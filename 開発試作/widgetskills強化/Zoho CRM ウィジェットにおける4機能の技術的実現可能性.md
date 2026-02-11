# Zoho CRM ウィジェットにおける4機能の技術的実現可能性

Pinecone検索の重み付け調整、Excel出力、メール送信、関連リストウィジェットの制約の4項目すべてについて、**技術的に実現可能**であることが確認できた。ただし、いずれも直接的なAPIが用意されているわけではなく、複数の手法を組み合わせたアーキテクチャ設計が必要となる。以下、各項目の実現方法と具体的なコード例を示す。

---

## 1. Pinecone検索の重み付けはクライアントサイドで実現する

**結論：可能。** ただしPineconeにはサーバーサイドの重み付けパラメータ（alpha）は存在しない。Hybrid Searchのdense/sparse比率調整はクエリ送信前にクライアント側でベクトルをスケーリングする方式で実現する。

### Hybrid Search（dense + sparse）のalpha調整

Pineconeは**ビルトインのalphaパラメータを持たない**。公式ドキュメントには「Pinecone views your sparse-dense vector as a single vector, it does not offer a built-in parameter to adjust the weight」と明記されている。代わりに、クエリ送信前にベクトル値そのものをスケーリングする。

```python
def hybrid_score_norm(dense, sparse, alpha: float):
    """alpha * dense + (1 - alpha) * sparse の凸結合"""
    if alpha < 0 or alpha > 1:
        raise ValueError("Alpha must be between 0 and 1")
    hs = {
        'indices': sparse['indices'],
        'values': [v * (1 - alpha) for v in sparse['values']]
    }
    return [v * alpha for v in dense], hs

# alpha=1.0 → 純粋なセマンティック検索、alpha=0.0 → 純粋なキーワード検索
hdense, hsparse = hybrid_score_norm(dense_vector, sparse_vector, alpha=0.75)

results = index.query(
    vector=hdense,
    sparse_vector=hsparse,
    top_k=50,
    include_metadata=True
)
```

**Hybrid Indexの要件として`dotproduct`メトリクスが必須**であり、sparse-onlyクエリは不可という制約がある。alphaはクエリごとに動的変更可能であるため、フロントエンドのスライダーUIとの連携に最適。

### メタデータフィルタリングは「絞り込み」であり「重み付け」ではない

Pineconeのメタデータフィルタは**ブール型のプレフィルタ**として機能し、ベクトルスコアには一切影響しない。マッチ/非マッチの二値でしか動作しないため、「スキル適合度を70%重視」のような重み付けはフィルタでは不可能である。

```python
# メタデータフィルタの例（MongoDB風構文）
results = index.query(
    vector=query_vector,
    top_k=20,
    filter={
        "$and": [
            {"location": {"$eq": "Tokyo"}},
            {"salary_min": {"$lte": 8000000}},
            {"years_experience": {"$gte": 3}}
        ]
    },
    include_metadata=True
)
```

対応演算子は `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$exists`, `$and`, `$or`。フィルタは検索候補の絞り込みには有効だが、スコアリングの重み付けには使えない。

### 推奨アーキテクチャ：オーバーフェッチ + クライアントサイド重み付けリランク

スキル適合度・給与マッチ度・勤務地・経験年数などの**ビジネスロジックに基づく重み付けはクライアントサイドで実装する**のが唯一かつ推奨のアプローチ。

