# Zoho CRMウィジェットのテスト戦略 完全ガイド

Zoho CRMウィジェット（iframe + Widget SDK v1.5）には**公式のテストフレームワークが存在しない**。そのため、ZOHO SDKグローバルオブジェクトのモック、テストファイルの`app/`外配置、Vitest + jsdomによる単体テスト、Playwrightによるiframe E2Eテストを組み合わせた多層テスト戦略が必要となる。本レポートでは、ローカル開発環境からCI/CDパイプラインまで、具体的なコード例と設定ファイルを交えて全6領域を網羅する。

---

## 1. ZET CLIによるローカル開発・テスト環境の構築

### インストールと基本コマンド

ZET（Zoho Extension Toolkit）はnpmパッケージとしてグローバルインストールする。Node.js **7.1.0以上**が必要だが、実用上はNode.js 18〜20を推奨する。

```bash
npm install -g zoho-extension-toolkit
zet          # ヘルプ表示で動作確認
```

主要コマンドの用途は以下の通り。

| コマンド | 用途 |
|---------|------|
| `zet init` | プロジェクト雛形を生成（対話式でZoho CRMを選択） |
| `zet run` | ローカルHTTPSサーバーを**ポート5000**で起動 |
| `zet validate` | `plugin-manifest.json`とパッケージ構造を検証 |
| `zet pack` | `dist/`にアップロード用ZIPを生成（最大25MB） |

`zet init`で生成されるプロジェクト構造は以下の通り。**`app/`ディレクトリが全ウィジェットファイルの配置先**であり、`zet pack`時にこのディレクトリが丸ごとZIPに含まれる。

```
MyWidget/
├── app/
│   ├── widget.html          # エントリーポイント
│   ├── js/                  # ビジネスロジック
│   ├── css/
│   └── translations/        # i18n（en.json等）
├── plugin-manifest.json     # ウィジェットメタデータ
├── package.json
└── dist/                    # zet pack出力先
```

### ローカルプレビューとCRM接続

`zet run`実行後、`https://127.0.0.1:5000/app/widget.html`でプレビューできる。ChromeのSSL警告が出た場合は画面上で`thisisunsafe`とタイプしてバイパスする。

**CRMコンテキストでのテスト**（SDK完全動作）には、Zoho CRM内で「外部ホスティング」ウィジェットを作成し、Base URLに`https://127.0.0.1:5000`を指定する。これによりCRMのiframe内でローカルファイルが読み込まれ、`ZOHO.embeddedApp`が正常に動作する。

### ZETにはホットリロードがない

**ZETにはビルトインのHMR/ライブリロードが存在しない**。CRMページの手動リフレッシュが必要となる。UI開発の高速化にはViteのdev serverを併用し、ビルド出力を`app/`に配置する二段構成が有効だ。

```json
// package.json（Vite併用時）
{
  "scripts": {
    "dev": "vite",
    "build": "vite build --outDir app",
    "serve": "zet run"
  }
}
```

### ZOHO SDKモック（ローカル環境用）

CRM iframe外ではSDKが動作しないため、開発用モックオブジェクトを作成する。以下のパターンは環境を自動判定し、ローカル時のみモックを有効化する。

```javascript
// app/js/zoho-mock.js
(function() {
  // iframe内（CRM環境）なら何もしない
  if (window.self !== window.top) return;
  
  console.warn('[ZOHO Mock] ローカルモードで動作中');
  const handlers = {};

  window.ZOHO = {
    embeddedApp: {
      on: function(event, cb) { handlers[event] = cb; },
      init: function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            if (handlers['PageLoad']) {
              handlers['PageLoad']({
                Entity: 'Leads',
                EntityId: '3000000032096'
              });
            }
            resolve();
          }, 100);
        });
      }
    },
    CRM: {
      API: {
        getRecord: function(config) {
          return Promise.resolve({
            data: [{
              id: config.RecordID || '3000000032096',
              Full_Name: 'テスト太郎',
              Email: 'test@example.com',
              Company: 'テスト株式会社'
            }]
          });
        },
        searchRecord: function() {
          return Promise.resolve({ data: [] });
        }
      },
      CONNECTION: {
        invoke: function(connName, reqData) {
          console.log('[Mock] CONNECTION.invoke:', connName);
          return Promise.resolve({
            code: 'SUCCESS',
            details: { statusMessage: '{}' },
            status: 'success'
          });
        }
      },
      FUNCTIONS: {
        execute: function(funcName, config) {
          console.log('[Mock] FUNCTIONS.execute:', funcName);
          return Promise.resolve({
            code: 'success',
            details: { output: '{"status":"ok"}' }
          });
        }
      },
      UI: {
        Resize: function() { return Promise.resolve(); }
      },
      CONFIG: {
        getCurrentUser: function() {
          return Promise.resolve({
            users: [{
              id: '1000000',
              full_name: 'テストユーザー',
              email: 'admin@example.com'
            }]
          });
        }
      }
    }
  };
})();
```

