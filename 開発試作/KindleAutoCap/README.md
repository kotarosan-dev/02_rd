# KindleAutoCap

Kindle for PC を自動操作してページごとにスクリーンショットを取得し、連番 PNG ファイルとして保存する Python スクリプトです。

YAML 設計書: [kindle_autocap.yaml](kindle_autocap.yaml)
PlantUML 図: [kindle_autocap.puml](kindle_autocap.puml)

## 目的

- Kindle for PC の書籍内容を自動でキャプチャします。
- 生成された PNG ファイルは、PDF への結合や OCR 処理などの後続プロセスで使用できます。

## セットアップ

1.  **リポジトリのクローンまたはダウンロード**
2.  **仮想環境の作成と有効化:**
    ```powershell
    python -m venv venv
    .\venv\Scripts\activate
    ```
3.  **依存関係のインストール:**
    ```powershell
    pip install -r requirements.txt
    ```
4.  **(重要) 終了マーカー画像の準備:**
    `res/end_marker.png` を、書籍の最終ページや特定の終了を示す実際の画像に置き換えてください。スクリプトはこの画像を画面上で探し、キャプチャを停止する条件として使用します。
5.  **設定ファイルの調整:**
    `kindle_autocap.yaml` を開き、環境に合わせて以下の項目を調整します。
    *   `paths`: `working_dir`, `output_dir` などを必要に応じて変更します。
    *   `capture`:
        *   `region`: キャプチャする領域を指定します (例: `[100, 150, 800, 600]`)。`null` の場合はフルスクリーンです。
        *   `delay_after_page`: ページめくり後の待機時間 (秒) を調整します。PC の性能や Kindle の反応速度に合わせてください。
    *   `controls`:
        *   `window_title`: 操作対象の Kindle ウィンドウのタイトルを指定します。部分一致や正規表現も使用可能です (PyAutoGUI の機能に依存)。
        *   `start_delay`: スクリプト実行後、Kindle ウィンドウを手動でアクティブにするための待機時間 (秒) です。
        *   `end_marker`: 終了マーカーの検出方法 (`image` または `pixel`) や、画像の信頼度 (`confidence`) を調整します。

## 使い方

1.  Kindle for PC を起動し、キャプチャを開始したいページを開いておきます。
2.  ターミナルまたはコマンドプロンプトで仮想環境を有効化します (`.\venv\Scripts\activate`)。
3.  以下のコマンドを実行します。
    ```powershell
    python capture.py --config kindle_autocap.yaml
    ```
4.  スクリプトが開始されると、`start_delay` で指定した秒数後に Kindle ウィンドウを自動でフォーカスしようと試みます。手動で Kindle ウィンドウを最前面に表示してください。
5.  自動的にページめくりとスクリーンショット取得が開始されます。
6.  以下のいずれかの条件で停止します:
    *   `end_marker` で指定した画像またはピクセルが画面上で検出された場合。
    *   `max_pages` で指定した最大ページ数に達した場合。
    *   手動でスクリプトを中断した場合 (Ctrl+C)。
7.  キャプチャされた画像は `output_dir` で指定されたディレクトリに `page_XXXX.png` の形式で保存されます。

## 注意事項

- このスクリプトは画面操作を自動化するため、実行中はマウスやキーボードの操作を行わないでください。
- Kindle for PC の UI が変更された場合、`window_title` や `end_marker` の設定、場合によってはスクリプト自体の修正が必要になることがあります。
- 著作権に配慮し、私的利用の範囲を超えないようにしてください。 