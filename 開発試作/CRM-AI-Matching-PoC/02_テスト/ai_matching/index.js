'use strict';

/**
 * CRM×AI Matching PoC - Catalyst Advanced I/O Function (Node.js)
 * 求職者と求人のセマンティックマッチングを行うサーバーレス関数
 * Pinecone Integrated Inference API（REST）を使用
 * マッチング理由生成（OpenAI）対応
 */

const express = require('express');

const app = express();
app.use(express.json());

// CORS設定（全てのオリジンを許可）
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 定数
const NAMESPACE_JOBSEEKERS = 'jobseekers';
const NAMESPACE_JOBS = 'jobs';
const PINECONE_HOST = 'firstprpjects-x0dk0o2.svc.aped-4627-b74a.pinecone.io';

async function callPineconeAPI(endpoint, method, body) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        throw new Error('PINECONE_API_KEY must be set');
    }
    const url = `https://${PINECONE_HOST}${endpoint}`;
    const response = await fetch(url, {
        method: method,
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
            'X-Pinecone-API-Version': '2025-01'
        },
        body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinecone API error: ${response.status} - ${errorText}`);
    }
    return response.json();
}

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
    }
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

async function upsertToPinecone(recordId, record, recordType) {
    const namespace = recordType === 'jobseeker' ? NAMESPACE_JOBSEEKERS : NAMESPACE_JOBS;
    const text = buildProfileText(record, recordType);
    const body = {
        records: [{
            _id: recordId,
            text: text,
            type: recordType,
            name: String(record.name || record.title || '').substring(0, 500),
            skills: String(record.skills || record.required_skills || '').substring(0, 500),
            location: String(record.desired_location || record.location || '').substring(0, 500),
            salary: String(record.desired_salary || `${record.salary_min}-${record.salary_max}` || '').substring(0, 100),
            position: String(record.desired_position || record.position || '').substring(0, 500)
        }]
    };
    await callPineconeAPI(`/records/namespaces/${namespace}/upsert`, 'POST', body);
    console.log(`Upserted ${recordType} ${recordId} to Pinecone`);
}

async function searchMatches(recordId, record, recordType, topK = 5) {
    const searchNamespace = recordType === 'jobseeker' ? NAMESPACE_JOBS : NAMESPACE_JOBSEEKERS;
    const text = buildProfileText(record, recordType);
    const body = {
        query: {
            inputs: { text: text },
            top_k: topK
        },
        fields: ['type', 'name', 'skills', 'location', 'salary', 'position']
    };
    const results = await callPineconeAPI(`/records/namespaces/${searchNamespace}/search`, 'POST', body);
    const matches = [];
    if (results && results.result && results.result.hits) {
        for (const hit of results.result.hits) {
            matches.push({
                id: hit._id,
                score: Math.round(hit._score * 1000) / 10,
                metadata: hit.fields || {}
            });
        }
    }
    return matches;
}

function formatRecordSummary(record, recordType) {
    if (recordType === 'jobseeker') {
        return `求職者: ${record.name || ''} | スキル: ${record.skills || ''} | 希望職種: ${record.desired_position || ''} | 希望勤務地: ${record.desired_location || ''} | 自己PR: ${(record.self_pr || '').substring(0, 100)}`;
    }
    return `求人: ${record.title || ''} | 必要スキル: ${record.required_skills || ''} | 職種: ${record.position || ''} | 勤務地: ${record.location || ''} | 内容: ${(record.description || '').substring(0, 100)}`;
}

function formatMatchSummary(metadata, recordType) {
    const title = metadata.title || metadata.name || '';
    if (recordType === 'jobseeker') {
        return `求人: ${title} | スキル: ${metadata.required_skills || metadata.skills || ''} | 職種: ${metadata.position || ''} | 勤務地: ${metadata.location || ''}`;
    }
    return `求職者: ${metadata.name || ''} | スキル: ${metadata.skills || ''} | 希望職種: ${metadata.desired_position || metadata.position || ''} | 希望勤務地: ${metadata.desired_location || metadata.location || ''}`;
}

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

function formatMatchLine(metadata, recordType, index) {
    const title = metadata.title || metadata.name || '';
    if (recordType === 'jobseeker') {
        return `${index}. ${title}（${metadata.position || ''} · ${metadata.location || ''}）`;
    }
    return `${index}. ${metadata.name || ''}（${metadata.skills || ''}）`;
}

async function generateOverallSummary(record, recordType, matches) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !matches.length) return null;
    const sourceSummary = formatRecordSummary(record, recordType);
    const matchLines = matches
        .slice(0, 5)
        .map((m, i) => formatMatchLine(m.metadata || {}, recordType, i + 1))
        .join('\n');
    const prompt = `以下は「現在のレコード」と「マッチした候補の一覧」です。このランキング全体を1〜2文で総合評価してください（日本語・80字程度）。求職者なら求人との相性、求人なら候補者との相性を簡潔に述べ、敬語は不要です。

【現在のレコード】
${sourceSummary}

【マッチした候補（上位）】
${matchLines}

総合評価:`;
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
                max_tokens: 200,
                temperature: 0.3
            })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.warn('Overall summary generation failed:', err.message);
        return null;
    }
}

app.get('/', (req, res) => {
    res.json({ status: 'ok', version: '1.5.0', cors: 'dynamic-origin' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.5.0', cors: 'dynamic-origin' });
});

app.get('/stats', async (req, res) => {
    try {
        const stats = await callPineconeAPI('/describe_index_stats', 'POST', {});
        res.json({ success: true, pinecone_connected: true, stats: stats });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ success: false, pinecone_connected: false, error: error.message });
    }
});

app.post('/upsert', async (req, res) => {
    try {
        const { record_id, record, record_type } = req.body;
        if (!record_id || !record || !record_type) {
            return res.status(400).json({ error: 'Missing required fields: record_id, record, record_type' });
        }
        await upsertToPinecone(record_id, record, record_type);
        res.json({ success: true, record_id });
    } catch (error) {
        console.error('Upsert error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/search', async (req, res) => {
    try {
        const { record_id, record, record_type, top_k = 5, generate_reasons = false, generate_summary = false } = req.body;
        if (!record_id || !record || !record_type) {
            return res.status(400).json({ error: 'Missing required fields: record_id, record, record_type' });
        }
        const matches = await searchMatches(record_id, record, record_type, top_k);
        let summary = null;
        if (generate_summary && matches.length > 0) {
            summary = await generateOverallSummary(record, record_type, matches);
        } else if (generate_reasons && matches.length > 0) {
            await addReasonsToMatches(matches, record, record_type, 3);
        }
        res.json({ success: true, record_id, matches, summary });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
});

module.exports = app;