`widget.html`では**実SDK→モック**の順で読み込む。CRM内では実SDKが先に`ZOHO`を定義するためモックは実行されない。

```html
<script src="https://live.zwidgets.com/js-sdk/1.5/ZohoEmbededAppSDK.min.js"></script>
<script src="js/zoho-mock.js"></script>
```

---

## 2. 単体テスト：Vitest + jsdomによるテスト基盤

### フレームワーク選定

**Vitestを推奨する**。理由は、ネイティブESMサポート、設定不要のTypeScript対応、Jestの2〜5倍の実行速度、そしてJestと互換性のあるAPIを持つ点だ。DOM環境には**jsdom**を採用する。happy-domはより高速だが、postMessage通信を使うZohoウィジェットではjsdomの方が標準準拠性で優れる。

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './app/js') }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'https://crm.zoho.com' }
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'app/translations'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/js/**/*.{js,ts}'],
      exclude: ['**/*.test.*', '**/*.d.ts', '**/vendor/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    }
  }
});
```

### テストファイルはapp/の外に配置する

`zet pack`は`app/`内を丸ごとZIPに含めるため、**テストファイルは必ず`app/`外の`tests/`ディレクトリに配置する**。ZIP上限の25MBを無駄にしないためにも不可欠だ。

```
my-zoho-widget/
├── app/
│   ├── widget.html
│   └── js/
│       ├── app.js
│       ├── utils.js          # escapeHtml等
│       ├── scores.js         # recalcScores
│       ├── export.js         # exportExcel
│       ├── lead-service.js   # CRM APIラッパー
│       └── pinecone-service.js
├── tests/                    # ← テストはここ
│   ├── setup.ts
│   ├── mocks/
│   │   └── zoho-sdk.ts
│   ├── unit/
│   │   ├── utils.test.ts
│   │   ├── scores.test.ts
│   │   └── export.test.ts
│   └── integration/
│       ├── lead-service.test.ts
│       └── pinecone-service.test.ts
├── vitest.config.ts
├── plugin-manifest.json
└── package.json
```

### ピュア関数のテスト例

```typescript
// tests/unit/utils.test.ts
import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../app/js/utils';

describe('escapeHtml', () => {
  it('XSS攻撃文字列をエスケープする', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('アンパサンドをエスケープする', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('空文字列をそのまま返す', () => {
    expect(escapeHtml('')).toBe('');
  });
});
```

```typescript
// tests/unit/scores.test.ts
import { describe, it, expect } from 'vitest';
import { recalcScores } from '../../app/js/scores';

describe('recalcScores', () => {
  it('スコアをパーセンテージに正規化する', () => {
    const input = [
      { label: '品質', rawScore: 8, maxScore: 10 },
      { label: '速度', rawScore: 3, maxScore: 5 },
      { label: 'コスト', rawScore: 7, maxScore: 20 }
    ];
    expect(recalcScores(input)).toEqual([80, 60, 35]);
  });

  it('空配列に対して空配列を返す', () => {
    expect(recalcScores([])).toEqual([]);
  });
});
```

### SheetJS（exportExcel）のテスト

SheetJSは実ファイル生成ではなく、**XLSX関数のモック**で検証する。

```typescript
// tests/unit/export.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportExcel } from '../../app/js/export';

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!ref': 'A1:C3' })),
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    book_append_sheet: vi.fn()
  },
  writeFile: vi.fn()
}));

