# SlyteUI サンプル収集 — AI が詰まっている点の分析

## 目的
動作確認済みの SlyteUI コンポーネント 4 件を集めて、共通点と「AI が外しがちなポイント」を構造的に抽出する。

## ディレクトリ構成
各 sample フォルダに以下 3 ファイルを配置:

```
sample01/
  component.html
  component.js
  component.css
sample02/
  ...
```

ファイル名は固定 (`component.{html,js,css}`) で OK。中身に書かれた `class` 名や `node-id` を比較する目的なので、ファイル名そのものは比較対象ではない。

## 分析の観点（後で AI が見るチェックリスト）
1. **`import` 行**: `@slyte/core` / `@slyte/component` のどちらを import しているか、`prop` を import しているか
2. **`constructor()`**: 明示しているか省略しているか
3. **`class` 名 vs API Name**: パネルの「クラス名」と完全一致か、API Name と一致か
4. **`export` 形式**: `export { Foo }` か `export default Foo` か
5. **ライフサイクル**: `init()` / `attached()` / `created()` / `rendered()` のどれを使っているか
6. **`data()` の戻り値構造**: スカラだけか、`@data` 用にオブジェクトを返しているか
7. **`static actions/methods/helpers/observers`** の定義有無
8. **HTML の `<template>` 直下に何が来ているか**（root が複数兄弟か単一か）
9. **CSS の `:host` ブロックの正規形**
10. **`node-id` / `group-name` の付け方の癖**

サンプル収集後、AI が一括 Read して上記表にまとめる。
