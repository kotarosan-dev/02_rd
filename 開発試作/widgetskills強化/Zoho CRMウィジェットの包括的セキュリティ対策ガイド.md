# Zoho CRMウィジェットの包括的セキュリティ対策ガイド

Zoho CRMウィジェット（iframe + Widget SDK v1.5）の最大のセキュリティ上の強みは、**CONNECTION.invoke()によるサーバーサイドプロキシ構造**にあり、APIキーがクライアントに露出しない設計になっている。一方、最大のリスクは**CRMレコードデータを介したStored XSS**と**Excelエクスポートによるデータ漏洩**である。ウィジェットは`*.zappscontents.com`から配信され、`crm.zoho.com`とはクロスオリジンで分離されるため、親ページのDOMやCookieへの直接アクセスは不可能だが、Widget SDK経由でCRM APIを呼び出せるため、ウィジェット内でのXSSは実質的にCRM全データへのアクセスを意味する。本レポートでは7つの調査項目について、脆弱なコードと安全なコードの対比を含む具体的な対策を示す。

---

## 1. iframeサンドボックスとCSP — Zohoが提供する隔離境界

### iframeのサンドボックス属性

Zohoは**ウィジェットiframeに設定する具体的なsandbox属性値を公式ドキュメントで公開していない**。ただし、ウィジェットの動作から以下が推測できる。

| 推測される属性 | 根拠 |
|---|---|
| `allow-scripts` | Widget SDK自体がJavaScript実行を前提（`ZOHO.embeddedApp.init()`） |
| `allow-forms` | メール送信フォーム等のフォーム送信が機能する |
| `allow-same-origin` | SDK内部でpostMessage通信、Storage APIが動作する |
| `allow-popups` | `ZOHO.CRM.UI.Record.open({Target:"_blank"})`が動作する |

**重要な分離構造**: 内部ホスティングのウィジェットは`*.zappscontents.com`から配信され、親ページの`crm.zoho.com`とはクロスオリジンになる。これにより`parent.document`へのアクセスはSame-Origin Policyで自動的にブロックされ、**iframeの自然な隔離が機能する**。

### CSPヘッダーの制御

CSPは`plugin-manifest.json`の`cspDomains`キーで設定可能である。

```json
{
  "cspDomains": {
    "connect-src": [
      "https://api.pinecone.io",
      "https://catalyst.zoho.com"
    ]
  }
}
```

`connect-src`はXHR/fetch先のドメインを制御する。**`script-src`や`style-src`は`plugin-manifest.json`からは直接設定できない**。CDNからSheetJSやChart.jsを`<script src>`で読み込む場合、Zohoのデフォルトの`script-src`ポリシーが適用される。開発者向けサンプルではBootstrapやjQueryのCDN読み込みが動作することが確認されており、一般的なCDNドメインは許可されているようだが、正確なホワイトリストは非公開である。

外部ホスティングの場合は、自前で`<meta>`タグによるCSP設定が可能だ。

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://live.zwidgets.com https://cdnjs.cloudflare.com;
               style-src 'self' 'unsafe-inline';
               connect-src https://*.zoho.com https://*.zohoapis.com;
               frame-ancestors https://*.zoho.com;">
```

### whiteListedDomains — サーバーサイドプロキシの制御

`cspDomains`とは別に、`whiteListedDomains`はZohoのRequest APIを経由したサーバーサイドプロキシ呼び出しの許可ドメインを制御する。

```json
{
  "whiteListedDomains": [
    "https://my-index.svc.pinecone.io",
    "https://catalyst.zoho.com"
  ]
}
```

**空配列にすると外部APIへのプロキシ呼び出しが全面的にブロックされる**ため、必要最小限のドメインのみ指定すること。

---

## 2. XSS対策 — CRMデータは「信頼できない入力」である

### なぜCRMレコードデータが危険か

CRMのフィールドデータはWebフォーム、メール取り込み、API連携、CSVインポートなど多様な経路で流入する。攻撃者がリードフォームの会社名に`<img src=x onerror="alert(document.cookie)">`を埋め込めば、Stored XSSが成立する。**ウィジェット内のXSSはWidget SDKを通じてCRM全データへのアクセスを可能にする**ため、影響は甚大だ。

### 脆弱なコードと安全なコードの対比

**パターン1: CRMレコードの表示**

```javascript
// ❌ 脆弱: innerHTMLにCRMデータを直接挿入
ZOHO.CRM.API.getRecord({ Entity: "Leads", RecordID: recordId })
  .then(function(data) {
    const lead = data.data[0];
    document.getElementById("lead-info").innerHTML =
      `<h2>${lead.Full_Name}</h2>
       <p>${lead.Company}</p>
       <p>${lead.Description}</p>`;
    // lead.Company = '<img src=x onerror="...">' → スクリプト実行
  });

