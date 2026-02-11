# AIマッチングウィジェットのUI/UXデザイン完全ガイド

**Zoho CRM内のiframeウィジェットとして動作するAIマッチングUIを世界水準のリッチさで実装するには、SVG円形プログレス＋スタガードカードアニメーション＋ストリーミングテキストの3軸が核となる。** 主要採用プラットフォーム（LinkedIn、Indeed、SmartRecruiters等）の調査から、業界トレンドは「不透明な数値スコア」から「説明可能なAI根拠表示」へ明確に移行しており、スコア＋自然言語による理由説明の組み合わせがベストプラクティスであることが判明した。実装は純CSS/JS＋軽量CDNライブラリ（合計**20KB未満**）で完結でき、iframe環境でも高パフォーマンスに動作する。

---

## 1. 主要プラットフォームから学ぶマッチングUIの設計原則

業界の主要プラットフォームは、意外にも数値スコアを前面に出していない。**LinkedInは数値スコアを一切表示せず、暗黙のランキング**でAI推薦結果を並べる。Indeedも同様に数値を見せず、AIが生成した自然言語サマリーで「なぜこの候補者が適合するか」を説明する。一方、明示的なスコアを採用するプラットフォームも存在する。

| プラットフォーム | スコア形式 | マッチ理由の表示方法 |
|---|---|---|
| LinkedIn | 非表示（ランキングのみ） | スキルタグ＋「関心度」バッジ |
| Indeed Smart Sourcing | 非表示 | AI生成の自然言語サマリー |
| SmartRecruiters Winston | **4段階スター** | 透明な自然言語による根拠 |
| Workable | **パーセンテージ** | 要件チェックリスト（✓/✗） |
| hireEZ | **4段階ラベル**（Best/Good/Partial/Not） | ペルソナベースの推論 |

**最も実装参考になるのはSmartRecruiters**のWinston Matchで、シンプルな視覚的インジケーター（スター）と自然言語の説明文を組み合わせている。Workableのチェックリスト形式（要件ごとに✓/✗を表示）も、実装が容易で直感的に理解しやすい。

マッチ理由の表示パターンとして確認されたのは以下の5つである。**要件チェックリスト**（Workable）、**自然言語サマリー**（Indeed・SmartRecruiters）、**スキルタグハイライト**（LinkedIn）、**段階ラベル**（hireEZ）、**箇条書き理由**（Skima AI）。本ウィジェットでは、これらを複合的に採用し、パーセンテージスコア＋チェックリスト＋AIサマリーの三層構造を推奨する。

---

## 2. SVG円形プログレスリングでスコアを直感的に表現する

マッチスコアの中心的な表現要素として、**SVG `stroke-dasharray`/`stroke-dashoffset`技法**による円形プログレスリングが最適である。ライブラリ不要、SVGベースでiframe内でも完璧にスケーリングする。

### 完全実装コード

```html
<div class="progress-container" id="matchScore">
  <svg class="progress-ring" width="120" height="120">
    <defs>
      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#3b82f6"/>
      </linearGradient>
    </defs>
    <circle class="progress-ring__track" r="52" cx="60" cy="60"/>
    <circle class="progress-ring__progress" r="52" cx="60" cy="60"
            stroke="url(#scoreGrad)"
            stroke-dasharray="326.73" stroke-dashoffset="326.73"/>
  </svg>
  <span class="progress-text">0%</span>
</div>

<style>
  .progress-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .progress-ring { transform: rotate(-90deg); }
  .progress-ring__track {
    fill: transparent; stroke: #e6e6e6; stroke-width: 8;
  }
  .progress-ring__progress {
    fill: transparent; stroke-width: 8; stroke-linecap: round;
    transition: stroke-dashoffset 1.5s ease-in-out;
  }
  .progress-text {
    position: absolute;
    font-size: 24px; font-weight: 700; color: #333;
  }
</style>

<script>
function setProgress(container, percent) {
  const circle = container.querySelector('.progress-ring__progress');
  const text = container.querySelector('.progress-text');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100 * circumference);
  
  // スコアに応じた動的カラー（赤→黄→緑）
  const hue = (percent / 100) * 120;
  circle.style.stroke = `hsl(${hue}, 70%, 45%)`;
  circle.style.strokeDashoffset = offset;

  // カウントアップアニメーション
  let current = 0;
  const step = Math.ceil(percent / 60);
  const timer = setInterval(() => {
    current = Math.min(current + step, percent);
    text.textContent = current + '%';
    if (current >= percent) clearInterval(timer);
  }, 20);
}
setTimeout(() => setProgress(document.getElementById('matchScore'), 87), 300);
</script>
```

**核心テクニック**: 半径52pxの円周は`2π × 52 ≈ 326.73`。`stroke-dasharray: 326.73`で全周を1セグメントとし、`stroke-dashoffset`を`circumference × (1 - percent/100)`に設定することでパーセンテージを表現する。CSS `transition`だけでスムーズなアニメーションが実現できる。

