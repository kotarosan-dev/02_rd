# Zoho CRMウィジェットで実現できるリッチUI/UXの全貌

**Zoho CRMウィジェットは、iframe内で動作する完全な小型Webアプリケーションであり、事実上あらゆるフロントエンド技術が利用可能である。** CSS Animations、GSAP、Lottie等のアニメーションライブラリ、Chart.js・ECharts等のチャートライブラリ、SortableJS等のドラッグ＆ドロップライブラリ、さらにはTailwind CSS、Bootstrap、Shoelace（Web Components）等のデザインシステムまで、CDN経由またはZIP同梱で自由に導入できる。パッケージサイズ上限は**25MB・約250ファイル**であり、WebTab配置なら全画面キャンバスも使える。本レポートでは、4つの観点から「ここまでできる」という限界線を具体的に示す。

---

## ウィジェットの技術基盤はiframeベースの独立したWebアプリ

Zoho CRMウィジェットの本質は、CRM画面内に埋め込まれた**iframeの中で動作する独立したHTMLページ**である。Zoho公式も「You can use any JavaScript or CSS framework you would like within your widget（ウィジェット内では好きなJS/CSSフレームワークを使ってよい）」と明言しており、技術選定の自由度は極めて高い。

通信はZoho Embedded App JS SDK（`ZohoEmbededAppSDK.min.js`）が`postMessage`を抽象化して処理する。`window.parent`への直接DOMアクセスはできないが、**SDK経由でCRMデータの取得・更新、外部API呼び出し、UI制御（ポップアップ・トースト・リサイズ）**が可能だ。SDK v1.5では`ZDK.Client`名前空間が追加され、`showMessage()`（トースト通知）、`showConfirmation()`（確認ダイアログ）、`getInput()`（入力フォーム）、`showLoader()`/`hideLoader()`（ローディング表示）などのネイティブUI機能が大幅に強化された。

外部ライブラリの読み込み方法は2通りある。**CDN経由**では`<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`のようにHTMLに記述するだけでよい。**ローカル同梱**では`app/js/`フォルダにライブラリファイルを配置し、`zet pack`でZIPパッケージに含める。CDN経由の場合はZIPサイズ制限（25MB）に影響しないため、大きなライブラリはCDN読み込みが推奨される。

| 制約項目 | 値 |
|---------|-----|
| ZIPパッケージ最大サイズ | **25MB** |
| パッケージ内最大ファイル数 | 約**250ファイル** |
| 個別ファイルサイズ上限 | 約**5MB** |
| 組織あたり最大ウィジェット数 | **200**（Enterprise/Ultimate） |
| SDK最新バージョン | v1.5（`live.zwidgets.com/js-sdk/1.5/`） |

---

## 1. アニメーション・トランジション：CSSだけで驚くほど表現できる

### 標準技術はすべて動作する

CSS Animations（`@keyframes`）、CSS Transitions、Web Animations API（`element.animate()`）は**iframe内でも完全に動作する**。iframeは独自のCSSOmを持つため、親ページとの干渉もない。GPU高速化対象プロパティ（`transform`、`opacity`、`filter`）はコンポジタースレッドで処理され、メインスレッドをブロックしない。

純粋なCSS/JSだけで実現できるマイクロインタラクションの例を以下に示す。

**ボタンホバー効果**（CSS Transitionのみ）：`transform: translateY(-2px)` + `box-shadow`の変化で浮き上がり効果を実現。`:active`で`scale(0.98)`を適用すればクリック感も再現できる。**スケルトンスクリーン**は`background`に`linear-gradient`を設定し、`background-position`をアニメーションさせるだけで実装可能。**トースト通知**は`transform: translateX(120%)`からの`translateX(0)`遷移で画面右からスライドイン、`cubic-bezier(0.68, -0.55, 0.27, 1.55)`のイージングでバウンス効果を加えられる。**フォームバリデーション**では`shake`キーフレーム（左右に6px振動）で入力エラーを視覚的にフィードバックできる。**リップルエフェクト**（Material Design風）も`:after`疑似要素と`overflow: hidden`の組み合わせで純CSSのみで再現可能だ。