// ✅ 安全: textContentでプレーンテキストとして表示
ZOHO.CRM.API.getRecord({ Entity: "Leads", RecordID: recordId })
  .then(function(data) {
    const lead = data.data[0];
    document.getElementById("lead-name").textContent = lead.Full_Name;
    document.getElementById("lead-company").textContent = lead.Company;
    document.getElementById("lead-desc").textContent = lead.Description;
  });
```

**パターン2: 動的リスト生成はDocumentFragmentで**

```javascript
// ❌ 脆弱: テンプレートリテラル + innerHTML
function renderContacts(contacts) {
  const html = contacts.map(c =>
    `<div class="card">
       <h3>${c.Full_Name}</h3>
       <span>${c.Email}</span>
     </div>`
  ).join('');
  document.getElementById("list").innerHTML = html;
}

// ✅ 安全: createElement + DocumentFragment
function renderContacts(contacts) {
  const fragment = document.createDocumentFragment();
  contacts.forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';

    const name = document.createElement('h3');
    name.textContent = c.Full_Name;

    const email = document.createElement('span');
    email.textContent = c.Email;

    card.appendChild(name);
    card.appendChild(email);
    fragment.appendChild(card);
  });
  const container = document.getElementById("list");
  container.innerHTML = '';
  container.appendChild(fragment);
}
```

**パターン3: リッチテキストが必要な場合 — DOMPurify必須**

```javascript
// DOMPurifyのCRM最適化設定
const CRM_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'span', 'div', 'hr'
  ],
  ALLOWED_ATTR: ['href', 'class', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false,
  SAFE_FOR_TEMPLATES: true,
  SANITIZE_DOM: true,
  SANITIZE_NAMED_PROPS: true,
  USE_PROFILES: { html: true }
};

// リンクの安全性を強化するフック
DOMPurify.addHook('afterSanitizeAttributes', function(node) {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
    const href = node.getAttribute('href') || '';
    if (href.startsWith('javascript:') || href.startsWith('data:')) {
      node.removeAttribute('href');
    }
  }
});

// 使用例
function displayRichText(dirtyHtml) {
  const clean = DOMPurify.sanitize(dirtyHtml, CRM_PURIFY_CONFIG);
  document.getElementById("rich-content").innerHTML = clean;
}
```

**パターン4: イベントハンドラインジェクションの防止**

```javascript
// ❌ 脆弱: インラインイベントハンドラに動的データ
document.getElementById("actions").innerHTML =
  `<button onclick="handleClick('${labelFromCRM}')">${labelFromCRM}</button>`;
// labelFromCRM = "'); alert('XSS');//" → onclick乗っ取り

// ✅ 安全: addEventListenerを使用
const btn = document.createElement('button');
btn.textContent = labelFromCRM;
btn.addEventListener('click', () => handleClick(labelFromCRM));
document.getElementById("actions").appendChild(btn);
```

### DOMPurifyの導入方法

ウィジェットへの組み込みは、ローカルバンドルが推奨される。

```html
<!-- ローカルバンドル（推奨） -->
<script src="./lib/purify.min.js"></script>

<!-- CDN利用時はSRI必須 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.3.1/purify.min.js"
        integrity="sha384-実際のハッシュ値"
        crossorigin="anonymous"></script>
```

高頻度のサニタイズ処理では、**`RETURN_DOM_FRAGMENT: true`** を使うとHTML文字列への変換→再パースの二重処理を回避でき、パフォーマンスが向上する。

```javascript
const cleanFragment = DOMPurify.sanitize(dirtyHtml, {
  ...CRM_PURIFY_CONFIG,
  RETURN_DOM_FRAGMENT: true,
  RETURN_DOM_IMPORT: true
});
container.innerHTML = '';
container.appendChild(cleanFragment);
```

---

## 3. API認証セキュリティ — CONNECTION.invoke()の内部機構

### サーバーサイドプロキシアーキテクチャ

`ZOHO.CRM.CONNECTION.invoke()`は**クライアントから直接外部APIを呼び出さない**。呼び出しフローは以下の通りだ。

```
ウィジェット (ブラウザ)
  → postMessage → Zoho CRM親ページ
    → Zoho CRMバックエンドサーバー
      → 保存済みOAuthトークンを注入
        → 外部API (Pinecone, Catalyst等)
