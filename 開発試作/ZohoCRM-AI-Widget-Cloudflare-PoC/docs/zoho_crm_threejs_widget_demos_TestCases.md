# Zoho CRM Three.js Widget Demos Test Cases

Place this in `<ProjectRoot>/02_テスト/test_cases/zoho_crm_threejs_widget_demos_TestCases.md`.

## TC-01 ローカル mock 起動

1. `npm run check:files` を実行する
2. `npm run serve` を実行する
3. `http://127.0.0.1:5174/widget.html` を開く

期待結果:

- `Three CRM Lens` が表示される
- `Deals Orbit` が初期選択される
- canvas が非空で描画される
- Context に mock の Entity / RecordID が表示される

## TC-02 demo mode 切替

1. 5つの tab を順にクリックする

期待結果:

- scene title、metrics、records が mode に応じて更新される
- canvas の表示が切り替わる
- JavaScript エラーで描画が停止しない

## TC-03 3D 操作

1. canvas 上で pointer drag する
2. pointer を離して数秒待つ

期待結果:

- drag 中に 3D group が回転する
- pointer release 後に自動の低速回転へ戻る

## TC-04 CRM SDK 環境

1. Zoho CRM widget として upload する
2. PageLoad context を持つ配置場所で開く

期待結果:

- `ZOHO.embeddedApp.on("PageLoad")` 登録後に `init()` される
- `ZOHO.CRM.API.getAllRecords` で対象 entity を読む
- `ZOHO.CRM.UI.Resize` が mode ごとの高さで呼ばれる

## TC-05 安全性

1. CRM レコードの文字列項目に HTML 断片を含める
2. widget で該当レコードを表示する

期待結果:

- HTML として解釈されず、テキストとして表示される
- DOM に script / inline event handler が挿入されない

