"""
既存の JobSeekers / Jobs レコードを、リッチなテストデータで UPDATE する。
Name で照合して一致したレコードを上書き。
使い方: python update_records.py --env demo3
"""
import os, sys, requests, json
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent.parent / "03_実装" / "config"

_env_name = None
if "--env" in sys.argv:
    i = sys.argv.index("--env")
    if i + 1 < len(sys.argv):
        _env_name = sys.argv[i + 1].strip().lower()
_env_file = ".env.demo3" if _env_name == "demo3" else ".env"
env_path = CONFIG_DIR / _env_file

if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k] = v
else:
    print("env not found:", env_path)
    sys.exit(1)

dc = (os.getenv("ZOHO_DC") or "jp").lower()
tld_map = {"jp": "jp", "us": "com", "eu": "eu", "in": "in", "au": "com.au", "ca": "zohocloud.ca"}
tld = tld_map.get(dc, "jp")
ACCOUNTS = "https://accounts.zoho.{}".format(tld)
API = "https://www.zohoapis.{}".format(tld)
ORG = os.getenv("ZOHO_ORG_ID")

# Token
r = requests.post("{}/oauth/v2/token".format(ACCOUNTS), data={
    "client_id": os.getenv("ZOHO_CLIENT_ID"),
    "client_secret": os.getenv("ZOHO_CLIENT_SECRET"),
    "grant_type": "client_credentials",
    "scope": "ZohoCRM.modules.ALL",
    "soid": "ZohoCRM.{}".format(ORG),
})
tok = r.json()
if "access_token" not in tok:
    print("Token error:", tok)
    sys.exit(1)
TOKEN = tok["access_token"]
HEADERS = {"Authorization": "Zoho-oauthtoken {}".format(TOKEN), "Content-Type": "application/json"}

def get_records(module):
    r = requests.get("{}/crm/v6/{}".format(API, module),
                     params={"fields": "Name,id", "per_page": 200},
                     headers=HEADERS)
    if r.status_code == 200 and "data" in r.json():
        return r.json()["data"]
    return []

def update_records(module, records):
    r = requests.put("{}/crm/v6/{}".format(API, module),
                     headers=HEADERS,
                     json={"data": records})
    return r.status_code, r.json()

# ====== 求職者テストデータ（充実版） ======
JOBSEEKER_DATA = {
    "田中太郎": {
        "Skills": "Python, AWS, Docker, Kubernetes, PostgreSQL, FastAPI, Terraform",
        "Experience_Years": 5,
        "Desired_Position": "バックエンドエンジニア",
        "Desired_Location": "東京",
        "Desired_Salary": 600,
        "Self_PR": "Webアプリケーション開発を5年間経験。AWSでのインフラ構築からアプリ開発まで一貫して担当。スタートアップでの0→1開発が得意で、FastAPIとDockerによるマイクロサービス構築の実績多数。チームリーダーとして5名のチームを率いた経験あり。"
    },
    "佐藤花子": {
        "Skills": "JavaScript, React, TypeScript, Node.js, Next.js, Figma, CSS/Tailwind",
        "Experience_Years": 3,
        "Desired_Position": "フロントエンドエンジニア",
        "Desired_Location": "東京（リモート可）",
        "Desired_Salary": 500,
        "Self_PR": "モダンなフロントエンド開発に情熱を持つエンジニア。React/Next.jsを使ったSPA開発が専門。UI/UXにも強い関心があり、Figmaでのプロトタイピングからコーディングまで対応可能。アクセシビリティを考慮した実装が得意。"
    },
    "鈴木一郎": {
        "Skills": "Java, Spring Boot, MySQL, AWS, チームマネジメント, システム設計, CI/CD",
        "Experience_Years": 7,
        "Desired_Position": "テックリード",
        "Desired_Location": "大阪",
        "Desired_Salary": 800,
        "Self_PR": "大規模基幹システムの設計・開発経験が豊富。Spring Bootを中心としたJavaバックエンドのアーキテクチャ設計を得意とし、年間100万PVのECサイトをリード。8名チームのマネジメント経験あり。技術選定からコードレビューまで幅広く対応。"
    },
}