ページ遷移やモーダル表示では、**フェードイン/アウト**（`opacity`遷移）、**スライドトランジション**（`translateX`遷移）、**モーダルオープン**（`scale(0.9)`からの拡大＋`translateY(20px)`からの上昇）、**スタガードリストアニメーション**（`nth-child`で`animation-delay`をずらして順次表示）が実装できる。これらはすべてGPU高速化プロパティのみを使うため、パフォーマンス負荷は最小限だ。

### 外部ライブラリで到達できるレベル

| ライブラリ | サイズ（gzip） | 用途 | CDN URL |
|-----------|--------------|------|---------|
| **Motion One** | **3.8KB** | WAAPI基盤の軽量アニメーション | `cdn.jsdelivr.net/npm/motion@latest/dist/motion.js` |
| **Anime.js** | **~6KB** | 汎用アニメーション | `cdnjs.cloudflare.com/ajax/libs/animejs/3.2.0/anime.min.js` |
| **GSAP** | **~24KB** | タイムライン・複雑なシーケンス | `cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js` |
| **Lottie (dotlottie-wc)** | 可変 | After Effects書き出しアニメーション | `unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js` |

**Motion One**（現「Motion」）はわずか**3.8KB**でGSAPの20%未満のサイズながら、Web Animations APIを活用してハードウェアアクセラレーションによるスムーズなアニメーションを実現する。`animate(".box", { rotate: 360 })`という直感的な構文で、スタガー効果やスプリングアニメーションも記述できる。

**GSAP**は複雑なタイムラインベースのアニメーション（連続する要素の順次アニメーション、パララックス効果、SVGモーフィング等）に最適で、広告業界でも標準的に使われている。Webflow社のスポンサーシップにより**全プラグインが無料化**された。

**Lottie**はデザイナーがAfter Effectsで作成したベクターアニメーションをJSON形式で書き出し、Webで再生する技術だ。`<dotlottie-wc src="animation.lottie" loop autoplay>`というWeb Component形式で簡単に埋め込める。LottieFilesの膨大なフリーアニメーション素材を活用すれば、プロ品質のローディングアニメーションやイラストアニメーションをウィジェットに組み込める。

**Framer Motionは避けるべきだ。** React依存に加え、iframeの`Element`プロトタイプチェーン差異に起因する既知バグ（GitHub #379）がある。同じ作者のMotion（バニラJS版）を使うのが正解だ。

### パフォーマンス上の注意点

**Safariのクロスオリジンiframeスロットリング**が最大の注意点だ。Safariはクロスオリジンiframe内の`requestAnimationFrame`を、ユーザーがiframe内をクリック/タップするまで**約30fps**に制限する。CSS AnimationsやWAAPIはコンポジタースレッドで実行されるためこの影響を受けないが、rAFベースのJSアニメーション（GSAP等）は影響を受ける可能性がある。対策として、可能な限りCSS TransitionsやWAAPIを優先し、rAFベースのアニメーションは最小限に留める。

---

## 2. データビジュアライゼーション：フルインタラクティブなダッシュボードが構築可能

### チャートライブラリの選定ガイド

すべての主要チャートライブラリがiframe内で動作する。ウィジェット用途では**サイズと機能のバランス**が選定基準となる。