```

**OAuthトークン、APIキー、リフレッシュトークンは全てZohoサーバーに保存され、クライアントサイドには一切露出しない**。ウィジェット開発者はコネクション名を参照するだけでよい。

### Pinecone APIの安全な呼び出し

Pinecone公式ドキュメントは「TypeScript SDKはサーバーサイド専用。ブラウザ環境でSDKを使用するとAPIキーが露出する」と明記している。CONNECTION.invoke()を使えばこの問題を完全に回避できる。

```javascript
// ✅ 安全: CONNECTION.invoke()経由でPineconeを呼び出し
// APIキーはコネクション設定に保存され、ブラウザに露出しない
var req_data = {
  parameters: JSON.stringify({
    namespace: "crm-knowledge",
    topK: 5,
    vector: queryEmbedding,
    includeMetadata: true
  }),
  headers: { "Content-Type": "application/json" },
  method: "POST",
  url: "https://my-index.svc.pinecone.io/query",
  param_type: 2
};

ZOHO.CRM.CONNECTION.invoke("pinecone_connection", req_data)
  .then(function(data) {
    if (data.code === "SUCCESS") {
      const results = data.details;
      // ベクトル検索結果を処理
    } else {
      console.error("Connection failed:", data.message);
    }
  });
```

### より安全な多段プロキシ構成

最もセキュアなアーキテクチャは、Catalyst Functionsをミドルウェアとして挟む構成である。

```
ウィジェット
  → ZOHO.CRM.FUNCTIONS.execute("catalyst_proxy")
    → Deluge関数 (サーバーサイド)
      → invokeUrl with connection: "catalyst_conn"
        → Catalyst Advanced I/O Function
          → Pinecone API (APIキーはCatalyst環境変数に格納)
```

```javascript
// ウィジェット側 — CRM関数経由でCatalystを呼び出し
ZOHO.CRM.FUNCTIONS.execute("catalyst_proxy_function", {
  arguments: JSON.stringify({
    action: "query_vectors",
    query_text: searchText,
    record_id: recordId
  })
}).then(function(data) {
  // Catalyst経由の結果を処理
});
```

### スコープの最小権限原則

`zohoAuthorisation`のスコープは可能な限り狭く設定する。

```json
{
  "zohoAuthorisation": {
    "type": "connectors",
    "connectionLinkName": "zohocrm_minimal",
    "connectionName": "zohocrm",
    "serviceName": "zlabs_integration",
    "userAccess": true,
    "scope": [
      "ZohoCRM.modules.contacts.READ",
      "ZohoCRM.modules.deals.READ",
      "ZohoCRM.settings.fields.READ"
    ]
  }
}
```

| スコープ | リスク | 推奨 |
|---|---|---|
| `ZohoCRM.modules.ALL` | **高** — 全モジュールのCRUD | 避ける |
| `ZohoCRM.modules.READ` | 中 — 全モジュール読み取り | 許容 |
| `ZohoCRM.modules.contacts.READ` | **低** — 連絡先のみ読み取り | 推奨 |
| `ZohoCRM.settings.ALL` | 中〜高 — 全設定アクセス | 避ける |

**OAuthトークンの有効期限**: アクセストークンは**1時間**で失効し、Zohoが自動的にリフレッシュトークンで更新する。この処理はウィジェット開発者から完全に透過的で、手動のトークンリフレッシュロジックは不要。

---

## 4. CDNライブラリの安全性 — SRIとローカルバンドルの選択

### SRI（Subresource Integrity）の実装

SRIはCDNから読み込むリソースの改竄を検知する仕組みだ。ブラウザがリソースをダウンロード後にハッシュを計算し、`integrity`属性の値と比較する。不一致ならリソースの実行をブロックする。

```html
<!-- Chart.js with SRI -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
        integrity="sha384-実際のハッシュ値をここに"
        crossorigin="anonymous"
        onerror="loadLocalFallback('chartjs')"></script>

<!-- SheetJS with SRI -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"
        integrity="sha384-実際のハッシュ値をここに"
        crossorigin="anonymous"
        onerror="loadLocalFallback('sheetjs')"></script>
