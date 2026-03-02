#!/usr/bin/env node
/**
 * Zoho Learn API クライアント（LMS: コース・レッスン・メンバー・レポート）
 *
 * .env 必須:
 *   ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET
 *   ZOHO_LEARN_REFRESH_TOKEN  ← Authorization Code フローで取得（Client Credentials は9007エラー）
 *
 * .env 任意:
 *   ZOHO_DC / ZOHO_DATA_CENTER（デフォルト: jp）
 *   ZOHO_LEARN_PORTAL_URL（ポータルURL）
 *
 * Refresh Token の取得方法:
 *   node get-tokens.mjs <grant_code>
 *   grant_code は https://accounts.zoho.jp/developerconsole → Self Client で取得
 */

import 'dotenv/config';

const DC = (process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp').toLowerCase();
const TLD_MAP = { jp: 'jp', us: 'com', eu: 'eu', in: 'in', au: 'com.au', ca: 'zohocloud.ca' };
const TLD = TLD_MAP[DC] || 'jp';

export const ACCOUNTS_URL = `https://accounts.zoho.${TLD}`;
export const LEARN_BASE = `https://learn.zoho.${TLD}/learn/api/v1`;

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Access Token 取得。
 * ZOHO_LEARN_REFRESH_TOKEN がある場合は Refresh Token フローを優先。
 * ない場合は Client Credentials フロー（ポータルAPIでは9007エラーになる可能性あり）。
 */
export async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const refreshToken = process.env.ZOHO_LEARN_REFRESH_TOKEN;
  if (refreshToken) {
    return _getTokenFromRefresh(refreshToken);
  }
  return _getTokenFromClientCredentials();
}

async function _getTokenFromRefresh(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json();
  if (data.error) throw new Error(`Refresh Token Error: ${data.error}. ZOHO_LEARN_REFRESH_TOKEN が無効または期限切れです。get-tokens.mjs で再取得してください。`);
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
  return cachedToken;
}

async function _getTokenFromClientCredentials() {
  const orgId = process.env.ZOHO_ORG_ID;
  if (!orgId) throw new Error('ZOHO_ORG_ID is required');
  const scope = [
    'ZohoLearn.course.READ', 'ZohoLearn.course.CREATE', 'ZohoLearn.course.UPDATE',
    'ZohoLearn.lesson.CREATE', 'ZohoLearn.lesson.UPDATE',
    'ZohoLearn.questionbank.CREATE', 'ZohoLearn.questionbank.UPDATE',
    'ZohoLearn.hubMember.CREATE', 'ZohoLearn.customportal.UPDATE',
  ].join(',');
  const params = new URLSearchParams({
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope,
    soid: `ZohoLearn.${orgId}`,
  });
  const res = await fetch(`${ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token Error: ${data.error}`);
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
  return cachedToken;
}

export function clearTokenCache() {
  cachedToken = null;
  tokenExpiry = 0;
}

export const DEFAULT_PORTAL_URL = process.env.ZOHO_LEARN_PORTAL_URL || '';

/**
 * ポータルベースURLを返す
 */
export function getPortalBase(portalUrl) {
  return `${LEARN_BASE}/portal/${encodeURIComponent(portalUrl)}`;
}

/**
 * 認証付きで Learn API を呼ぶ
 */
async function learnFetch(portalUrl, path, options = {}) {
  const token = await getAccessToken();
  const base = getPortalBase(portalUrl);
  const url = path.startsWith('http') ? path : `${base}/${path.replace(/^\//, '')}`;
  const headers = {
    Authorization: `Zoho-oauthtoken ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { _raw: text };
  }
  if (!res.ok) {
    const err = new Error(body.message || body.error || res.statusText);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/**
 * コース一覧取得
 */
export async function listCourses(portalUrl, opts = {}) {
  const params = new URLSearchParams();
  if (opts.pageIndex != null) params.set('pageIndex', String(opts.pageIndex));
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.sortBy) params.set('sortBy', opts.sortBy);
  if (opts.view) params.set('view', opts.view);
  const qs = params.toString();
  return learnFetch(portalUrl, `course${qs ? `?${qs}` : ''}`, { method: 'GET' });
}

/**
 * コース詳細取得（course.url で指定）
 */
export async function getCourseByUrl(portalUrl, courseUrl) {
  return learnFetch(portalUrl, `course?course.url=${encodeURIComponent(courseUrl)}`, { method: 'GET' });
}

/**
 * コース作成（実機: キーは name で送信。9007 = Invalid hub はポータル未作成 or 権限不足）
 */
export async function createCourse(portalUrl, name, _description = '') {
  const token = await getAccessToken();
  const base = getPortalBase(portalUrl);
  const url = `${base}/course`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    const err = new Error(data.reason || data.message || res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/**
 * レッスン作成
 */
export async function createLesson(portalUrl, courseId, name, type = 'TEXT') {
  return learnFetch(portalUrl, `course/${courseId}/lesson`, {
    method: 'POST',
    body: JSON.stringify({ name, type }),
  });
}

/**
 * コースにメンバー追加
 */
export async function addMembers(portalUrl, courseId, userIds, role = 'MEMBER') {
  return learnFetch(portalUrl, `course/${courseId}/member`, {
    method: 'POST',
    body: JSON.stringify({ userIds, role }),
  });
}

/**
 * コースレポート取得（レッスン別 or メンバー別）
 */
export async function getCourseStatus(portalUrl, courseId, isMemberView = false, opts = {}) {
  const params = new URLSearchParams({ isMemberView: String(isMemberView) });
  if (opts.pageIndex != null) params.set('pageIndex', String(opts.pageIndex));
  if (opts.filterBy) params.set('filterBy', opts.filterBy);
  const qs = params.toString();
  return learnFetch(portalUrl, `course/${courseId}/status?${qs}`, { method: 'GET' });
}