```javascript
// サーバーサイド（API endpoint）
async function weightedSearch(queryVector, weights, filters) {
  // Step 1: Pineconeからオーバーフェッチ（最終結果の3-10倍）
  const results = await index.query({
    vector: queryVector,
    topK: 100,
    filter: filters,
    includeMetadata: true
  });

  // Step 2: カスタム重み付けスコア計算
  const scored = results.matches.map(match => {
    const meta = match.metadata;
    const vectorScore = match.score;  // Pineconeの類似度スコア（0-1）

    const skillScore = calcSkillMatch(meta.skills, targetSkills);
    const salaryScore = calcSalaryMatch(meta.salary_min, meta.salary_max, targetSalary);
    const locationScore = meta.location === targetLocation ? 1.0 : 0.3;
    const experienceScore = calcExperienceScore(meta.years_exp, targetYears);

    const finalScore =
      weights.semantic    * vectorScore +
      weights.skill       * skillScore +
      weights.salary      * salaryScore +
      weights.location    * locationScore +
      weights.experience  * experienceScore;

    return { id: match.id, finalScore, metadata: meta, subScores: { vectorScore, skillScore, salaryScore, locationScore, experienceScore } };
  });

  // Step 3: 最終スコアでソート
  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored.slice(0, 20);
}
```

### スライダーUI実装の2層戦略

| スライダー種別 | 変更時の処理 | レイテンシ |
|---|---|---|
| Alpha（dense/sparse比率） | Pinecone再クエリが必要 | 100-500ms |
| メタデータフィルタ（勤務地等） | Pinecone再クエリが必要 | 100-500ms |
| **カスタム重み（スキル・給与等）** | **キャッシュ結果のクライアントサイド再ソートのみ** | **<10ms（即座）** |

**重み付けスライダー変更時はPinecone再クエリ不要**。初回検索結果（100件）をキャッシュし、重みスライダー変更時にはキャッシュデータに対してクライアント側で再計算・再ソートするだけで済む。これにより、APIコスト削減と即座のUXレスポンスを両立できる。

Pineconeはサーバーサイドのリランクモデル（`cohere-rerank-3.5`, `bge-reranker-v2-m3`, `pinecone-rerank-v0`）も提供しているが、これらはセマンティック関連度の再評価のみで、ビジネスロジックのカスタム重み付けには対応していない。

---

## 2. Excel出力はSheetJSクライアントサイド生成が最も実用的

**結論：可能。** SheetJSによるクライアントサイドExcel生成が最も手軽で、iframe内からのBlobダウンロードも実際に動作する実例が確認されている。

### SheetJSによるクライアントサイド生成

SheetJS（xlsx）はCDNまたはローカルバンドルでウィジェットに組み込める。CDN URLは以下の通り。

```
https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js
```

本番環境ではウィジェットZIPパッケージ内にローカルコピーを含めることを推奨（CDN依存回避、ZIPサイズ上限25MB）。

```html
<script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<script>
ZOHO.embeddedApp.on("PageLoad", function(data) {});
ZOHO.embeddedApp.init();

document.getElementById("exportBtn").addEventListener("click", function() {
  // CRMからデータ取得
  ZOHO.CRM.API.getAllRecords({ Entity: "Deals", per_page: 200 })
    .then(function(response) {
      var rows = response.data.map(function(r) {
        return {
          "案件名": r.Deal_Name,
          "金額": r.Amount,
          "ステージ": r.Stage,
          "完了日": r.Closing_Date
        };
      });

      // ワークシート・ワークブック作成
      var ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "レポート");

      // ダウンロード実行
      XLSX.writeFile(wb, "CRM_Report.xlsx");
    });
});
</script>
```

### iframe内からのファイルダウンロード

**結論：高い確率で動作する。** GitHubにはZoho CRMウィジェット内からTSVデータをダウンロードする動作実績（開発者jeznag氏の実例）が存在する。`XLSX.writeFile()`は内部的にBlobの生成とアンカータグのクリックを行うが、Zohoのiframeサンドボックスで`allow-downloads`が設定されていれば動作する。

**Zoho CRMのiframeサンドボックス属性は公式には未公開**だが、Widget SDKが`allow-scripts`、`allow-same-origin`を必要とし、`ZOHO.CRM.API.uploadFile()`がファイル操作をサポートしていることから、ファイル関連の権限は付与されていると推定される。

### ダウンロードが機能しない場合の代替策（優先順）