describe('exportExcel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('正しいデータでワークブックを生成する', () => {
    const data = [
      { 名前: 'リードA', スコア: 85 },
      { 名前: 'リードB', スコア: 72 }
    ];
    exportExcel(data, 'ScoreReport.xlsx');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(data);
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.any(Object), 'ScoreReport.xlsx'
    );
  });
});
```

### Chart.jsテストの注意点

jsdomにはCanvas APIがないため、**`jest-canvas-mock`**をsetupFilesに追加する。ただし、レーダーチャートのレンダリング自体はE2Eやビジュアルリグレッションで検証し、**単体テストではデータ変換ロジックのみをテストする**のが原則だ。

```typescript
// tests/setup.ts
import 'jest-canvas-mock';
import { createZohoMock } from './mocks/zoho-sdk';
(globalThis as any).ZOHO = createZohoMock();
```

---

## 3. Widget SDKモック統合テストの実装パターン

### 包括的なZOHO SDKモックファクトリ

テストセットアップでグローバルに`ZOHO`オブジェクトをモック化する。各テストで`mockResolvedValueOnce`を使い、テストケース固有のレスポンスを差し込む。

```typescript
// tests/mocks/zoho-sdk.ts
const mockFn = typeof vi !== 'undefined' ? vi.fn : jest.fn;

export function createZohoMock() {
  return {
    embeddedApp: {
      init: mockFn(),
      on: mockFn()
    },
    CRM: {
      API: {
        getRecord: mockFn().mockResolvedValue({
          data: [{
            id: '1234567890',
            Full_Name: 'John Doe',
            Email: 'john@example.com',
            Company: 'Acme Corp'
          }]
        }),
        getAllRecords: mockFn().mockResolvedValue({ data: [] }),
        searchRecord: mockFn().mockResolvedValue({ data: [] }),
        insertRecord: mockFn().mockResolvedValue({
          data: [{ code: 'SUCCESS', details: { id: '9999' } }]
        }),
        updateRecord: mockFn().mockResolvedValue({
          data: [{ code: 'SUCCESS', status: 'success' }]
        })
      },
      CONFIG: {
        getCurrentUser: mockFn().mockResolvedValue({
          users: [{
            id: '1000000030132',
            full_name: 'Test User',
            email: 'test@example.com',
            role: { name: 'CEO' },
            profile: { name: 'Administrator' }
          }]
        })
      },
      CONNECTION: {
        invoke: mockFn().mockResolvedValue({
          code: 'SUCCESS',
          details: { statusMessage: '{}' },
          status: 'success'
        })
      },
      FUNCTIONS: {
        execute: mockFn().mockResolvedValue({
          code: 'success',
          details: { output: '{"status":"ok"}', id: '1234' }
        })
      },
      UI: {
        Resize: mockFn().mockResolvedValue(true),
        Record: { open: mockFn(), populate: mockFn() }
      }
    }
  };
}
```

### ZOHO.CRM.API.getRecord()の統合テスト

```typescript
// tests/integration/lead-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLeadDetails } from '../../app/js/lead-service';