```

**`crossorigin="anonymous"`を必ず付与すること**。これがないとブラウザはSRIチェックをスキップし、「fail-open」（検証なしで読み込み）となる。

SRIハッシュの生成方法:

```bash
# OpenSSLで生成
openssl dgst -sha384 -binary chart.min.js | openssl base64 -A
# 出力の先頭に "sha384-" を付ける

# オンラインツール: https://srihash.org/ にCDN URLを入力
```

CDNのバージョン更新時はハッシュも再生成が必要。**`@latest`のようなバージョンエイリアスをSRIと併用してはならない**（ファイル内容が変わるとハッシュ不一致でブロックされる）。

### ローカルバンドル vs CDN — セキュリティ比較と推奨

2024年のPolyfill.io事件は、ドメイン所有権の移転後に**10万以上のWebサイトにマルウェアが注入**された。CDNjsにもRCE脆弱性が発見されている。SheetJS公式もサプライチェーン攻撃対策として「ベンダリング」（ローカルホスティング）を推奨している。

**Zoho CRMウィジェットではローカルバンドルを強く推奨する**。SheetJS（約500KB）+ Chart.js（約200KB）+ DOMPurify（約30KB）を合計しても1MB未満であり、ZIPの25MB制限に対して十分余裕がある。

```
app/
├── widget.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── lib/           ← ライブラリをローカルに配置
    ├── xlsx.full.min.js
    ├── chart.min.js
    └── purify.min.js
```

CDNをどうしても使う場合は、SRI + フォールバックのハイブリッド方式を採用する。

```javascript
function loadLocalFallback(lib) {
  const fallbacks = {
    chartjs: './lib/chart.min.js',
    sheetjs: './lib/xlsx.full.min.js'
  };
  const script = document.createElement('script');
  script.src = fallbacks[lib];
  document.head.appendChild(script);
  console.warn(`CDN load failed for ${lib}, using local fallback`);
}
```

---

## 5. データ保護 — PII・給与データのクライアントサイド管理

### データ最小化の原則

CRM APIからは**必要なフィールドのみ取得する**。全フィールドを取得すると、給与や社会保険番号などの機密データが不要にブラウザのメモリとDevToolsのネットワークタブに残る。

```javascript
// ❌ 全フィールド取得 — 不要なPIIも含まれる
ZOHO.CRM.API.getRecord({ Entity: "Contacts", RecordID: id });

// ✅ 必要なフィールドのみ取得
ZOHO.CRM.API.getRecord({
  Entity: "Contacts",
  RecordID: id
}).then(data => {
  // 必要なフィールドだけ抽出して保持
  const { First_Name, Last_Name, Department } = data.data[0];
  renderUI({ First_Name, Last_Name, Department });
  // data変数への参照をスコープ外に持ち出さない
});
```

### 機密データのメモリ管理とコンソール保護

```javascript
// 処理後に機密データをクリア
function processSalaryData(records) {
  let salaryData = records.map(r => ({
    id: r.id,
    salary: r.Annual_Salary
  }));

  generateChart(salaryData);

  // 使用後にクリア（JSのGCは非決定的だが、ベストエフォート）
  salaryData.forEach(item => { item.salary = null; });
  salaryData = null;
}

// 本番環境でのconsole.log保護
if (location.hostname !== 'localhost') {
  const originalLog = console.log;
  const SENSITIVE_KEYS = ['salary', 'Annual_Salary', 'ssn', 'phone', 'email'];

  console.log = function(...args) {
    const sanitized = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        const clone = { ...arg };
        SENSITIVE_KEYS.forEach(key => {
          if (clone[key]) clone[key] = '[REDACTED]';
        });
        return clone;
      }
      return arg;
    });
    originalLog.apply(console, sanitized);
  };
}
```

### Excelエクスポートのデータ漏洩対策

SheetJSはブラウザメモリ内でExcelファイルを生成し、Blob URLでダウンロードを実行する。一度ダウンロードされたファイルは制御不能なため、**エクスポート前にデータを制限することが唯一の防御線**である。

```javascript
// データマスキング関数
function maskSensitiveFields(records) {
  return records.map(r => ({
    ...r,
    Annual_Salary: r.Annual_Salary
      ? String(r.Annual_Salary).charAt(0) + '***' + String(r.Annual_Salary).slice(-1)
      : '',
    Email: r.Email
      ? r.Email.substring(0, 2) + '***@' + r.Email.split('@')[1]
      : '',
    Phone: r.Phone
      ? '***-***-' + r.Phone.slice(-4)
      : ''
  }));
}

