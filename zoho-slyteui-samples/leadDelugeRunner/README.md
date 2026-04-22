# leadDelugeRunner

SlyteUI から Standalone Deluge Function を呼び出す PoC。

## 全体像

1. CRM Setup > Functions に Deluge function `calculate_lead_score` を作成（コードは `../_deluge/calculate_lead_score.dg`）
2. 関数の REST API を **OAuth2** で有効化
3. SlyteUI の Lead 詳細ページに本コンポーネントを配置
4. 「スコアを計算する」ボタン押下 → ZRC が Deluge を実行 → スコア / ラベル / 根拠 / 推奨アクションを表示

## 重要ポイント

### Deluge function のシグネチャ

ZRC から呼ぶ場合、Deluge function は **`crmAPIRequest` (Map type) を引数に取る**必要がある。
HTTP body は `crmAPIRequest.get("body")` で取得できる（文字列なので `.toMap()` で Map 化）。

### ZRC からの呼び出し

```javascript
const res = await zrc.post(
  "/crm/v7/functions/calculate_lead_score/actions/execute?auth_type=oauth",
  { record_id: $Page.record_id }
);
const output = res.data.details.output;  // ← Deluge の return 値はここ
```

ポイント:
- パスは **v7**（v8 ではない。v8 では `/functions/...` 系がまだ動かないことがある）
- クエリ `?auth_type=oauth` を必ず付ける（関数側で OAuth2 を有効化済みのこと）
- 返り値は `res.data.details.output`（直接 `res.data` ではない）
- output は **オブジェクト or JSON 文字列** どちらの可能性もあるので `JSON.parse` 対応

### `lyte-if` での結果分岐表示

ローディング / 結果 / エラーを 3 つの `lyte-if` で出し分け:

```html
<div lyte-if="{{loading}}" comp-name="lyte-if" group-name="dynamic-components">...</div>
<div lyte-if="{{hasResult}}" ...>...</div>
<div lyte-if="{{hasError}}" ...>...</div>
```

各フラグは `data()` で `prop("boolean", { default: false })` 宣言。

## クラス名と配置

- Display Name: 任意（例: "LeadDelugeRunner"）
- API Name (内部) : 自動で `Leaddelugerunner` になる（先頭大文字、残り小文字）
- 配置: Lead モジュール > 詳細ページ > 関連リスト or カスタムセクション
