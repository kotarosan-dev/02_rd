import os, requests, json
from pathlib import Path

env_path = Path(__file__).parent.parent.parent / "03_実装" / "config" / ".env.demo3"
for line in env_path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        os.environ[k] = v

dc = os.getenv("ZOHO_DC", "jp").lower()
tld_map = {"jp": "jp", "us": "com", "eu": "eu", "in": "in", "au": "com.au", "ca": "zohocloud.ca"}
tld = tld_map.get(dc, "jp")
accounts = "https://accounts.zoho.{}".format(tld)
api = "https://www.zohoapis.{}".format(tld)
org = os.getenv("ZOHO_ORG_ID")

r = requests.post("{}/oauth/v2/token".format(accounts), data={
    "client_id": os.getenv("ZOHO_CLIENT_ID"),
    "client_secret": os.getenv("ZOHO_CLIENT_SECRET"),
    "grant_type": "client_credentials",
    "scope": "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL",
    "soid": "ZohoCRM.{}".format(org),
})
token = r.json()["access_token"]
headers = {"Authorization": "Zoho-oauthtoken {}".format(token)}

# Get modules list
r2 = requests.get("{}/crm/v8/settings/modules".format(api), headers=headers)
print("Modules status:", r2.status_code)
modules = r2.json().get("modules", [])
custom = [m for m in modules if m.get("api_name") in ["JobSeekers", "Jobs"]]
for m in custom:
    print("  {} id={} plural={} singular={}".format(
        m.get("api_name"), m.get("id"), m.get("plural_label"), m.get("singular_label")))

# Direct record fetch
print("\n--- Direct record fetch: JobSeekers/12343000002120039 ---")
r3 = requests.get("{}/crm/v8/JobSeekers/12343000002120039".format(api), headers=headers)
print("Status:", r3.status_code)
resp3 = r3.json()
if "data" in resp3:
    for rec in resp3["data"]:
        filtered = {k: v for k, v in rec.items()
                    if not k.startswith("$") and k not in [
                        "Owner", "Created_By", "Modified_By", "Created_Time", "Modified_Time",
                        "Last_Activity_Time", "Currency", "Exchange_Rate", "Email_Opt_Out",
                        "Tag", "Unsubscribed_Mode", "Unsubscribed_Time", "Locked__s",
                        "Record_Image", "Record_Status__s"]}
        print(json.dumps(filtered, ensure_ascii=False, indent=2))
else:
    print(json.dumps(resp3, ensure_ascii=False, indent=2))

# List all records v6 with fields
print("\n--- v6 JobSeekers (fields) ---")
r4 = requests.get("{}/crm/v6/JobSeekers".format(api),
                   params={"fields": "Name,Skills,Experience_Years,Desired_Position,Desired_Location,Desired_Salary,Self_PR"},
                   headers=headers)
print("Status:", r4.status_code)
resp4 = r4.json()
if "data" in resp4:
    for rec in resp4["data"]:
        print(json.dumps(rec, ensure_ascii=False, indent=2))
else:
    print(json.dumps(resp4, ensure_ascii=False, indent=2))

# List all records v6 Jobs with fields
print("\n--- v6 Jobs (fields) ---")
r5 = requests.get("{}/crm/v6/Jobs".format(api),
                   params={"fields": "Name,Position,Description,Location,Required_Skills,Required_Experience,Salary_Min,Salary_Max"},
                   headers=headers)
print("Status:", r5.status_code)
resp5 = r5.json()
if "data" in resp5:
    for rec in resp5["data"]:
        print(json.dumps(rec, ensure_ascii=False, indent=2))
else:
    print(json.dumps(resp5, ensure_ascii=False, indent=2))
