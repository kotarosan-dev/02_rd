# Zoho CRM AIマッチングウィジェットのUI/UX改善設計ガイド

Zoho CRM関連リストウィジェット内で、**Chart.jsやCSS-onlyチャートを含むリッチUI実装は技術的に完全に可能**であり、SDK v1.5のSPA対応・動的リサイズAPI・外部ライブラリ自由読み込みにより、モダンなマッチングランキング体験を実現できる。本レポートでは、HR Techの実例・制約環境のベストプラクティス・具体的なワイヤーフレーム構成・推奨JSON設計を包括的に提示する。

---

## Zoho CRMウィジェットの技術的制約と自由度

Zoho公式ドキュメントは明確に述べている：**「任意のJavaScriptまたはCSSフレームワークを使用できる」**。ウィジェットは標準的なHTML/CSS/JSアプリケーションがiframe内で動作する仕組みであり、Canvas API（Chart.js用）、SVG（D3.js用）、CSS Grid、Flexbox、CSS Animations、conic-gradientなど、モダンブラウザの全機能が利用可能だ。

**SDK v1.5の主要機能**は以下の通り。SPA（React/Vue/Angular）ルーティング対応、`ZOHO.CRM.UI.Resize({height: "600"})`による動的高さ調整（v1.3以降、関連リストウィジェットで対応）、`ZOHO.CRM.HTTP.get/post`による外部API呼び出し、`ZOHO.CRM.API.coql()`による効率的なCRMデータ取得。ウィジェットパッケージは**ZIP 25MB以内・250ファイル以内**の制約があるが、CDNからの外部ライブラリ読み込みに制限はない。

チャートライブラリの選定では、**Chart.js v4のツリーシェイキング**が最適解だ。必要なチャートタイプ（Doughnut + Bar）のみインポートすれば**gzip後約16〜20KB**に収まる。一方、ApexChartsはgzip後約130KBと重い。最も軽量なアプローチは、後述する**CSS-onlyの円形プログレスバー**（依存ゼロ・約200バイト）を主要スコア表示に使い、詳細表示時のみChart.jsのレーダーチャートを遅延読み込みする二段構成である。

---

## HR Techの事例に学ぶマッチングスコアの可視化戦略

SmartRecruiters（Winston Match）は業界のベンチマークだ。スキル・経歴・学歴など複数ディメンションを個別モデルでスコアリングし、重み付けで**単一の総合スコア**にアンサンブルする。重要なのは、スコアの数字だけでなく**「なぜマッチするのか」の説明テキスト**を併記する点で、リクルーターの信頼度を劇的に高めている。Workableも同様に、AIスクリーニングの結果にラベル付きの説明文を添えている。

**スコア可視化の推奨階層**は3レベルで構成すべきだ。

- **カード内インライン表示**：カラーコード付き数値バッジ（例：「94%」の緑色ピル）が最もスペース効率が高い。LinkedIn的アプローチで、リスト走査時に一瞬で判断可能
- **総合スコアの主要表示**：ドーナツ型円形プログレスが最適。**48px程度の小サイズでも視認性**が確保でき、中央に数値を配置するパターンはユーザーに広く浸透している。色コーディングは75〜100%を緑、50〜74%を黄/琥珀、0〜49%を赤とする
- **詳細展開時**：レーダーチャートでスキル・勤務地・年収・経験年数など多軸比較を表示。NNGroupのスキルマッピング手法に準じ、「理想プロファイル」と「候補者プロファイル」のポリゴンを重畳表示してギャップを直感的に示す

**CSS-onlyで実装可能な円形スコア**の具体コードは以下の通り。SVG `stroke-dasharray`方式が、アクセシビリティ・アニメーション・ゼロ依存の三拍子で最も推奨される：

```html
<svg viewBox="0 0 40 40" width="64" height="64">
  <circle cx="20" cy="20" r="15.9" fill="transparent" 
          stroke="#e8e8e8" stroke-width="3"/>
  <circle cx="20" cy="20" r="15.9" fill="transparent"
          stroke="#4CAF50" stroke-width="3"
          stroke-dasharray="94 6" stroke-dashoffset="25"
          stroke-linecap="round"/>
  <text x="20" y="22" text-anchor="middle" font-size="8" 
        font-weight="bold" fill="#333">94%</text>
</svg>
```

各ディメンションのスコア内訳には、**グラデーション付き水平プログレスバー**が最適だ。ラベル左・数値右の配置で複数バーを縦に積むことで、コンパクトかつスキャンしやすい表示となる。

---

## ワイヤーフレーム構成案：4セクション構成の全体設計

制約環境（iframe幅300〜800px）でのリサーチ結果を統合し、以下の**4セクション縦積み構成**を提案する。

