"""
CRM×AI Matching PoC - CRMモジュールセットアップスクリプト
JobSeekers（求職者）とJobs（求人）モジュールを作成
環境を分離: デフォルトは .env、demo3 向けは --env demo3 で .env.demo3 を読み込む。
"""

import os
import sys
import requests
import json
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent.parent / "03_実装" / "config"

# 環境の切り替え: --env demo3 なら .env.demo3、それ以外は .env
_env_name = None
if "--env" in sys.argv:
    i = sys.argv.index("--env")
    if i + 1 < len(sys.argv):
        _env_name = sys.argv[i + 1].strip().lower()
_env_file = ".env.demo3" if _env_name == "demo3" else ".env"
env_path = CONFIG_DIR / _env_file

if env_path.exists():
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
else:
    if _env_name == "demo3":
        print(f"エラー: demo3 用の設定ファイルがありません: {env_path}")
        print("  03_実装/config/.env.demo3.example をコピーして .env.demo3 を作成し、Client ID / Secret / 組織ID を記入してください。")
        sys.exit(1)

# ZOHO_DC から URL を導出（スキルと同じ TLD マッピング）
_dc = (os.getenv("ZOHO_DC") or os.getenv("ZOHO_DATA_CENTER") or "jp").lower()
_tld_map = {"jp": "jp", "us": "com", "eu": "eu", "in": "in", "au": "com.au", "ca": "zohocloud.ca"}
_tld = _tld_map.get(_dc, "jp")
if not os.getenv("ZOHO_ACCOUNTS_URL"):
    os.environ["ZOHO_ACCOUNTS_URL"] = f"https://accounts.zoho.{_tld}"
if not os.getenv("ZOHO_API_DOMAIN"):
    os.environ["ZOHO_API_DOMAIN"] = f"https://www.zohoapis.{_tld}"

# 設定
ZOHO_CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
ZOHO_CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
ZOHO_ORG_ID = os.getenv("ZOHO_ORG_ID")
ZOHO_ACCOUNTS_URL = os.getenv("ZOHO_ACCOUNTS_URL")
ZOHO_API_DOMAIN = os.getenv("ZOHO_API_DOMAIN")


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


CRM_API_VERSION = "v8"


def get_existing_modules(access_token):
    """既存モジュール一覧を取得（API v8）"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/settings/modules"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        modules = data.get("modules", [])
        return {m["api_name"]: m for m in modules}
    return {}


def get_existing_fields(access_token, module_api_name):
    """モジュールの既存フィールド一覧を取得（API v8）。[{ api_name, field_label }] を返す。"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/settings/fields"
    params = {"module": module_api_name}
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    
    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        return []
    data = response.json()
    fields = data.get("fields", [])
    return [
        {"api_name": f.get("api_name"), "field_label": f.get("field_label") or f.get("display_label") or ""}
        for f in fields
        if f.get("api_name")
    ]


def get_profiles(access_token):
    """プロファイル一覧を取得（API v8）。モジュール作成時に profiles 必須のため使用。"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/settings/profiles"
    headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return []
    data = response.json()
    return data.get("profiles", [])


def create_module(access_token, module_data):
    """カスタムモジュールを作成（API v8）。module_data に profiles と display_field 必須。"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/settings/modules"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, json={"modules": [module_data]})
    return response.status_code, response.json()


def create_field_payload(field_label, data_type, **kwargs):
    """v8 用フィールド作成用の1件オブジェクトを組み立てる。"""
    payload = {"field_label": field_label, "data_type": data_type}
    if data_type == "textarea":
        payload["textarea"] = kwargs.get("textarea", {"type": "small"})
        payload["length"] = kwargs.get("length", 2000)
    elif data_type == "text":
        payload["length"] = kwargs.get("length", 255)
    return payload