| ライブラリ | サイズ（min） | チャート種類 | ズーム/パン | ドリルダウン | 推奨度 |
|-----------|-------------|------------|-----------|------------|-------|
| **Chart.js** | ~254KB | 8種（拡張可） | プラグイン要 | イベント経由 | ⭐⭐⭐⭐⭐ |
| **ApexCharts** | ~496KB | 16種以上 | 組み込み | イベント経由 | ⭐⭐⭐⭐ |
| **ECharts** | ~1MB | 20種以上 | 組み込み（dataZoom） | 組み込み（v5.5+） | ⭐⭐⭐⭐ |
| **uPlot** | **~48KB** | 時系列特化 | 組み込み | なし | ⭐⭐⭐（時系列向け） |
| **Frappe Charts** | ~15KB(gz) | 7種+ヒートマップ | なし | なし | ⭐⭐⭐（軽量向け） |
| **D3.js** | ~280KB | 無限（自由構築） | 自作必要 | 自作必要 | ⭐⭐（高度カスタム向け） |
| **Plotly.js** | ~3.5MB | 40種以上 | 組み込み | 組み込み | ⚠️（サイズ過大） |

**最も推奨されるのはChart.js**だ。~254KBと適度なサイズで、8種の基本チャート（棒・折れ線・円・ドーナツ・レーダー・散布図・バブル・極座標）を網羅する。Zoho CRMウィジェットガイドでも推奨されている実績がある。`responsive: true`がデフォルトで有効であり、ウィジェットのリサイズにも自動追従する。

**本格的な企業ダッシュボード**にはEChartsが最適だ。サイズは~1MBと大きいが、ツリーマップ、サンキー図、ゲージ、ヒートマップ、地理マップ、ドリルダウンまでを1つのライブラリでカバーする。`myChart.setOption()`による更新はインテリジェントなdiffアルゴリズムで差分のみをスムーズにアニメーション遷移させる。さらに`echarts.connect([chart1, chart2])`で複数チャート間のツールチップ・ハイライトを連動させる**クロスフィルタリング**もネイティブサポートしている。カスタムビルドツールで必要なチャートタイプのみを含むビルドを生成すれば、サイズを大幅に削減できる。

**パフォーマンス最優先**ならuPlot（~48KB）が圧倒的だ。166,650データポイントを25msで描画し、60fpsでのストリーミング表示も可能。Chart.jsの5分の1、EChartsの20分の1のサイズである。

### Zoho CRM APIとチャートの連携パターン

データ取得から表示までの実装パターンは以下の通りだ。`ZOHO.embeddedApp.init()`でSDKを初期化した後、`ZOHO.CRM.API.getAllRecords()`で最大200件/リクエストのデータを取得する。2,000件以上のデータには`page_token`パラメータを使ったページネーションが必要で、最大100,000件まで取得可能だ。

```javascript
// 典型的なパターン：商談ステージ別集計→ドーナツチャート
ZOHO.embeddedApp.init().then(function() {
  ZOHO.CRM.API.getAllRecords({Entity:"Deals", per_page:200})
    .then(function(response) {
      var stageCount = response.data.reduce(function(acc, r) {
        acc[r.Stage] = (acc[r.Stage] || 0) + 1;
        return acc;
      }, {});
      new Chart(document.getElementById('chart'), {
        type: 'doughnut',
        data: { labels: Object.keys(stageCount),
                datasets: [{ data: Object.values(stageCount) }] }
      });
    });
});
```

**リアルタイム更新**は`setInterval`によるポーリングで実現する。Zoho CRM APIのレート制限を考慮し、**30〜60秒間隔**が推奨される。Chart.jsなら`chart.data.datasets[0].data = newData; chart.update('none');`（`'none'`でアニメーションスキップ）、EChartsなら`myChart.setOption({series:[{data:newData}]})`でスムーズに更新できる。

### 高度なビジュアライゼーション

**ガントチャート**にはFrappe Gantt（MIT、ゼロ依存、SVGベース）が最適で、タスクのドラッグによる日程変更、日/週/月/年の表示切り替えをサポートする。**地図表示**にはLeaflet.js（~42KB）が軽量かつ高機能で、マーカー、ポリゴン、ポップアップ、タイルレイヤーに対応する。**カレンダーヒートマップ**（GitHub風）はFrappe Chartsに組み込みで提供されている。

---

## 3. ドラッグ＆ドロップ：カンバンからファイルアップロードまで

