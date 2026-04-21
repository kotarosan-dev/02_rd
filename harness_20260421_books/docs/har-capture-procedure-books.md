# Books 内部 API HAR 採取手順書 (T02-A)

## 目的

`books.zoho.jp` の管理画面 (Settings → Automation) が叩いている内部 XHR を録画して、
**Workflow Custom Function / Custom Schedule / Custom Button の CRUD・実行・logs API** をリバースエンジニアリングする。

採取した HAR は `harness_20260421_books/docs/har/` に置き、後続 T02-C で解析する。

---

## 0. 事前準備

- Chrome (または Edge) で `https://books.zoho.jp` にログイン済みであること
- 管理者権限のあるアカウントで操作すること（kotarosan org `90000792806`）
- 既存の Workflow / Custom Function を**少なくとも 1 つ**作成しておくこと（list/get/update の検証に必須）
  - 一時的な `_qa_books_test` 関数を 1 件だけ手で作って、終わったら削除する形で OK
- Network 録画中に余計なタブを開かない（HAR が肥大化する）

### ⚠️ DevTools の必須設定（これが OFF だと HAR に Save の XHR が入らない）

1. F12 → Network タブ → **歯車アイコン (Settings)** をクリック
2. ✅ **"Preserve log"** を ON （ページ遷移しても XHR ログが消えない）
3. ✅ **"Disable cache"** を ON （キャッシュで XHR が省略されないように）
4. Network タブの Filter ボタンで **"All"** を選択（"Fetch/XHR" だけだと iframe の document が落ちる場合あり）
5. 右上の **3点メニュー → "Big request rows"** にしておくと URL が見やすい

> 2026-04-21 の初回採取で Preserve log OFF だったため Save の POST が記録されず、再採取となりました。再発防止のため必須化。

---

## 1. 採取手順（Chrome DevTools）

各シナリオで **別の HAR ファイル**として保存する。順番どおり実行。

### Scenario A: Workflow Rule 一覧と詳細

1. Books → 設定 (歯車) → **オートメーション → ワークフロールール**
2. F12 → **Network タブ → 録画ON (●) → Clear (🚫)**
3. 一覧画面をリロード（Ctrl+R）
4. 任意のワークフロールールを **クリックして詳細を開く**
5. 録画OFF → **右クリック → "Save all as HAR with content"** → `docs/har/books_a_workflow.har`

### Scenario B: Custom Function (Workflow から開く)

1. Workflow Rule の詳細画面で **アクション → カスタム関数** を開く
2. 録画ON → Clear
3. **既存の関数 1 つをクリックして編集画面を開く**
4. **Deluge コードを 1 文字だけ変更 → Save** （差分検証用）
5. **Save 完了を待ってから**録画OFF
6. 保存 → `docs/har/books_b_function_open_save.har`

### Scenario C: Custom Function 新規作成

1. ワークフロー編集画面で **新しいカスタム関数を作成** ボタン
2. 録画ON → Clear
3. 関数名 `_qa_books_test_<日付>`、language=Deluge、body は `info "ping";` のみ → **Save**
4. 録画OFF → 保存 → `docs/har/books_c_function_create.har`
5. **作成された関数を控えておく**（あとで削除する）

### Scenario D: Custom Function テスト実行

1. 上で作った関数の編集画面に戻る
2. 録画ON → Clear
3. **Execute / Test ボタン**を押す（実行）
4. 結果ペインが表示されるまで待つ
5. 録画OFF → 保存 → `docs/har/books_d_function_execute.har`

### Scenario E: Custom Function 実行履歴 (logs)

1. 関数編集画面の **History / 実行履歴 / Logs タブ**をクリック
2. 録画ON → Clear
3. 履歴一覧をクリックして 1 件の詳細を開く
4. 録画OFF → 保存 → `docs/har/books_e_function_logs.har`

### Scenario F: Custom Function 削除

1. 一覧に戻る
2. 録画ON → Clear
3. 上で作った `_qa_books_test_<日付>` を **Delete**
4. 録画OFF → 保存 → `docs/har/books_f_function_delete.har`

### Scenario G: Schedule (定期実行)

1. 設定 → オートメーション → **スケジュール / Custom Schedules**
2. 録画ON → Clear → 一覧をリロード → 任意の schedule を開く
3. 録画OFF → 保存 → `docs/har/books_g_schedule.har`

### Scenario H: Custom Button (オプション)

1. 設定 → カスタマイゼーション → **カスタムボタン**
2. 録画ON → Clear → 既存ボタン 1 件を開く / 新規 1 件作成 → Save
3. 録画OFF → 保存 → `docs/har/books_h_custombutton.har`

---

## 2. 配置先

```
harness_20260421_books/
└─ docs/
   └─ har/
      ├─ books_a_workflow.har
      ├─ books_b_function_open_save.har
      ├─ books_c_function_create.har
      ├─ books_d_function_execute.har
      ├─ books_e_function_logs.har
      ├─ books_f_function_delete.har
      ├─ books_g_schedule.har
      └─ books_h_custombutton.har         (任意)
```

`docs/har/*` は **絶対に commit しない**（Cookie / CSRF が含まれる）。
`.gitignore` に既に追加してあれば OK。なければ手順 3 を実施。

---

## 3. .gitignore 確認

ルート `.gitignore` または `harness_20260421_books/.gitignore` に下記を含める:

```
harness_20260421_books/docs/har/*
!harness_20260421_books/docs/har/.gitkeep
.env
.env.keys
```

---

## 4. 採取後にユーザーが実施すること

1. HAR ファイルを上記パスに配置
2. 配置できたらチャットに「**HAR 配置完了**」と伝える
3. 以降は AI 側で T02-C (HAR 解析 → 内部 API 仕様抽出) を進める

---

## 5. シナリオが期待どおりに動かない場合


| 症状                        | 対応                                                                     |
| ------------------------- | ---------------------------------------------------------------------- |
| Workflow Rule が 1 件もない    | Scenario A はスキップ。Scenario C で関数を作ってから Scenario A を後追い                  |
| Custom Function メニューが見えない | プランが Free の可能性。プランを確認（T01-D で plan_type=5003 確認済み = Premium 系なので使えるはず） |
| HAR ファイルが 50MB を超える       | 録画開始前に Network タブで Filter "Fetch/XHR" のみに絞る                            |
| Save 時に 403 / 401 が出る     | ログインし直す（Cookie が古い）                                                    |


---

## 6. 解析側で抽出するもの (T02-C で実施)

各 HAR から下記を取り出して `docs/books-internal-api-spec.md` に表形式で整理:


| 項目                 | 期待                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------- |
| URL (path + query) | `https://books.zoho.jp/api/v3/...` または `https://books.zoho.jp/...`                    |
| Method             | GET/POST/PUT/DELETE                                                                   |
| 必須 Headers         | `X-ZB-CSRF-TOKEN` / `X-ZB-Source-Token` / `X-Requested-With` 等                        |
| Cookie の必須キー       | JSESSIONID 等                                                                          |
| Body 構造            | JSON or form                                                                          |
| Response 構造        | id / script / status / logs                                                           |
| 9 種マッピング           | list / get / create / update / delete / execute / logs(history) / logs(detail) / test |