### 超軽量バリアント（半径≈16トリック）

半径を**15.9155**に設定すると円周がちょうど約100になり、`stroke-dasharray`の値がそのままパーセンテージに直結する：

```html
<svg viewBox="0 0 36 36" width="80">
  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="#eee" stroke-width="2.8"/>
  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831
           a 15.9155 15.9155 0 0 1 0 -31.831"
        fill="none" stroke="#4CC790" stroke-width="2.8"
        stroke-linecap="round"
        stroke-dasharray="85, 100"/>
  <text x="18" y="20.5" text-anchor="middle" font-size="8" fill="#333">85%</text>
</svg>
```

### レーダーチャートによる多軸評価

**Chart.js**（CDN: `https://cdn.jsdelivr.net/npm/chart.js`、約65KB）でスキル・経験・給与・勤務地・カルチャーフィットなどの多軸評価を表示できる：

```html
<canvas id="radarChart" width="300" height="300"></canvas>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
new Chart(document.getElementById('radarChart').getContext('2d'), {
  type: 'radar',
  data: {
    labels: ['スキル', '経験', '給与', '勤務地', 'カルチャー', '学歴'],
    datasets: [
      { label: '求人要件', data: [90,80,70,85,75,60],
        backgroundColor: 'rgba(54,162,235,0.2)',
        borderColor: 'rgba(54,162,235,1)', borderWidth: 2 },
      { label: '候補者プロフィール', data: [85,70,90,60,80,75],
        backgroundColor: 'rgba(124,58,237,0.2)',
        borderColor: 'rgba(124,58,237,1)', borderWidth: 2 }
    ]
  },
  options: {
    scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { stepSize: 20 } } },
    plugins: { legend: { position: 'bottom' } }
  }
});
</script>
```

### 水平バーによるコンパクトなスコア分解表示

iframe幅が限られる環境では、レーダーチャートよりも**水平バー分解表示**がスペース効率に優れる：

```html
<style>
  .score-row { margin-bottom: 8px; }
  .score-label { display: flex; justify-content: space-between;
                 font-size: 12px; margin-bottom: 2px; color: #555; }
  .score-bar-bg { background: #f0f0f0; border-radius: 4px;
                  height: 8px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 4px;
                    transition: width 1s ease-out; }
</style>
<div class="score-row">
  <div class="score-label"><span>スキル適合</span><span>92%</span></div>
  <div class="score-bar-bg">
    <div class="score-bar-fill" style="width:92%; background:#00C851"></div>
  </div>
</div>
```

---

## 3. リッチなカードUI：ランキング・展開・比較の実装パターン

### グラスモーフィズム × ソフトシャドウのハイブリッドカード

Zoho CRMのiframe内では、過度な`backdrop-filter: blur()`はパフォーマンスに影響するため、**トップマッチ（1位）にのみグラスモーフィズムを適用し、2位以下はソフトシャドウカード**とする混合アプローチを推奨する：

```css
/* トップマッチ: グラスモーフィズム */
.match-card.rank-1 {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px solid #FFD700;
  box-shadow: 0 0 12px rgba(255,215,0,0.15), 0 4px 12px rgba(0,0,0,0.08);
  border-radius: 16px;
  padding: 16px 20px;
}

/* 2位以下: ソフトシャドウ */
.match-card {
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 12px 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.match-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
```

### ランキング視覚的差別化（金・銀・銅）

```css
.rank-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  font-weight: 700; font-size: 12px;
}
.rank-1 {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #7c2d12;
  box-shadow: 0 0 8px rgba(255,215,0,0.4);
}
.rank-2 {
  background: linear-gradient(135deg, #E8E8E8, #B0B0B0);
  color: #374151;
}
.rank-3 {
  background: linear-gradient(135deg, #CD7F32, #A0522D);
  color: #fff;
}

/* カード背景のランク別グラデーション */
.match-card.rank-1 { background: linear-gradient(135deg, #fffbeb, #ffffff); }
.match-card.rank-2 { background: linear-gradient(135deg, #f8f9fa, #ffffff); }
.match-card.rank-3 { background: linear-gradient(135deg, #fef5e7, #ffffff); }
```

### CSS Gridによるスムーズな展開/折りたたみ

**`grid-template-rows: 0fr → 1fr`** の手法は、コンテンツの高さを事前に知る必要がなく、CSSのみでスムーズな高さアニメーションを実現する現在最良の手法である：

```css
.card-expandable {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s ease-out;
}
.card-expandable.expanded {
  grid-template-rows: 1fr;
}
.card-expandable-inner {
  overflow: hidden;
  min-height: 0;
}
```

