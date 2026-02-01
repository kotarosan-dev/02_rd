# Zoho セットアップ自動化 研究サマリー

**作成日**: 2026-02-01  
**目的**: 別AIへの引き継ぎ用 / 試行錯誤の記録

---

## 1. プロジェクト概要

### ゴール

Zoho One 導入時の初期セットアップを「AI + 最小限の手動操作」で完了できる**スキル集**を作成する。

### アプローチ

```
┌─────────────────────────────────────────────┐
│  1. 各サービスの「操作可能性」を調査        │
│     - API ドキュメント確認                  │
│     - MCP 有無確認                          │
│     - ブラウザ自動化の実現性検証            │
├─────────────────────────────────────────────┤
│  2. 調査結果を「スキル」として構造化        │
│     - できること / できないこと             │
│     - 推奨ワークフロー                      │
│     - 必要なツール・前提条件                │
├─────────────────────────────────────────────┤
│  3. スキルを Cursor に登録                  │
│     - .cursor/skills/ または .claude/skills/│
│     - トリガーワード設定                    │
├─────────────────────────────────────────────┤
│  4. 実際のセットアップで検証・改善          │
│     - 再現性確認                            │
│     - 効率化ポイント発見                    │
│     - スキルに反映                          │
└─────────────────────────────────────────────┘
```

---

## 2. 技術スタック

### 2.1 ブラウザ自動化（重要）

**採用ツール**: `cursor-ide-browser` MCP

| MCP サーバー名 | 状態 | 備考 |
|----------------|------|------|
| **`cursor-ide-browser`** | **✅ 動作** | Cursor 内蔵、承認不要、推奨 |
| `user-playwright` | ❌ 承認バグ | Cursor 2.3.x で承認ダイアログが表示されない |
| `cursor-browser-extension` | ❌ 存在しない | 誤った名前（実際は cursor-ide-browser） |

#### cursor-ide-browser の使い方

**前提条件**:
1. Cursor Settings → Tools & MCP → Browser Automation を **ON**
2. Browser Tab モードを選択
3. MCP ツールを `server: "cursor-ide-browser"` で呼び出す

**利用可能なツール一覧** (`mcps/cursor-ide-browser/tools/`):

| ツール名 | 用途 |
|----------|------|
| `browser_navigate` | URL へ移動 |
| `browser_snapshot` | ページ構造（DOM）を取得 |
| `browser_click` | 要素をクリック（ref 指定） |
| `browser_fill` | テキスト入力 |
| `browser_type` | キー入力（追記） |
| `browser_drag` | ドラッグ＆ドロップ（**制限あり**） |
| `browser_select_option` | ドロップダウン選択 |
| `browser_take_screenshot` | スクリーンショット |
| `browser_wait_for` | 要素を待機 |
| `browser_tabs` | タブ一覧取得 |
| `browser_lock` / `browser_unlock` | ブラウザ排他制御 |

**呼び出し例**:
```typescript
CallMcpTool(
  server: "cursor-ide-browser",
  toolName: "browser_navigate",
  arguments: { url: "https://creator.zoho.jp/" }
)
```

#### browser_drag の制限（重要）

**問題**: Zoho Creator のフォームビルダーは **jQuery UI** の `ui-draggable` を使用しているが、`browser_drag` は **HTML5 の `draggable="true"`** 属性をチェックするため、互換性がない。

```
エラー: "Source element e155 does not appear to be draggable. 
        It lacks the draggable attribute."
```

**結論**: フィールドのドラッグ＆ドロップは**手動でしかできない**。

---

### 2.2 既存の Zoho 関連スキル

