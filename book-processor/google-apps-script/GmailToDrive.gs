/**
 * Gmail添付ファイルをGoogle Driveに自動保存
 *
 * セットアップ:
 * 1. script.google.com で新規プロジェクト作成
 * 2. このコードを貼り付け
 * 3. saveToDrive() を1分トリガーで設定
 */

// 設定
const CONFIG = {
  // 保存先フォルダ名（自動作成される）
  FOLDER_NAME: "VFlatScan_Books",

  // 処理済みラベル名
  PROCESSED_LABEL: "BookProcessed",

  // VFlatScan送信元アドレス（自分のアドレス）
  SENDER_EMAIL: "info@kotarosan-nocode.com",

  // 対象拡張子
  EXTENSIONS: [".txt", ".text", ".md"]
};

/**
 * メイン関数（トリガーで実行）
 */
function saveToDrive() {
  const folder = getOrCreateFolder(CONFIG.FOLDER_NAME);
  const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);

  // 未読メールを検索
  const threads = GmailApp.search("is:unread");

  let savedCount = 0;

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (!message.isUnread()) continue;

      // 送信元が自分（VFlatScan経由）か確認
      const from = message.getFrom().toLowerCase();
      const isFromSelf = from.includes(CONFIG.SENDER_EMAIL.toLowerCase());
      if (!isFromSelf) continue;

      // 添付ファイルを処理
      const attachments = message.getAttachments();
      let hasTextFile = false;

      for (const attachment of attachments) {
        const filename = attachment.getName();
        const isTextFile = CONFIG.EXTENSIONS.some(ext =>
          filename.toLowerCase().endsWith(ext)
        );

        if (isTextFile) {
          // 元のファイル名のままDriveに保存
          folder.createFile(attachment.copyBlob().setName(filename));
          Logger.log("保存: " + filename);

          hasTextFile = true;
          savedCount++;
        }
      }

      // 処理済みとしてマーク
      message.markRead();
      thread.addLabel(label);

      if (!hasTextFile) {
        Logger.log("テキストファイルなし: " + message.getSubject());
      }
    }
  }

  Logger.log("処理完了: " + savedCount + "件のファイルを保存");
}

/**
 * フォルダを取得または作成
 */
function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(name);
}

/**
 * ラベルを取得または作成
 */
function getOrCreateLabel(name) {
  let label = GmailApp.getUserLabelByName(name);

  if (!label) {
    label = GmailApp.createLabel(name);
  }

  return label;
}

/**
 * 初期セットアップ（手動で1回実行）
 */
function setup() {
  // フォルダ作成
  const folder = getOrCreateFolder(CONFIG.FOLDER_NAME);
  Logger.log("フォルダ作成: " + folder.getUrl());

  // ラベル作成
  const label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  Logger.log("ラベル作成: " + CONFIG.PROCESSED_LABEL);

  Logger.log("セットアップ完了！");
  Logger.log("次のステップ:");
  Logger.log("1. saveToDrive を1分トリガーに設定");
  Logger.log("2. Google Drive for Desktop でフォルダを同期");
}
