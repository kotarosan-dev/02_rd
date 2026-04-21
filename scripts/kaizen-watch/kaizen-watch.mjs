// Zoho CRM Kaizen Series 月次巡回スクリプト
//
// 公式ディレクトリ https://www.zoho.com/crm/developer/docs/kaizen-series-directory.html を取得し、
// 既知タイトルとの差分（新規 Kaizen 投稿）をレポートする。
// 既知タイトル一覧は ./known-kaizen.json に保存し、初回実行時にスナップショットを作成する。
//
// 使い方:
//   node scripts/kaizen-watch/kaizen-watch.mjs            # diff レポートを出す
//   node scripts/kaizen-watch/kaizen-watch.mjs --update   # 既知リストを最新に更新
//
// CRON 例（GitHub Actions / Windows タスクスケジューラ）:
//   月初 09:00 JST に node scripts/kaizen-watch/kaizen-watch.mjs > report.md

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWN_PATH = path.join(__dirname, 'known-kaizen.json');

const SOURCES = [
  // CRM Kaizen 公式 KB アーカイブ（カテゴリ別 / 年別）
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/api/articles/api-2026',
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/functions/articles/functions-2025',
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/queries/articles/kaizen-posts-2025-queries-series',
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/widgets',
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/client-script',
  'https://help.zoho.com/portal/en/kb/crm/kaizen-series-zoho-crm-developers/other-developer-tools/articles/kaizen-posts-2025-other-developer-tools',
  // Directory（HTML テーブル）
  'https://www.zoho.com/crm/developer/docs/kaizen-series-directory.html',
];

const TITLE_RE = /Kaizen\s*[#＃]?\s*(\d+)\s*[-–—:|]\s*([^<\n"]+?)(?=<|$|"|\n)/gi;

async function fetchTitles(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 kaizen-watch' },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const out = new Map(); // num -> title
    for (const m of html.matchAll(TITLE_RE)) {
      const num = m[1];
      const title = m[2].trim().replace(/\s+/g, ' ').slice(0, 200);
      if (title.length > 5) out.set(num, title);
    }
    return [...out.entries()].map(([num, title]) => ({ num, title, source: url }));
  } catch (e) {
    return [{ num: '?', title: `[ERROR fetching ${url}: ${e.message}]`, source: url }];
  }
}

async function loadKnown() {
  try {
    return JSON.parse(await fs.readFile(KNOWN_PATH, 'utf8'));
  } catch {
    return { snapshot_at: null, titles: {} };
  }
}

async function saveKnown(known) {
  await fs.mkdir(path.dirname(KNOWN_PATH), { recursive: true });
  await fs.writeFile(KNOWN_PATH, JSON.stringify(known, null, 2), 'utf8');
}

async function main() {
  const update = process.argv.includes('--update');
  const all = (await Promise.all(SOURCES.map(fetchTitles))).flat();
  const seen = new Map();
  for (const e of all) {
    if (!seen.has(e.num)) seen.set(e.num, e);
  }

  const known = await loadKnown();
  const knownNums = new Set(Object.keys(known.titles));
  const newOnes = [...seen.values()].filter((e) => e.num !== '?' && !knownNums.has(e.num));

  console.log('# Kaizen Watch Report');
  console.log(`- run_at: ${new Date().toISOString()}`);
  console.log(`- known_count: ${knownNums.size}`);
  console.log(`- fetched_count: ${seen.size}`);
  console.log(`- new_count: ${newOnes.length}`);

  if (newOnes.length === 0) {
    console.log('\n新規 Kaizen 投稿はありません。');
  } else {
    console.log('\n## 新規候補');
    for (const e of newOnes.sort((a, b) => Number(a.num) - Number(b.num))) {
      console.log(`- #${e.num}: ${e.title}`);
    }
    console.log('\n## アクション');
    console.log('- 内容を読み、既存スキル群（zoho-crm-* / zoho-setup / zoho-harness 等）に取り込めるか判定');
    console.log('- スキル化候補は `--update` 実行前に分類メモを残す');
  }

  if (update) {
    const titles = { ...known.titles };
    for (const e of seen.values()) if (e.num !== '?') titles[e.num] = e.title;
    await saveKnown({ snapshot_at: new Date().toISOString(), titles });
    console.log(`\nknown-kaizen.json を更新しました（${Object.keys(titles).length} 件）。`);
  } else {
    console.log('\n（差分を既知リストへ取り込むには `--update` を付けて再実行）');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
