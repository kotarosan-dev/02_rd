# Leadactionmenu — ステータス駆動型アクションメニュー

Zoho CRM の Lead 詳細ページに配置する SlyteUI コンポーネント。
現在の `Lead_Status` を読み取り、ステータスごとに適切な遷移ボタンだけを動的に表示する。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `Leadactionmenu.js`   | data / helpers / actions / observers — Slyte 規約 6 メンバ準拠 |
| `Leadactionmenu.html` | template ルート + lyte-if 条件分岐 + lyte-button |
| `Leadactionmenu.css`  | :host グリッド + flex 縦並び |

## 実装で確定したベストプラクティス

このコンポーネントは 5 回の試行錯誤の末に動作。以下が **Slyte の暗黙ルール**:

1. **class 直下に書けるのは constructor + data + 4 static セクション（methods/helpers/actions/observers）のみ**。`init()` 等は構文エラー扱い。
2. **`data()` の値は必ず `prop("型", { default })` で型宣言**。スカラ直書き不可。
3. **`actions` 内から他の action / method を `this.xxx()` で呼べない**。完全インライン化が必須。
4. **`ZDK.Page.getEntityId()` は存在しない**。レコード ID は `window.location.pathname.split("/").filter(Boolean).pop()` で取得。
5. **条件分岐は `<template is="if">` ではなく `<div lyte-if="..." comp-name="lyte-if" group-name="dynamic-components">`**（公式サンプル sample04 準拠）。
6. **`ZDK.Client.showAlert(message, heading, accept)` は位置引数の文字列**（オブジェクト渡しは NG）。
7. **`lt-prop-appearance="primary"` がスタイル指定**。`lt-prop-type` は HTML button type なので別物。

## デプロイ手順

1. Zoho CRM Setup → 開発者領域 → SlyteUI → 新規コンポーネント
2. API Name: `LeadActionMenu`（パネル「クラス名」が `Leadactionmenu` になることを確認）
3. 上記 3 ファイルの中身をコピペ
4. プレビューで動作確認 → 「公開する」
5. Setup → カスタマイズ → モジュールと項目 → Leads → ページレイアウト
6. 「Widget」枠をドラッグ → SlyteUI コンポーネント `Leadactionmenu` を選択
7. 保存

## 動作確認シナリオ

サンプルレコード `12343000002839002` で確認:
- 「ステータスを読み込み」→ 現在のステータスが表示される
- ステータスに応じて適切なボタン群だけが出る（条件分岐）
- ボタン押下 → API で `Lead_Status` 更新 → 表示も同期更新
