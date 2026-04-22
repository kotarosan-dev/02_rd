/**
 * SlyteUI ステータス制御 PoC 用のテスト Lead を作成する。
 *
 * 使い方:
 *   pnpm dlx @dotenvx/dotenvx run -- node scripts/slyteui-poc/create-lead.mjs
 *
 * 必要な .env:
 *   ZOHO_CLIENT_ID_DEMOETIKA3
 *   ZOHO_CLIENT_SECRET_DEMOETIKA3
 *   ZOHO_ORG_ID_DEMOETIKA3
 *   ZOHO_DATA_CENTER_DEMOETIKA3   ("jp" / "us" / "eu" 等)
 *
 * Lead_Status はデフォルトで "Contacted" を入れる（SlyteUI 側で Pre Qualified / Qualified
 * に手動変更してボタン出し分けを試す想定）。
 */

const TLD_MAP = { jp: "jp", us: "com", eu: "eu", in: "in", au: "com.au", ca: "zohocloud.ca" };

const CID    = process.env.ZOHO_CLIENT_ID_DEMOETIKA3;
const SECRET = process.env.ZOHO_CLIENT_SECRET_DEMOETIKA3;
const ORG    = process.env.ZOHO_ORG_ID_DEMOETIKA3;
const DC     = (process.env.ZOHO_DATA_CENTER_DEMOETIKA3 || "jp").toLowerCase();
const TLD    = TLD_MAP[DC] || "jp";

if (!CID || !SECRET || !ORG) {
  console.error("Missing demoetika3 credentials. Run via dotenvx run.");
  process.exit(1);
}

const ACCOUNTS = `https://accounts.zoho.${TLD}`;
const API      = `https://www.zohoapis.${TLD}`;

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id:     CID,
    client_secret: SECRET,
    grant_type:    "client_credentials",
    scope:         "ZohoCRM.modules.ALL,ZohoCRM.settings.ALL",
    soid:          `ZohoCRM.${ORG}`,
  });
  const res = await fetch(`${ACCOUNTS}/oauth/v2/token`, { method: "POST", body: params });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Token error: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function createLead(token) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const lead = {
    Last_Name:   `SlyteUI_PoC_${stamp}`,
    First_Name:  "テスト",
    Company:     "SlyteUI 検証用 株式会社",
    Email:       `slyteui-poc+${Date.now()}@example.com`,
    Phone:       "0312345678",
    Lead_Status: "Contacted",
    Lead_Source: "Internal Seminar",
    Industry:    "Technology",
    Description: "SlyteUI ステータス制御ボタンメニュー PoC のテスト用レコード。Lead_Status を手で変更して出し分けを確認する。",
  };

  const res = await fetch(`${API}/crm/v8/Leads`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: [lead], trigger: [] }),
  });
  const j = await res.json();
  if (!j.data?.[0] || j.data[0].status !== "success") {
    throw new Error(`Create error: ${JSON.stringify(j)}`);
  }
  return j.data[0].details;
}

async function fetchPicklistValues(token) {
  const res = await fetch(`${API}/crm/v8/settings/fields?module=Leads`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  const j = await res.json();
  const f = j.fields?.find((x) => x.api_name === "Lead_Status");
  return f?.pick_list_values?.map((v) => v.actual_value) ?? [];
}

const token = await getAccessToken();
console.log("✓ token acquired");

const created = await createLead(token);
console.log("✓ Lead created");
console.log("  ID         :", created.id);
console.log("  Created_By :", created.Created_By?.name);
console.log("  Created_At :", created.Created_Time);

const accountsBase = `https://crm.zoho.${TLD}`;
console.log("  URL        :", `${accountsBase}/crm/org${ORG}/tab/Leads/${created.id}`);

const statuses = await fetchPicklistValues(token);
console.log("\nLead_Status の picklist 値（SlyteUI で出し分けに使える）:");
for (const s of statuses) console.log("  -", s);
