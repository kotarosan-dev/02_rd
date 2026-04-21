# Kaizen Watch

Zoho CRM の [Kaizen Series Directory](https://www.zoho.com/crm/developer/docs/kaizen-series-directory.html) を月次で巡回し、未取り込みの新規投稿を検出するスクリプト。

## 使い方

```bash
# 差分レポート表示のみ
node scripts/kaizen-watch/kaizen-watch.mjs

# 既知リストを今日時点に更新（次回 diff の基準にする）
node scripts/kaizen-watch/kaizen-watch.mjs --update

# 月次レポートをファイルに出す
node scripts/kaizen-watch/kaizen-watch.mjs > reports/kaizen-$(date +%Y%m).md
```

## 運用フロー（月初 1 回）

1. `node scripts/kaizen-watch/kaizen-watch.mjs > kaizen-report.md` を実行
2. レポートの「新規候補」を 1 つずつ確認
3. 既存スキル（`zoho-crm-*` / `zoho-setup` / `zoho-harness`）に取り込めるテーマか判断
   - YES → 該当スキルに節追加 or 新規スキル化（empirical-prompt-tuning で評価）
   - NO  → 「対象外」とメモして次回以降スキップ
4. 判断完了後 `--update` を付けて再実行し、既知リストを最新化

## 自動化（任意）

### Windows タスクスケジューラ

- トリガー: 毎月 1 日 09:00
- 操作: `node "c:\...\scripts\kaizen-watch\kaizen-watch.mjs" > "c:\...\reports\kaizen-monthly.md"`

### GitHub Actions（このリポジトリを GitHub に置いている場合）

```yaml
on:
  schedule:
    - cron: '0 0 1 * *'   # 月初 09:00 JST = 00:00 UTC
jobs:
  watch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: node scripts/kaizen-watch/kaizen-watch.mjs > kaizen-report.md
      - uses: actions/upload-artifact@v4
        with: { name: kaizen-report, path: kaizen-report.md }
```

## 制限

- 公式ページの HTML 構造変化に弱い（タイトル抽出は `Kaizen #NN - Title` の正規表現マッチ）
- ページが Cloudflare 等で SSR レンダリングされていると本文が拾えないことがある（その場合は WebFetch / WebSearch ベースで補助）
- 新規 Kaizen 番号でなくとも有意な投稿（カテゴリ別総まとめ等）は拾えない場合がある → 月次レビュー時に Directory ページを目視確認するのが安全
