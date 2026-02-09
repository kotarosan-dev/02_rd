"""
CRM×AI Matching PoC - Catalyst Advanced I/O Function
Flask フレームワーク使用（Catalyst Python Advanced I/O要件）
"""

import os
import json
import logging
from typing import List, Dict, Any
from flask import Request, make_response, jsonify
from pinecone import Pinecone

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pineconeクライアント（遅延初期化）
_pinecone_client = None
_pinecone_index = None

# 定数
NAMESPACE_JOBSEEKERS = "jobseekers"
NAMESPACE_JOBS = "jobs"


def get_pinecone_index():
    """Pineconeインデックスを取得"""
    global _pinecone_client, _pinecone_index
    if _pinecone_index is None:
        api_key = os.environ.get("PINECONE_API_KEY")
        host = os.environ.get("PINECONE_HOST")
        if not api_key or not host:
            raise ValueError("PINECONE_API_KEY and PINECONE_HOST must be set")
        _pinecone_client = Pinecone(api_key=api_key)
        _pinecone_index = _pinecone_client.Index(host=host)
    return _pinecone_index


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
    else:
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
    """レコードをPineconeにアップサート"""
    index = get_pinecone_index()
    namespace = NAMESPACE_JOBSEEKERS if record_type == "jobseeker" else NAMESPACE_JOBS
    text = build_profile_text(record, record_type)
    
    index.upsert_records(
        namespace=namespace,
        records=[{
            "_id": record_id,
            "text": text,
            "type": record_type,
            **{k: str(v)[:500] for k, v in record.items() if v}
        }]
    )
    logger.info(f"Upserted {record_type} {record_id}")


def search_matches(record_id: str, record: Dict[str, Any], record_type: str, top_k: int = 5) -> List[Dict]:
    """類似マッチング検索"""
    index = get_pinecone_index()
    search_namespace = NAMESPACE_JOBS if record_type == "jobseeker" else NAMESPACE_JOBSEEKERS
    text = build_profile_text(record, record_type)
    
    results = index.search(
        namespace=search_namespace,
        query={
            "top_k": top_k,
            "inputs": {"text": text}
        }
    )
    
    matches = []
    if results and hasattr(results, 'result') and results.result:
        for hit in results.result.hits:
            matches.append({
                "id": hit["_id"],
                "score": round(hit["_score"] * 100, 1),
                "metadata": hit.get("fields", {})
            })
    return matches


def handler(request: Request):
    """
    Catalyst Advanced I/O ハンドラー（Flask形式）
    """
    logger.info(f"Request path: {request.path}, method: {request.method}")
    
    # ヘルスチェック
    if request.path == "/" or request.path == "/health":
        response = make_response(jsonify({
            "status": "ok",
            "version": "1.0.0"
        }), 200)
        return response
    
    # Upsert エンドポイント
    if "/upsert" in request.path and request.method == "POST":
        try:
            body = request.get_json() or {}
            record_id = body.get("record_id")
            record = body.get("record")
            record_type = body.get("record_type")
            
            if not all([record_id, record, record_type]):
                return make_response(jsonify({
                    "error": "Missing required fields: record_id, record, record_type"
                }), 400)
            
            upsert_to_pinecone(record_id, record, record_type)
            return make_response(jsonify({
                "success": True,
                "record_id": record_id
            }), 200)
        except Exception as e:
            logger.error(f"Upsert error: {str(e)}")
            return make_response(jsonify({"error": str(e)}), 500)
    
    # Search エンドポイント
    if "/search" in request.path and request.method == "POST":
        try:
            body = request.get_json() or {}
            record_id = body.get("record_id")
            record = body.get("record")
            record_type = body.get("record_type")
            top_k = body.get("top_k", 5)
            
            if not all([record_id, record, record_type]):
                return make_response(jsonify({
                    "error": "Missing required fields: record_id, record, record_type"
                }), 400)
            
            matches = search_matches(record_id, record, record_type, top_k)
            return make_response(jsonify({
                "success": True,
                "record_id": record_id,
                "matches": matches
            }), 200)
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return make_response(jsonify({"error": str(e)}), 500)
    
    # 404
    return make_response(jsonify({
        "error": "Not found",
        "path": request.path
    }), 404)
