# Zoho CRM Widget JS SDK v1.5 全機能リファレンス

Zoho CRM Widget JS SDK v1.5は、CRM内にiframeで埋め込まれるウィジェットからCRMデータの操作・UI制御・外部API連携を行うための**JavaScript SDK**であり、**10個の主要名前空間に約60以上のメソッド**を提供する。v1.5ではSPA（Single Page Application）の完全サポート、ZRC（Zoho Resource Connector）による統一的API呼び出し構文、およびZDK.Clientによるトースト通知・確認ダイアログ・ローダー表示といった新しいUI機能が追加された。SDKはProfessional・Enterprise・Ultimateエディションで利用可能であり、CDN経由で `https://live.zwidgets.com/js-sdk/1.5/ZohoEmbededAppSDK.min.js` から読み込む。

---

## SDKの初期化とイベント駆動アーキテクチャ

ウィジェットはCRM内のiframeとして動作し、すべてのSDKメソッド呼び出しの前に初期化が必要である。**イベントリスナーの登録は必ず`init()`の前に行う**ことが重要で、順序を誤ると「undefined」エラーが発生する。

```html
<script src="https://live.zwidgets.com/js-sdk/1.5/ZohoEmbededAppSDK.min.js"></script>
<script>
ZOHO.embeddedApp.on("PageLoad", function(data) {
    // data には Entity, EntityId 等のコンテキスト情報が含まれる
    console.log(data);
});
ZOHO.embeddedApp.init();
</script>
```

登録可能なイベントは以下の通りである。

| イベント名 | トリガー条件 | 追加バージョン |
|------------|-------------|---------------|
| `PageLoad` | エンティティ詳細ページ読込時 | v1.0 |
| `DialerActive` | ソフトフォンウィンドウのトグル時 | v1.0 |
| `Dial` | CRM内の電話アイコンクリック時 | v1.0 |
| `HistoryPopState` | WebTabでのブラウザバック時 | v1.0 |
| `Notify` | Client Scriptからの非同期フライアウト通知 | v1.2 |
| `NotifyAndWait` | Client Scriptからの同期フライアウト通知 | v1.2 |
| `ContextUpdate` | Wizardフォームデータの変更通知 | v1.3 |

---

## ZOHO.CRM.API：データ操作の中核（28メソッド）

すべてのメソッドは**Promiseを返却**し、非同期で動作する。configオブジェクトでパラメータを渡す設計で統一されている。

### レコードCRUD操作

**ZOHO.CRM.API.getRecord(config)** は単一レコードの全フィールドを取得する。`config.Entity`（モジュールAPI名、例："Leads"）と`config.RecordID`が必須で、`config.approved`に`"both"`を指定すると承認待ちレコードも含めて取得できる。

```js
ZOHO.CRM.API.getRecord({Entity:"Leads", RecordID:"1000000030132", approved:"both"})
.then(function(data){ console.log(data); });
// 戻り値: { data: [{ Last_Name: "Peterson", Company: "Zylker", ... }] }
```

**ZOHO.CRM.API.getAllRecords(config)** はモジュール内の全レコードをページネーション付きで取得する。`sort_order`（"asc"/"desc"）、`page`、`per_page`、`converted`、`approved`をオプションで指定可能。戻り値の`info`オブジェクトに`more_records`フラグが含まれる。

**ZOHO.CRM.API.insertRecord(config)** は1件または複数件のレコードを作成する。`config.APIData`に単一オブジェクトまたは配列を渡し、**`config.Trigger`に`["workflow"]`、`["approval"]`、`["blueprint"]`を指定するとそれぞれのオートメーションをトリガーできる**。空配列`[]`を渡すとトリガーを無効化する。

```js
ZOHO.CRM.API.insertRecord({
    Entity: "Leads",
    APIData: [
        {"Company":"ZohoCorp","Last_Name":"Babu"},
        {"Company":"ZohoCorp","Last_Name":"Naresh"}
    ],
    Trigger: ["workflow"]
}).then(function(data){ console.log(data); });
```

