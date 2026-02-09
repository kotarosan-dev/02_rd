'use strict';

/**
 * CRM×AI Matching PoC - Catalyst Advanced I/O Function (Node.js)
 * 求職者と求人のセマンティックマッチングを行うサーバーレス関数
 * Pinecone Integrated Inference API（REST）を使用
 */

const express = require('express');

const app = express();
app.use(express.json());

// CORS設定（全てのオリジンを許可）
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        // リクエスト元のオリジンを許可（動的に設定）
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // プリフライトリクエスト（OPTIONS）に即座に応答
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 定数
const NAMESPACE_JOBSEEKERS = 'jobseekers';
const NAMESPACE_JOBS = 'jobs';
const PINECONE_HOST = 'firstprpjects-x0dk0o2.svc.aped-4627-b74a.pinecone.io';

/**
 * Pinecone REST APIを呼び出す
 */
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
 * レコードをPineconeにアップサート（組み込みEmbeddings使用）
 */
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

/**
 * 類似マッチング検索（組み込みEmbeddings使用）
 */
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
    res.json({ status: 'ok', version: '1.4.0', cors: 'dynamic-origin' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.4.0', cors: 'dynamic-origin' });
});

// Stats エンドポイント（Pinecone接続確認）
app.get('/stats', async (req, res) => {
    try {
        const stats = await callPineconeAPI('/describe_index_stats', 'POST', {});
        res.json({
            success: true,
            pinecone_connected: true,
            stats: stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            pinecone_connected: false,
            error: error.message
        });
    }
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
        const { record_id, record, record_type, top_k = 5 } = req.body;
        
        if (!record_id || !record || !record_type) {
            return res.status(400).json({
                error: 'Missing required fields: record_id, record, record_type'
            });
        }
        
        const matches = await searchMatches(record_id, record, record_type, top_k);
        
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
