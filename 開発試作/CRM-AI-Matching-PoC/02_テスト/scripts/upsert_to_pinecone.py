"""
CRM の JobSeekers / Jobs を取得し、Pinecone Python SDK でインデックスに upsert する。
Catalyst の index.js と同じ namespace・レコード形式（text, type, name, skills, location, salary, position）を使用。

前提:
  - pip install pinecone
  - 03_実装/config/.env.demo3 に PINECONE_API_KEY, PINECONE_HOST またはインデックス名が設定されていること
  - Pinecone インデックスは Integrated Inference（text で埋め込み）対応であること

実行:
  cd 02_テスト/scripts
  python upsert_to_pinecone.py --env demo3
"""
import os
import sys
import time
import requests
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent.parent / "03_実装" / "config"

_env_name = None
if "--env" in sys.argv:
    i = sys.argv.index("--env")
    if i + 1 < len(sys.argv):
        _env_name = sys.argv[i + 1].strip().lower()
_env_file = ".env.demo3" if _env_name == "demo3" else ".env"
env_path = CONFIG_DIR / _env_file

if not env_path.exists():
    print("Error: env file not found:", env_path)
    sys.exit(1)

for line in env_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ[k] = v

try:
    from pinecone import Pinecone
except ImportError:
    print("Error: pip install pinecone を実行してください")
    sys.exit(1)

# Zoho
dc = (os.getenv("ZOHO_DC") or "jp").lower()
tld_map = {"jp": "jp", "us": "com", "eu": "eu", "in": "in", "au": "com.au", "ca": "zohocloud.ca"}
tld = tld_map.get(dc, "jp")
ACCOUNTS = "https://accounts.zoho.{}".format(tld)
API = "https://www.zohoapis.{}".format(tld)
ORG = os.getenv("ZOHO_ORG_ID")

NAMESPACE_JOBSEEKERS = "jobseekers"
NAMESPACE_JOBS = "jobs"


def get_zoho_token():
    r = requests.post("{}/oauth/v2/token".format(ACCOUNTS), data={
        "client_id": os.getenv("ZOHO_CLIENT_ID"),
        "client_secret": os.getenv("ZOHO_CLIENT_SECRET"),
        "grant_type": "client_credentials",
        "scope": "ZohoCRM.modules.ALL",
        "soid": "ZohoCRM.{}".format(ORG),
    })
    if r.status_code != 200 or "access_token" not in r.json():
        raise RuntimeError("Zoho token failed: {}".format(r.text))
    return r.json()["access_token"]


def get_crm_records(token, module, fields):
    headers = {"Authorization": "Zoho-oauthtoken {}".format(token), "Content-Type": "application/json"}
    r = requests.get("{}/crm/v6/{}".format(API, module), params={"fields": fields, "per_page": 200}, headers=headers)
    if r.status_code != 200:
        return []
    return r.json().get("data", [])


def build_profile_text_jobseeker(rec):
    return "\n".join([
        "氏名: {}".format(rec.get("Name") or ""),
        "スキル: {}".format(rec.get("Skills") or ""),
        "経験年数: {}年".format(rec.get("Experience_Years") or ""),
        "希望職種: {}".format(rec.get("Desired_Position") or ""),
        "希望勤務地: {}".format(rec.get("Desired_Location") or ""),
        "希望年収: {}万円".format(rec.get("Desired_Salary") or ""),
        "自己PR: {}".format(rec.get("Self_PR") or ""),
    ]).strip()


def build_profile_text_job(rec):
    return "\n".join([
        "求人タイトル: {}".format(rec.get("Name") or ""),
        "必要スキル: {}".format(rec.get("Required_Skills") or ""),
        "経験年数: {}年以上".format(rec.get("Required_Experience") or ""),
        "職種: {}".format(rec.get("Position") or ""),
        "勤務地: {}".format(rec.get("Location") or ""),
        "年収: {}-{}万円".format(rec.get("Salary_Min") or "", rec.get("Salary_Max") or ""),
        "仕事内容: {}".format(rec.get("Description") or ""),
    ]).strip()


