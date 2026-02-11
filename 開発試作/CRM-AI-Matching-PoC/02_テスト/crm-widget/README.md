# AI Matching Widget（CRM ウィジェット）

求職者・求人レコードの関連リストに表示し、AIマッチング候補を表示する Zoho CRM ウィジェットです。

## 必須: CRM Connection の作成

ウィジェットから Catalyst API を呼び出すには、**「Custom Service」タイプ**の Connection が必須です。  
（「Zoho Catalyst」タイプではカスタム関数の URL 指定ができず、CORS 回避のため Custom Service を使用します。）

### 手順

1. CRM で **設定** > **開発者スペース** > **接続** > **接続を追加**
2. **Custom Service** を選択（Zoho Catalyst ではない）
3. 以下を設定:

| 項目 | 値 |
|------|-----|
| Service Name | `catalyst_matching_api` |
| Service URL | `https://{あなたのCatalystプロジェクト}.development.catalystserverless.jp`（末尾スラッシュなし） |
| Authentication Type | API Key（任意。Catalyst 側で未使用ならダミーで可） |
| Parameter Type | Header |
| Parameter Key | `X-Api-Key` など |
| Parameter Value | 任意 |

4. 保存後、ウィジェットの `CONFIG.CONNECTION_NAME` と Service Name が一致していることを確認（既定: `catalyst_matching_api`）。

## ファイル構成

- `app/widget.html` … 本番エントリ（関連リストで読み込まれる）
- `app/js/widget.js` … 本番ロジック（CONNECTION.invoke・Resize・マッチ表示）
- `app/js/main.js` … テスト/スタンドアロン用（CONNECTION 未使用時はモック）
- `app/css/style.css` … スタイル
- `plugin-manifest.json` … ウィジェット名・配置場所・スコープ

## 配置場所

- **関連リスト**（`crm.record.detail.related_list`）
- モジュール: JobSeekers, Jobs

関連リストは高さがデフォルトでほぼ 0 のため、`widget.js` 内で PageLoad 時に `ZOHO.CRM.UI.Resize({ height: '500', width: '1000' })` を実行しています。

## パッケージ化・アップロード

```bash
# ZET CLI が入っている場合
zet pack
# 生成された ZIP を CRM 設定 > 開発者スペース > ウィジェット からアップロード
```

ZET 未使用の場合は、`app/` 以下と `plugin-manifest.json` をルートに含む ZIP を手動で作成してください。

## 参照

- zoho-setup スキル: CRMウィジェット × Catalyst 統合パターン（CONNECTION.invoke・Custom Service）
- zoho-crm-widget スキル: イベント登録→init→SDK、Resize、CONNECTION.invoke 推奨