# ====== 求人テストデータ（充実版） ======
JOB_DATA = {
    "シニアバックエンドエンジニア": {
        "Required_Skills": "Python, AWS, Kubernetes, Docker, マイクロサービス設計",
        "Required_Experience": 3,
        "Position": "バックエンドエンジニア",
        "Location": "東京（フルリモート可）",
        "Salary_Min": 500,
        "Salary_Max": 800,
        "Description": "自社SaaSプロダクトのバックエンド開発をリードしていただきます。PythonとAWSを中心としたマイクロサービスアーキテクチャで、年間売上30億円規模のプロダクトを支えるインフラ・API開発。コードレビュー文化があり、技術的チャレンジを歓迎する環境です。"
    },
    "フロントエンドエンジニア": {
        "Required_Skills": "React, TypeScript, Next.js, テスト設計, UI/UX設計",
        "Required_Experience": 2,
        "Position": "フロントエンドエンジニア",
        "Location": "東京（週2出社）",
        "Salary_Min": 400,
        "Salary_Max": 600,
        "Description": "新規プロダクトのフロントエンド開発を担当。ユーザー体験を重視した開発ができる方を募集。デザイナーと密に連携しながら、React/TypeScriptでモダンなUIを構築。Storybookでのコンポーネント管理やE2Eテストの整備にも関われます。"
    },
    "テックリード / エンジニアリングマネージャー": {
        "Required_Skills": "Java, Spring Boot, マネジメント経験3年以上, システム設計, AWS/GCP",
        "Required_Experience": 5,
        "Position": "テックリード / EM",
        "Location": "大阪（週2出社）",
        "Salary_Min": 700,
        "Salary_Max": 1000,
        "Description": "エンジニアチーム（5-8名）のリードと技術戦略の立案を担当。大規模トラフィックを処理するバックエンドの設計・レビュー、メンバーの成長支援、採用活動への参加が主な業務。経営層との技術的な意思決定にも関与できるポジションです。"
    },
}


# ====== 実行 ======
print("=== 既存レコード更新 ===")
print("環境:", _env_name or "default")
print("組織ID:", ORG)

# JobSeekers 更新
print("\n--- JobSeekers ---")
existing_js = get_records("JobSeekers")
print("既存レコード: {}件".format(len(existing_js)))
updates_js = []
for rec in existing_js:
    name = rec.get("Name", "")
    if name in JOBSEEKER_DATA:
        upd = {"id": rec["id"]}
        upd.update(JOBSEEKER_DATA[name])
        updates_js.append(upd)
        print("  更新予定: {} (id={})".format(name, rec["id"]))

if updates_js:
    status, result = update_records("JobSeekers", updates_js)
    print("  結果: status={} data={}".format(
        status,
        json.dumps(result, ensure_ascii=False, indent=2)[:1000]
    ))
else:
    print("  更新対象なし（名前不一致）")

# Jobs 更新
print("\n--- Jobs ---")
existing_jobs = get_records("Jobs")
print("既存レコード: {}件".format(len(existing_jobs)))
updates_j = []
for rec in existing_jobs:
    name = rec.get("Name", "")
    if name in JOB_DATA:
        upd = {"id": rec["id"]}
        upd.update(JOB_DATA[name])
        updates_j.append(upd)
        print("  更新予定: {} (id={})".format(name, rec["id"]))

if updates_j:
    status, result = update_records("Jobs", updates_j)
    print("  結果: status={} data={}".format(
        status,
        json.dumps(result, ensure_ascii=False, indent=2)[:1000]
    ))
else:
    print("  更新対象なし（名前不一致）")

# 更新後の確認
print("\n=== 更新後確認 ===")
for mod, fields in [
    ("JobSeekers", "Name,Skills,Experience_Years,Desired_Position,Desired_Location,Desired_Salary,Self_PR"),
    ("Jobs", "Name,Required_Skills,Required_Experience,Position,Location,Salary_Min,Salary_Max,Description"),
]:
    print("\n--- {} ---".format(mod))
    r = requests.get("{}/crm/v6/{}".format(API, mod),
                     params={"fields": fields, "per_page": 10},
                     headers=HEADERS)
    if r.status_code == 200 and "data" in r.json():
        for rec in r.json()["data"]:
            print(json.dumps(rec, ensure_ascii=False, indent=2))
            print("---")
    else:
        print("  取得失敗:", r.status_code, r.text[:300])