**ZOHO.CRM.API.updateRecord(config)** はレコードを更新する。`APIData`内に必ず`id`フィールドを含める必要がある。**ZOHO.CRM.API.upsertRecord(config)** はinsert-or-updateを実行し、`duplicate_check_fields`で重複チェック対象フィールドを指定できる。**ZOHO.CRM.API.deleteRecord(config)** は`Entity`と`RecordID`を指定してレコードを削除する。

### 検索とCOQL

**ZOHO.CRM.API.searchRecord(config)** は4種類の検索タイプをサポートする。`Type`パラメータに`"email"`、`"phone"`、`"word"`、`"criteria"`を指定し、`Query`に検索文字列を渡す。criteria検索では`"(Company:equals:Zoho)"`のような構文や、`"((Company:equals:Zoho)or(Company:equals:zylker))"`のような複合条件が使える。`delay:false`を指定するとディレイなしで即座に結果を取得する。

**ZOHO.CRM.API.coql(config)**（v1.2追加）はCRM Object Query Languageによる柔軟なクエリを実行する。SQLライクな構文でフィールド選択・条件指定・ソート・リミットが可能。

```js
ZOHO.CRM.API.coql({
    select_query: "select Last_Name, First_Name from Contacts where Last_Name = 'Boyle' limit 2"
}).then(function(data){ console.log(data); });
```

### 関連リスト操作

**ZOHO.CRM.API.getRelatedRecords(config)** は親レコードの関連リストレコードを取得する（`Entity`、`RecordID`、`RelatedList`が必須）。**ZOHO.CRM.API.updateRelatedRecords(config)** は関連レコードのデータを更新し、**ZOHO.CRM.API.delinkRelatedRecord(config)** はレコード間のリンクを解除する。

### 承認・Blueprint・ユーザー・プロファイル

| メソッド | 説明 | 主要パラメータ |
|---------|------|--------------|
| `approveRecord(config)` | レコードの承認/却下/委任/再送信 | `actionType`: "approve"/"reject"/"delegate"/"resubmit" |
| `getApprovalRecords(config)` | 承認待ちレコード一覧取得 | `type`: "awaiting"（デフォルト）/"others_awaiting" |
| `getApprovalById(config)` | 特定の承認詳細取得 | `id`: 承認ID |
| `getApprovalsHistory()` | 承認履歴の取得 | パラメータなし |
| `getBluePrint(config)` | Blueprintの詳細取得 | `Entity`, `RecordID` |
| `updateBluePrint(config)` | Blueprintのトランジション更新 | `BlueprintData`にtransition_idとdataを指定 |
| `getAllUsers(config)` | ユーザー一覧取得 | `Type`: "AllUsers"/"ActiveUsers"/"AdminUsers"等9種類 |
| `getUser(config)` | ユーザー詳細取得 | `ID`: ユーザーID |
| `getAllProfiles()` | 全プロファイル取得 | パラメータなし |
| `getProfile(config)` | プロファイル詳細取得 | `ID`: プロファイルID |
| `updateProfile(config)` | プロファイル権限更新 | `ID`, `APIData` |
| `getAllActions(config)` | レコードの利用可能アクション一覧 | `Entity`, `RecordID` |

### ファイル・ノート操作

**ZOHO.CRM.API.addNotes(config)** は`Title`と`Content`を指定してレコードにノートを追加する。**ZOHO.CRM.API.attachFile(config)** はBlob形式のファイルをレコードに添付し、**ZOHO.CRM.API.uploadFile(config)** はZohoサーバーにファイルをアップロードしてIDを取得、**ZOHO.CRM.API.getFile(config)** はそのIDからファイルを取得する。

### 組織変数

