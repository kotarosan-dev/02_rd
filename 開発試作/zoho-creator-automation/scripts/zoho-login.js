/**
 * Zoho ログイン スタンドアロンスクリプト
 * 
 * 使い方: node scripts/zoho-login.js
 * または: npx playwright test を使わずに直接実行
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// 環境変数を読み込む
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ZOHO_EMAIL = process.env.ZOHO_EMAIL;
const ZOHO_PASSWORD = process.env.ZOHO_PASSWORD;
const AUTH_STATE_PATH = path.resolve(__dirname, '../03_実装/auth-state/zoho.json');
const SCREENSHOT_DIR = path.resolve(__dirname, '../02_テスト/screenshots');

async function main() {
  console.log('=== Zoho ログイン自動化スクリプト ===\n');

  // スクリーンショットディレクトリを作成
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 認証状態ディレクトリを作成
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // ブラウザを起動（ヘッドありモード）
  console.log('ブラウザを起動中...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500  // 操作を見やすくするため少し遅延
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Zohoログインページへ移動
    console.log('Step 1: Zohoログインページへ移動');
    await page.goto('https://accounts.zoho.com/signin');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_page.png') });

    // Step 2: メールアドレスを入力
    console.log('Step 2: メールアドレスを入力');
    await page.locator('#login_id').fill(ZOHO_EMAIL);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_email_entered.png') });

    // Step 3: 「次へ」ボタンをクリック
    console.log('Step 3: 「次へ」ボタンをクリック');
    await page.locator('#nextbtn').click();

    // Step 4: パスワード入力欄が表示されるまで待機
    console.log('Step 4: パスワード入力欄を待機');
    await page.waitForSelector('#password', { state: 'visible', timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_password_page.png') });

    // Step 5: パスワードを入力
    console.log('Step 5: パスワードを入力');
    await page.locator('#password').fill(ZOHO_PASSWORD);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_password_entered.png') });

    // Step 6: サインインボタンをクリック
    console.log('Step 6: サインインボタンをクリック');
    // 複数のボタンセレクターを試す
    const signInButton = page.locator('#nextbtn');
    await signInButton.click();

    // Step 7: ログイン完了を待機（zoho.com または zoho.jp のいずれかにリダイレクト）
    console.log('Step 7: ログイン完了を待機');
    await page.waitForURL(/zoho\.(com|jp)/, { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log(`リダイレクト先: ${page.url()}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_logged_in.png') });

    // リカバリー情報追加ページが表示された場合はスキップ
    if (page.url().includes('add-recovery') || page.url().includes('announcement')) {
      console.log('リカバリー情報追加ページが表示されました。スキップします...');
      const skipButton = page.locator('text=後で').or(page.locator('text=スキップ')).or(page.locator('text=Skip'));
      if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await skipButton.click();
        await page.waitForLoadState('networkidle');
      }
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_after_skip.png') });
    }

    // Step 8: 認証状態を保存
    console.log('Step 8: 認証状態を保存');
    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`認証状態を保存しました: ${AUTH_STATE_PATH}`);

    console.log('\n=== ログイン成功 ===');
    console.log(`現在のURL: ${page.url()}`);

    // 5秒待ってからブラウザを閉じる
    console.log('\n5秒後にブラウザを閉じます...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('\n=== エラー発生 ===');
    console.error(error.message);
    
    // エラー時のスクリーンショット
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_screenshot.png') });
    console.log('エラー時のスクリーンショットを保存しました');
    
    // エラー時は10秒待ってから閉じる（確認用）
    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
    console.log('ブラウザを閉じました');
  }
}

main().catch(console.error);