// エクスポートフィールドの制限
function createSafeExport(records, includesSensitive) {
  const safeFields = ['Full_Name', 'Department', 'Position'];
  if (includesSensitive) {
    // 権限チェック後のみ機密フィールドを追加
    safeFields.push('Annual_Salary');
  }

  const filtered = records.map(record => {
    const safe = {};
    safeFields.forEach(f => { safe[f] = record[f]; });
    return safe;
  });

  const ws = XLSX.utils.json_to_sheet(filtered);

  // ワークシート保護（編集防止、閲覧用パスワードではない）
  ws['!protect'] = {
    password: 'export-protection',
    sheet: true,
    objects: true,
    scenarios: true
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Export');
  return wb;
}

// 監査ログの記録
function logExportAudit(userId, recordCount, fields) {
  ZOHO.CRM.API.insertRecord({
    Entity: "Export_Audit_Logs",
    APIData: [{
      User: userId,
      Export_Date: new Date().toISOString(),
      Record_Count: recordCount,
      Fields_Exported: fields.join(', '),
      Contains_PII: fields.some(f =>
        ['Annual_Salary', 'SSN', 'Phone'].includes(f))
    }]
  });
}
```

**注意**: SheetJSのコミュニティ版の`ws['!protect']`は**ワークシート保護**（編集防止）であり、ファイルを開くためのパスワード暗号化ではない。真のファイルレベル暗号化が必要な場合は`xlsx-populate`や`secure-spreadsheet`パッケージの利用を検討すること。

---

## 6. OWASP Top 10のウィジェット固有リスクと対策

### A03 Injection — APIクエリへのインジェクション防止

```javascript
// ❌ 脆弱: ユーザー入力をCRM検索クエリに直接連結
ZOHO.CRM.API.searchRecord({
  Entity: "Contacts",
  Type: "criteria",
  Query: "(Last_Name:equals:" + userInput + ")"
});

// ✅ 安全: 入力をバリデーション・サニタイズしてから使用
const sanitized = userInput.replace(/[^a-zA-Z0-9\s\-\.]/g, '');
if (sanitized.length > 0 && sanitized.length <= 100) {
  ZOHO.CRM.API.searchRecord({
    Entity: "Contacts",
    Type: "criteria",
    Query: `(Last_Name:equals:${sanitized})`
  });
}
```

### A07 XSS — Stored XSSがウィジェット最大の脅威

CRMフィールドに格納されたXSSペイロードがウィジェット表示時に発火するStored XSSが最大のリスクだ。Webフォーム、メール取り込み、CSV/APIインポートが主な侵入経路となる。対策は前述のセクション2で詳述した。

### A01 Broken Access Control — postMessageのオリジン検証

```javascript
// postMessageを受信する場合は必ずオリジンを検証
window.addEventListener('message', function(event) {
  const allowedOrigins = [
    'https://crm.zoho.com',
    'https://crm.zoho.eu',
    'https://crm.zoho.in',
    'https://crm.zoho.com.au'
  ];
  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Rejected message from:', event.origin);
    return;
  }
  // event.dataも型とスキーマを検証してから使用
});

// 送信時もオリジンを明示（'*'は使わない）
window.parent.postMessage(
  { type: 'WIDGET_READY' },
  'https://crm.zoho.com'  // ❌ '*' → ✅ 具体的なオリジン
);
```

### A08 Software and Data Integrity — サプライチェーン対策

CDNライブラリのSRI実装（セクション4）に加え、以下を遵守する。

- CDN URLは**必ずバージョンを固定**（`@3.9.1`等）し、`@latest`は使わない
- 依存ライブラリのセキュリティアドバイザリを定期的に確認する
- Widget SDKの読み込みは`https://live.zwidgets.com/js-sdk/1.5/ZohoEmbededAppSDK.min.js`からのみ

### CSRF — iframe環境での考慮事項

ウィジェットがiframe内にあるため、`SameSite=Strict`クッキーは外部サービスへのリクエストに付与されない。CRM API呼び出しはWidget SDKが親ページのセッションコンテキストで仲介するため、CSRFトークンの手動管理は不要だ。ただし、**CRMフィールドに格納された`<img>`タグによるStored CSRF**は注意が必要で、これもDOMPurifyによるサニタイズで防御する。

### メール送信フォームの入力バリデーション