**ZOHO.CRM.API.getOrgVariable(config)** はプラグイン設定データを取得する。文字列で単一変数名を渡すか、`{apiKeys:["key1","key2"]}`で複数変数を一括取得できる。

---

## ZOHO.CRM.UI：ユーザーインターフェース制御

### ウィジェットリサイズ

**ZOHO.CRM.UI.Resize({height, width})** はウィジェットのiframeサイズをピクセル単位で変更する。v1.3で関連リストウィジェット、v1.4でWizardウィジェットのリサイズもサポートされた。

```js
ZOHO.CRM.UI.Resize({height:"500", width:"800"}).then(function(data){
    console.log(data); // True
});
```

### ポップアップ制御

**ZOHO.CRM.UI.Popup.close()** はボタンアクションウィジェット等のポップアップを閉じる（CRMページはリロードしない）。**ZOHO.CRM.UI.Popup.closeReload()** はポップアップを閉じた後にCRMページをリロードする。レコード更新後にユーザーに最新データを表示したい場合に使用する。

### レコード画面操作

**ZOHO.CRM.UI.Record**名前空間は4つのメソッドを提供する。

| メソッド | 説明 | パラメータ |
|---------|------|----------|
| `create({Entity, Target?})` | 新規レコード作成画面を開く | `Target:"_blank"`で新タブ |
| `edit({Entity, RecordID, Target?})` | レコード編集画面を開く | 同上 |
| `open({Entity, RecordID, Target?})` | レコード詳細画面を開く | 同上 |
| `populate(RecordData)` | 現在のフォームにデータをプリフィル | サブフォームも配列で対応可 |

`populate`はWizardやBlueprintのコンテキストで特に有用であり、サブフォームデータも配列形式で渡せる。

```js
ZOHO.CRM.UI.Record.populate({
    "Company": "zoho",
    "Last_Name": "uk",
    "sub_form_api_name": [
        {"name1":"uk","email":"uk@zoho.com"},
        {"name1":"mail","email":"mail@zoho.com"}
    ]
});
```

### ダイアラー（テレフォニー）制御

**ZOHO.CRM.UI.Dialer**はソフトフォン統合用の3メソッドを提供する。`maximize()`でダイアラーウィンドウを最大化、`minimize()`で最小化、`notify()`で着信音等の通知音を鳴らす。いずれもテレフォニーウィジェット内でのみ有効。

### ウィジェット間通信

**ZOHO.CRM.UI.Widget.open(config)** はWebTabウィジェットを開き、`Message`オブジェクトでカスタムデータを渡すことができる。

```js
ZOHO.CRM.UI.Widget.open({
    Entity: "WebTab1_Widget",
    Message: {arg1:"Argument 1", nested:{subArg1:"SubArgument 1"}}
});
```

---

## ZOHO.CRM.CONFIG・META：設定とメタデータ

### CONFIG名前空間

**ZOHO.CRM.CONFIG.getCurrentUser()** はログインユーザーの`full_name`、`id`、`email`、`role`（名前・ID）、`profile`（名前・ID）、`status`、`zuid`を返す。ウィジェットUI のパーソナライズやロールベースの条件分岐に必須のメソッドである。

**ZOHO.CRM.CONFIG.getOrgInfo()** は組織レベルのプラグイン設定データを取得する。**ZOHO.CRM.CONFIG.getUserPreference()**（v1.4追加）は現在のユーザーのテーマ設定（Day/Night）を取得する。

### META名前空間（6メソッド）

| メソッド | 説明 | 主要パラメータ |
|---------|------|--------------|
| `getModules()` | 利用可能な全モジュール一覧を取得 | なし |
| `getFields({Entity})` | モジュールの全フィールドメタデータ取得 | フィールドタイプ・ピックリスト値・view_type等を含む |
| `getLayouts({Entity, LayoutId?})` | レイアウト情報取得 | セクション・フィールド配置情報を含む |
| `getRelatedList({Entity})` | 関連リストメタデータ取得 | 関連リストのAPI名等 |
| `getCustomViews({Entity, Id?})` | カスタムビュー一覧・詳細取得 | フィルタ条件・ソート情報含む |
| `getAssignmentRules({Entity})` | 割り当てルール取得 | ルール名・作成者・日付 |

