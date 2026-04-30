# Zoho CRM AI SDK Widget Feasibility

Place this in `<ProjectRoot>/01_計画/project_management_docs/zoho_crm_ai_sdk_widget_feasibility.md`.

## 結論

可能。ただし、Claude Code SDK / Cursor SDK / OpenAI Agents SDK のような agent SDK を Zoho CRM widget の iframe 内で直接動かす設計は避ける。

正しい分担は次の形。

```text
Zoho CRM Widget
  - CRM内UI
  - ZOHO SDKでrecord/context取得
  - 結果表示、ユーザー確認、軽い操作

Backend / Zoho Function / Cloud Agent
  - APIキー保持
  - OpenAI / Anthropic / Cursor SDK 実行
  - MCP / CRM API / DB / WorkDrive 連携
  - 長時間処理、tool execution、監査ログ
```

widget は「AIの操作パネル」であり、agent runtime ではない。

## なぜ widget 直実行を避けるか

| 論点 | 判断 |
| --- | --- |
| APIキー | widget内に置くと顧客ブラウザへ露出する |
| SDK実行環境 | Claude Code / Cursor SDK は Node.js、CLI、VM、repo clone、shell、MCP などを前提にする |
| 長時間処理 | iframe内の画面遷移・リロード・ネットワーク切断に弱い |
| 権限管理 | CRMデータの読み書き、メール送信、PR作成などはユーザー確認と監査ログが必要 |
| Zoho制約 | internal widget は静的ファイル中心。外部サービス連携は backend / connection / function 経由が安全 |

## 使える実装パターン

### Pattern A: Widget + AI Backend API

最有力。

```text
Widget -> Backend API -> OpenAI Agents SDK / Anthropic API / Cursor SDK
       <- stream/result <-
```

用途:

- 商談要約
- 次アクション提案
- リスク診断
- Pipeline Lens の自然言語解説
- CRM入力品質チェック

利点:

- APIキーを隠せる
- SDKをNode/Pythonで自由に使える
- ストリーミング、キュー、ログ、承認フローを作れる

注意:

- 顧客CRMデータを外部送信するため、送信範囲、保存有無、利用規約、同意設計が必要。

### Pattern B: Widget + Zoho CRM FUNCTIONS.execute

軽量なAI処理に向く。

```text
Widget -> ZOHO.CRM.FUNCTIONS.execute() -> Deluge Function -> AI API
```

用途:

- 1レコードの要約
- 入力漏れチェック
- 簡単な分類
- 営業メモの整形

利点:

- Zoho内の権限・接続設定に寄せやすい
- CRM管理者に説明しやすい

注意:

- Claude Code / Cursor のような coding agent SDK には向かない。
- 長時間実行・複数turn・大量データ処理は backend のほうがよい。

### Pattern C: Widget + Cloud Coding Agent

CRMのエンドユーザー向けではなく、Zoho導入支援・開発者向け。

```text
Widget/管理画面 -> Backend -> Cursor SDK / Claude Code SDK / OpenAI Agents SDK
                         -> branch / PR / widget draft / Deluge draft
```

用途:

- Zoho CRM項目定義から widget 雛形を生成
- Deluge / Client Script / Widget の初稿を生成
- 顧客別のCRM改善案をコード化
- sandbox repoにPRを作る

利点:

- 受託開発・Zoho Partner向け商品にしやすい
- Cursor SDK の cloud runtime / dedicated VM / PR 作成機能と相性がよい

注意:

- 顧客CRM本番を直接変更しない。
- 初期は git repo / sandbox / mock data に限定する。

### Pattern D: MCP Bridge

中長期。

```text
Agent SDK -> MCP server -> Zoho CRM tools
```

用途:

- `get_deal_summary`
- `search_accounts`
- `draft_followup_email`
- `check_blueprint_readiness`
- `create_task_after_user_approval`

利点:

- OpenAI / Claude / Cursor など複数agentから同じCRM操作を使える。
- tool権限を細かく制御できる。

注意:

- write操作は必ず人間確認を挟む。

## SDK別の現実的な使い方

