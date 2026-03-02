# Zoho Learn API - Refresh Token 取得手順

## なぜ必要か

Zoho Learn APIは「ポータルメンバーのユーザートークン」が必要です。
Client Credentials（機械トークン）では `9007 Invalid hub` エラーが発生します。

## 手順（Self Client）

### Step 1: Developer Console にアクセス

https://accounts.zoho.jp/developerconsole

### Step 2: 対象クライアントを選択

`ZOHO_CLIENT_ID` のクライアントをクリック。

### Step 3: 「Generate Code」タブ（またはSelf Client）

スコープを入力：
```
ZohoLearn.course.READ,ZohoLearn.course.CREATE,ZohoLearn.course.UPDATE,ZohoLearn.lesson.CREATE,ZohoLearn.lesson.READ
```

Time duration: **10 minutes**

→ 「Create」をクリックして `code` を取得。

### Step 4: Refresh Token を取得

下記スクリプトを実行（codeを引数に渡す）:

```bash
node get-tokens.mjs <ここにcodeを貼る>
```

### Step 5: .env に追記

取得した `ZOHO_LEARN_REFRESH_TOKEN` を .env に追加：
```
ZOHO_LEARN_REFRESH_TOKEN=1000.xxxx.yyyy
ZOHO_LEARN_PORTAL_URL=kotarosan-portal
```
