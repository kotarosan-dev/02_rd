/**
 * Pinecone Integrated Inference APIに直接登録するスクリプト
 * 実行: node register_jobs_direct.js
 */

// API Keyは環境変数から取得（.envファイルに設定）
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
if (!PINECONE_API_KEY) {
  console.error('ERROR: PINECONE_API_KEY environment variable is not set');
  console.error('Set it with: $env:PINECONE_API_KEY="your-api-key"');
  process.exit(1);
}
const PINECONE_HOST = 'https://firstprpjects-x0dk0o2.svc.aped-4627-b74a.pinecone.io';
const NAMESPACE = 'jobs';

const jobs = [
  {
    _id: "13059000001662474",
    text: "求人タイトル: シニアバックエンドエンジニア 必要スキル: Python, AWS, Kubernetes, Go 勤務地: 東京（リモート可） 年収: 600-900万円 職種: バックエンドエンジニア",
    type: "job",
    name: "シニアバックエンドエンジニア",
    skills: "Python, AWS, Kubernetes, Go",
    location: "東京（リモート可）",
    salary: "600-900",
    position: "バックエンドエンジニア"
  },
  {
    _id: "13059000001662475",
    text: "求人タイトル: フロントエンドエンジニア 必要スキル: React, TypeScript, Next.js 勤務地: 東京 年収: 400-600万円 職種: フロントエンドエンジニア",
    type: "job",
    name: "フロントエンドエンジニア",
    skills: "React, TypeScript, Next.js",
    location: "東京",
    salary: "400-600",
    position: "フロントエンドエンジニア"
  },
  {
    _id: "13059000001662476",
    text: "求人タイトル: テックリード 必要スキル: Java, Spring Boot, MySQL, AWS 勤務地: 大阪 年収: 700-1000万円 職種: テックリード",
    type: "job",
    name: "テックリード",
    skills: "Java, Spring Boot, MySQL, AWS",
    location: "大阪",
    salary: "700-1000",
    position: "テックリード"
  }
];

async function upsertRecords() {
  const url = `${PINECONE_HOST}/records/namespaces/${NAMESPACE}/upsert`;
  
  console.log("=== Pinecone 直接登録開始 ===\n");
  console.log("URL:", url);
  console.log("Namespace:", NAMESPACE);
  console.log("");
  
  // NDJSON形式（各レコードを1行ずつ）
  const ndjsonBody = jobs.map(job => JSON.stringify(job)).join('\n');
  
  console.log("Request body (NDJSON):");
  console.log(ndjsonBody);
  console.log("");
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/x-ndjson',
        'X-Pinecone-API-Version': '2025-01'
      },
      body: ndjsonBody
    });
    
    const responseText = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", responseText);
    
    if (response.ok) {
      console.log("\n✅ 登録成功！");
    } else {
      console.log("\n❌ エラー発生");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

upsertRecords();
