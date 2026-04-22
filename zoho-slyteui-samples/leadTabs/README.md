# leadTabs

SlyteUI の `lyte-tabs` を使った 3 タブの Lead 詳細ページ用 widget。

## タブ構成

| タブ | 内容 | 使用 API |
|---|---|---|
| 📋 基本情報 | First/Last Name, Company, Email, Phone, Industry, Lead_Status | `zrc.get('/crm/v8/Leads/{id}')` |
| 📝 メモ | Lead に紐づく Notes 全件 | `zrc.get('/crm/v8/Leads/{id}/Notes')` |
| ✅ タスク | Lead に紐づく Tasks 全件 | `zrc.get('/crm/v8/Leads/{id}/Tasks')` |

各タブに「🔄 再読み込み」ボタンがあり、押下時に zrc.get で取得 → setData で表示更新。

## lyte-tabs の SlyteUI 必須構造

```html
<lyte-tabs @data="lyteTabs1" lt-prop-height="480px" node-id="lyteTabs1" group-name="lyte-ui-component">
  <template is="registerYield" node-id="templateNode1" yield-name="tabYield">
    <lyte-tab-head node-id="lyteTabHead1">
      <lyte-tab-title lt-prop-id="tabA" node-id="lyteTabTitle1">
        <span @data="span1" node-id="span1" group-name="native-html">タブ A</span>
      </lyte-tab-title>
      ...
    </lyte-tab-head>
    <lyte-tab-body node-id="lyteTabBody1">
      <lyte-tab-content id="tabA" lyte-display="grid" node-id="lyteTabContent1">
        <!-- タブ A の中身 -->
      </lyte-tab-content>
      ...
    </lyte-tab-body>
  </template>
</lyte-tabs>
```

ポイント:
- `<template is="registerYield" yield-name="tabYield">` で囲む（Slyte の yield 機構）
- `lyte-tab-title` の `lt-prop-id` と `lyte-tab-content` の `id` を一致させる
- 各 `lyte-tab-content` は `lyte-display="grid"` を指定

## helpers の活用

`actions` から `methods` や他 `actions` を `this.x()` で呼べない（Proxy 制限）。
共通ロジックは `static helpers()` に純粋関数として置き、`Leadtabs.helpers().fnName(args)` で呼ぶ:

```javascript
static helpers() {
    return {
        joinNotes(notes) { ... }
    }
}

// action 内
self.setData("notesText", Leadtabs.helpers().joinNotes(notes));
```

## クラス名と配置

- Display Name: "LeadTabs" など任意
- API Name (内部) : `Leadtabs`
- 配置: Lead モジュール > 詳細ページ