describe('getLeadDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CRM APIからリードデータを取得し整形する', async () => {
    (ZOHO.CRM.API.getRecord as any).mockResolvedValueOnce({
      data: [{
        id: '555',
        Full_Name: '山田太郎',
        Email: 'yamada@example.com',
        Company: '山田商事'
      }]
    });

    const result = await getLeadDetails('555');

    expect(ZOHO.CRM.API.getRecord).toHaveBeenCalledWith({
      Entity: 'Leads',
      RecordID: '555'
    });
    expect(result).toEqual({
      id: '555',
      name: '山田太郎',
      email: 'yamada@example.com',
      company: '山田商事'
    });
  });
});
```

### CONNECTION.invoke（Pinecone連携）のテスト

```typescript
// tests/integration/pinecone-service.test.ts
describe('queryPinecone', () => {
  it('Pineconeにベクトル検索を実行し結果を返す', async () => {
    const mockMatches = {
      matches: [{ id: 'vec1', score: 0.95, metadata: { name: 'Lead A' } }]
    };
    (ZOHO.CRM.CONNECTION.invoke as any).mockResolvedValueOnce({
      code: 'SUCCESS',
      details: {
        statusMessage: JSON.stringify(mockMatches)
      },
      status: 'success'
    });

    const result = await queryPinecone([0.1, 0.2, 0.3], 5);

    expect(ZOHO.CRM.CONNECTION.invoke).toHaveBeenCalledWith(
      'pinecone_connection',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.matches[0].score).toBe(0.95);
  });

  it('CONNECTION失敗時にエラーをスローする', async () => {
    (ZOHO.CRM.CONNECTION.invoke as any).mockResolvedValueOnce({
      code: 'FAILURE',
      message: 'Connection not found',
      status: 'error'
    });

    await expect(queryPinecone([0.1], 5))
      .rejects.toThrow('Pinecone query failed');
  });
});
```

### FUNCTIONS.execute（Deluge関数）のテスト

```typescript
describe('executeScoringFunction', () => {
  it('Deluge関数を呼び出しJSON出力をパースする', async () => {
    (ZOHO.CRM.FUNCTIONS.execute as any).mockResolvedValueOnce({
      code: 'success',
      details: {
        output: '{"score":87,"grade":"A"}',
        id: '999'
      }
    });

    const result = await executeScoringFunction('12345');

    expect(ZOHO.CRM.FUNCTIONS.execute).toHaveBeenCalledWith(
      'calculate_lead_score',
      { arguments: JSON.stringify({ lead_id: '12345' }) }
    );
    expect(result.score).toBe(87);
    expect(result.grade).toBe('A');
  });
});
```

### エラーハンドリング・非同期テストパターン

```typescript
describe('エラーハンドリング', () => {
  it('APIトークン無効時のリジェクションを処理する', async () => {
    (ZOHO.CRM.API.getRecord as any).mockRejectedValueOnce(
      new Error('INVALID_TOKEN')
    );
    await expect(getLeadDetails('999')).rejects.toThrow('INVALID_TOKEN');
  });

  it('ネットワークタイムアウトを処理する', async () => {
    (ZOHO.CRM.API.getRecord as any).mockImplementationOnce(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 100)
      )
    );
    await expect(getLeadDetails('999')).rejects.toThrow('TIMEOUT');
  });

  it('空データレスポンスを処理する', async () => {
    (ZOHO.CRM.API.getRecord as any).mockResolvedValueOnce({ data: [] });
    await expect(getLeadDetails('empty')).rejects.toThrow();
  });

  it('リトライ後に成功する', async () => {
    const mockApi = ZOHO.CRM.API.getRecord as any;
    mockApi
      .mockRejectedValueOnce(new Error('RATE_LIMIT'))
      .mockRejectedValueOnce(new Error('RATE_LIMIT'))
      .mockResolvedValueOnce({
        data: [{ id: '1', Full_Name: '成功', Email: 'ok@test.com', Company: 'X' }]
      });

    const result = await getLeadDetailsWithRetry('1', { maxRetries: 3 });
    expect(mockApi).toHaveBeenCalledTimes(3);
    expect(result.name).toBe('成功');
  });
});
```

### モックレスポンスの型定義

```typescript
// tests/mocks/types.ts
export interface ZohoApiResponse<T = Record<string, any>> {
  data: T[];
  info?: { more_records: boolean; count: number; page: number };
}

export interface ZohoConnectionResponse {
  code: 'SUCCESS' | 'FAILURE';
  details: { CODE?: number; statusMessage: string; status: string };
  message: string;
  status: string;
}

export interface ZohoFunctionResponse {
  code: string;
  details: { output: string; id: string };
  message?: string;
  status: string;
}
```

---

## 4. E2Eテスト：iframe制約との闘い方

### PlaywrightがZohoウィジェットE2Eに最適な理由

**Playwrightを推奨する**。Cypressではiframeサポートが限定的（プラグイン依存、Issue #136が長期未解決）だが、Playwrightは`frameLocator` APIでクロスオリジンiframeをネイティブにサポートする。設定変更なしでクロスオリジンフレームにアクセスでき、自動待機機構も組み込まれている。

```typescript
// tests/e2e/widget.spec.ts（Playwright）
import { test, expect } from '@playwright/test';

test('ウィジェットがリード情報を表示する', async ({ page }) => {
  await page.goto('https://crm-sandbox.zoho.com/crm/tab/Leads/12345');
  
  // iframeウィジェットを特定
  const widget = page.frameLocator('iframe[src*="widget"]');
  
  // ウィジェット内の要素を操作
  await widget.getByLabel('検索').fill('テストクエリ');
  await widget.getByRole('button', { name: '検索' }).click();
  
  // 結果を検証
  await expect(widget.getByText('検索結果')).toBeVisible();
});
```

Cypressを使用する場合は、`chromeWebSecurity: false`の設定と`cypress-iframe`プラグインが必須となる。

```javascript
// cypress.config.js
module.exports = {
  e2e: { chromeWebSecurity: false }
};