### セクション1：フィルターバー（sticky固定）

幅400px以下では「フィルター」ボタン1つにまとめてドロワー展開、400〜800pxでは**水平インラインドロップダウン2〜3個**を並べる。PatternFlyのレスポンシブフィルターパターンに準じ、`position: sticky; top: 0;`で常時可視とする。

```
┌─────────────────────────────────────────────┐
│ 🔽 スキル別  │ 🔽 勤務地別  │ 🔽 年収別   │
│ ──────────────────────────────────────────── │
│ 表示中: 12件 / 全48件   [✕ フィルタクリア]   │
└─────────────────────────────────────────────┘
```

フィルタリングは**即時反映（auto-apply）方式**を推奨する。Linear・NotionなどのモダンSaaSが採用しており、クライアントサイドフィルタリングなら200ms以下で応答可能だ。適用中フィルタは**ピル/チップ形式**で表示し、結果件数（「12件 / 全48件」）と「クリア」ボタンを併記する。

### セクション2：ランキングカードリスト（メインコンテンツ）

NNGroupの知見に基づき、**ハイブリッドリスト・カード形式**を採用する。純粋なカードレイアウトはランキングの順序性を弱めるため、明示的な順位番号付きのリスト構造をベースに、各アイテムにカード的なビジュアル処理を施す。

```
┌─────────────────────────────────────────────┐
│ ① ┌─────────────────────────────────────┐  │
│    │ 🏅 シニアフロントエンドエンジニア    │  │
│    │ TechCorp Inc. · SF, CA · ハイブリッド │  │
│    │                                      │  │
│    │ ◉ 94%   [React][TypeScript][GraphQL] │  │
│    │ ████████████████████░░ スキル 97%     │  │
│    │ ██████████████████░░░░ 勤務地 90%     │  │
│    │ ¥175K-210K                     [▸詳細]│  │
│    └─────────────────────────────────────┘  │
│                                              │
│ ② ┌─────────────────────────────────────┐  │
│    │ 🥈 スタッフFEデベロッパー            │  │
│    │ StartupXYZ · リモート(US)           │  │
│    │                                      │  │
│    │ ◉ 88%   [React][TypeScript][Next.js] │  │
│    │ ████████████████████░░ スキル 91%     │  │
│    │ ████████████████████████ 勤務地 100%  │  │
│    │ ¥160K-195K                     [▸詳細]│  │
│    └─────────────────────────────────────┘  │
│                                              │
│ ③ ┌───────────── ... ──────────────────┐   │
└─────────────────────────────────────────────┘
```

**カード内の情報階層**は3レベルで厳密に管理する。第1階層（最大・太字）に順位番号 + 求人タイトル + 総合スコアのドーナツ。第2階層（中ウェイト）に企業名・勤務地・タグ。第3階層（ライトウェイト）にスコア内訳バーと年収レンジ。1カード**最大100文字・3行以内**のテキスト量が、Andrew Coyleのカードデザイン原則に合致する。

**トップ3の視覚的強調**にはゴールド（#FFD700）・シルバー（#C0C0C0）・ブロンズ（#CD7F32）のメダルアイコンと、微細な背景色の違い・シャドウの深さで差別化する。4位以降はニュートラルなスタイルに遷移させる。

**インタラクション**として、カードクリックで**インライン展開**（カードが垂直に広がり、レーダーチャート + AI個別ハイライト + アクションボタンを表示）を推奨する。LinkedInリクルーターのスライドインパネル方式は幅広の環境では有効だが、300〜400px幅のウィジェットでは**インライン展開の方が文脈喪失が少ない**。

### セクション3：AI総合評価パネル（リスト下部）

ユーザーの要件通りリスト下部に配置するが、リサーチ結果としては**上部（リスト前）配置がUXベストプラクティス**であることも併記する。Perplexity・Bloomberg・Googleの検索AI要約はいずれもコンテンツ上部に配置しており、「逆ピラミッド」の情報設計原則に合致する。ただし、リクルーターが「まず自分の目でランキングを確認→AI評価で裏付け確認」というワークフローを取る場合、下部配置にも合理性がある。折衷案として**折りたたみ可能なパネル**を推奨する。

```
┌─────────────────────────────────────────────┐
│ ✨ AI マッチング総合評価          [▾ 折りたたむ]│
│ ─────────────────────────────────────────── │
│                                              │
│ 求職者のReact/TypeScript 8年の経験は、上位    │
│ 求人の技術スタックと高い親和性を示しています。 │
│ 特にGraphQLスキルは上位10件中68%の求人で求め  │
│ られており、大きな強みです。                   │
│                                              │
│  💪 強み: GraphQL経験が市場ニーズと一致       │
│  🎯 機会: 12件がハイブリッド/リモート対応     │
│  ⚠️  課題: Python経験不足で3件は要件未達      │
│                                              │
│ [👍 参考になった] [👎 改善の余地あり]          │
└─────────────────────────────────────────────┘
```