def add_fields_to_module(access_token, module_api_name, fields):
    """モジュールにフィールドを追加（API v8）"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/settings/fields"
    params = {"module": module_api_name}
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, headers=headers, params=params, json={"fields": fields})
    return response.status_code, response.json()


def create_test_records(access_token, module_api_name, records):
    """テストレコードを作成（API v8）"""
    url = f"{ZOHO_API_DOMAIN}/crm/{CRM_API_VERSION}/{module_api_name}"
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
    env_label = "demo3 (.env.demo3)" if _env_name == "demo3" else "デフォルト (.env)"
    print(f"環境: {env_label}")
    print(f"対象組織 ID (soid): {ZOHO_ORG_ID or '(未設定)'}")
    print(f"API Domain: {ZOHO_API_DOMAIN}")
    print()
    
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
    
    # プロファイル取得（モジュール作成時に profiles 必須のため）
    profiles = get_profiles(access_token)
    profile_ids = [p["id"] for p in profiles if p.get("id")]
    if not profile_ids:
        print("❌ プロファイルを取得できませんでした（モジュール作成に1件以上必要）")
        sys.exit(1)
    profile_id_for_module = profile_ids[0]
    
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
        print("   既に存在します - スキップ")
    else:
        print("   作成を試みます...")
        jobseekers_module = {
            "singular_label": "求職者",
            "plural_label": "求職者",
            "api_name": "JobSeekers",
            "profiles": [{"id": profile_id_for_module}],
            "display_field": {"field_label": "氏名", "data_type": "text"},
        }
        status, result = create_module(access_token, jobseekers_module)
        if status in [200, 201]:
            print(f"   作成成功")
        else:
            print(f"   結果: {status} - {result}")
    
    # Jobsモジュール
    print("\n=== Jobs（求人）モジュール ===")
    if "Jobs" in existing_modules:
        print("   既に存在します - スキップ")
    else:
        print("   作成を試みます...")
        jobs_module = {
            "singular_label": "求人",
            "plural_label": "求人",
            "api_name": "Jobs",
            "profiles": [{"id": profile_id_for_module}],
            "display_field": {"field_label": "求人タイトル", "data_type": "text"},
        }
        status, result = create_module(access_token, jobs_module)
        if status in [200, 201]:
            print(f"   作成成功")
        else:
            print(f"   結果: {status} - {result}")
    
    # フィールド定義（setup-guide 準拠。api_name は Zoho が field_label から自動生成する想定）
    # JobSeekers: 氏名=Name(標準), スキル, 経験年数, 希望職種, 希望勤務地, 希望年収, 自己PR
    JOBSEEKERS_FIELDS = [
        ("Skills", "スキル", "textarea", {}),
        ("Experience_Years", "経験年数", "integer", {}),
        ("Desired_Position", "希望職種", "text", {"length": 255}),
        ("Desired_Location", "希望勤務地", "text", {"length": 255}),
        ("Desired_Salary", "希望年収", "integer", {}),
        ("Self_PR", "自己PR", "textarea", {}),
    ]
    # Jobs: 求人タイトル=Name(標準), 必要スキル, 必要経験年数, 職種, 勤務地, 年収下限, 年収上限, 仕事内容
    JOBS_FIELDS = [
        ("Required_Skills", "必要スキル", "textarea", {}),
        ("Required_Experience", "必要経験年数", "integer", {}),
        ("Position", "職種", "text", {"length": 255}),
        ("Location", "勤務地", "text", {"length": 255}),
        ("Salary_Min", "年収下限", "integer", {}),
        ("Salary_Max", "年収上限", "integer", {}),
        ("Description", "仕事内容", "textarea", {}),
    ]
    
    def ensure_module_fields(access_token, module_api_name, field_specs, module_label):
        existing = get_existing_fields(access_token, module_api_name)
        existing_api = {e["api_name"] for e in existing}
        existing_labels = {e.get("field_label", "").strip() for e in existing}
        to_create = [
            spec for spec in field_specs
            if spec[0] not in existing_api and spec[1] not in existing_labels
        ]
        if not to_create:
            print(f"   フィールドは全て揃っています - スキップ")
            return
        print(f"   不足フィールド {len(to_create)} 件を追加します...")
        for api_name, field_label, data_type, opts in to_create:
            payload = create_field_payload(field_label, data_type, **opts)
            status, result = add_fields_to_module(access_token, module_api_name, [payload])
            if status in [200, 201] and result.get("fields") and result["fields"][0].get("status") == "success":
                print(f"     {field_label} ({api_name}) 追加OK")
            else:
                print(f"     {field_label}: {status} - {result}")
    
    print("\n=== JobSeekers フィールド（項目）===")
    ensure_module_fields(access_token, "JobSeekers", JOBSEEKERS_FIELDS, "求職者")
    
    print("\n=== Jobs フィールド（項目）===")
    ensure_module_fields(access_token, "Jobs", JOBS_FIELDS, "求人")
    
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
    print("1. CRM画面でJobSeekersとJobsモジュール・フィールドを確認")
    print("2. 関連リストにウィジェット「おすすめ求人」「おすすめ候補者」を配置")
    print("3. ウィジェットをアップロード（zet pack → CRM に ZIP アップロード）")


if __name__ == "__main__":
    main()
