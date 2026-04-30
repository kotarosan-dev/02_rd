# Zoho CRM Three.js Widget Demos ClientDoc

Place this in `<ProjectRoot>/01_計画/client_design/zoho_crm_threejs_widget_demos_ClientDoc.md`.

## 目的

Zoho CRM の widget iframe 内で、three.js を使った軽量な 3D 表現がどこまで実務 UI として成立するかを確認するためのデモ集を作成する。

## 想定デモ

| デモ | CRMデータ | 表示目的 |
| --- | --- | --- |
| Deals Orbit | Deals | 案件ステージ、金額、確度の直感的な把握 |
| Account Towers | Accounts | 取引先規模と業種の比較 |
| Activity Pulse | Tasks | 未完了活動と優先度の可視化 |
| Lead Focus | Leads | 見込み客の情報充足度と接点状態の把握 |
| Forecast Grid | Deals | 確度別の見込み売上確認 |

## デモ判断基準

- Zoho SDK の初期化順序が守られている
- CRM 環境外でも mock で動作確認できる
- 3D 表現が補助的で、CRM の実務操作を邪魔しない
- ライブラリと描画負荷を抑え、widget ZIP の制限内に収まる
- CRM データを安全に表示し、XSS につながる直接 HTML 挿入を避ける

## 成果物

- 実装: `<ProjectRoot>/03_実装/zoho-crm-threejs-widget-demos/`
- テストケース: `<ProjectRoot>/02_テスト/test_cases/zoho_crm_threejs_widget_demos_TestCases.md`

