import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getToken, getModules, getLayouts, getFields, canvas } from './lib/oauth.mjs';

try {
  const dx = await import('@dotenvx/dotenvx');
  const cfg = dx.config || dx.default?.config;
  cfg?.({ path: ['.env', '../.env'], quiet: true, overload: false });
} catch {
  // fallback to process.env only
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const DEFAULT_TEMPLATE = resolve(repoRoot, 'templates', 'canvas-skeleton', 'deals-detail-v1.json');

function parseArgs(argv) {
  const a = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      a.flags[k] = v;
    } else {
      a._.push(t);
    }
  }
  return a;
}

function clampInt(v, min = 0) {
  const n = Number(v);
  if (Number.isNaN(n) || !Number.isFinite(n)) return min;
  return Math.max(min, Math.round(n));
}

function parsePngSize(buf) {
  const signature = '89504e470d0a1a0a';
  if (buf.length < 24 || buf.slice(0, 8).toString('hex') !== signature) return null;
  if (buf.slice(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'png' };
}

function parseJpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return { width: w, height: h, format: 'jpeg' };
    }
    if (marker === 0xda || marker === 0xd9) break;
    const len = buf.readUInt16BE(i + 2);
    if (len <= 2) break;
    i += 2 + len;
  }
  return null;
}

function detectImageSize(buf) {
  return parsePngSize(buf) || parseJpegSize(buf) || null;
}

