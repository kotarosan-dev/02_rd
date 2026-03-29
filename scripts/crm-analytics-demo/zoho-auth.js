// zoho-auth.js - Zoho API 認証ヘルパー
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const DC = process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp';
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
const TLD = TLD_MAP[DC] || 'jp';

const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;
const API_DOMAIN   = `https://www.zohoapis.${TLD}`;
const ANALYTICS_BASE = `https://analyticsapi.zoho.${DC}`;

async function getAccessToken(serviceName, scope) {
  const params = new URLSearchParams({
    client_id:     process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type:    'client_credentials',
    scope,
    soid: `${serviceName}.${process.env.ZOHO_ORG_ID}`,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, { method: 'POST', body: params });
  const data = await res.json();
  if (data.error) throw new Error(`Token Error [${serviceName}]: ${data.error}`);
  return data.access_token;
}

module.exports = { getAccessToken, API_DOMAIN, ANALYTICS_BASE, ACCOUNTS_URL, DC, TLD };