```javascript
document.querySelectorAll('.card-summary').forEach(summary => {
  summary.addEventListener('click', () => {
    const expandable = summary.nextElementSibling;
    expandable.classList.toggle('expanded');
  });
});
```

### スキルタグの4段階カラーコーディング

マッチ・部分マッチ・非マッチ・不足の4状態を視覚的に即座に識別できるタグシステム：

```css
.skill-tag.matched  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.skill-tag.partial  { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
.skill-tag.unmatched { background: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
.skill-tag.missing  { background: #fef2f2; color: #991b1b; border: 1px dashed #fca5a5; }
```

```html
<div class="skill-tags">
  <span class="skill-tag matched">✓ React</span>
  <span class="skill-tag matched">✓ Node.js</span>
  <span class="skill-tag partial">~ Python</span>
  <span class="skill-tag missing">✗ AWS</span>
  <span class="skill-overflow">+3 more</span>
</div>
```

---

## 4. マイクロインタラクションで体験を磨き上げる

### スタガードカードアニメーション（CSS変数による遅延制御）

CSS変数 `--i` を使い、カードの出現順を動的に制御する。ライブラリ不要：

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
.match-card {
  opacity: 0;
  animation: fadeSlideUp 0.5s ease-out forwards;
  animation-delay: calc(var(--i) * 150ms);
}
@media (prefers-reduced-motion: reduce) {
  .match-card { animation: none; opacity: 1; }
}
```

```html
<div class="match-card" style="--i:0">候補者1</div>
<div class="match-card" style="--i:1">候補者2</div>
<div class="match-card" style="--i:2">候補者3</div>
```

### スケルトンスクリーン（シマー付きローディング）

AI分析中にコンテンツの形状を予告するスケルトンUIは、体感待ち時間を大幅に短縮する：

```css
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
  border-radius: 4px;
}
.skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; }
.skeleton-text   { height: 14px; margin-bottom: 8px; }
.skeleton-score  { width: 64px; height: 64px; border-radius: 50%; }
```

### コンフェッティエフェクト（高スコアマッチ時）

**canvas-confetti**（CDN: `https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js`、約6KB）をスコア90%超で発火：

```javascript
function celebrateHighScore() {
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  // サイドキャノンで追加演出
  confetti({ particleCount: 40, spread: 360, startVelocity: 30,
             origin: { x: 0.1, y: 0.5 } });
  confetti({ particleCount: 40, spread: 360, startVelocity: 30,
             origin: { x: 0.9, y: 0.5 } });
}
if (matchScore > 90) celebrateHighScore();
```

---

## 5. 「AIっぽさ」を演出するデザイン要素とアニメーション

### AI分析中アニメーション（オービットローダー）

```html
<style>
.ai-orbit-loader {
  width: 60px; height: 60px; position: relative; margin: 20px auto;
}
.ai-orbit-loader .core {
  position: absolute; inset: 15px; border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #3b82f6);
  animation: aiPulse 2s ease-in-out infinite;
}
.ai-orbit-loader .ring {
  position: absolute; inset: 0;
  border: 2px solid transparent;
  border-top-color: #7c3aed; border-right-color: #3b82f6;
  border-radius: 50%;
  animation: aiSpin 1.5s linear infinite;
}
.ai-orbit-loader .ring:nth-child(2) {
  inset: 5px; border-top-color: #3b82f6; border-right-color: #06b6d4;
  animation-duration: 2s; animation-direction: reverse;
}
@keyframes aiSpin  { to { transform: rotate(360deg); } }
@keyframes aiPulse { 0%,100% { transform: scale(0.8); opacity: 0.6; }
                     50%     { transform: scale(1); opacity: 1; } }
</style>
<div class="ai-orbit-loader">
  <div class="ring"></div><div class="ring"></div><div class="core"></div>
</div>
```

### AIグラデーションカラーパレットとグロー効果

AI製品に共通する**パープル→ブルー→シアン**のグラデーションパレットが、AIらしさの視覚的シグナルとして確立している。カラーコード: `#7c3aed`（パープル）、`#3b82f6`（ブルー）、`#06b6d4`（シアン）。

```css
/* アニメーショングラデーント背景 */
.ai-gradient-bg {
  background: linear-gradient(135deg, #667eea, #764ba2, #6B73FF, #7c3aed);
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}
@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* アニメーショングラデーントボーダー */
.gradient-border {
  position: relative; border-radius: 16px; padding: 24px; background: white;
}
.gradient-border::before {
  content: ''; position: absolute; inset: -2px; border-radius: 18px;
  background: linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4, #7c3aed);
  background-size: 300% 300%;
  animation: gradientShift 4s ease infinite;
  z-index: -1;
}

/* ネオンテキストグロー（スコア数値用） */
.ai-score-glow {
  color: #7c3aed;
  text-shadow: 0 0 7px rgba(124,58,237,0.5), 0 0 10px rgba(124,58,237,0.3),
               0 0 21px rgba(124,58,237,0.2);
}
```