```javascript
// 代替策1: window.open() でBlobをダウンロード
var u8 = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
var blob = new Blob([u8], {
  type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
});
window.open(URL.createObjectURL(blob), "_blank");

// 代替策2: CRMレコードに添付ファイルとして保存
var file = new File([blob], "Report.xlsx", { type: blob.type });
ZOHO.CRM.API.attachFile({
  Entity: "Deals", RecordID: recordId,
  File: { Name: "Report.xlsx", Content: blob }
}).then(function() { alert("添付ファイルとして保存しました"); });

// 代替策3: Catalyst関数でサーバーサイド生成
window.open("https://your-catalyst-app.zohoplatform.com/server/excel-export?id=" + recordId, "_blank");
```

### PDF/レポート生成について

Zoho CRM APIには**専用のPDFレポート生成エンドポイントは存在しない**。代替手段としてZoho Analytics API（CSV/XLSX/PDF形式でのエクスポート対応）、またはZoho Writer APIによるテンプレート差し込み印刷が利用可能。DelugeのtoFile()はCSV/テキストのみ対応でXLSX生成は不可。

---

## 3. メール送信はCUSTOM FUNCTIONS経由が最も確実

**結論：可能。** ただしWidget SDKには**sendMail()メソッドは存在しない**。`ZOHO.CRM.FUNCTIONS.execute()`経由でDelugeのsendmailを呼び出す方式が推奨。

### Widget SDKのメール関連API：存在しない

`ZOHO.CRM.API`名前空間を完全に列挙した結果、**`sendMail`、`sendEmail`、`composeMail`等のメール関連メソッドは一切存在しない**。また、CRM標準のメール作成ダイアログを開く`ZOHO.CRM.UI.Record.sendMail()`も存在しない。`ZOHO.CRM.UI.Record`には`create`、`edit`、`open`、`populate`のみが定義されている。

### 推奨方式：ZOHO.CRM.FUNCTIONS.execute() + Deluge sendmail

ウィジェットからDeluge Custom Functionを呼び出し、サーバーサイドでメール送信する方式が**最もシンプルかつ確実**。

**Step 1: Delugeカスタム関数を作成（CRM設定 → 開発者スペース → 関数）**

```deluge
// 関数API名: send_email_function
// 引数: crmAPIRequest (type: string)
m_Request = crmAPIRequest.toMap();
m_Params = m_Request.get("body");

to_address = m_Params.get("to_address");
subject = m_Params.get("subject");
message = m_Params.get("message");

sendmail
[
    from: zoho.adminuserid
    to: to_address
    subject: subject
    message: message
];
return "Email sent successfully";
```

**Step 2: 関数をREST APIとして公開（関数エディタで「REST APIとして呼び出し」を有効化）**

**Step 3: ウィジェットから呼び出し**

```javascript
// マッチング結果をHTMLメール本文にフォーマット
function formatMatchingResults(matches) {
  var html = '<div style="font-family: Arial, sans-serif;">';
  html += '<h2>マッチング結果</h2>';
  html += '<table style="border-collapse: collapse; width: 100%;">';
  html += '<tr style="background-color: #4CAF50; color: white;">';
  html += '<th style="padding: 8px;">名前</th>';
  html += '<th style="padding: 8px;">スコア</th>';
  html += '<th style="padding: 8px;">スキル</th></tr>';
  matches.forEach(function(m, i) {
    var bg = i % 2 === 0 ? '#f2f2f2' : '#fff';
    html += '<tr style="background:' + bg + ';">';
    html += '<td style="padding:8px;border:1px solid #ddd;">' + m.name + '</td>';
    html += '<td style="padding:8px;border:1px solid #ddd;">' + m.score + '</td>';
    html += '<td style="padding:8px;border:1px solid #ddd;">' + m.skills + '</td></tr>';
  });
  html += '</table></div>';
  return html;
}

// メール送信実行
document.getElementById("send-btn").addEventListener("click", function() {
  var reqData = {
    "arguments": JSON.stringify({
      "to_address": document.getElementById("to-email").value,
      "subject": document.getElementById("subject").value,
      "message": formatMatchingResults(currentMatches)
    })
  };
  ZOHO.CRM.FUNCTIONS.execute("send_email_function", reqData)
    .then(function(data) { alert("送信完了"); })
    .catch(function(err) { console.error("送信失敗:", err); });
});
```

