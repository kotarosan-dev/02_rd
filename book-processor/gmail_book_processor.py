"""
Gmail書籍テキスト自動処理スクリプト
VFlatScanから送信された書籍テキストを自動取得し、Claude Codeで処理

必要なもの:
- Gmailアプリパスワード（2段階認証有効時）
- Python 3.8+
- Claude Code CLI（インストール済み）

使い方:
1. 環境変数を設定:
   export GMAIL_ADDRESS="your@gmail.com"
   export GMAIL_APP_PASSWORD="your-app-password"

2. スクリプト実行:
   python gmail_book_processor.py
"""

import imaplib
import email
from email.header import decode_header
import os
import sys
import subprocess
import time
import re
from pathlib import Path
from datetime import datetime
import logging

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('book_processor.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class GmailBookProcessor:
    """Gmailから書籍テキストを取得してClaude Codeで処理"""

    def __init__(self):
        self.gmail_address = os.getenv('GMAIL_ADDRESS')
        self.gmail_password = os.getenv('GMAIL_APP_PASSWORD')

        if not self.gmail_address or not self.gmail_password:
            raise ValueError(
                "環境変数 GMAIL_ADDRESS と GMAIL_APP_PASSWORD を設定してください"
            )

        # 出力ディレクトリ
        self.output_base = Path(
            r"C:\Users\user\Desktop\kotarosan\03_Internal\02_R&D\books"
        )
        self.output_base.mkdir(parents=True, exist_ok=True)

        # 処理済みラベル
        self.processed_label = "BookProcessed"

        # VFlatScanからのメール識別用
        self.vflatscan_patterns = [
            "vflat",
            "スキャン",
            "scan",
            "書籍",
            "book"
        ]

    def connect(self):
        """Gmail IMAPに接続"""
        logger.info("Gmailに接続中...")
        self.imap = imaplib.IMAP4_SSL("imap.gmail.com")
        self.imap.login(self.gmail_address, self.gmail_password)
        logger.info("Gmail接続成功")

    def disconnect(self):
        """接続を切断"""
        try:
            self.imap.logout()
            logger.info("Gmail接続を切断しました")
        except Exception:
            pass

    def decode_mime_header(self, header):
        """MIMEヘッダーをデコード"""
        if header is None:
            return ""

        decoded_parts = decode_header(header)
        result = []
        for part, charset in decoded_parts:
            if isinstance(part, bytes):
                charset = charset or 'utf-8'
                try:
                    result.append(part.decode(charset))
                except Exception:
                    result.append(part.decode('utf-8', errors='replace'))
            else:
                result.append(part)
        return ''.join(result)

    def is_vflatscan_email(self, subject, sender):
        """VFlatScanからのメールかどうか判定"""
        text = f"{subject} {sender}".lower()
        return any(pattern in text for pattern in self.vflatscan_patterns)

    def get_unprocessed_emails(self):
        """未処理の書籍メールを取得"""
        self.imap.select("INBOX")

        # 未読 + 添付ファイルあり のメールを検索
        # ラベル「BookProcessed」がないものを対象
        search_criteria = '(UNSEEN)'

        status, messages = self.imap.search(None, search_criteria)

        if status != "OK":
            logger.warning("メール検索に失敗しました")
            return []

        email_ids = messages[0].split()
        logger.info(f"未読メール: {len(email_ids)}件")

        book_emails = []

        for email_id in email_ids:
            status, msg_data = self.imap.fetch(email_id, "(RFC822)")

            if status != "OK":
                continue

            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)

            subject = self.decode_mime_header(msg["Subject"])
            sender = self.decode_mime_header(msg["From"])

            # VFlatScanからのメールか確認
            if self.is_vflatscan_email(subject, sender):
                logger.info(f"書籍メール検出: {subject}")
                book_emails.append({
                    "id": email_id,
                    "subject": subject,
                    "message": msg
                })

        return book_emails

    def extract_text_attachment(self, msg):
        """テキスト添付ファイルを抽出"""
        attachments = []

        for part in msg.walk():
            content_disposition = part.get("Content-Disposition", "")

            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    filename = self.decode_mime_header(filename)

                    # テキストファイルのみ対象
                    if filename.endswith(('.txt', '.text', '.md')):
                        content = part.get_payload(decode=True)

                        # エンコーディング検出
                        charset = part.get_content_charset() or 'utf-8'
                        try:
                            text = content.decode(charset)
                        except Exception:
                            text = content.decode('utf-8', errors='replace')

                        attachments.append({
                            "filename": filename,
                            "content": text
                        })
                        logger.info(f"添付ファイル検出: {filename}")

        return attachments

    def sanitize_filename(self, name):
        """ファイル名として使用可能な文字列に変換"""
        # 拡張子を除去
        name = Path(name).stem
        # 無効な文字を置換
        name = re.sub(r'[<>:"/\\|?*]', '_', name)
        # 空白を置換
        name = re.sub(r'\s+', '_', name)
        return name[:50]  # 長さ制限

    def process_with_claude(self, book_name, text_content, output_dir):
        """Claude Code CLIで処理"""
        logger.info(f"Claude Code処理開始: {book_name}")

        # 一時ファイルに書き込み
        temp_file = output_dir / "source.txt"
        temp_file.write_text(text_content, encoding='utf-8')

        # 処理タスクの定義
        tasks = [
            {
                "name": "article",
                "prompt": f"""この書籍テキストからnote記事を生成してください。
/book-article-generator スキルを使用して、読者の「問い」を起点にした記事を作成してください。

書籍名: {book_name}
テキストファイル: {temp_file}

出力先: {output_dir / 'article.md'}""",
                "output": "article.md"
            },
            {
                "name": "summary",
                "prompt": f"""この書籍テキストの要約を作成してください。

以下の構成で:
1. 一言で言うと（1行）
2. 主要なポイント（3-5個）
3. 実践への示唆（3個）
4. 印象に残った引用（2-3個）

書籍名: {book_name}
出力先: {output_dir / 'summary.md'}""",
                "output": "summary.md"
            },
            {
                "name": "skill",
                "prompt": f"""この書籍からClaude Code用のSkillを抽出してください。
/skill-extraction-template スキルを使用してください。

書籍名: {book_name}
出力先ディレクトリ: {output_dir / 'skill'}""",
                "output": "skill/"
            }
        ]

        results = {}

        for task in tasks:
            logger.info(f"タスク実行中: {task['name']}")

            try:
                # Claude Code CLIを実行
                result = subprocess.run(
                    [
                        "claude",
                        "-p",
                        task["prompt"],
                        "--allowedTools", "Read,Write,Edit,Glob,Grep,Bash"
                    ],
                    capture_output=True,
                    text=True,
                    timeout=600,  # 10分タイムアウト
                    cwd=str(output_dir)
                )

                if result.returncode == 0:
                    logger.info(f"タスク完了: {task['name']}")
                    results[task['name']] = "success"
                else:
                    logger.error(f"タスク失敗: {task['name']}")
                    logger.error(result.stderr)
                    results[task['name']] = "failed"

            except subprocess.TimeoutExpired:
                logger.error(f"タスクタイムアウト: {task['name']}")
                results[task['name']] = "timeout"
            except Exception as e:
                logger.error(f"タスクエラー: {task['name']} - {e}")
                results[task['name']] = f"error: {e}"

        return results

    def mark_as_processed(self, email_id):
        """メールを処理済みとしてマーク"""
        # 既読にする
        self.imap.store(email_id, '+FLAGS', '\\Seen')

        # ラベル（フォルダ）に移動（Gmailの場合はコピー+削除）
        # 注: Gmailでラベルを事前に作成しておく必要あり
        try:
            self.imap.copy(email_id, self.processed_label)
            logger.info(f"メールを {self.processed_label} ラベルに移動しました")
        except Exception as e:
            logger.warning(f"ラベル付与失敗（ラベルが存在しない可能性）: {e}")

    def process_email(self, email_data):
        """1通のメールを処理"""
        subject = email_data["subject"]
        msg = email_data["message"]
        email_id = email_data["id"]

        logger.info(f"処理開始: {subject}")

        # 添付ファイル抽出
        attachments = self.extract_text_attachment(msg)

        if not attachments:
            logger.warning(f"テキスト添付ファイルがありません: {subject}")
            return

        for attachment in attachments:
            book_name = self.sanitize_filename(attachment["filename"])
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            # 出力ディレクトリ作成
            output_dir = self.output_base / f"{timestamp}_{book_name}"
            output_dir.mkdir(parents=True, exist_ok=True)

            # Claude Codeで処理
            results = self.process_with_claude(
                book_name,
                attachment["content"],
                output_dir
            )

            # 結果サマリーを保存
            summary_path = output_dir / "processing_log.md"
            summary_content = f"""# 処理結果

- 処理日時: {datetime.now().isoformat()}
- 書籍名: {book_name}
- 元ファイル: {attachment['filename']}

## タスク結果

| タスク | 結果 |
|--------|------|
"""
            for task_name, result in results.items():
                summary_content += f"| {task_name} | {result} |\n"

            summary_path.write_text(summary_content, encoding='utf-8')

            logger.info(f"処理完了: {output_dir}")

        # 処理済みマーク
        self.mark_as_processed(email_id)

    def run_once(self):
        """1回だけ実行"""
        try:
            self.connect()
            emails = self.get_unprocessed_emails()

            for email_data in emails:
                self.process_email(email_data)

            if not emails:
                logger.info("処理対象のメールはありません")

        finally:
            self.disconnect()

    def run_daemon(self, interval_seconds=60):
        """デーモンモードで常駐実行"""
        logger.info(f"デーモンモード開始（{interval_seconds}秒間隔）")
        logger.info("Ctrl+C で停止")

        while True:
            try:
                self.run_once()
            except Exception as e:
                logger.error(f"エラー発生: {e}")

            time.sleep(interval_seconds)


def main():
    """メイン関数"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Gmail書籍テキスト自動処理"
    )
    parser.add_argument(
        "--daemon", "-d",
        action="store_true",
        help="デーモンモードで常駐実行"
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=60,
        help="ポーリング間隔（秒）"
    )

    args = parser.parse_args()

    processor = GmailBookProcessor()

    if args.daemon:
        processor.run_daemon(args.interval)
    else:
        processor.run_once()


if __name__ == "__main__":
    main()