**視覚的差別化**は必須だ。ShapeOfAI・Googleのデザインリサーチによると、AI生成コンテンツの識別には**✨スパークルアイコン + 紫/バイオレットのアクセントカラー**が業界標準として定着している。パネルの背景を微かな紫グラデーション（`#f5f3ff`〜`#ede9fe`）にし、左ボーダーに紫アクセント（`border-left: 3px solid #6366f1`）を付与する。サムズアップ/ダウンのフィードバックボタンも、AI出力の信頼性向上のため配置する。

### セクション4：フッター（ページネーション / ロードモア）

リストが20件を超える場合、「さらに読み込む」ボタンまたは`IntersectionObserver`による無限スクロールを配置。件数が少ない（〜10件）場合はページネーション不要。

---

## 制約環境で高速UIを実現する実装テクニック

パフォーマンス最適化は、ウィジェット体験の生死を分ける。チャートライブラリの選定戦略として、**メイン表示にはCSS-only/SVGスコア可視化を使い、詳細展開時のみChart.jsを遅延読み込み**する二段構成が最適だ。

```javascript
// レーダーチャートの遅延読み込み例
async function showDetailChart(cardElement, scores) {
  const { Chart, RadarController, RadialLinearScale, 
          PointElement, LineElement, Filler } = 
    await import('https://cdn.jsdelivr.net/npm/chart.js/+esm');
  Chart.register(RadarController, RadialLinearScale, 
                 PointElement, LineElement, Filler);
  // レーダーチャート描画...
}
```

20〜100件のリストでは、**`content-visibility: auto`**（CSSプロパティ）が最も手軽な仮想スクロール代替だ。ブラウザが画面外要素のレンダリングを自動スキップし、JavaScript不要でパフォーマンスが劇的に改善する。

```css
.ranking-card {
  content-visibility: auto;
  contain-intrinsic-size: 0 140px;
}
```

フィルタリングのクライアントサイド実装では、`requestAnimationFrame`でDOM更新をバッチ化し、`DocumentFragment`で一括挿入する。件数表示の更新とカードの表示/非表示をデバウンス（16ms）で滑らかにする。CSSアニメーションは`transform`と`opacity`のみ使用し（GPU合成レイヤーで処理）、`width`や`height`のアニメーションは避ける。

ウィジェットの初期化パターンは以下の通り：