| SDK / API | CRM widget内で直接実行 | 推奨配置 | CRM商品化の使い道 |
| --- | --- | --- | --- |
| OpenAI Responses API | 非推奨 | Backend / Deluge Function | レコード要約、分類、次アクション、構造化出力 |
| OpenAI Agents SDK | 非推奨 | Backend / Python or TypeScript service | 複数tool、承認、MCP、長いワークフロー |
| OpenAI Codex系モデル | 非推奨 | Backend / agent service | Zoho widget / Deluge / Client Script 生成補助 |
| Claude Code SDK | 不向き | Node/Python backend / local or CI | 開発者向け生成、レビュー、PR作成 |
| Cursor SDK | 不向き | Node backend / Cursor cloud or local runtime | 顧客別widget生成、CRM改善PR、社内agent platform |
| Anthropic Claude API | 非推奨 | Backend / Deluge Function | 文章生成、要約、分類、営業支援 |

## 売れる方向性

### 1. AI Pipeline Lens

現在の Three.js デモに一番近い。

画面:

- Deals Orbit
- Forecast Grid
- 右側にAI解説パネル

AIが出すもの:

- 今週見るべき商談
- 停滞しているステージ
- 確度と金額の矛盾
- 次回会議で確認すべき質問

商品名:

- AI Pipeline Review Widget

初回pilot:

- Deals 50件を読み、AI summary と risk flags を出す。
- writeback なし。

### 2. AI Deal Coach

商談詳細画面の custom button / business card 向け。

AIが出すもの:

- 商談メモの要約
- 失注リスク
- 次回アクション
- 決裁者・予算・時期の不足チェック
- フォローアップメール下書き

注意:

- メール送信は自動化しない。必ず下書き止まり。

### 3. AI Data Quality Lens

Lead / Account / Contact の入力品質向け。

AIが出すもの:

- 入力不足
- 表記揺れ
- 重複候補
- 業種・規模の推定候補
- 補完すべき項目

商品化しやすい理由:

- CRM改善の費用対効果を説明しやすい。
- AIが派手でなくても実務価値が出る。

### 4. AI Zoho Builder for Partners

Cursor SDK / Claude Code SDK / OpenAI Agents SDK と一番相性がよい。

対象:

- Zoho導入支援者
- 社内CRM管理者
- 開発者

AIがやること:

- CRM要件から widget spec を作る
- Deluge / widget / Client Script の初稿を作る
- git branch / PR を作る
- demo screenshot を添付する

商品化:

- エンドユーザー向けAI機能ではなく、導入支援の生産性向上ツールとして売る。

## 最初のPoC案

### PoC-1: AI Pipeline Lens

範囲:

- 既存 `zoho-crm-threejs-widget-demos` に AI panel を追加
- mock Deals を backend に送り、AI summary を返す
- 実CRM writebackなし

技術:

- Widget: existing vanilla JS
- Backend: Node Express or lightweight Vercel/Cloudflare Worker
- AI: OpenAI Responses API または Anthropic Messages API
- Output: JSON schema

期待出力:

```json
{
  "summary": "今週はNegotiationの大型案件が偏っています。",
  "risks": [
    { "recordId": "D-1002", "reason": "金額が大きいが次アクションが未設定" }
  ],
  "questions": [
    "決裁者は誰か",
    "次回接点日はいつか"
  ]
}
```

### PoC-2: AI Widget Builder

範囲:

- CSV/YAMLのCRM要件から widget demo の派生版を作る
- Cursor SDK or Claude Code SDK は backend/CLI 側で実行
- 生成物は repo branch / work_files に出す

用途:

- 「CRMの中で動くAI」ではなく、「CRM widgetを量産するAI」として検証する。

## 判断

最初に作るべきは `AI Pipeline Lens`。

理由:

- 既存 Three.js デモをそのまま使える
- AIの価値が「自然言語の解説」として見えやすい
- writebackなしで安全に試せる
- 商談レビューの売り方とつながる

次に作るべきは `AI Zoho Builder for Partners`。

理由:

- Claude Code / Cursor SDK / Codex系の強みが出る
- 顧客別カスタムwidget作成を短縮できる
- 受託開発の生産性向上として明確に売れる

## Next Action

1. `AI Pipeline Lens` の mock backend を追加する。
2. widget右側に `AI Insight` panel を追加する。
3. 最初は OpenAI/Anthropic のどちらでも差し替えられる provider interface にする。
4. CRM writeback は入れない。
5. 生成結果は summary / risks / questions の JSON に限定する。