### HTML5 Drag and Drop APIの動作状況

HTML5 DnD APIは**iframe内部でのドラッグ操作は完全に動作する**。`dragstart`、`drag`、`dragover`、`drop`等のイベントが正常に発火する。ただし、**CRM親ページとウィジェットiframe間のクロスフレームドラッグは動作しない**（Chromiumバグ#251718）。実用上、ウィジェット内で完結するDnD操作であれば問題ない。

### ドラッグ＆ドロップライブラリの実力

**SortableJS**（~14KB gzip、依存なし）がウィジェット用途の第一選択肢だ。リスト内の並べ替えはもちろん、`group`オプションで複数リスト間のアイテム移動が可能。タッチデバイス対応も組み込まれている。カンバンボードの実装は、各カラムにSortableJSを初期化し`group: 'kanban'`を設定するだけで実現できる。

```javascript
document.querySelectorAll('.kanban-column').forEach(col => {
  new Sortable(col, {
    group: 'kanban', animation: 150,
    onEnd: function(evt) {
      // ドロップ時にZOHO.CRM.API.updateRecord()でステージ更新
    }
  });
});
```

**既製のカンバンライブラリ**としては**jKanban**（~5KB gzip、依存なし、Apache-2.0）が最も軽量だ。ボードの定義、アイテムの追加・削除、ドラッグ移動を簡潔なAPIで提供する。

**interact.js**（~29KB gzip）はドラッグに加えて**リサイズ、マルチタッチジェスチャー、慣性（inertia）、グリッドスナッピング**に対応する。パネルのリサイズやSVG要素の操作など、より複雑なインタラクションに適している。

**Split.js**（わずか**~4KB gzip**、依存なし）は**リサイズ可能なスプリットパネル**の実装に特化したライブラリだ。水平・垂直分割、最小サイズ制約、ドラッグコールバックを提供する。`Split(['#left', '#right'], { sizes: [50, 50], gutterSize: 8 })`の一行でスプリッターが完成する。

### ジェスチャーとファイルドロップ

**Hammer.js**（~7KB gzip）がiframe内でパン、ピンチ、スワイプ、ローテーションなどのタッチジェスチャーを認識する。ポインターイベントベースで動作するため、iframe制約の影響を受けない。

**ファイルドラッグ＆ドロップ**は、OSデスクトップからiframe内の要素へのファイルドロップが**動作する**。`dragover`・`drop`イベントで`event.preventDefault()`を呼び、`event.dataTransfer.files`からファイルにアクセスできる。**Dropzone.js**（~13KB gzip、依存なし）を使えば、サムネイルプレビュー、プログレスバー、ファイル種類・サイズ検証を含むアップロードUIが即座に構築できる。

---

## 4. モダンデザインシステム：Shoelaceで40以上のコンポーネントが使える

### CSSフレームワークの選択肢

| フレームワーク | サイズ（gzip） | JS依存 | 特徴 |
|-------------|--------------|--------|------|
| **Pico CSS** | **~10KB** | なし | セマンティックHTML自動スタイリング |
| **Bulma** | ~26KB | なし | クラスベース、JS不要 |
| **Bootstrap 5** | ~50KB(CSS+JS) | あり | 最も普及、豊富なコンポーネント |
| **Tailwind CDN** | ~300KB(スクリプト) | あり | ユーティリティファースト、JITコンパイル |

**最小限で美しい結果を求めるならPico CSS**が最適だ。わずか~10KBで、`<input>`, `<button>`, `<table>`, `<dialog>`等のHTMLネイティブ要素を自動的にモダンなスタイルに整える。クラスの付与すら不要で、ダークモードも組み込み済みだ。

**Tailwind CSS**はCDN版（Play CDN）でiframe内でも動作する。`<script src="https://cdn.tailwindcss.com"></script>`を追加するだけで、iframe内のDOM要素のクラス名をスキャンしてCSSを動的生成する。本番環境では事前ビルドして必要なクラスだけを含む~5-15KBのCSSを同梱するのがベストプラクティスだ。