```javascript
ZOHO.embeddedApp.on("PageLoad", async function(entity) {
  const recordId = entity.EntityId;
  // 1. マッチングAPIからデータ取得
  const response = await ZOHO.CRM.HTTP.get({
    url: `https://your-api.com/matches/${recordId}`
  });
  const data = JSON.parse(response.data);
  // 2. フィルターバー描画
  renderFilters(data.filters);
  // 3. ランキングカード描画（CSS-onlyスコア）
  renderRankingCards(data.results);
  // 4. AI総合評価描画
  renderAISummary(data.ai_analysis);
  // 5. iframe高さ調整
  ZOHO.CRM.UI.Resize({height: calculateTotalHeight()});
});
ZOHO.embeddedApp.init();
```

---

## 推奨JSONデータ構造

リサーチの結果、Algolia/Elasticsearch App Searchのファセット設計パターンをベースにした以下の構造を推奨する。**フィルタ情報はresultsの外側にファセットとして独立配置**し、AI総合評価は`ai_analysis`として明確に名前空間を分離する。

```json
{
  "meta": {
    "candidate_id": "cand_789",
    "candidate_name": "田中太郎",
    "total_results": 48,
    "processing_time_ms": 285,
    "timestamp": "2026-02-09T14:30:00Z"
  },

  "ai_analysis": {
    "summary": "React/TypeScriptの8年の実務経験は上位求人の技術スタックと高い親和性を示しています。特にGraphQLスキルは上位10件中68%で求められており、大きな強みです。",
    "key_insights": [
      {"type": "strength", "text": "GraphQL経験が上位求人の68%で需要あり"},
      {"type": "opportunity", "text": "ハイブリッド/リモート対応が12件"},
      {"type": "gap", "text": "Python経験不足で3件は要件未達"}
    ],
    "model_version": "match-analyzer-v2.1",
    "generated_at": "2026-02-09T14:30:00Z"
  },

  "results": [
    {
      "job_id": "job_001",
      "rank": 1,
      "job": {
        "title": "シニアフロントエンドエンジニア",
        "company_name": "TechCorp株式会社",
        "location": "東京都渋谷区",
        "work_style": "hybrid",
        "salary_min": 8000000,
        "salary_max": 12000000,
        "currency": "JPY",
        "tags": ["React", "TypeScript", "GraphQL"],
        "experience_level": "senior",
        "job_url": "/jobs/job_001"
      },
      "scores": {
        "overall": 94,
        "skills": 97,
        "location": 90,
        "salary": 95,
        "experience": 92
      },
      "highlights": {
        "matched_skills": ["React", "TypeScript", "GraphQL"],
        "missing_skills": [],
        "text": "GraphQLとReactの実績が技術スタックに直接合致"
      }
    },
    {
      "job_id": "job_002",
      "rank": 2,
      "job": {
        "title": "リードフロントエンド開発者",
        "company_name": "StartupXYZ",
        "location": "フルリモート",
        "work_style": "remote",
        "salary_min": 7000000,
        "salary_max": 10000000,
        "currency": "JPY",
        "tags": ["React", "TypeScript", "Next.js"],
        "experience_level": "lead",
        "job_url": "/jobs/job_002"
      },
      "scores": {
        "overall": 88,
        "skills": 91,
        "location": 100,
        "salary": 82,
        "experience": 85
      },
      "highlights": {
        "matched_skills": ["React", "TypeScript", "Next.js"],
        "missing_skills": ["Tailwind"],
        "text": "フルリモート対応。年収レンジがやや下回る可能性あり"
      }
    }
  ],

  "filters": {
    "skills": {
      "type": "multi_select",
      "options": [
        {"key": "react", "label": "React", "count": 38},
        {"key": "typescript", "label": "TypeScript", "count": 35},
        {"key": "graphql", "label": "GraphQL", "count": 22},
        {"key": "nextjs", "label": "Next.js", "count": 18}
      ]
    },
    "work_style": {
      "type": "enum",
      "options": [
        {"key": "remote", "label": "リモート", "count": 15},
        {"key": "hybrid", "label": "ハイブリッド", "count": 20},
        {"key": "onsite", "label": "出社", "count": 13}
      ]
    },
    "salary_range": {
      "type": "range",
      "currency": "JPY",
      "buckets": [
        {"min": 4000000, "max": 6000000, "label": "400〜600万円", "count": 8},
        {"min": 6000000, "max": 8000000, "label": "600〜800万円", "count": 18},
        {"min": 8000000, "max": 10000000, "label": "800〜1000万円", "count": 15},
        {"min": 10000000, "max": null, "label": "1000万円以上", "count": 7}
      ]
    },
    "experience_level": {
      "type": "enum",
      "options": [
        {"key": "senior", "label": "シニア", "count": 28},
        {"key": "lead", "label": "リード", "count": 12},
        {"key": "staff", "label": "スタッフ", "count": 8}
      ]
    }
  }
}
```

**この構造の設計意図**は4点ある。第一に、`filters`をresults配列の外にファセットとして独立配置することで、**O(n)の冗長データを排除**し、フィルタUIのレンダリングを1パスで完了できる。第二に、`scores`を`overall`+4ディメンションの**フラットなオブジェクト**にすることで、クライアントサイドでのソート・フィルタ処理が`results.sort((a,b) => b.scores.skills - a.scores.skills)`のように簡潔に書ける。第三に、`ai_analysis`を明確に名前空間分離することで、**トークン節約のためAI生成は1回だけ**という要件に対応しつつ、将来的にAI総合評価のみ別エンドポイントに分離してストリーミング対応する拡張性を確保する。第四に、各フィルタに`type`（enum / multi_select / range）を付与することで、**汎用的なフィルタUIレンダラー**を1つ書くだけで全フィルタに対応できる。

---

## 結論：実装優先度と統合的な推奨事項

本リサーチから導かれる最も重要な知見は、**「説明可能性」がスコア数値そのものより価値が高い**ということだ。SmartRecruiters・Workableの事例が示す通り、マッチスコアの「なぜ」を伝えることがリクルーターの信頼と採用率を決定的に左右する。トークン節約のためAI総合評価を1つにまとめる方針は正しく、個別カードには`highlights.text`の1行ハイライト（AI不要・テンプレート生成可能）を残しつつ、詳細な根拠は総合評価パネルに集約するのが最適バランスだ。

実装優先度は、**Phase 1**でCSS-onlyスコア可視化 + フラットなカードリスト + JSONデータ構造の確立、**Phase 2**でフィルターバー + AI総合評価パネルの統合、**Phase 3**でChart.js遅延読み込みによるレーダーチャート詳細展開の順で進めるのが、最小工数で最大のUX改善を達成する道筋となる。全体のJSバンドルは**初期ロード50KB以下**を目標とし、CSS-onlyチャートの活用でこれは十分に達成可能だ。