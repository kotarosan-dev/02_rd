/**
 * 古いテストデータを削除するスクリプト
 */

const PINECONE_API_KEY = 'pcsk_69Ftgv_87rKSRSB49CtVmoLhuqaZhqk931M5ciMCbZ3i2HUTaipsXqgRcWAdmn346ZR4gr';
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
