# Zoho CRM Three.js Widget Go-To-Market Validation

Place this in `<ProjectRoot>/01_計画/project_management_docs/zoho_crm_threejs_widget_go_to_market_validation.md`.

## 目的

Three.js で作った Zoho CRM widget を「見た目がすごいデモ」ではなく、CRM 導入・改善案件として売れる用途へ変換する。

検証の主題は、3D そのものではなく、CRM 内の判断・説明・優先順位付けが速くなるかどうかに置く。

## 前提

- Zoho CRM widget は CRM 内に埋め込める UI コンポーネントで、JS SDK 経由で CRM / 外部データを扱える。
- Zoho CRM の widget 配置先には Dashboard、Web tab、Custom Button、Custom Related List、Wizard、Signal、Settings、Blueprint がある。
- 拡張機能として売る場合は、private extension と Zoho Marketplace listing の2ルートがある。
- private extension はインストール URL を使って独自販売できるが、Zoho CRM Enterprise 以上の制約がある。

参考:

- https://www.zoho.com/crm/developer/docs/widgets/
- https://www.zoho.com/crm/developer/docs/widgets/usage.html
- https://www.zoho.com/developer/help/extensions/publish-extension.html
- https://www.zoho.com/developer/help/extensions/widget-support.html

## 売り方の3ルート

| ルート | 位置づけ | 初期検証での優先度 | 理由 |
| --- | --- | --- | --- |
| 個別CRM改善案件 | 顧客のCRM画面に合わせて widget を作る | 高 | 顧客課題に合わせやすく、受託・保守にしやすい |
| Private extension | インストールURLで限定提供する | 中 | パッケージ化を試せるが、Enterprise以上の制約がある |
| Zoho Marketplace | 公開アプリとして掲載する | 低 | レビュー・資料・サポート体制が必要。勝ち筋確定後でよい |

最初に売るべきものは「3Dダッシュボード」ではなく、「CRM上で判断が詰まる場面を短くする小型 widget」です。

## 最初に検証すべきユースケース

### 1. 商談レビュー用 Pipeline Lens

対象:

- 営業責任者
- 経営者
- Zoho CRM を使っているが、商談レビューがスプレッドシートや会議資料に逃げている会社

CRM配置:

- Dashboard
- Web tab
- Custom Button on Deals

価値仮説:

- 案件ステージ、金額、確度、滞留を1画面で把握できると、週次会議の準備時間が減る。
- 3D表現は「魅せる」用途ではなく、異常値・偏り・詰まりの発見に使う。

初回デモ:

- `Deals Orbit`
- `Forecast Grid`

検証質問:

- 今の商談レビューで、CRM画面だけでは判断できず別資料に移している情報は何か。
- 週次会議で一番時間を使っている確認は何か。
- この画面があれば、誰が、どの会議で、何分短縮できるか。

成功シグナル:

- 「自社のDeals項目で見たい」と言われる
- ステージ定義、確度定義、金額項目の具体名が出る
- 会議名・利用者・頻度が具体化する

### 2. Account 360 Business Card

対象:

- B2B営業
- カスタマーサクセス
- 取引先単位で商談・活動・問い合わせを横断したい会社

CRM配置:

- Business Card Widget
- Custom Related List
- Web tab

価値仮説:

- 取引先詳細画面で、売上規模・未完了活動・関連商談を即時に把握できると、訪問前準備と引き継ぎが速くなる。

初回デモ:

- `Account Towers`
- `Activity Pulse`

検証質問:

- 取引先詳細を開いたとき、最初に見たい判断材料は何か。
- 現在はどの関連リストを何個開いて確認しているか。
- 引き継ぎや訪問前確認で、見落としが起きる項目は何か。

成功シグナル:

- Account / Deals / Tasks / Calls の結合要件が出る
- 「この順番で表示したい」という画面構成の要望が出る
- 既存関連リストでは足りない理由が説明される

### 3. Lead Quality / 入力品質 Lens

対象:

- インサイドセールス
- マーケティング
- 新規リードの取りこぼしに課題がある会社

CRM配置:

- Custom Button on Leads
- Wizard
- Business Card Widget

価値仮説:

- メール・電話・会社名・ステータス・直近接点の不足を視覚化すると、フォロー優先順位と入力補完が速くなる。

初回デモ:

- `Lead Focus`

検証質問:

- リード対応で、優先順位は何で決めているか。
- 入力不足が原因でフォロー漏れや重複対応が起きるか。
- リード品質を誰が、いつ、どの画面で確認するか。

成功シグナル:

- スコア項目・必須項目・除外条件の話が出る
- CSV流入、フォーム流入、展示会名刺など具体的な流入経路が出る
- 「この条件なら自動で色分けしたい」という運用ルールが出る

### 4. Blueprint Transition Assistant

対象:

- 承認・引き継ぎ・契約前チェックが多い組織
- 営業プロセスを Blueprint で管理している会社

CRM配置:

- Blueprint widget
- Custom Button

価値仮説:

- 遷移前に不足情報・リスク・次アクションを見せると、承認差戻しと手戻りが減る。

初回デモ:

- `Forecast Grid`
- `Activity Pulse`

検証質問:

- どのステージ遷移で差戻しが多いか。
- 承認者は何を見て判断しているか。
- 遷移前に自動チェックしたい条件は何か。

成功シグナル:

- Blueprint名、Transition名、必須条件が具体化する
- 「この項目がないと進めたくない」という条件が出る
- 差戻し件数や承認リードタイムの話になる

## 検証順

1. `Pipeline Lens` を最優先で 3社に見せる。
2. 反応が弱ければ `Account 360` に切り替える。
3. `Lead Quality` は CRM入力品質に悩む会社に限定して出す。
4. `Blueprint Assistant` は Blueprint 運用がある会社だけに出す。

## 価格・商品化仮説

| 商品 | 内容 | 価格仮説 |
| --- | --- | --- |
| Demo診断 | 既存CRMを見て widget 化できる場面を1つ特定 | 無料または低額 |
| Pilot実装 | 1画面・1配置先・mockなし実データ接続 | 10万〜30万円 |
| 業務別Widget Pack | Pipeline / Account / Lead など複数画面 | 30万〜80万円 |
| 保守・改善 | 項目変更、表示調整、Zoho仕様変更対応 | 月額3万〜10万円 |

検証では価格表を出すより、まず「この画面が自社CRMに入ったら誰が使うか」「そのために項目定義を一緒に詰める意思があるか」を見る。

## 判断基準

次の条件を満たすユースケースだけを次フェーズに進める。

- 顧客が CRM 内の具体的な配置場所を指定できる
- 画面を見る人、頻度、業務タイミングが明確
- 既存CRM画面・レポート・関連リストでは足りない理由がある
- 3D表現が意思決定や説明を速くする
- データ項目と権限の範囲が現実的

## Next Action

1. `Pipeline Lens` 用の 10分デモ台本で初回ヒアリングを行う。
2. 3社分の反応を `zoho_crm_threejs_widget_use_case_hypotheses.csv` に追記する。
3. 反応が強い1用途だけを、Zoho CRM Sandbox 内の実データ接続 pilot に進める。