**場所**: `C:\Users\user\.claude\skills\`

| スキル名 | 対象 | 主な機能 |
|----------|------|----------|
| `zoho-deluge-developer` | Deluge / Client Script | コードレビュー、スクリプト生成、API連携 |
| `zoho-client-script` | Zoho CRM Client Script | ZDK API、イベント処理、UI制御 |
| `zoho-crm-widget` | Zoho CRM Widget | ZET CLI、JS SDK、ウィジェット開発 |

これらは**Zoho CRM 向け**であり、Creator 向けスキルは未作成。

---

### 2.3 Zoho CRM MCP

**場所**: `mcps/user-zoho-crm/tools/`

**利用可能な操作**（50+ ツール）:

| カテゴリ | 主なツール |
|----------|------------|
| レコード操作 | `create_record`, `update_record`, `delete_record`, `search_records` |
| モジュール操作 | `create_module`, `delete_module`, `get_module_info` |
| フィールド操作 | `add_fields_to_module`, `delete_field`, `get_all_fields` |
| バルク操作 | `batch_create_records`, `bulk_update_by_criteria` |
| メタ情報 | `get_layouts`, `get_blueprint`, `get_workflow_rules` |
| バックアップ | `schedule_backup`, `download_backup` |

**結論**: Zoho CRM は **API/MCP でほぼすべての操作が可能**。Cursor 上で完結できる。

---

## 3. Zoho Creator 調査結果

### 3.1 API の限界

| API 種別 | できること | フィールド作成・変更 |
|----------|------------|---------------------|
| **Data API** | レコードの追加・更新・削除 | **不可** |
| **Meta API** | フィールド情報の取得（読み取り専用） | **不可** |
| **File API** | ファイルのアップロード・ダウンロード | **不可** |
| **Bulk API** | 大量データのエクスポート | **不可** |
| **Custom API** | カスタムエンドポイント作成 | **不可** |

**結論**: Zoho Creator API では**フォームやフィールドの作成・変更はできない**。

### 3.2 ブラウザ自動化の実現性

| 操作 | cursor-ide-browser | 備考 |
|------|---------------------|------|
| ページ遷移 | ✅ 可能 | `browser_navigate` |
| フォーム名入力 | ✅ 可能 | `browser_fill` |
| フィールド追加（D&D） | ❌ **不可** | jQuery UI 非対応 |
| フィールド設定変更 | △ 不安定 | ref が頻繁に変わる |
| API名/表示名入力 | △ 可能だが手間 | 毎回 snapshot → ref 取得が必要 |

#### ref（要素参照）の問題

Zoho Creator の設定パネルは**動的に再レンダリング**されるため、フィールドをクリックするたびに ref が変わる。

**対処法**:
1. フィールドをクリック → `browser_snapshot` で新しい ref を取得
2. 取得した ref で `browser_fill` を実行
3. これを**各フィールドごとに繰り返す**

**実績**: API名変更は 5/7 フィールドで成功（残り2つは ref 不安定で手動）、表示名変更は 7/7 成功。

### 3.3 推奨ワークフロー

```
① AI: 要件をヒアリング
↓
② AI: CSV（ヘッダー＋サンプルデータ）を生成
↓
③ ユーザー: Creator で「インポート」→ CSV をアップロード
↓
④ Creator（Zia）: フィールドタイプを推測して自動生成
↓
⑤ ユーザー: 必要に応じて微調整（表示名、必須設定など）
```

**CSVインポートが最効率**。GUIでのフィールドドラッグよりも圧倒的に早い。

### 3.4 その他の代替手段

| 手法 | 概要 | 有用性 |
|------|------|--------|
| **DS File** | アプリ構造をテキストでエクスポート/インポート | ★★★（テンプレート化に有効） |
| **CSV インポート** | CSV から AI がフィールド自動生成 | ★★★（初期構築に最適） |
| **アプリ複製** | 既存アプリを構造のみコピー | ★★☆（同じ構造の複製） |

---

## 4. 試行錯誤の詳細ログ

**場所**: `01_計画/experiment-notes.md`

### 主な発見

1. **MCP サーバー名の混乱**
   - `cursor-browser-extension` は存在しない
   - 正しくは `cursor-ide-browser`

2. **Playwright MCP の承認バグ**
   - Cursor 2.3.x で承認ダイアログが表示されない
   - 回避策: `cursor-ide-browser` を使用

3. **Zoho Creator フォームビルダーの特性**
   - jQuery UI ドラッグは MCP で自動化不可
   - 設定パネルの ref は不安定
   - iframe や内部スクロールで要素が隠れることあり

4. **日本語パスの問題**
   - Playwright CLI は日本語パスでエラーになることがある
   - 回避策: 絶対パスで実行

---

## 5. 現在のプロジェクト構造

```
zoho-creator-automation/
├── .env.example
├── .gitignore
├── package.json
├── playwright.config.ts
├── 01_計画/
│   ├── contact-form-setup-guide.md      # フォーム作成ガイド（詳細）
│   ├── experiment-notes.md               # 試行錯誤ログ
│   └── zoho-setup-automation-research-summary.md  # ← このファイル
├── 02_テスト/
│   ├── auth/
│   │   └── zoho-login.setup.ts
│   ├── creator/
│   │   ├── form-create.spec.ts
│   │   └── record-input.spec.ts
│   └── screenshots/                      # 各ステップのスクリーンショット
├── 03_実装/
│   └── auth-state/
│       └── .gitkeep                      # （zoho.json は gitignore）
└── scripts/
    ├── explore-creator.js
    └── zoho-login.js                     # Playwright CLI ログインスクリプト
