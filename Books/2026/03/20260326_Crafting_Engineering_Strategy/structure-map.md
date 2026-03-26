# Structure Map：『Crafting Engineering Strategy: AI Companion』

## 全体像

本書は `Preface + 6 chapters` の構成で、流れは次のように進む。

1. `Preface`: companion の目的定義
2. `Chapter 1`: LLM 協働の基礎技法と実行環境
3. `Chapter 2`: 新規戦略の共著
4. `Chapter 3`: 既存戦略のレビューと改稿
5. `Chapter 4`: systems model の生成・実行・可視化
6. `Chapter 5`: Wardley map 生成の試行錯誤
7. `Chapter 6`: 実務への埋め込みと形式の将来性

---

## 章別マップ

| セクション | 機能 | 1行サマリー | 重要度 |
|---|---|---|---|
| Preface | 導入 | これは通常の読書本ではなく、`LLM` と一緒に『Crafting Engineering Strategy』を使うための companion だと宣言する | ★★☆ |
| Chapter 1. The Foundations of Collaboration | 基礎 | `LLM as Intern`、`metaprompting`、`ICL`、Projects、`llm.py`、`MCP` を使って文脈豊富な協働環境をつくる | ★★★ |
| Chapter 2. Cowriting Strategy | 展開 | 問題文づくりから始め、探索・診断・政策・運用を段階生成し、人間が編集する共著フローを示す | ★★★ |
| Chapter 3. Reviewing an Existing Strategy | 展開 | 既存戦略の reasoning errors、根拠不足、欠落要素を洗い出し、重要論点に絞って改稿へつなげる | ★★★ |
| Chapter 4. Generating Systems Models | 応用 | README などの文脈を与えて systems model を生成させ、必要なら `MCP` で実行と可視化まで内製化する | ★★★ |
| Chapter 5. Generating Wardley Maps | 転換 | 画像直接生成の失敗を踏まえ、DSL に複雑さを逃がすことで Wardley map を実用化する | ★★★ |
| Chapter 6. Next Steps | 結論 | 本を常時コンテキストとして使う実務運用と、`LLM-optimized books` という形式の可能性を整理する | ★★☆ |

---

## 因果連鎖

| 前段 | 後段 | つながり |
|---|---|---|
| Chapter 1 | Chapter 2 | 良い共著は、良いプロンプト設計と十分な文脈投入が前提 |
| Chapter 2 | Chapter 3 | 新規に書いた戦略は、そのままでは不十分なので批評と改稿が続く |
| Chapter 1 | Chapter 4 | `ICL` と文脈投入の考え方を、systems という DSL に横展開する |
| Chapter 4 | Chapter 5 | 「複雑さをツールへ移す」という原理を、画像生成から DSL 生成へ再適用する |
| Chapter 2-5 | Chapter 6 | ここまでのテクニックを一発芸でなく、日常の戦略業務へ埋め込む |

---

## 核心命題リスト

| セクション | 核心命題 |
|---|---|
| Preface | companion の価値は、本の内容を読むことではなく、仕事のコンテキストとして使えることにある |
| Chapter 1 | `LLM` の品質は、モデル能力以上に、指示の具体性・例示・文脈供給で決まる |
| Chapter 2 | 戦略は一括生成するより、問題文から順に段階生成し、人間が編集するほうが強い |
| Chapter 3 | `LLM` は書く道具以上に、戦略文書の穴を見つける批評装置として有効である |
| Chapter 4 | `LLM` は DSL を書くのに向くが、モデルが現実を正しく写しているかは人間が判定する |
| Chapter 5 | `LLM` が苦手な表現は、DSL と専用ツールへ変換すると一気に実用域へ入る |
| Chapter 6 | `LLM-optimized` な知識は、読み物ではなく、常駐コンテキストとして使ってこそ価値が出る |

---

## 原著に戻る優先順位

| 目的 | 先に読むべき章 | 理由 |
|---|---|---|
| とにかく LLM の使い方を改善したい | Chapter 1 | 他章の前提がすべてここにある |
| 戦略文書を最短で下書きしたい | Chapter 2 | 実際の生成ワークフローが最もまとまっている |
| 戦略レビューの観点だけ欲しい | Chapter 3 | レビュー観点がそのまま実務に流用しやすい |
| systems thinking を LLM で試したい | Chapter 4 | README の与え方と `MCP` 委譲が具体的 |
| Wardley map を速くたたき台化したい | Chapter 5 | 失敗例と DSL 経由の成功例が対比される |
| companion の使いどころを考えたい | Chapter 6 | 日常運用への落とし込みが最も直接的 |

---

## 圧縮上の注記

- OCR ノイズ、画面キャプチャ断片、UI ラベル、重複表示は構造理解に不要なため圧縮時に除去した。
- 本書はツール解説も多いが、圧縮テンプレート上は `C（ビジネス書・自己啓発）` と判定した。
- 判定理由は、中心命題が `engineering strategy をどう作り、どう直し、どう業務へ埋め込むか` というフレームワーク抽出にあり、ツール説明がその従属要素になっているため。