// cypress/support/commands.js
Cypress.Commands.add('getIframeBody', (selector) => {
  return cy.get(selector)
    .its('0.contentDocument.body')
    .should('not.be.empty')
    .then(cy.wrap);
});
```

### クロスオリジン制約の影響

Zohoウィジェットは`crm.zoho.com`のiframe内に外部オリジン（`127.0.0.1:5000`や自社ドメイン）として埋め込まれる。この構造がE2Eテストに与える影響は以下の通り。

- **Playwright**：クロスオリジンiframeをデフォルトで処理可能。特別な設定不要
- **Cypress**：`chromeWebSecurity: false`でChromium系でのみ動作。Firefoxでは別対応が必要
- **CRM認証**：テストスクリプトでZoho CRMにログインする必要があり、2FAが有効な場合は複雑化する

### Zoho Sandbox組織でのテスト

Zoho CRMの**Sandbox環境**（Setup → Data Administration → Sandbox）を活用する。**最大5環境**を作成でき、本番設定のインポートやサンプルデータの生成が可能だ。

ワークフロー全体は次のように進める。

1. `zet run`でローカルサーバー起動
2. Sandbox CRMで外部ホスティングウィジェットのBase URLを`https://127.0.0.1:5000`に設定
3. SDK含む全機能のテストをSandbox上で実施
4. `zet pack`でZIP生成
5. Sandboxからのデプロイ機能で本番へ反映

---

## 5. Zoho固有のデバッグ手法とCatalyst/Deluge テスト

### Chrome DevToolsでのiframeデバッグ

DevToolsのConsoleタブにある**JavaScriptコンテキスト切替ドロップダウン**（デフォルトは「top」）から、ウィジェットiframeのコンテキストを選択する。これにより、`ZOHO.CRM.CONFIG.getCurrentUser().then(d => console.log(d))`のようなSDK呼び出しをコンソールから直接テストできる。

postMessage通信の監視も有用だ。

```javascript
// 親ウィンドウまたはiframeのコンソールで実行
window.addEventListener('message', e => 
  console.log('Message:', e.data, 'Origin:', e.origin)
);
```

### Widget SDK呼び出しのデバッグラッパー

```javascript
function debugSDKCall(name, promise) {
  console.log(`[SDK] 呼出: ${name}`);
  const start = Date.now();
  return promise
    .then(data => {
      console.log(`[SDK] ${name} 成功 (${Date.now()-start}ms):`,
        JSON.stringify(data, null, 2));
      return data;
    })
    .catch(err => {
      console.error(`[SDK] ${name} 失敗 (${Date.now()-start}ms):`, err);
      throw err;
    });
}

// 使用例
debugSDKCall('getRecord', ZOHO.CRM.API.getRecord({
  Entity: 'Leads', RecordID: '12345'
}));
```

### Catalyst関数のローカルテスト

Catalyst CLIをインストールし、`catalyst serve`でローカル実行する。**ポート3000**でサーバーが起動し、Basic I/O・Advanced I/O関数をローカルでテストできる。

```bash
npm install -g zcatalyst-cli
catalyst login
catalyst init
catalyst serve              # デフォルトポート3000
catalyst serve --port 4000  # ポート指定
catalyst serve --debug      # デバッグモード
```

関数シェルで対話的テストも可能だ。

```bash
catalyst functions:shell
# シェル内で関数を直接呼び出し
my_function({"param1": "value1"})
```

Pinecone等の外部API呼び出しはアウトバウンドHTTPリクエストのためローカルでもそのまま動作する。CI環境では`catalyst token:generate`で生成したトークンを使って`CATALYST_TOKEN=xxx catalyst deploy`で非対話デプロイが可能だ。

### Deluge関数のテスト

Deluge関数のデバッグには`info`文を使用する。出力はCRM Functions IDEの**コンソールパネル**に表示される（管理者のみ閲覧可、最大500KB）。

```deluge
leadRecord = zoho.crm.getRecordById("Leads", leadId);
info "Lead Record: " + leadRecord;
info "Email: " + leadRecord.get("Email");
```

CRM Functions IDE（Setup → Developer Hub → Functions）の**Runボタン**は保存せずに関数を実行できるため、デプロイ済みコードに影響を与えずにテストが可能だ。REST APIを使ったテストは以下のように行える。

```bash
curl -X POST \
  'https://www.zohoapis.com/crm/v2/functions/my_function/actions/execute' \
  -d 'auth_type=apikey&zapikey=YOUR_KEY' \
  -d 'body={"key":"value"}'
```

### 本番デプロイ前チェックリスト

