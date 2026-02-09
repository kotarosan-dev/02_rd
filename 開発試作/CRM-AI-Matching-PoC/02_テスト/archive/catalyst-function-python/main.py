"""
CRM×AI Matching PoC - Catalyst Function
求職者と求人のセマンティックマッチングを行うサーバーレス関数
Pinecone組み込みEmbeddingsを使用（OpenAI不要）
"""

import os
import json
import logging
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone
import requests

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 環境変数読み込み
env_path = Path(__file__).parent.parent.parent / "03_実装" / "config" / ".env"
load_dotenv(env_path)

# Pineconeクライアント初期化
pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pinecone_client.Index(host=os.getenv("PINECONE_HOST"))

# 定数
NAMESPACE_JOBSEEKERS = "jobseekers"
NAMESPACE_JOBS = "jobs"


def build_profile_text(record: Dict[str, Any], record_type: str) -> str:
    """CRMレコードからマッチング用テキストを生成"""
    if record_type == "jobseeker":
        return f"""
氏名: {record.get('name', '')}
スキル: {record.get('skills', '')}
経験年数: {record.get('experience_years', '')}年
希望職種: {record.get('desired_position', '')}
希望勤務地: {record.get('desired_location', '')}
希望年収: {record.get('desired_salary', '')}万円
自己PR: {record.get('self_pr', '')}
""".strip()
    else:  # job
        return f"""
求人タイトル: {record.get('title', '')}
必要スキル: {record.get('required_skills', '')}
経験年数: {record.get('required_experience', '')}年以上
職種: {record.get('position', '')}
勤務地: {record.get('location', '')}
年収: {record.get('salary_min', '')}-{record.get('salary_max', '')}万円
仕事内容: {record.get('description', '')}
""".strip()


def upsert_to_pinecone(record_id: str, record: Dict[str, Any], record_type: str):
    """
    レコードをPineconeにアップサート
    Pinecone組み込みEmbeddingsを使用
    """
    namespace = NAMESPACE_JOBSEEKERS if record_type == "jobseeker" else NAMESPACE_JOBS
    text = build_profile_text(record, record_type)
    
    # Pineconeの組み込みEmbeddingsを使用
    # upsert_recordsメソッドはテキストを自動でベクトル化
    pinecone_index.upsert_records(
        namespace=namespace,
        records=[{
            "_id": record_id,
            "text": text,  # Pineconeが自動でEmbedding生成
            "type": record_type,
            **{k: str(v)[:500] for k, v in record.items() if v}
        }]
    )
    logger.info(f"Upserted {record_type} {record_id} to Pinecone")


def search_matches(record_id: str, record: Dict[str, Any], record_type: str, top_k: int = 5) -> List[Dict]:
    """
    類似マッチング検索
    Pinecone組み込みEmbeddingsを使用
    """
    # 求職者なら求人を、求人なら求職者を検索
    search_namespace = NAMESPACE_JOBS if record_type == "jobseeker" else NAMESPACE_JOBSEEKERS
    text = build_profile_text(record, record_type)
    
    # Pineconeの組み込み検索を使用
    results = pinecone_index.search(
        namespace=search_namespace,
        query={
            "top_k": top_k,
            "inputs": {
                "text": text
            }
        }
    )
    
    matches = []
    if results and hasattr(results, 'result') and results.result:
        for hit in results.result.hits:
            matches.append({
                "id": hit["_id"],
                "score": round(hit["_score"] * 100, 1),  # パーセント表示
                "metadata": hit.get("fields", {})
            })
    
    return matches


