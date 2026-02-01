"""
CRM×AI Matching PoC - CRMモジュールセットアップスクリプト
JobSeekers（求職者）とJobs（求人）モジュールを作成
"""

import os
import sys
import requests
import json
from pathlib import Path

# .envファイルを読み込む
env_path = Path(__file__).parent.parent.parent / "03_実装" / "config" / ".env"
if env_path.exists():
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# 設定
ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_ORG_ID = os.getenv("ZOHO_ORG_ID")
ZOHO_ACCOUNTS_URL = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.jp")
ZOHO_API_DOMAIN = os.getenv("ZOHO_API_DOMAIN", "https://www.zohoapis.jp")


def get_access_token():
    """Client Credentials FlowでAccess Tokenを取得"""
    print("=== Access Token取得中... ===")
    
    url = f"{ZOHO_ACCOUNTS_URL}/oauth/v2/token"
    params = {
        "client_id": ZOHO_CLIENT_ID,
        "client_secret": ZOHO_CLIENT_SECRET,
        "grant_type": "client_credentials",
        "scope": "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCRM.coql.READ",
        "soid": f"ZohoCRM.{ZOHO_ORG_ID}"
    }
    
    response = requests.post(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if "access_token" in data:
            print(f"✅ Access Token取得成功")
            print(f"   API Domain: {data.get('api_domain')}")
            print(f"   有効期限: {data.get('expires_in')}秒")
            return data["access_token"]
        else:
            print(f"❌ エラー: {data}")
            return None
    else:
        print(f"❌ HTTPエラー: {response.status_code}")
        print(response.text)
        return None


def get_existing_modules(access_token):
    """既存モジュール一覧を取得"""
    url = f"{ZOHO_API_DOMAIN}/crm/v6/settings/modules"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        modules = data.get("modules", [])
        return {m["api_name"]: m for m in modules}
    return {}


def create_module(access_token, module_data):
    """カスタムモジュールを作成"""
    url = f"{ZOHO_API_DOMAIN}/crm/v6/settings/modules"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json={"modules": [module_data]})
    return response.status_code, response.json()


def add_fields_to_module(access_token, module_api_name, fields):
    """モジュールにフィールドを追加"""
    url = f"{ZOHO_API_DOMAIN}/crm/v6/settings/fields?module={module_api_name}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json={"fields": fields})
    return response.status_code, response.json()


def create_test_records(access_token, module_api_name, records):
    """テストレコードを作成"""
    url = f"{ZOHO_API_DOMAIN}/crm/v6/{module_api_name}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json={"data": records})
    return response.status_code, response.json()