```javascript
// メールヘッダインジェクション対策
function sanitizeEmailHeader(value) {
  return value.replace(/[\r\n\0]/g, '').trim();
}

function validateEmailForm(to, subject, body) {
  const errors = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(to)) errors.push('無効なメールアドレス');
  if (/[\r\n]/.test(subject)) errors.push('件名に改行は使用できません');
  if (subject.length > 200) errors.push('件名が長すぎます');
  if (body.length > 50000) errors.push('本文が長すぎます');

  return errors;
}

// HTMLメール本文はDOMPurifyでサニタイズ
const safeBody = DOMPurify.sanitize(userInputBody, {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i
});
```

---

## 7. plugin-manifest.jsonのセキュリティ設定とパッケージング

### セキュリティ関連フィールドの全体像

```json
{
  "service": "CRM",
  "storage": false,
  "whiteListedDomains": [
    "https://my-index.svc.pinecone.io"
  ],
  "cspDomains": {
    "connect-src": ["https://catalyst.zoho.com"]
  },
  "connectors": [
    {
      "connectionLinkName": "pinecone_connection",
      "connectionName": "Pinecone Vector DB",
      "serviceName": "pinecone_service",
      "userAccess": false,
      "isUserDefinedService": true,
      "scope": []
    }
  ],
  "zohoAuthorisation": {
    "type": "connectors",
    "connectionLinkName": "zohocrm_minimal",
    "connectionName": "zohocrm",
    "serviceName": "zlabs_integration",
    "userAccess": true,
    "scope": [
      "ZohoCRM.modules.contacts.READ",
      "ZohoCRM.modules.deals.READ"
    ]
  },
  "config": [
    {
      "displayName": "Pinecone Environment",
      "name": "pinecone_env",
      "secure": true,
      "type": "text",
      "mandatory": true,
      "userdefined": true,
      "authType": "org"
    }
  ],
  "modules": {
    "widgets": [
      {
        "location": "crm.record.detail.relatedlist",
        "url": "/app/widget.html",
        "name": "AI Knowledge Widget"
      }
    ]
  }
}
```

| フィールド | セキュリティ上の役割 |
|---|---|
| `whiteListedDomains` | サーバープロキシAPI呼び出しの許可ドメイン。空配列で外部呼び出し全禁止 |
| `cspDomains.connect-src` | ブラウザCSPのconnect-src制御。XHR/fetch先ドメインの制限 |
| `config[].secure` | **`true`にするとZohoが値を暗号化して保存**。APIキー等に必須 |
| `config[].authType` | `"org"` = 管理者が一括設定、`"user"` = ユーザー個別設定 |
| `connectors[].userAccess` | `false` = 管理者のトークンを共有、`true` = ユーザー個別認証 |
| `zohoAuthorisation.scope` | CRM APIの権限範囲。最小権限原則で設定 |
| `storage` | `false`にするとデータストレージ機能を無効化（攻撃面の削減） |

### パッケージング時の注意点

`zet pack`は**`app/`ディレクトリとplugin-manifest.jsonのみ**をZIPに含める。`.zetignore`のような除外設定ファイルは存在しない。

- **`.env`ファイル、秘密鍵、サーバーサイドコードは必ず`app/`ディレクトリの外に配置**する
- 機密値は`config[].secure = true`で設定し、ハードコーディングしない
- `zet validate`でマニフェストのスキーマバリデーションを実行してからパッキングする
- ZIPは`zet pack`コマンドでのみ作成する（手動ZIPは無効）
- 制限: 最大**250ファイル**、合計**25MB**、単一ファイル**5MB**

---

## 結論 — 防御の優先順位

Zoho CRMウィジェットのセキュリティは、Zohoプラットフォーム側の保護（クロスオリジン分離、CONNECTION.invoke()のサーバーサイドプロキシ、OAuthトークン管理）と開発者側の責任（XSS対策、データ保護、入力バリデーション）の2層で構成される。開発者が最優先で取り組むべき対策は3つある。**第一に、全てのCRMデータ表示にtextContentまたはDOMPurifyを使用**し、innerHTMLへの未サニタイズデータの直接挿入を根絶すること。**第二に、SheetJS・Chart.js・DOMPurifyをローカルバンドル**し、サプライチェーンリスクを排除すること。**第三に、`zohoAuthorisation.scope`をモジュール単位・READ/WRITE単位で最小化**し、万が一のXSS被害範囲を限定すること。これら3つの対策だけで、ウィジェットのセキュリティリスクの大部分をカバーできる。