def _format_record_summary(record: Dict[str, Any], record_type: str) -> str:
    """理由生成用にレコードを短いテキストにまとめる"""
    if record_type == "jobseeker":
        return (
            f"求職者: {record.get('name', '')} | "
            f"スキル: {record.get('skills', '')} | "
            f"希望職種: {record.get('desired_position', '')} | "
            f"希望勤務地: {record.get('desired_location', '')} | "
            f"自己PR: {(record.get('self_pr', '') or '')[:100]}"
        )
    else:
        return (
            f"求人: {record.get('title', '')} | "
            f"必要スキル: {record.get('required_skills', '')} | "
            f"職種: {record.get('position', '')} | "
            f"勤務地: {record.get('location', '')} | "
            f"内容: {(record.get('description', '') or '')[:100]}"
        )


def _format_match_summary(metadata: Dict[str, Any], record_type: str) -> str:
    """マッチ側のメタデータを短いテキストにまとめる（Pineconeのfields由来）"""
    if record_type == "jobseeker":
        return (
            f"求人: {metadata.get('title', '')} | "
            f"スキル: {metadata.get('required_skills', metadata.get('skills', ''))} | "
            f"職種: {metadata.get('position', '')} | "
            f"勤務地: {metadata.get('location', '')}"
        )
    else:
        return (
            f"求職者: {metadata.get('name', '')} | "
            f"スキル: {metadata.get('skills', '')} | "
            f"希望職種: {metadata.get('desired_position', '')} | "
            f"希望勤務地: {metadata.get('desired_location', '')}"
        )


def generate_match_reason(
    record: Dict[str, Any],
    record_type: str,
    match_metadata: Dict[str, Any],
    score: float,
) -> Optional[str]:
    """
    OpenAI API で「このマッチングが適している理由」を1文で生成する。
    OPENAI_API_KEY が未設定の場合は None を返す。
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.info("OPENAI_API_KEY not set, skipping reason generation")
        return None

    source_summary = _format_record_summary(record, record_type)
    match_summary = _format_match_summary(match_metadata, record_type)

    prompt = f"""以下はマッチングした2件の情報です。このマッチングが適している理由を1文で述べてください（日本語・50字程度）。理由のみ出力し、敬語は不要です。

【現在のレコード】
{source_summary}

【マッチした候補】
{match_summary}