### Webフォント：日本語フォントも問題なく使える

**Google Fontsはiframe内で完全に動作する。** `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">`をウィジェットHTMLの`<head>`に追加するだけでよい。Google FontsのCDNは適切なCORSヘッダーを返すため、クロスオリジンの問題はない。

Noto Sans JPは全ウェイト込みだと4-5MBだが、Google Fontsは**unicode-range**によるサブセット配信で、一般的な日本語文字に必要な分だけ（ウェイトあたり~100-200KB）を自動的に分割ダウンロードする。`font-display: swap`を指定すれば、フォント読み込み中もフォールバックフォントでテキストが表示される。`@font-face`による自前フォントの読み込みもiframe内で正常に動作する。

### モダンCSS機能はすべて利用可能

iframeは独自のドキュメントとレンダリングコンテキストを持つため、**CSSの機能はブラウザサポートにのみ依存し、iframe固有の制限はない**。これは実は大きな利点でもある。ウィジェットのスタイルはZoho CRMのスタイルと完全に隔離されるため、CSSの衝突を心配する必要がない。

CSS Variables、CSS Grid、Flexbox、Container Queries（Chrome 105+）、`:has()`セレクタ（Chrome 105+）、Scroll Snap、`backdrop-filter`（グラスモーフィズム）、CSS Nesting（Chrome 120+）まで、**すべてのモダンCSS機能がiframe内で動作する**。特にCSS Variablesは後述するダークモード対応の基盤技術となる。

### Web ComponentsとShoelaceによる本格的UIコンポーネント

**Web Components（Custom Elements + Shadow DOM）はiframe内で完全に動作する**。各iframeは独自のカスタム要素レジストリを持ち、`customElements.define()`でコンポーネントを登録できる。Shadow DOMも正常に機能する。ただし、`@font-face`宣言はShadow DOM内ではなくライトDOM（グローバルスコープ）で行う必要がある点に注意。

この仕組みを活用した最有力ライブラリが**Shoelace**だ。Lit（~5KB gzip）ベースのWeb Componentsライブラリで、**40以上のUIコンポーネント**（ボタン、ダイアログ、ドロワー、入力、タブ、ツリー、カラーピッカー、レーティング等）をCDN経由で利用できる。

```html
<!-- Shoelaceの読み込み（autoloaderが使用コンポーネントのみを動的読み込み） -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/themes/light.css">
<script type="module" src="https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/shoelace-autoloader.js"></script>

<!-- 使用例 -->
<sl-button variant="primary" loading>Processing</sl-button>
<sl-dialog label="確認">本当に削除しますか？</sl-dialog>
<sl-tab-group><sl-tab slot="nav" panel="overview">概要</sl-tab></sl-tab-group>
```

Shoelaceのautoloaderは**実際に使用されているコンポーネントのみをオンデマンドで読み込む**ため、初期ロードの負荷を最小限に抑えられる。各コンポーネントは~2-10KBと軽量だ。CSS Custom Propertiesと`::part()`疑似要素によるスタイルカスタマイズが可能で、ライト/ダークテーマも組み込み済みである。

### ダークモード対応は2つのアプローチで実現可能

**OS設定連動**：`prefers-color-scheme`メディアクエリはiframe内でも動作する。`:root`にCSS Variablesでライト/ダークの色を定義し、`@media (prefers-color-scheme: dark)`で切り替えるだけだ。

**Zoho CRMテーマ連動**：SDK v1.4以降の`ZOHO.CRM.CONFIG.getUserPreference()`で、ユーザーが設定したCRMのDay/Nightモードを取得できる。この値に基づいて`document.documentElement.setAttribute('data-theme', 'dark')`を設定し、CSS Variablesでテーマを切り替えるのがベストプラクティスだ。

---

## ウィジェット配置先ごとの制約と最適な活用法

