// Canvas API を 公式 OAuth Bearer で叩いて、scope 要否・本番運用可否を判定する。
// 内部API（Cookie+CSRF）と同じ URL を、公式 API ドメイン（www.zohoapis.{TLD}）と
// CRM ホスト（crm.zoho.{TLD}）の両方で試す。

const DC = (process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp').toLowerCase();
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
const TLD = TLD_MAP[DC] || 'jp';
const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;
const ORG_ID = process.env.ZOHO_ORG_ID;
const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET || !ORG_ID) {
  console.error('Missing ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_ORG_ID');
  process.exit(1);
}

const HOSTS = [
  `https://www.zohoapis.${TLD}`,
  `https://crm.zoho.${TLD}`,
];

const SCOPES = [
  'ZohoCRM.settings.ALL',
  'ZohoCRM.settings.canvas.ALL',
  'ZohoCRM.settings.canvas_views.ALL',
  'ZohoCRM.settings.layouts.ALL,ZohoCRM.settings.canvas.ALL',
];

async function getToken(scope) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
    soid: `ZohoCRM.${ORG_ID}`,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: params });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function probe(host, token) {
  const url = `${host}/crm/v8/settings/canvas/views?feature=HomeView`;
  const res = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await res.text();
  return { url, status: res.status, snippet: text.slice(0, 240) };
}

console.log(`DC=${DC}  ORG=${ORG_ID}\n`);

for (const scope of SCOPES) {
  console.log(`── scope = ${scope}`);
  const tok = await getToken(scope);
  if (tok.json?.access_token) {
    console.log(`   token: OK  (expires_in=${tok.json.expires_in})`);
    for (const h of HOSTS) {
      const r = await probe(h, tok.json.access_token);
      console.log(`   GET ${r.url}\n     -> ${r.status}  ${r.snippet}`);
    }
  } else {
    console.log(`   token: FAIL  status=${tok.status}  body=${tok.text}`);
  }
  console.log('');
}