### 代替方式：CONNECTION.invoke()によるCRM Send Mail REST API呼び出し

CRMのメール送信REST API（`POST /{module}/​{record_id}/actions/send_mail`）を`ZOHO.CRM.CONNECTION.invoke()`経由で呼び出す方式は、**メールがCRMレコードのメール履歴に記録される**利点がある。ただし事前にOAuth接続の設定が必要（スコープ: `ZohoCRM.modules.emails.ALL`）。

```javascript
ZOHO.CRM.CONNECTION.invoke("zohocrm_connection", {
  url: "https://www.zohoapis.com/crm/v8/Leads/" + recordId + "/actions/send_mail",
  method: "POST",
  param_type: 2,
  parameters: {
    data: JSON.stringify([{
      from: { user_name: "Sales", email: "sales@company.com" },
      to: [{ user_name: "候補者", email: "candidate@example.com" }],
      subject: "マッチング結果のご連絡",
      content: formatMatchingResults(matches),
      mail_format: "html"
    }])
  }
}).then(function(data) { console.log(data); });
```

**制約：CRM Send Mail APIは送信先がCRMレコードとして存在する必要がある**。任意アドレスへの送信にはDeluge sendmailのほうが柔軟。

### CRM標準メールダイアログの呼び出し

**不可能。** Widget SDKにはCRM標準のメール作成画面を開くAPIが存在しない。`ZOHO.CRM.UI.Record.open()`でレコード詳細画面に遷移させ、ユーザーに手動でメールボタンを押してもらうのが唯一のネイティブUI活用パターンだが、これは実用的ではない。ウィジェット内にカスタムメールフォーム（宛先・件名・本文）を構築し、上記API経由で送信する方式を推奨する。

---

## 4. 関連リストウィジェットは高さ可変、幅は固定、モーダルはiframe内限定

### 表示サイズの制約

**幅は関連リストコンテナに固定**（レコード詳細ページの関連リスト領域の100%幅）で、`ZOHO.CRM.UI.Resize()`のwidthパラメータは関連リスト配置では実質無効。**高さはResize()で自由に変更可能**だが、デフォルトで0またはそれに近い値のため、**初期化時にResize()の呼び出しが必須**。

```javascript
ZOHO.embeddedApp.on("PageLoad", function(data) {
  // 初期高さを設定（必須）
  ZOHO.CRM.UI.Resize({ height: "500", width: "1000" })
    .then(function(result) { console.log("Resized:", result); });
});
ZOHO.embeddedApp.init();

// コンテンツに応じた動的リサイズ
function adjustHeight() {
  var h = document.body.scrollHeight;
  ZOHO.CRM.UI.Resize({ height: h.toString(), width: "1000" });
}
```

`ZOHO.CRM.UI.Resize()`は何度でも呼び出し可能であるため、コンテンツの展開・折りたたみに合わせた動的リサイズが実現可能。公式には最大値は未公開だが、ページスクロールが発生する程度の大きな値も設定可能。

### モーダル/ポップアップの制約と対処法

**iframe内でのCSSモーダル/HTML `<dialog>`要素は完全に動作する**が、**親ウィンドウ（CRM画面）へのオーバーレイは不可能**。これはブラウザの同一オリジンポリシーによる根本的な制約であり、回避手段はない。