def main():
    print("=" * 60)
    print("CRM×AI Matching PoC - CRMモジュールセットアップ")
    print("=" * 60)
    
    # 設定確認
    if not all([ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_ORG_ID]):
        print("❌ 環境変数が設定されていません")
        print(f"   ZOHO_CLIENT_ID: {'✅' if ZOHO_CLIENT_ID else '❌'}")
        print(f"   ZOHO_CLIENT_SECRET: {'✅' if ZOHO_CLIENT_SECRET else '❌'}")
        print(f"   ZOHO_ORG_ID: {'✅' if ZOHO_ORG_ID else '❌'}")
        sys.exit(1)
    
    # Access Token取得
    access_token = get_access_token()
    if not access_token:
        print("❌ Access Token取得に失敗しました")
        sys.exit(1)
    
    # 既存モジュール確認
    print("\n=== 既存モジュール確認中... ===")
    existing_modules = get_existing_modules(access_token)
    print(f"   検出モジュール数: {len(existing_modules)}")
    
    # カスタムモジュール確認
    custom_modules = [m for m in existing_modules.values() if m.get("generated_type") == "custom"]
    print(f"   カスタムモジュール: {[m['api_name'] for m in custom_modules]}")
    
    # JobSeekersモジュール
    print("\n=== JobSeekers（求職者）モジュール ===")
    if "JobSeekers" in existing_modules:
        print("   ⏭️ 既に存在します - スキップ")
    else:
        print("   📝 作成を試みます...")
        jobseekers_module = {
            "singular_label": "求職者",
            "plural_label": "求職者",
            "api_name": "JobSeekers"
        }
        status, result = create_module(access_token, jobseekers_module)
        if status in [200, 201]:
            print(f"   ✅ 作成成功")
        else:
            print(f"   ⚠️ 結果: {status} - {result}")
    
    # Jobsモジュール
    print("\n=== Jobs（求人）モジュール ===")
    if "Jobs" in existing_modules:
        print("   ⏭️ 既に存在します - スキップ")
    else:
        print("   📝 作成を試みます...")
        jobs_module = {
            "singular_label": "求人",
            "plural_label": "求人",
            "api_name": "Jobs"
        }
        status, result = create_module(access_token, jobs_module)
        if status in [200, 201]:
            print(f"   ✅ 作成成功")
        else:
            print(f"   ⚠️ 結果: {status} - {result}")
    
    # テストレコード作成
    print("\n=== テストレコード作成 ===")
    
    # 求職者テストデータ
    jobseeker_records = [
        {
            "Name": "田中太郎",
            "Skills": "Python, AWS, Docker, Kubernetes",
            "Experience_Years": 5,
            "Desired_Position": "バックエンドエンジニア",
            "Desired_Location": "東京",
            "Desired_Salary": 600,
            "Self_PR": "Webアプリケーション開発を5年間経験。スタートアップでの0→1開発が得意です。チームリーダー経験もあります。"
        },
        {
            "Name": "佐藤花子",
            "Skills": "JavaScript, React, TypeScript, Node.js",
            "Experience_Years": 3,
            "Desired_Position": "フロントエンドエンジニア",
            "Desired_Location": "東京（リモート可）",
            "Desired_Salary": 500,
            "Self_PR": "モダンなフロントエンド開発に情熱を持っています。UI/UXにも強い関心があります。"
        },
        {
            "Name": "鈴木一郎",
            "Skills": "Java, Spring Boot, MySQL, AWS",
            "Experience_Years": 7,
            "Desired_Position": "テックリード",
            "Desired_Location": "大阪",
            "Desired_Salary": 800,
            "Self_PR": "大規模システムの設計・開発経験が豊富。チームマネジメントも得意です。"
        }
    ]
    
    # 求人テストデータ
    job_records = [
        {
            "Name": "シニアバックエンドエンジニア",
            "Required_Skills": "Python, AWS, Kubernetes",
            "Required_Experience": 3,
            "Position": "バックエンドエンジニア",
            "Location": "東京（リモート可）",
            "Salary_Min": 500,
            "Salary_Max": 800,
            "Description": "自社SaaSプロダクトのバックエンド開発をリードしていただきます。マイクロサービスアーキテクチャでの開発経験を活かせます。"
        },
        {
            "Name": "フロントエンドエンジニア",
            "Required_Skills": "React, TypeScript, Next.js",
            "Required_Experience": 2,
            "Position": "フロントエンドエンジニア",
            "Location": "東京",
            "Salary_Min": 400,
            "Salary_Max": 600,
            "Description": "新規プロダクトのフロントエンド開発を担当。ユーザー体験を重視した開発ができる方を募集。"
        },
        {
            "Name": "テックリード / エンジニアリングマネージャー",
            "Required_Skills": "Java, マネジメント経験, システム設計",
            "Required_Experience": 5,
            "Position": "テックリード",
            "Location": "大阪（週2出社）",
            "Salary_Min": 700,
            "Salary_Max": 1000,
            "Description": "エンジニアチーム（5-8名）のリードと技術戦略の立案を担当。"
        }
    ]
    
    # JobSeekersにレコード追加
    print("   求職者レコード作成中...")
    status, result = create_test_records(access_token, "JobSeekers", jobseeker_records)
    if status in [200, 201]:
        print(f"   ✅ 求職者 {len(jobseeker_records)}件 作成成功")
    else:
        print(f"   ⚠️ 結果: {status}")
        print(f"      {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")
    
    # Jobsにレコード追加
    print("   求人レコード作成中...")
    status, result = create_test_records(access_token, "Jobs", job_records)
    if status in [200, 201]:
        print(f"   ✅ 求人 {len(job_records)}件 作成成功")
    else:
        print(f"   ⚠️ 結果: {status}")
        print(f"      {json.dumps(result, indent=2, ensure_ascii=False)[:500]}")
    
    print("\n" + "=" * 60)
    print("セットアップ完了")
    print("=" * 60)
    print("\n次のステップ:")
    print("1. CRM画面でJobSeekersとJobsモジュールを確認")
    print("2. フィールドが不足している場合はGUIで追加")
    print("3. ウィジェットをアップロード")


if __name__ == "__main__":
    main()
