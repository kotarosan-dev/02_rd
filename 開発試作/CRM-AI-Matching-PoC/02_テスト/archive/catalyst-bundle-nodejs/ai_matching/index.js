'use strict';

/**
 * CRM×AI Matching PoC - Catalyst Advanced I/O Function (Node.js)
 * 求職者と求人のセマンティックマッチングを行うサーバーレス関数
 * Pinecone組み込みEmbeddingsを使用
 */

const express = require('express');
const { Pinecone } = require('@pinecone-database/pinecone');

const app = express();
app.use(express.json());

// Pineconeクライアント（遅延初期化）
let pineconeIndex = null;

// 定数
const NAMESPACE_JOBSEEKERS = 'jobseekers';
const NAMESPACE_JOBS = 'jobs';

/**
 * Pineconeインデックスを取得
 */
function getPineconeIndex() {
    if (!pineconeIndex) {
        const apiKey = process.env.PINECONE_API_KEY;
        const host = process.env.PINECONE_HOST;
        
        if (!apiKey || !host) {
            throw new Error('PINECONE_API_KEY and PINECONE_HOST must be set');
        }
        
        const pc = new Pinecone({ apiKey });
        pineconeIndex = pc.index(host);
    }
    return pineconeIndex;
}

/**
 * CRMレコードからマッチング用テキストを生成
 */
function buildProfileText(record, recordType) {
    if (recordType === 'jobseeker') {
        return `
氏名: ${record.name || ''}
スキル: ${record.skills || ''}
経験年数: ${record.experience_years || ''}年
希望職種: ${record.desired_position || ''}
希望勤務地: ${record.desired_location || ''}
希望年収: ${record.desired_salary || ''}万円
自己PR: ${record.self_pr || ''}
`.trim();
    } else {
        return `
求人タイトル: ${record.title || ''}
必要スキル: ${record.required_skills || ''}
経験年数: ${record.required_experience || ''}年以上
職種: ${record.position || ''}
勤務地: ${record.location || ''}
年収: ${record.salary_min || ''}-${record.salary_max || ''}万円
仕事内容: ${record.description || ''}
`.trim();
    }
}

/**
 * レコードをPineconeにアップサート
 */
async function upsertToPinecone(recordId, record, recordType) {
    const index = getPineconeIndex();
    const namespace = recordType === 'jobseeker' ? NAMESPACE_JOBSEEKERS : NAMESPACE_JOBS;
    const text = buildProfileText(record, recordType);
    
    // メタデータを準備（値を文字列に変換、500文字制限）
    const metadata = { type: recordType };
    for (const [key, value] of Object.entries(record)) {
        if (value !== null && value !== undefined) {
            metadata[key] = String(value).substring(0, 500);
        }
    }
    
    await index.namespace(namespace).upsertRecords([{
        _id: recordId,
        text: text,
        ...metadata
    }]);
    
    console.log(`Upserted ${recordType} ${recordId} to Pinecone`);
}

/**
 * 理由生成用：レコードを短いテキストにまとめる
 */
function formatRecordSummary(record, recordType) {
    if (recordType === 'jobseeker') {
        return `求職者: ${record.name || ''} | スキル: ${record.skills || ''} | 希望職種: ${record.desired_position || ''} | 希望勤務地: ${record.desired_location || ''} | 自己PR: ${(record.self_pr || '').substring(0, 100)}`;
    }
    return `求人: ${record.title || ''} | 必要スキル: ${record.required_skills || ''} | 職種: ${record.position || ''} | 勤務地: ${record.location || ''} | 内容: ${(record.description || '').substring(0, 100)}`;
}

/**
 * 理由生成用：マッチ側メタデータを短いテキストにまとめる
 */
function formatMatchSummary(metadata, recordType) {
    if (recordType === 'jobseeker') {
        return `求人: ${metadata.title || ''} | スキル: ${metadata.required_skills || metadata.skills || ''} | 職種: ${metadata.position || ''} | 勤務地: ${metadata.location || ''}`;
    }
    return `求職者: ${metadata.name || ''} | スキル: ${metadata.skills || ''} | 希望職種: ${metadata.desired_position || ''} | 希望勤務地: ${metadata.desired_location || ''}`;
}

/**
 * OpenAI API でマッチング理由を1文生成（OPENAI_API_KEY が無い場合は null）
 */
async function generateMatchReason(record, recordType, matchMetadata, score) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.log('OPENAI_API_KEY not set, skipping reason generation');
        return null;
    }
    const sourceSummary = formatRecordSummary(record, recordType);
    const matchSummary = formatMatchSummary(matchMetadata, recordType);
    const prompt = `以下はマッチングした2件の情報です。このマッチングが適している理由を1文で述べてください（日本語・50字程度）。理由のみ出力し、敬語は不要です。

【現在のレコード】
${sourceSummary}

【マッチした候補】
${matchSummary}

マッチングスコア: ${score}%
理由:`;

    try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 150,
                temperature: 0.3
            })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim() || null;
        return content || null;
    } catch (err) {
        console.warn('Reason generation failed:', err.message);
        return null;
    }
}

/**
 * マッチング結果の上位 maxReasons 件に理由を付与（in-place）
 */
async function addReasonsToMatches(matches, record, recordType, maxReasons = 3) {
    for (let i = 0; i < matches.length; i++) {
        if (i >= maxReasons) {
            matches[i].reason = null;
            continue;
        }
        const meta = matches[i].metadata || {};
        matches[i].reason = await generateMatchReason(record, recordType, meta, matches[i].score);
    }
}

/**
 * 類似マッチング検索
 */
async function searchMatches(recordId, record, recordType, topK = 5) {
    const index = getPineconeIndex();
    const searchNamespace = recordType === 'jobseeker' ? NAMESPACE_JOBS : NAMESPACE_JOBSEEKERS;
    const text = buildProfileText(record, recordType);
    
    const results = await index.namespace(searchNamespace).searchRecords({
        query: {
            topK: topK,
            inputs: { text: text }
        }
    });
    
    const matches = [];
    if (results && results.result && results.result.hits) {
        for (const hit of results.result.hits) {
            matches.push({
                id: hit._id,
                score: Math.round(hit._score * 1000) / 10, // パーセント表示
                metadata: hit.fields || {}
            });
        }
    }
    
    return matches;
}

// CORS設定
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ヘルスチェック
app.get('/', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Upsert エンドポイント
app.post('/upsert', async (req, res) => {
    try {
        const { record_id, record, record_type } = req.body;
        
        if (!record_id || !record || !record_type) {
            return res.status(400).json({
                error: 'Missing required fields: record_id, record, record_type'
            });
        }
        
        await upsertToPinecone(record_id, record, record_type);
        
        res.json({ success: true, record_id });
    } catch (error) {
        console.error('Upsert error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search エンドポイント
app.post('/search', async (req, res) => {
    try {
        const { record_id, record, record_type, top_k = 5, generate_reasons = false } = req.body;
        
        if (!record_id || !record || !record_type) {
            return res.status(400).json({
                error: 'Missing required fields: record_id, record, record_type'
            });
        }
        
        const matches = await searchMatches(record_id, record, record_type, top_k);
        
        if (generate_reasons && matches.length > 0) {
            await addReasonsToMatches(matches, record, record_type, 3);
        }
        
        res.json({ success: true, record_id, matches });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 404ハンドラー
app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
});

module.exports = app;