- `zet validate`が通過すること
- `ZOHO.embeddedApp.init()`がページ読み込み時に呼ばれていること
- 全SDK呼び出しに`.catch()`ハンドラが存在すること
- 管理者以外のロール/プロファイルでも動作検証済みであること
- `plugin-manifest.json`の`cspDomains`に外部API（Pinecone等）のドメインが含まれていること
- クライアントコードにAPIキーやシークレットが露出していないこと
- Chrome/Firefox/Safari/Edgeでのクロスブラウザテスト済みであること
- `info`文を削除またはガードしていること（Deluge）
- Sandbox環境でのフルテストが完了していること

---

## 6. GitHub ActionsによるCI/CDパイプライン

### 完全なワークフロー定義

`zet pack`と`zet validate`は**認証不要・ヘッドレス環境で完全に動作する**。ただし、Zoho CRMにはウィジェットZIPをアップロードするREST APIが存在しないため、**デプロイは手動**となる。CIの役割はテスト・検証・パッケージ生成・アーティファクト保存までだ。

```yaml
# .github/workflows/widget-ci.yml
name: Zoho CRM Widget CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── テスト・検証 ──────────────────────────
  test:
    name: Lint・テスト・カバレッジ
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: ESLint
        run: npm run lint

      - name: 単体テスト（カバレッジ付き）
        run: npx vitest run --coverage --reporter=verbose

      - name: カバレッジレポート保存
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14

  # ── ビルド・パッケージ ────────────────────
  package:
    name: ビルド・検証・パッケージ
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: ビルド（Vite使用時）
        run: npm run build
        env:
          NODE_ENV: production

      - name: ZET CLIインストール
        run: npm install -g zoho-extension-toolkit

      - name: ウィジェット検証
        run: zet validate

      - name: ZIPパッケージ生成
        run: zet pack

      - name: パッケージ内容確認
        run: |
          ls -la dist/
          unzip -l dist/*.zip

      - name: アーティファクト保存
        uses: actions/upload-artifact@v4
        with:
          name: widget-${{ github.ref_name }}-${{ github.run_number }}
          path: dist/*.zip
          retention-days: 30
          if-no-files-found: error

  # ── リリース作成（mainブランチのみ）───────
  release:
    name: GitHubリリース作成
    runs-on: ubuntu-latest
    needs: package
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: widget-main-${{ github.run_number }}
          path: dist/

      - name: タグ生成
        id: tag
        run: echo "tag=v$(date +'%Y%m%d.%H%M%S')" >> $GITHUB_OUTPUT

      - name: リリース作成
        uses: softprops/action-gh-release@v2
        with:
          tag_name: ${{ steps.tag.outputs.tag }}
          name: Widget ${{ steps.tag.outputs.tag }}
          body: |
            コミット ${{ github.sha }} からの自動ビルド。

            **デプロイ手順:**
            1. 下記ZIPをダウンロード
            2. Zoho CRM → 設定 → 開発者ハブ → ウィジェット
            3. ウィジェットを編集 → ホスティング「Zoho」→ ZIPアップロード
            4. インデックスページを `/widget.html` に設定
          files: dist/*.zip
```

### ブランチ戦略

| ブランチ | 環境 | CIアクション |
|---------|------|-------------|
| `feature/*` | — | Lint + テストのみ（PRチェック） |
| `develop` | Sandbox | フルCI → パッケージ → アーティファクト保存 |
| `main` | Production | フルCI → パッケージ → GitHubリリース作成 |

デプロイの最後のステップ（ZIPのCRMへのアップロード）は、Zoho CRM APIにウィジェット管理エンドポイントが存在しないため、手動で行う。ZDK CLI（`zdk org:push`）はベータ版で存在するが、ブラウザベースのOAuth認証が必要なためCI環境での完全自動化にはまだ対応していない。

---

## Conclusion

Zohoウィジェットのテスト戦略は、**3つの層**で構築する。第1層はVitestによるピュア関数と SDK モック統合テスト（最も費用対効果が高い）。第2層はChrome DevToolsとSandbox環境でのSDK統合確認。第3層はPlaywrightを使った、可能な範囲でのE2Eテストだ。

最も重要な設計原則は**ビジネスロジックとSDK呼び出しの分離**である。`escapeHtml()`や`recalcScores()`のようなピュア関数を抽出し、SDK依存部分はモック可能な薄いラッパー層に隔離する。この構造を作れば、テストカバレッジの大半をモック統合テストで確保でき、CRM環境に依存する高コストなE2Eテストは重要なワークフローに限定できる。CI/CDではデプロイ自動化が現時点では不可能だが、テスト・検証・パッケージ生成までを自動化することで、手動アップロードのミスリスクを最小化できる。