マッチングスコア: {score}%
理由:"""

    try:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 150,
                "temperature": 0.3,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")
        return (content or "").strip() or None
    except Exception as e:
        logger.warning(f"Reason generation failed: {e}")
        return None


def add_reasons_to_matches(
    matches: List[Dict],
    record: Dict[str, Any],
    record_type: str,
    max_reasons: int = 3,
) -> None:
    """マッチング結果の上位 max_reasons 件に理由を付与する（matches を in-place で更新）"""
    for i, match in enumerate(matches):
        if i >= max_reasons:
            match["reason"] = None
            continue
        meta = match.get("metadata") or {}
        reason = generate_match_reason(record, record_type, meta, match.get("score", 0))
        match["reason"] = reason


def handler(context, request):
    """
    Catalyst Advanced I/O ハンドラー
    
    エンドポイント:
    - POST /upsert - レコードをPineconeに登録
    - POST /search - マッチング検索
    - GET /health - ヘルスチェック
    """
    try:
        path = request.path
        method = request.method
        
        # ヘルスチェック
        if path == "/health" and method == "GET":
            return {
                "statusCode": 200,
                "body": json.dumps({"status": "ok"})
            }
        
        # リクエストボディ取得
        body = json.loads(request.body) if request.body else {}
        
        # レコード登録
        if path == "/upsert" and method == "POST":
            record_id = body.get("record_id")
            record = body.get("record")
            record_type = body.get("record_type")  # "jobseeker" or "job"
            
            if not all([record_id, record, record_type]):
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "Missing required fields"})
                }
            
            upsert_to_pinecone(record_id, record, record_type)
            
            return {
                "statusCode": 200,
                "body": json.dumps({"success": True, "record_id": record_id})
            }
        
        # マッチング検索
        if path == "/search" and method == "POST":
            record_id = body.get("record_id")
            record = body.get("record")
            record_type = body.get("record_type")
            top_k = body.get("top_k", 5)
            generate_reasons = body.get("generate_reasons", False)
            
            if not all([record_id, record, record_type]):
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": "Missing required fields"})
                }
            
            matches = search_matches(record_id, record, record_type, top_k)
            
            if generate_reasons and matches:
                add_reasons_to_matches(matches, record, record_type, max_reasons=3)
            
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "success": True,
                    "record_id": record_id,
                    "matches": matches
                })
            }
        
        # 404
        return {
            "statusCode": 404,
            "body": json.dumps({"error": "Not found"})
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }


# ローカルテスト用
if __name__ == "__main__":
    print("=" * 60)
    print("CRM×AI Matching PoC - Pinecone組み込みEmbeddingsテスト")
    print("=" * 60)
    
    # テストデータ
    test_jobseekers = [
        {
            "name": "田中太郎",
            "skills": "Python, AWS, Docker, Kubernetes",
            "experience_years": 5,
            "desired_position": "バックエンドエンジニア",
            "desired_location": "東京",
            "desired_salary": 600,
            "self_pr": "Webアプリケーション開発を5年間経験。スタートアップでの0→1開発が得意です。"
        },
        {
            "name": "佐藤花子",
            "skills": "JavaScript, React, TypeScript, Node.js",
            "experience_years": 3,
            "desired_position": "フロントエンドエンジニア",
            "desired_location": "東京（リモート可）",
            "desired_salary": 500,
            "self_pr": "モダンなフロントエンド開発に情熱を持っています。"
        }
    ]
    
    test_jobs = [
        {
            "title": "シニアバックエンドエンジニア",
            "required_skills": "Python, AWS, Kubernetes",
            "required_experience": 3,
            "position": "バックエンドエンジニア",
            "location": "東京（リモート可）",
            "salary_min": 500,
            "salary_max": 800,
            "description": "自社SaaSプロダクトのバックエンド開発をリード。"
        },
        {
            "title": "フロントエンドエンジニア",
            "required_skills": "React, TypeScript, Next.js",
            "required_experience": 2,
            "position": "フロントエンドエンジニア",
            "location": "東京",
            "salary_min": 400,
            "salary_max": 600,
            "description": "新規プロダクトのフロントエンド開発を担当。"
        }
    ]
    
    # テスト実行
    print("\n=== Upserting test data ===")
    
    for i, jobseeker in enumerate(test_jobseekers):
        upsert_to_pinecone(f"jobseeker_{i+1:03d}", jobseeker, "jobseeker")
        print(f"  [OK] Jobseeker {i+1}: {jobseeker['name']}")
    
    for i, job in enumerate(test_jobs):
        upsert_to_pinecone(f"job_{i+1:03d}", job, "job")
        print(f"  [OK] Job {i+1}: {job['title']}")
    
    print("\n[Waiting] Index sync (10 seconds)...")
    time.sleep(10)
    
    print("\n=== Searching matches ===")
    
    # 田中太郎に合う求人を検索
    print(f"\n[Tanaka Taro] Recommended Jobs:")
    matches = search_matches("jobseeker_001", test_jobseekers[0], "jobseeker", top_k=3)
    for match in matches:
        print(f"  - {match['metadata'].get('title', 'N/A')} (Score: {match['score']}%)")
    
    # 佐藤花子に合う求人を検索
    print(f"\n[Sato Hanako] Recommended Jobs:")
    matches = search_matches("jobseeker_002", test_jobseekers[1], "jobseeker", top_k=3)
    for match in matches:
        print(f"  - {match['metadata'].get('title', 'N/A')} (Score: {match['score']}%)")
    
    # シニアバックエンドエンジニア求人に合う候補者を検索
    print(f"\n[Senior Backend Engineer] Recommended Candidates:")
    matches = search_matches("job_001", test_jobs[0], "job", top_k=3)
    for match in matches:
        print(f"  - {match['metadata'].get('name', 'N/A')} (Score: {match['score']}%)")
    
    print("\n" + "=" * 60)
    print("テスト完了")
    print("=" * 60)