配置先によってキャンバスサイズと機能が大きく異なる。以下の表は、各配置先での特性と推奨UI表現をまとめたものだ。

| 配置先 | キャンバスサイズ | リサイズ | 推奨UI表現 |
|-------|--------------|--------|-----------|
| **WebTab** | **全画面**（CRMナビ除く） | 自動 | ダッシュボード、カンバン、ガントチャート |
| **カスタムボタン（ポップアップ）** | モーダル（可変） | `ZOHO.CRM.UI.Resize()` | フォーム、確認ダイアログ、データ入力 |
| **関連リスト** | インライン（高さ可変） | `ZOHO.CRM.UI.Resize()`（v1.3+） | レコードグラフ、ミニダッシュボード |
| **ダッシュボード** | ダッシュボードコンポーネント | 制限あり | KPIカード、要約チャート |
| **ウィザード** | ウィザードステップ内 | `Resize`（v1.4+） | ステップ内フォーム、検証UI |

**WebTabが最もリッチなUI表現に適している**。全画面キャンバスを活用して、スプリットパネル付きのダッシュボード、複数チャートのクロスフィルタリング、カンバンボードなどの複雑なアプリケーションが構築できる。`HistoryPopState`イベントによるブラウザバックナビゲーションもサポートされており、SPA的なページ遷移も実装可能だ。

関連リストウィジェットでは、特定レコードに紐づく**ミニダッシュボード**（Chart.jsのドーナツチャート＋KPIカード）が効果的だ。高さは`ZOHO.CRM.UI.Resize({height:"400"})`で動的に調整できる。

---

## 実装時に知っておくべき技術的注意点

**CORSの回避方法**が重要だ。ウィジェットから直接外部APIを呼ぶとCORSエラーになるが、`ZOHO.CRM.HTTP.get/post()`を使えばZohoサーバー経由でプロキシされ、CORSを回避できる。OAuth認証が必要なAPIには`ZOHO.CRM.CONNECTION.invoke()`、サーバーサイド処理が必要な場合は`ZOHO.CRM.FUNCTIONS.execute()`でDeluge関数を呼び出す。SDK v1.5の**ZRC（Zoho Request Client）**はこれらを統一構文で提供する。

**SafariのrAFスロットリング**は前述の通り、クロスオリジンiframeで`requestAnimationFrame`が~30fpsに制限される。JSアニメーションライブラリ（GSAP等）はrAFベースのため影響を受ける可能性がある。対策はCSS TransitionsやWAAPIの優先利用だ。

**メモリ管理**として、チャートやアニメーションのインスタンスは不要になったら必ず破棄する。Chart.jsの`chart.destroy()`、EChartsの`myChart.dispose()`、WAAPIの`animation.cancel()`を適切に呼び出す。特にSPA的な画面切り替えを行うウィジェットでは、メモリリーク防止のために必須だ。

---

## 結論：ウィジェットは「ミニWebアプリ」として自由に構築できる

Zoho CRMウィジェットの技術的限界は、実質的には**モダンブラウザの限界と同義**だ。iframeという隔離環境はスタイル衝突防止のメリットをもたらし、外部ライブラリの読み込みも自由に行える。

純粋なHTML/CSS/JSだけでも、CSSアニメーション、グラデーション、`backdrop-filter`によるグラスモーフィズム、CSS Gridによる高度なレイアウト、スケルトンスクリーン、リップルエフェクトなどの洗練されたUIが実現できる。そこに**Chart.js（~254KB）+ SortableJS（~14KB）+ Split.js（~4KB）+ Motion One（~3.8KB）+ Pico CSS（~10KB）**という軽量ライブラリスタックを加えれば、合計~286KB（gzip後はさらに小さい）で、インタラクティブなチャート、ドラッグ＆ドロップ、リサイズ可能パネル、スムーズなアニメーション、モダンなデフォルトスタイリングを備えた本格的なCRMアプリケーションが構築できる。これはZoho CRMの標準UIでは到底実現できないレベルのリッチさだ。