```

---

## 6. Zoho サービス別 操作可能性マトリクス

| サービス | API | MCP | ブラウザ自動化 | 推奨手段 |
|----------|-----|-----|----------------|----------|
| **Zoho CRM** | ◎ | ◎ `user-zoho-crm` | △ 補助 | **API/MCP 中心** |
| **Zoho Creator** | △ データのみ | - | △ 制限多い | **CSV インポート** |
| Zoho Books | ? | - | ? | 要調査 |
| Zoho Desk | ? | - | ? | 要調査 |
| Zoho Campaigns | ? | - | ? | 要調査 |
| Zoho Analytics | ? | - | ? | 要調査 |
| Zoho Flow | ? | - | ? | 要調査 |

---

## 7. 次のアクション案

| # | アクション | 詳細 |
|---|------------|------|
| A | **Creator スキル作成** | 今回の調査結果を `.claude/skills/zoho-creator-setup/` に |
| B | **CRM スキル整理** | 既存知見を統合、セットアップ用スキルとして再構成 |
| C | **他サービス調査** | Books / Desk / Analytics の API 確認 |
| D | **スキル管理方針決定** | フォルダ構成、命名規則、トリガーワード設計 |

---

## 8. 参考リンク

### ドキュメント
- [Zoho Creator API v2](https://www.zoho.com/creator/help/api/v2/)
- [Zoho Creator Meta API - Get Fields](https://www.zoho.com/creator/help/api/v2/get-fields.html)
- [DS File について](https://www.zoho.com/creator/newhelp/app-settings/understand-ds-file.html)
- [Application IDE](https://www.zoho.com/creator/newhelp/app-settings/view-and-modify-application-ide.html)

### 関連ファイル
- `mcps/cursor-ide-browser/tools/` - MCP ツール定義
- `mcps/user-zoho-crm/tools/` - Zoho CRM MCP ツール定義
- `.claude/skills/zoho-*` - 既存 Zoho スキル

---

## 9. 用語集

| 用語 | 説明 |
|------|------|
| **MCP** | Model Context Protocol。AI が外部ツールを呼び出す標準プロトコル |
| **cursor-ide-browser** | Cursor 内蔵のブラウザ自動化 MCP サーバー |
| **ref** | cursor-ide-browser で要素を特定するための参照ID（動的に変わる） |
| **DS File** | Zoho Creator アプリの構造をテキストで保存したファイル |
| **Zia** | Zoho の AI アシスタント |
| **スキル** | AI エージェントが参照する定型化された手順・知識ファイル |

---

**作成者**: Cursor AI  
**最終更新**: 2026-02-01