`getFields`の戻り値には`data_type`、`pick_list_values`、`view_type`（view/edit/quick_create/create）、`formula`、`unique`等の詳細メタデータが含まれ、**動的フォーム構築やバリデーションロジックの実装に不可欠**である。

---

## 外部連携：CONNECTION・CONNECTOR・HTTP・FUNCTIONS

### ZOHO.CRM.CONNECTION.invoke()

DRE（Developer Resource Extensions）コネクションを通じてサードパーティAPIを呼び出す。**OAuthトークン管理はZoho CRM側が自動処理**するため、ウィジェット開発者は認証ロジックを実装する必要がない。

```js
ZOHO.CRM.CONNECTION.invoke("mailchimp4", {
    method: "POST",
    url: "http://mailchimp.api/sample_api",
    parameters: {param1:"value1"},
    headers: {header1:"value1"},
    param_type: 1  // 1=params, 2=body
}).then(function(data){ console.log(data); });
```

### ZOHO.CRM.CONNECTOR（2メソッド）

`authorize(nameSpace)`でコネクタのOAuth認可ウィンドウを表示し、`invokeAPI(nameSpace, data)`でコネクタAPIを実行する。マルチパートリクエストやファイルアップロードもサポートし、`CONTENT_TYPE:"multipart"`、`PARTS`配列、`FILE`オブジェクトで制御する。

### ZOHO.CRM.HTTP（5メソッド）

`get`、`post`、`put`、`patch`、`delete`の5つのHTTPメソッドを提供する。任意のURLに対してリクエストを送信でき、CRM APIのラッパーでカバーされない独自エンドポイントへのアクセスに使用する。**認証ヘッダーは開発者が自身で管理する必要がある**。

```js
ZOHO.CRM.HTTP.post({
    url: "https://api.example.com/data",
    headers: {Authorization: "Bearer xxxxxx"},
    body: {key:"value"}
}).then(function(data){ console.log(data); });
```

### ZOHO.CRM.FUNCTIONS.execute()

CRMに登録されたDeluge関数（REST APIとして公開済み）をウィジェットから実行する。**v1.4で実行スコープが管理者権限からログインユーザー権限に変更された**。引数は`JSON.stringify()`で文字列化して渡す。

```js
ZOHO.CRM.FUNCTIONS.execute("custom_function4", {
    arguments: JSON.stringify({mailid:"user@example.com"})
}).then(function(data){ console.log(data); });
```

---

## Blueprint・Wizardとの連携

**ZOHO.CRM.BLUEPRINT.proceed()**（v1.1追加）はBlueprintトランジション内のウィジェットから次のステートへ進行させる。1つのトランジションに紐づけられるウィジェットは**1つのみ**という制約がある。

**ZOHO.CRM.WIZARD.post(record_data)**（v1.1追加）はWizardステップ内のウィジェットからレコードフォームにフィールドデータを渡す。`ContextUpdate`イベント（v1.3追加）と組み合わせることで、Wizardフォームの変更をリアルタイムに検知してウィジェットUIを動的に更新できる。

---

## v1.5の新機能：ZDK.Clientと$Client

v1.5で追加されたZDK.Client名前空間は、**マークダウンサポート付きのトースト通知やユーザー入力取得**を提供する。

| メソッド | 説明 |
|---------|------|
| `ZDK.Client.showMessage()` | マークダウン対応のトーストメッセージ表示 |
| `ZDK.Client.showConfirmation()` | 確認ダイアログ（マークダウン対応） |
| `ZDK.Client.showAlert()` | アラートメッセージ（マークダウン対応） |
| `ZDK.Client.getInput()` | ユーザーから1つ以上の入力を取得 |
| `ZDK.Client.openPopup()` | ウィジェットをポップアップで開く |
| `ZDK.Client.showLoader()` | ローディングインジケータ表示 |
| `ZDK.Client.hideLoader()` | ローディングインジケータ非表示 |
| `ZDK.Client.sendResponse(id, data)` | Client ScriptのNotifyAndWaitへの応答送信 |