### ストリーミングテキスト（ChatGPTライクなタイピング）

AIサマリーをワード単位で逐次表示し、「AIがリアルタイムで思考・生成している」体験を演出する：

```javascript
class AITextStreamer {
  constructor(element, options = {}) {
    this.el = element;
    this.speed = options.speed || 30;
    this.variance = options.variance || 20;
  }
  async stream(text) {
    this.el.innerHTML = '';
    const cursor = document.createElement('span');
    cursor.className = 'blinking-cursor';
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      this.el.textContent += (i > 0 ? ' ' : '') + words[i];
      this.el.appendChild(cursor);
      await new Promise(r => setTimeout(r, this.speed * 3 + Math.random() * this.variance * 3));
    }
    setTimeout(() => cursor.remove(), 2000);
  }
}
```

```css
.blinking-cursor {
  display: inline-block; width: 2px; height: 1em;
  background-color: #7c3aed; margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursorBlink 1s step-end infinite;
}
@keyframes cursorBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
```

### AI Insightサマリーカード

全要素を統合したAIサマリーカードの完全実装：

```html
<div class="ai-summary-card">
  <div class="ai-badge">
    <span class="sparkle">✨</span> AI分析レポート
  </div>
  <div class="ai-summary-text" id="ai-summary"></div>
  <div class="ai-confidence">
    分析完了: 2.3秒 · 信頼度: 高
  </div>
</div>

<style>
.ai-summary-card {
  position: relative;
  background: linear-gradient(135deg, rgba(124,58,237,0.03), rgba(59,130,246,0.03));
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 16px; padding: 20px; overflow: hidden;
}
.ai-summary-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4);
}
.ai-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(59,130,246,0.1));
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 20px; padding: 4px 12px;
  font-size: 12px; font-weight: 600; color: #7c3aed;
}
.sparkle { animation: sparkleAnim 2s ease-in-out infinite; }
@keyframes sparkleAnim {
  0%,100% { transform: scale(1) rotate(0deg); }
  50%     { transform: scale(1.2) rotate(15deg); opacity: 0.7; }
}
</style>
```

---

## 6. 推奨アニメーションシーケンスとライブラリスタック

ウィジェット全体のアニメーションフローを以下の順序で設計することで、**ストーリー性のあるUX**が実現できる：

1. **ロード** → スケルトンカード表示（シマーアニメーション）
2. **AI処理中** → オービットローダー＋ステータスメッセージ（「スキル分析中...」「経験比較中...」「スコア算出中...」を順次表示）
3. **結果表示** → スケルトン→実カードへのスタガードアニメーション（150ms間隔）
4. **スコア公開** → 円形プログレスのストロークアニメーション＋カウントアップ
5. **高スコア演出** → 90%超でコンフェッティ発火
6. **AIサマリー** → ワード単位ストリーミングテキスト表示
7. **インタラクション待機** → ホバーリフト＋クリックリップル

### CDNライブラリ推奨構成（合計約17KB）

| ライブラリ | CDN URL | サイズ | 用途 |
|---|---|---|---|
| CountUp.js | `cdn.jsdelivr.net/npm/countup.js@2.8.0/dist/countUp.umd.js` | ~6KB | スコアカウントアップ |
| canvas-confetti | `cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js` | ~6KB | 高スコア祝福演出 |
| Chart.js | `cdn.jsdelivr.net/npm/chart.js` | ~65KB | レーダーチャート（任意） |

**スコア円形プログレス、スタガードアニメーション、スケルトンスクリーン、AI分析ローダー、ストリーミングテキスト、ホバーエフェクト、グラデーント演出はすべて純CSS/JSで実装**でき、外部依存を最小化しつつ世界水準のリッチさを達成できる。Chart.jsはレーダーチャートが必要な場合のみ追加すればよい。

## 結論：設計判断の要点

本調査で最も重要な知見は、**業界トップクラスのプラットフォームがスコアの「数値」よりも「理由」を重視している**という事実である。単に「87%マッチ」と表示するだけでは不十分で、「なぜ87%なのか」をチェックリスト＋自然言語で説明することがユーザーの信頼とアクション率を高める。

実装面では、**SVGストロークアニメーション（0KB追加）+ CSS変数スタガー（0KB追加）+ ストリーミングテキスト（純JS）**の3技法がコストパフォーマンスに最も優れる。iframe環境という制約下で、`backdrop-filter`の使用は#1マッチカードのみに限定し、システムフォントスタックでフォント読み込みを回避する。**パープル→ブルー→シアン**のAIグラデーントカラーパレットは、ユーザーに「AI搭載」の印象を瞬時に与える確立されたビジュアル言語であり、積極的に採用すべきである。