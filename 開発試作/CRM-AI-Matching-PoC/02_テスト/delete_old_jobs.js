/**
 * 古いテストデータを削除するスクリプト
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

const idsToDelete = ["job_001", "job_002"];

async function deleteRecords() {
  const url = `${PINECONE_HOST}/vectors/delete`;
  
  console.log("=== 古いテストデータ削除 ===\n");
  console.log("削除対象ID:", idsToDelete);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2025-01'
      },
      body: JSON.stringify({
        ids: idsToDelete,
        namespace: NAMESPACE
      })
    });
    
    const responseText = await response.text();
    console.log("Status:", response.status);
    console.log("Response:", responseText);
    
    if (response.ok) {
      console.log("\n✅ 削除成功！");
    } else {
      console.log("\n❌ エラー発生");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

deleteRecords();