| 手法 | 可否 | 動作範囲 |
|---|---|---|
| CSS overlay（position: fixed + z-index） | ✅ 可能 | iframe内のみ |
| HTML `<dialog>` 要素 | ✅ 可能 | iframe内のみ |
| 親CRM画面へのオーバーレイ | ❌ 不可能 | ブラウザセキュリティ制約 |
| `ZOHO.CRM.UI.Popup.open()` | ❌ 存在しない | — |
| `ZOHO.CRM.UI.Record.create()` | ✅ 可能 | CRMネイティブのレコード作成フォームを開く |

**実用的な対処法として、モーダル表示前に`ZOHO.CRM.UI.Resize()`でiframeの高さを拡大し、iframe全体をカバーするCSSオーバーレイを表示する**パターンが最も効果的。

```javascript
// モーダル表示時にiframeを拡大
function showModal() {
  ZOHO.CRM.UI.Resize({ height: "800", width: "1000" })
    .then(function() {
      document.getElementById("custom-modal").style.display = "flex";
    });
}

// モーダル閉じる時に元のサイズに戻す
function closeModal() {
  document.getElementById("custom-modal").style.display = "none";
  ZOHO.CRM.UI.Resize({ height: "500", width: "1000" });
}
```

### ZOHO.CRM.UI 名前空間の全メソッド一覧

`ZOHO.CRM.UI.Popup`は存在するが、これはボタンウィジェット用のポップアップを**閉じる**ためのメソッド（`close()`、`closeReload()`）のみ。ポップアップを**開く**メソッドは存在しない。`ZOHO.CRM.UI.Dialer`（`maximize`/`minimize`/`notify`）はテレフォニーウィジェット専用。`ZOHO.CRM.UI.Widget.open()`はWebTabウィジェットを開くもので、関連リストウィジェットからの任意ポップアップ生成には使えない。ウィジェット間の直接通信APIも存在しない。

---

## 総合実現可能性マトリクス

| 機能 | 実現可否 | 推奨アプローチ | 複雑度 |
|---|---|---|---|
| Pinecone検索の重み付け調整 | **✅ 可能** | クライアントサイドalpha + オーバーフェッチ＆リランク | 中 |
| スライダーUIによるリアルタイム調整 | **✅ 可能** | キャッシュ結果の再ソート（API再呼び出し不要） | 低 |
| Excel生成・ダウンロード | **✅ 可能** | SheetJSクライアントサイド生成 + Blobダウンロード | 低 |
| PDFレポート生成 | **⚠️ 間接的に可能** | Zoho Analytics API or Zoho Writer API | 中 |
| メール送信 | **✅ 可能** | `ZOHO.CRM.FUNCTIONS.execute()` + Deluge sendmail | 中 |
| CRM標準メールダイアログ呼び出し | **❌ 不可能** | カスタムメールフォームで代替 | — |
| ウィジェットの高さ調整 | **✅ 可能** | `ZOHO.CRM.UI.Resize()` | 低 |
| ウィジェットの幅調整（関連リスト） | **❌ 実質不可** | コンテナ幅に固定 | — |
| iframe内モーダル | **✅ 可能** | CSS overlay + Resize()で高さ拡大 | 低 |
| 親画面オーバーレイ | **❌ 不可能** | Resize()拡大 + iframe内フルスクリーンモーダルで代替 | — |

## 結論として押さえるべき設計方針

今回の調査で明らかになった最も重要な設計原則は、**Pineconeの重み付けもメール送信もExcel出力も、SDKが直接提供するのではなく、既存APIの組み合わせとクライアントサイドロジックで実現する**という点である。Pineconeのalphaは「見かけ上のパラメータ」に過ぎずクライアント側でベクトルスケーリングするものであり、カスタム重み付けはオーバーフェッチ＋クライアントリランクで実装する。メール送信はDeluge関数への委譲が必須で、Excel出力はSheetJSが事実上の標準ライブラリとなる。関連リストウィジェットのUI制約については、`Resize()`による動的高さ調整と、iframe内フルスクリーンモーダルの組み合わせにより、ユーザー体験を大きく損なうことなく十分な操作空間を確保できる。