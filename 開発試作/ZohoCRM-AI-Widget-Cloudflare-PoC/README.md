# Zoho CRM AI Widget Cloudflare PoC

Zoho CRM Widget 上で動く、軽量 three.js 表現と Cloudflare Pages Functions の AI Insight API を組み合わせたPoCです。1つの widget に複数の demo mode を持たせ、Zoho SDK がある環境では CRM API を読み、ローカルでは mock data で同じ画面を確認できます。

## 配置

Place this in `<ProjectRoot>/開発試作/ZohoCRM-AI-Widget-Cloudflare-PoC/`.

## デモ内容

- `Deals Orbit`: 案件ステージと金額規模を 3D orbit で表示
- `Account Towers`: 取引先の規模・業種を低ポリゴンの tower map で表示
- `Activity Pulse`: タスク・通話・活動の滞留を pulse ring で表示
- `Lead Focus`: 見込み客の情報充足度と接点状況を radial graph で表示
- `Forecast Grid`: 確度別の売上見込みを compact grid で表示

## ローカル実行

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\ZohoCRM-AI-Widget-Cloudflare-PoC"
npm run check:files
npm run serve
```

ローカル URL:

```text
http://127.0.0.1:5174/widget.html
```

## Zoho CRM Widget 化

ZET CLI で検証・パッケージ化します。手動 ZIP は使用しません。

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\ZohoCRM-AI-Widget-Cloudflare-PoC"
zet validate
zet pack
```

## Cloudflare Pages 外部ホスティング

Zoho CRM の Widget 作成画面で `External Hosting` を選ぶ場合は、Cloudflare Pages の公開URLを指定します。

Cloudflare 側の役割:

- `app/`: Pages で配信する静的 widget
- `functions/api/insight.js`: Pages Functions で動く AI Insight API

ローカル確認:

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\ZohoCRM-AI-Widget-Cloudflare-PoC"
npm run cf:dev
```

デプロイ:

```powershell
npm run cf:deploy
```

Cloudflare Dashboard から作る場合:

- Workers and Pages > Create > Pages
- Git連携または Direct Upload を選択
- Git連携時の build command は空、build output directory は `app`
- Pages Functions を使う場合は、この project root の `functions/` を含めてデプロイ
- Zoho ZET pack との共存を優先するため、Cloudflare専用の `_headers` は `app/` には置かない
- Zoho CRM 側には `https://{project}.pages.dev/widget.html` を External Hosting URL として設定

AI APIキーは Pages のフロントには置かず、Cloudflare の environment variable / secret に入れます。

## Cloudflare Workers deploy 設定

Cloudflare 側の deploy command が `npx wrangler deploy` の場合は、repo root の `wrangler.jsonc` を使います。

現在の Cloudflare build setting:

```text
Root directory: /
Deploy command: npx wrangler deploy
```

この設定では repo root の `wrangler.jsonc` が次を明示します。

- static assets: `開発試作/ZohoCRM-AI-Widget-Cloudflare-PoC/app`
- Worker entry: `開発試作/ZohoCRM-AI-Widget-Cloudflare-PoC/worker.js`
- API route: `/api/insight`

ローカル確認:

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\ZohoCRM-AI-Widget-Cloudflare-PoC"
npm run worker:dev
```

Cloudflare の失敗ログに `Could not detect a directory containing static files` が出た場合は、`wrangler.jsonc` が repo root に含まれているかを確認します。

## 実装方針

- vanilla HTML/CSS/JS と `app/lib/three-adapter.js` で構成
- `app/lib/three.module.min.js` がある場合はそれを最優先で読み込む
- vendored three.js がない場合は jsDelivr の three.js module を試し、ネットワーク不可のローカル検証では `three-lite.js` fallback で canvas 描画を継続する
- textures、postprocessing、外部 font、重い UI framework は未使用
- `ZOHO.embeddedApp.on("PageLoad")` 登録後に `ZOHO.embeddedApp.init()` を実行
- CRM 由来の表示値は `textContent` / DOM node 生成で扱い、`innerHTML` に流し込まない
- Zoho SDK 不在時は `app/js/zoho-mock.js` が mock context と mock records を提供

## three.js を vendoring できる場合

ネットワークが通る環境では、`three.module.min.js` を `app/lib/` に置くと adapter が自動でそちらを使います。

```powershell
cd "C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\開発試作\ZohoCRM-AI-Widget-Cloudflare-PoC"
npm pack three --pack-destination "."
# tarball から package/build/three.module.min.js を app/lib/three.module.min.js へコピー
```