**$Client.close()** はClient Scriptから開かれたウィジェットを閉じるために使用する。

v1.5の最大の技術的進歩は**マルチページ/SPAサポート**で、React・Angular・Vueなどのクライアントサイドルーティングを使用するアプリケーションで、**どのルートからでもSDKメソッドを呼び出せる**ようになった。

---

## ウィジェット配置場所は10種類

Zoho CRMは以下の配置場所をサポートしており、各場所で利用可能なAPIが異なる。

| 配置場所 | 説明 | モバイル対応 |
|---------|------|-------------|
| **カスタムボタン** | リストビュー・詳細ページのボタンクリックでアクション実行 | ○ |
| **関連リスト** | レコード詳細画面内の関連リストとして表示 | ○ |
| **WebTab** | フルタブとしてモジュールのように表示 | ○ |
| **ダッシュボード** | ホームページダッシュボードに埋め込み | × |
| **Blueprint** | Blueprintトランジション内に配置（1トランジション1ウィジェット） | ○ |
| **Wizard** | Wizardのステップ内に埋め込み | ○ |
| **Signal** | シグナル通知の詳細パネルに表示 | × |
| **Settings** | 設定画面のコンポーネントとして配置 | × |
| **テレフォニー** | コールセンター/ソフトフォン統合 | — |
| **ビジネスカード** | レコードビューページにカスタム形式で表示 | — |

---

## 制約事項とAPI制限の全体像

### パッケージ・リソース制限

ZIPファイルの最大サイズは**25MB**、プロジェクト内の最大ファイル数は**250ファイル**、個別ファイルの上限は**5MB**である。組織あたりの最大ウィジェット数はEnterprise/Ultimateで**200個**。

### API呼び出し制限

ウィジェットのAPI呼び出しは組織のCRM APIクレジットシステムを共有する。Professionalでは24時間あたり**50,000 + (ユーザー数 × 500)クレジット**（上限300万）、Enterpriseでは**50,000 + (ユーザー数 × 1,000)クレジット**（上限500万）が割り当てられる。同時実行数（コンカレンシー）はEnterprise で**20**、COQL・検索・一括更新等のリソース集約型APIは**サブコンカレンシー上限10**が適用される。

### セキュリティ・技術的制約

ウィジェットはCRMと同じ**SAML SSO 2.0認証**を使用し、APIの権限はログインユーザーのプロファイルとロールに従う。開発者権限は「設定 → ユーザーと制御 → セキュリティ制御 → プロファイル → 開発者権限」で有効化する。v1.0.5以降jQuery依存は廃止されている。

---

## まとめと開発ベストプラクティス

Zoho CRM Widget JS SDK v1.5は成熟した包括的なSDKであり、CRM内のあらゆるデータ操作・UI制御・外部連携を単一のJavaScriptインターフェースで実現する。開発における重要な原則は3つある。第一に、**イベント登録→init()→SDK呼び出し**の順序を厳守すること。第二に、外部APIへのアクセスには`ZOHO.CRM.HTTP`の直接呼び出しよりも`ZOHO.CRM.CONNECTION.invoke()`を優先し、OAuth管理をZoho側に委譲すること。第三に、複雑なサーバーサイドロジックには`ZOHO.CRM.FUNCTIONS.execute()`を活用してDeluge関数をウィジェットから実行し、クライアントサイドのコード量を最小限に保つこと。v1.5のSPAサポートにより、モダンフレームワークでの開発がシームレスになった点も、今後のウィジェット開発戦略に大きく影響する。