/**
 * Pineconeに求人データを登録するスクリプト
 * 実行: node register_jobs.js
 */

const API_URL = "https://ai-matching-poc-90002038385.development.catalystserverless.jp/server/ai_matching/upsert";

const jobs = [
  {
    record_id: "13059000001662474",
    record: {
      title: "シニアバックエンドエンジニア",
      required_skills: "Python, AWS, Kubernetes, Go",
      position: "バックエンドエンジニア",
      location: "東京（リモート可）",
      salary_min: 600,
      salary_max: 900,
      description: "自社SaaSプロダクトのバックエンド開発をリード"
    },
    record_type: "job"
  },
  {
    record_id: "13059000001662475",
    record: {
      title: "フロントエンドエンジニア",
      required_skills: "React, TypeScript, Next.js",
      position: "フロントエンドエンジニア",
      location: "東京",
      salary_min: 400,
      salary_max: 600,
      description: "新規プロダクトのフロントエンド開発を担当"
    },
    record_type: "job"
  },
  {
    record_id: "13059000001662476",
    record: {
      title: "テックリード",
      required_skills: "Java, Spring Boot, MySQL, AWS",
      position: "テックリード",
      location: "大阪",
      salary_min: 700,
      salary_max: 1000,
      description: "開発チームのリーダーとして技術選定・設計・メンバー育成を担当"
    },
    record_type: "job"
  }
];

async function registerJob(job) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job)
    });
    const data = await response.json();
    console.log(`✅ ${job.record.title} (${job.record_id}): ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    console.error(`❌ ${job.record.title}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("=== Pinecone 求人データ登録開始 ===\n");
  
  for (const job of jobs) {
    await registerJob(job);
    await new Promise(r => setTimeout(r, 500)); // 0.5秒待機
  }
  
  console.log("\n=== 登録完了 ===");
}

main();