const DEFAULT_TEXTS = {
  hero_header: [
    { value: '商談詳細', x: 32, y: 24, w: 120, h: 24, font_size: '14px', color: '#ffffff' },
    { value: '基幹システム刷新プロジェクト', x: 32, y: 58, w: 360, h: 32, font_size: '22px', color: '#ffffff', font_family: 'r' },
    { value: 'フェーズ', x: 32, y: 112, w: 70, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
    { value: '確度', x: 190, y: 112, w: 70, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
    { value: '金額', x: 300, y: 112, w: 70, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
    { value: '予定完了日', x: 440, y: 112, w: 100, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
    { value: '取引先名', x: 590, y: 112, w: 90, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
    { value: '主担当者', x: 760, y: 112, w: 90, h: 18, font_size: '12px', color: 'rgba(255,255,255,0.75)' },
  ],
  pipeline_strip: [
    { value: '✓ ニーズの確認      ✓ 提案の検討      ▶ 提案・見積      ○ 交渉・調整      ○ 最終確認      ○ 受注', x: 24, y: 14, w: 710, h: 22, font_size: '13px', color: '#1f2937' },
  ],
  issues_card: [
    { value: '顧客課題', x: 18, y: 18, w: 120, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '・基幹システムの老朽化により運用コストが増大', x: 18, y: 58, w: 205, h: 22, font_size: '12px', color: '#374151' },
    { value: '・データ連携の手動作業により業務が分断', x: 18, y: 88, w: 205, h: 22, font_size: '12px', color: '#374151' },
    { value: '・レポート作成に時間がかかり意思決定が遅い', x: 18, y: 118, w: 205, h: 22, font_size: '12px', color: '#374151' },
  ],
  proposal_card: [
    { value: '提案内容', x: 18, y: 18, w: 120, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '・クラウドERPによる基幹システム刷新', x: 18, y: 58, w: 205, h: 22, font_size: '12px', color: '#374151' },
    { value: '・既存システムとのデータ連携をAPIで実現', x: 18, y: 88, w: 205, h: 22, font_size: '12px', color: '#374151' },
    { value: '・ダッシュボード機能で経営可視化を強化', x: 18, y: 118, w: 205, h: 22, font_size: '12px', color: '#374151' },
  ],
  risk_card: [
    { value: 'リスク', x: 18, y: 18, w: 120, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '● 高　競合A社が強い価格提案を実施中', x: 18, y: 58, w: 205, h: 22, font_size: '12px', color: '#dc2626' },
    { value: '● 中　予算承認が下期になる可能性', x: 18, y: 88, w: 205, h: 22, font_size: '12px', color: '#d97706' },
    { value: '● 低　IT部門のリソース確保が不透明', x: 18, y: 118, w: 205, h: 22, font_size: '12px', color: '#059669' },
  ],
  side_actions_top: [
    { value: 'メールを送信', x: 24, y: 18, w: 220, h: 26, font_size: '14px', color: '#ffffff', background_color: '#0b76f6', border_radius: '6px', align: 'center' },
    { value: '予定を作成    タスクを作成', x: 24, y: 56, w: 220, h: 22, font_size: '12px', color: '#374151' },
  ],
  tasks_panel: [
    { value: 'タスク（3）', x: 18, y: 18, w: 130, h: 24, font_size: '15px', color: '#111827', font_family: 'r' },
    { value: '□ 提案内容のレビュー会議\\n   2025/06/02 10:00\\n□ 見積書の提出\\n   2025/06/05\\n□ 稟議書のフォローアップ\\n   2025/06/10', x: 18, y: 54, w: 230, h: 140, font_size: '12px', color: '#374151' },
  ],
  next_actions_card: [
    { value: '次のアクション', x: 18, y: 18, w: 150, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '提案内容のレビュー会議（IT部長、経理部長）\\n2025/06/02（月）10:00 - 11:00\\n担当者：鈴木 健一', x: 18, y: 56, w: 205, h: 82, font_size: '12px', color: '#374151' },
    { value: 'タスクを作成', x: 18, y: 160, w: 86, h: 24, font_size: '12px', color: '#374151', border: '1px solid #d1d5db', border_radius: '4px', align: 'center' },
  ],
  activity_card: [
    { value: '活動履歴', x: 18, y: 18, w: 120, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '✉ 2025/05/28　メール送信\\n☎ 2025/05/26　訪問\\n☎ 2025/05/21　電話', x: 18, y: 56, w: 200, h: 100, font_size: '12px', color: '#374151' },
  ],
  stakeholders_card: [
    { value: '関係者', x: 18, y: 18, w: 120, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: '山田 太郎　決裁者\\n佐藤 花子　影響者\\n田中 一郎　推進者', x: 18, y: 56, w: 200, h: 100, font_size: '12px', color: '#374151' },
  ],
  related_summary_panel: [
    { value: '関連リスト', x: 18, y: 18, w: 120, h: 24, font_size: '15px', color: '#111827', font_family: 'r' },
    { value: '見積　　　　　　　　　3\\n提案書　　　　　　　　2\\n受注予定商品　　　　　3\\n活動履歴　　　　　　 12\\nメモ　　　　　　　　　1', x: 18, y: 58, w: 220, h: 130, font_size: '12px', color: '#374151' },
  ],
  quotes_board: [
    { value: '見積', x: 18, y: 18, w: 80, h: 24, font_size: '16px', color: '#111827', font_family: 'r' },
    { value: 'Q-202505-001　　　提出済み\\n有効期限　2025/06/15\\n金額　　　¥18,500,000\\n合計(税込) ¥20,350,000', x: 18, y: 62, w: 150, h: 120, font_size: '12px', color: '#374151', border: '1px solid #e5e7eb', border_radius: '6px' },
    { value: 'Q-202504-002　　　下書き\\n有効期限　2025/05/31\\n金額　　　¥17,200,000\\n合計(税込) ¥18,920,000', x: 184, y: 62, w: 150, h: 120, font_size: '12px', color: '#374151', border: '1px solid #e5e7eb', border_radius: '6px' },
    { value: 'Q-202504-001　　　却下\\n有効期限　2025/05/15\\n金額　　　¥16,000,000\\n合計(税込) ¥17,600,000', x: 350, y: 62, w: 150, h: 120, font_size: '12px', color: '#374151', border: '1px solid #e5e7eb', border_radius: '6px' },
  ],
  products_board: [
    { value: '主な商品・サービス（3件）', x: 18, y: 18, w: 180, h: 24, font_size: '15px', color: '#111827', font_family: 'r' },
    { value: 'クラウドERPライセンス　¥12,000,000\\nデータ連携オプション　¥2,500,000\\n導入支援サービス　　　¥4,000,000\\n\\n合計　　　　　　　　 ¥18,500,000', x: 18, y: 58, w: 180, h: 150, font_size: '12px', color: '#374151' },
  ],
  deal_info_panel: [
    { value: '商談情報', x: 18, y: 18, w: 120, h: 24, font_size: '15px', color: '#111827', font_family: 'r' },
    { value: '商談所有者　鈴木 健一\\n作成日時　2025/04/15 14:32\\n最終更新　2025/05/28 16:45\\nソース　　紹介\\nキャンペーン　展示会_2025春', x: 18, y: 58, w: 220, h: 130, font_size: '12px', color: '#374151' },
  ],
};

function makeStaticTextNode(t, scale, sectionPosition) {
  const x = clampInt((sectionPosition.start_x || 0) + t.x * scale.sx);
  const y = clampInt((sectionPosition.start_y || 0) + t.y * scale.sy);
  const w = clampInt(t.w * scale.sx, 1);
  const h = clampInt(t.h * scale.sy, 1);
  const style = {
    background_color: t.background_color || 'transparent',
    color: t.color || '#111827',
    font_size: t.font_size || '12px',
    ...(t.font_family ? { font_family: t.font_family } : {}),
    ...(t.border ? { border: t.border } : {}),
    ...(t.border_radius ? { border_radius: t.border_radius } : {}),
  };
  return {
    ui: {
      autoheight: false,
      value: {
        style: { default: style },
        custom_style: {},
        position: { start_x: x, start_y: y, end_x: x + w, width: w, height: h, depth: 1 },
        class: `zc_disabled${t.align === 'center' ? ' zc-ta-center' : ''}`,
        value: t.value,
      },
    },
    children: [],
    theme: 'Static Text',
    type: 'component',
  };
}

function buildCanvasPayload(template, opts) {
  const baseW = template.canvas.base_width;
  const baseH = template.canvas.base_height;
  const targetW = clampInt(opts.canvasWidth || baseW, baseW);
  const imageAspect = opts.imageHeight > 0 ? opts.imageWidth / opts.imageHeight : baseW / baseH;
  const targetH = clampInt(targetW / imageAspect, baseH);

  const sx = targetW / baseW;
  const sy = targetH / baseH;

  const children = template.sections.map((s) => {
    const x = clampInt(s.x * sx);
    const y = clampInt(s.y * sy);
    const w = clampInt(s.w * sx, 1);
    const h = clampInt(s.h * sy, 1);
    const position = {
      start_x: x,
      start_y: y,
      end_x: x + w,
      width: w,
      height: h,
      depth: 1,
    };
    const staticTexts = s.texts || DEFAULT_TEXTS[s.id] || [];
    return {
      type: 'component',
      theme: 'Custom Layout',
      ui: {
        value: {
          style: { default: s.style || {} },
          custom_style: {},
          position,
          class: s.class || 'zc-lsection',
          zcode: { name: s.id },
        },
      },
      children: staticTexts.map((t) => makeStaticTextNode(t, { sx, sy }, position)),
    };
  });

  return {
    canvas_view: [
      {
        name: opts.name,
        ui: {
          value: {
            style: { default: {} },
            custom_style: {},
            position: { start_x: 0, start_y: 0, end_x: targetW, width: targetW, height: targetH, depth: 1 },
            class: '',
          },
          canvas_rules: [],
          script_info: { mapping: {}, deleted: [] },
        },
        feature: template.canvas.feature,
        module: {
          id: opts.moduleId || '',
          api_name: opts.moduleApi,
        },
        layout: {
          id: opts.layoutId || '',
          name: opts.layoutName,
        },
        children,
        action: 'create',
        related_to: { data_hub_associations: null, lookup_associations: null, homepage_associations: [] },
      },
    ],
  };
}

function crmDatatype(field) {
  if (!field) return 'text';
  if (field.data_type === 'lookup') return 'lookup';
  if (field.data_type === 'ownerlookup') return 'lookup';
  if (field.data_type === 'currency') return 'currency';
  if (field.data_type === 'percent') return 'percent';
  if (field.data_type === 'date') return 'date';
  if (field.data_type === 'datetime') return 'datetime';
  if (field.data_type === 'textarea') return 'textarea';
  if (field.data_type === 'picklist') return 'picklist';
  return 'text';
}

function makeFieldNode(binding, field, scale, sectionPosition) {
  const x = clampInt((sectionPosition.start_x || 0) + binding.x * scale.sx);
  const y = clampInt((sectionPosition.start_y || 0) + binding.y * scale.sy);
  const w = clampInt(binding.w * scale.sx, 1);
  const h = clampInt(binding.h * scale.sy, 1);
  return {
    ui: {
      field: {
        style: { default: binding.field_style || {} },
        custom_style: {},
        class: binding.field_class || '',
      },
      value: {
        style: { default: binding.style || {} },
        custom_style: {},
        position: {
          start_x: x,
          start_y: y,
          end_x: x + w,
          width: w,
          height: h,
          depth: 1,
        },
        class: binding.class || 'zcanvas-field zc-ta-left',
      },
    },
    datatype: crmDatatype(field),
    children: [],
    id: field.id,
    type: 'field',
  };
}

function addFieldBindings(payload, template, fields, scale) {
  const byApiName = new Map(fields.map((f) => [f.api_name, f]));
  const sections = payload.canvas_view[0].children || [];
  const missing = [];
  template.sections.forEach((section, idx) => {
    if (!Array.isArray(section.fields) || !sections[idx]) return;
    const sectionPosition = sections[idx].ui.value.position;
    for (const binding of section.fields) {
      const field = byApiName.get(binding.api_name);
      if (!field?.id) {
        missing.push(binding.api_name);
        continue;
      }
      sections[idx].children.push(makeFieldNode(binding, field, scale, sectionPosition));
    }
  });
  return missing;
}

async function resolveIdsForCreate(token, payload, { moduleApi, layoutName }) {
  const modules = await getModules(token);
  const moduleDef = modules.find((m) => m.api_name === moduleApi);
  if (!moduleDef) throw new Error(`module not found: ${moduleApi}`);
  payload.canvas_view[0].module.id = moduleDef.id;
  payload.canvas_view[0].module.api_name = moduleDef.api_name;

  const layouts = await getLayouts(token, moduleDef.api_name);
  if (!layouts.length) throw new Error(`layout not found for module=${moduleDef.api_name}`);
  const layoutDef = layouts.find((l) => l.name === layoutName) || layouts[0];
  payload.canvas_view[0].layout.id = layoutDef.id;
  payload.canvas_view[0].layout.name = layoutDef.name;
}

async function resolveFieldsForCreate(token, payload, template, { moduleApi }) {
  const rootPos = payload.canvas_view[0].ui.value.position;
  const baseW = template.canvas.base_width;
  const baseH = template.canvas.base_height;
  const scale = {
    sx: rootPos.width / baseW,
    sy: rootPos.height / baseH,
  };
  const fields = await getFields(token, moduleApi);
  const missing = addFieldBindings(payload, template, fields, scale);
  if (missing.length) {
    console.warn(`field binding skipped: ${[...new Set(missing)].join(', ')}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const imagePath = args._[0];
if (!imagePath) {
  console.error('usage: node scripts/design-to-canvas.mjs <design.png|jpg> [--name "..."] [--template path] [--module Deals] [--layout Standard] [--output path] [--create] [--target-org <id>] [--canvas-width 1100]');
  process.exit(1);
}

const templatePath = resolve(args.flags.template || DEFAULT_TEMPLATE);
const name = args.flags.name || `DesignAuto_${Date.now()}`;
const moduleApi = args.flags.module || 'Deals';
const layoutName = args.flags.layout || 'Standard';

const imgBuf = await readFile(resolve(imagePath));
const img = detectImageSize(imgBuf);
if (!img) throw new Error('unsupported image format; use png/jpeg');

const template = JSON.parse(await readFile(templatePath, 'utf8'));
const payload = buildCanvasPayload(template, {
  name,
  moduleApi,
  layoutName,
  moduleId: args.flags['module-id'] || '',
  layoutId: args.flags['layout-id'] || '',
  imageWidth: img.width,
  imageHeight: img.height,
  canvasWidth: args.flags['canvas-width'],
});

if (!args.flags.create) {
  const outPath = resolve(args.flags.output || resolve(repoRoot, '_generated', `${name.replace(/[^\w.-]/g, '_')}__canvas.json`));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(payload, null, 2));
  console.log(`generated: ${outPath}`);
  console.log(`image: ${img.format} ${img.width}x${img.height}`);
  console.log(`children: ${payload.canvas_view[0].children.length}`);
  process.exit(0);
}

const orgId = args.flags['target-org'] || process.env.ZOHO_ORG_ID;
const token = await getToken({ orgId });
await resolveIdsForCreate(token, payload, { moduleApi, layoutName });
await resolveFieldsForCreate(token, payload, template, { moduleApi });
const res = await canvas.create(token, payload);
console.log(`POST status=${res.status}`);
console.log(res.text.slice(0, 800));
const newId = res.json?.canvas_view?.[0]?.details?.id;
if (!newId) process.exit(1);
console.log(`created canvas id=${newId}`);
