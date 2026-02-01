---
name: Zoho Creator GUI自動化実験
overview: |
  Cursor IDE + MCP経由でZoho Creator画面のGUI自動操作を実験的に検証する。
  【解決】cursor-ide-browser MCP が動作確認済み。Browser Tab 経由で操作可能。
todos:
  - id: setup-playwright-mcp
    content: Playwright MCPサーバーをmcp.jsonに追加し、Cursorを再起動
    status: completed
  - id: create-project-folder
    content: 開発試作/zoho-creator-automation/ にプロジェクト構造を作成
    status: completed
  - id: test-mcp-connection
    content: MCP接続テスト → cursor-ide-browser で成功
    status: completed
  - id: browser-tab-login
    content: Browser Tab で手動ログイン → MCP で操作可能な状態を確認
    status: completed
  - id: explore-creator-ui
    content: Zoho Creator画面のUI構造を調査（snapshot取得済み）
    status: completed
  - id: experiment-form-create
    content: フォーム作成・レコード入力の自動化を検証
    status: in_progress
  - id: document-mcp-usage
    content: cursor-ide-browser MCP の使い方をスキル化
    status: completed
isProject: false
---

# Zoho Creator GUI自動化実験プロジェクト

## 現在のステータス

| 項目 | 状態 |
|------|------|
| **cursor-ide-browser MCP** | **動作確認済み** ✅ |
| Browser Tab でのログイン | 成功 |
| Creator ダッシュボード操作 | **可能** |
| 既存アプリの編集 | 検証中 |

---

## 解決した問題

### 正しい MCP サーバー名の特定

| 試したサーバー名 | 結果 |
|------------------|------|
| `user-playwright` | 承認バグで不可 |
| `cursor-browser-extension` | **サーバーが存在しない** |
| **`cursor-ide-browser`** | **動作** ✅ |

**重要**: 公式ドキュメントや MCP フォルダの名前と実際のサーバー名が異なる場合がある。
エラーメッセージの `Available servers:` で正しい名前を確認すること。

---

## 動作確認済みの構成

### 前提条件
1. **Cursor Settings → Tools & MCP → Browser Automation** が ON
2. **Browser Tab** を選択（Chrome ではなく）
3. **Browser Tab で対象サイトにログイン済み**

### MCP 呼び出し方法

```typescript
CallMcpTool(
  server: "cursor-ide-browser",  // ← 正しいサーバー名
  toolName: "browser_snapshot",
  arguments: {}
)
```

### 利用可能なツール

| ツール | 説明 |
|--------|------|
| `browser_navigate` | URLに移動 |
| `browser_click` | 要素をクリック（ref指定） |
| `browser_type` | テキスト入力 |
| `browser_fill_form` | フォーム入力 |
| `browser_snapshot` | ページ構造を取得 |
| `browser_take_screenshot` | スクリーンショット |
| `browser_press_key` | キー入力 |
| `browser_hover` | ホバー |
| `browser_wait_for` | 要素待機 |

---

## Zoho Creator の構造（調査済み）

### ダッシュボード URL
`https://creator.zoho.jp/userhome/{username}/admindashboard#/`

### 主要な要素（ref ID）

| 要素 | ref | 説明 |
|------|-----|------|
| ソリューション作成ボタン | `e17` | 新規アプリ作成 |
| 既存アプリ（バーコードスキャンテスト） | `e19` | アプリを開く |
| 編集ボタン | `e21` | アプリ編集画面へ |
| 検索ボックス | `e15` | アプリ検索 |

### サイドバーメニュー

| メニュー | ref |
|----------|-----|
| ソリューション | `e4` |
| マイクロサービス | `e5` |
| 環境 | `e6` |
| モバイル | `e7` |
| ポータル | `e8` |
| ユーザー | `e9` |
| 組織 | `e10` |
| 管理体制 | `e11` |
| 指標データ | `e12` |
| 操作 | `e13` |
| 利用状況 | `e14` |

---

## Phase 1: 環境セットアップ（完了）

- [x] Cursor Browser Automation 設定 ON
- [x] Browser Tab モード選択
- [x] MCP サーバー名の特定（`cursor-ide-browser`）
- [x] Zoho Creator へのログイン（手動）
- [x] MCP 接続テスト成功

---

## Phase 2: UI 構造調査（完了）

- [x] ダッシュボードの snapshot 取得
- [x] 主要要素の ref ID 特定
- [x] 既存アプリの確認（2件）

---

## Phase 3: 操作の自動化検証（進行中）

### 3.1 検証項目

| 操作 | 状態 | 備考 |
|------|------|------|
| 既存アプリを開く | 未検証 | `browser_click ref=e19` |
| アプリ編集画面へ移動 | 未検証 | `browser_click ref=e21` |
| 新規ソリューション作成 | 未検証 | `browser_click ref=e17` |
| フォームへのデータ入力 | 未検証 | |
| レコード保存 | 未検証 | |

### 3.2 次のステップ

1. **既存アプリを開く** → 内部構造を調査
2. **編集画面の構造を把握** → フィールド追加等の操作を特定
3. **新規作成フローを検証** → ソリューション/アプリ/フォーム作成

---

## Phase 4: スキル化（待機中）

動作確認が完了したら、以下をスキル化：

1. **cursor-ide-browser MCP の使い方**
2. **Zoho Creator 操作のパターン**
3. **エラーハンドリング**

---

## 比較: 3つのアプローチ

| アプローチ | 状態 | 推奨度 |
|------------|------|--------|
| **cursor-ide-browser MCP** | **動作** | **★★★ 推奨** |
| Playwright CLI (Shell経由) | 動作 | ★★ 代替 |
| Playwright MCP (`user-playwright`) | 承認バグ | ★ 将来 |

### cursor-ide-browser のメリット

- Cursor 内で完結（外部ブラウザ不要）
- リアルタイムで操作・確認可能
- セッションが Browser Tab に保持される
- AI Agent が直接操作可能

### cursor-ide-browser の注意点

- 手動でログインが必要（storageState 自動復元なし）
- Browser Tab を開いておく必要がある
- ref ID はページ読み込みごとに変わる可能性

---

## 参考リンク

- [Cursor Browser Documentation](https://cursor.com/docs/agent/browser)
- 実験ログ: `開発試作/zoho-creator-automation/01_計画/experiment-notes.md`