def jobseeker_to_record(rec):
    rid = str(rec.get("id", ""))
    text = build_profile_text_jobseeker(rec)
    r = {
        "_id": rid,
        "type": "jobseeker",
        "name": (str(rec.get("Name") or "")[:500]),
        "skills": (str(rec.get("Skills") or "")[:500]),
        "location": (str(rec.get("Desired_Location") or "")[:500]),
        "salary": (str(rec.get("Desired_Salary") or "")[:100]),
        "position": (str(rec.get("Desired_Position") or "")[:500]),
    }
    r["text"] = text
    r["content"] = text
    return r


def job_to_record(rec):
    rid = str(rec.get("id", ""))
    text = build_profile_text_job(rec)
    salary_str = "{}-{}".format(rec.get("Salary_Min") or "", rec.get("Salary_Max") or "")
    r = {
        "_id": rid,
        "type": "job",
        "name": (str(rec.get("Name") or "")[:500]),
        "skills": (str(rec.get("Required_Skills") or "")[:500]),
        "location": (str(rec.get("Location") or "")[:500]),
        "salary": (salary_str[:100]),
        "position": (str(rec.get("Position") or "")[:500]),
    }
    r["text"] = text
    r["content"] = text
    return r


def main():
    print("=== Pinecone へ CRM データを upsert (Python SDK) ===\n")
    print("環境: {}".format(_env_name or "default"))

    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("Error: PINECONE_API_KEY が設定されていません (.env.demo3)")
        sys.exit(1)

    pc = Pinecone(api_key=api_key)

    # インデックス: 実ホストが設定されていれば host で接続、プレースホルダーや未設定なら Index(name) で接続
    host = (os.getenv("PINECONE_HOST") or "").strip().replace("https://", "").split("/")[0]
    raw_index_name = os.getenv("PINECONE_INDEX_NAME") or os.getenv("PINECONE_INDEX") or "aimatching-index"
    index_name = raw_index_name if raw_index_name and "your-index" not in raw_index_name.lower() else "aimatching-index"
    is_placeholder = not host or "your-index" in host.lower() or host == "your-index-name"
    if host and ".pinecone.io" in host and not is_placeholder:
        index = pc.Index(host=host)
        print("Pinecone Index (host): {}...".format(host[:50]))
    else:
        index = pc.Index(index_name)
        print("Pinecone Index (name): {}".format(index_name))

    token = get_zoho_token()
    print("Zoho CRM: トークン取得済み\n")

    batch_size = 96

    # JobSeekers
    js_fields = "Name,Skills,Experience_Years,Desired_Position,Desired_Location,Desired_Salary,Self_PR,id"
    jobseekers = get_crm_records(token, "JobSeekers", js_fields)
    if not jobseekers:
        print("JobSeekers: レコードが0件です")
    else:
        records_js = [jobseeker_to_record(r) for r in jobseekers]
        for i in range(0, len(records_js), batch_size):
            batch = records_js[i : i + batch_size]
            index.upsert_records(NAMESPACE_JOBSEEKERS, batch)
            print("JobSeekers: {} 件 upsert (batch {})".format(len(batch), i // batch_size + 1))
        print("JobSeekers: 合計 {} 件 完了\n".format(len(records_js)))

    # Jobs
    job_fields = "Name,Required_Skills,Required_Experience,Position,Location,Salary_Min,Salary_Max,Description,id"
    jobs = get_crm_records(token, "Jobs", job_fields)
    if not jobs:
        print("Jobs: レコードが0件です")
    else:
        records_j = [job_to_record(r) for r in jobs]
        for i in range(0, len(records_j), batch_size):
            batch = records_j[i : i + batch_size]
            index.upsert_records(NAMESPACE_JOBS, batch)
            print("Jobs: {} 件 upsert (batch {})".format(len(batch), i // batch_size + 1))
        print("Jobs: 合計 {} 件 完了\n".format(len(records_j)))

    print("検索可能になるまで 10 秒ほどかかります。待機します...")
    time.sleep(10)
    print("完了。CRM ウィジェットでマッチングを確認してください。")


if __name__ == "__main__":
    main()
