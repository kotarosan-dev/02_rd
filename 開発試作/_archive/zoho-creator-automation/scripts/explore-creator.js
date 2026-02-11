/**
 * Zoho Creator 探索スクリプト
 * 
 * 保存済みの認証状態を使って Creator 画面を開き、UI構造を調査する
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const AUTH_STATE_PATH = path.resolve(__dirname, '../03_実装/auth-state/zoho.json');
const SCREENSHOT_DIR = path.resolve(__dirname, '../02_テスト/screenshots/creator');

async function main() {
  console.log('=== Zoho Creator 探索スクリプト ===\n');

  // スクリーンショットディレクトリを作成
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 認証状態ファイルの確認
  if (!fs.existsSync(AUTH_STATE_PATH)) {
    console.error('エラー: 認証状態ファイルが見つかりません');
    console.error('先に zoho-login.js を実行してください');
    process.exit(1);
  }

  // ブラウザを起動（認証状態を読み込み）
  console.log('ブラウザを起動中（認証状態を復元）...');
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    storageState: AUTH_STATE_PATH
  });
  const page = await context.newPage();

  try {
    // Step 1: Zoho Creator ダッシュボードに移動
    console.log('\nStep 1: Zoho Creator ダッシュボードに移動');
    // 日本リージョンの場合は .jp、それ以外は .com
    await page.goto('https://creatorapp.zoho.jp/allApps', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_creator_home.png'), fullPage: true });
    console.log(`現在のURL: ${page.url()}`);

    // ログインが必要かチェック
    if (page.url().includes('accounts.zoho')) {
      console.log('⚠ ログインページにリダイレクトされました。認証状態が無効です。');
      console.log('zoho-login.js を再実行してください。');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_need_login.png') });
      await page.waitForTimeout(5000);
      await browser.close();
      return;
    }

    // Step 2: ページ構造を取得
    console.log('\nStep 2: ページ構造を調査');
    
    // タイトルを取得
    const title = await page.title();
    console.log(`ページタイトル: ${title}`);

    // 主要な要素を探索
    console.log('\n--- 主要な要素 ---');
    
    // ボタンを探す
    const buttons = await page.locator('button').all();
    console.log(`ボタン数: ${buttons.length}`);
    
    // 「新規作成」系のボタンを探す
    const createButtons = await page.locator('button:has-text("Create"), button:has-text("新規"), button:has-text("追加"), [data-testid*="create"]').all();
    if (createButtons.length > 0) {
      console.log(`「作成」系ボタン: ${createButtons.length}個発見`);
      for (let i = 0; i < Math.min(createButtons.length, 5); i++) {
        const text = await createButtons[i].textContent().catch(() => '(取得失敗)');
        console.log(`  - ${text.trim().substring(0, 50)}`);
      }
    }

    // リンクを探す
    const links = await page.locator('a').all();
    console.log(`リンク数: ${links.length}`);

    // アプリ一覧を探す
    const appItems = await page.locator('[class*="app"], [data-testid*="app"], .application-item').all();
    console.log(`アプリ要素: ${appItems.length}個`);

    // Step 3: スクリーンショットを複数角度から取得
    console.log('\nStep 3: 詳細スクリーンショット');
    
    // ビューポート全体
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_viewport.png') });
    
    // フルページ
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_fullpage.png'), fullPage: true });

    // Step 4: インタラクティブ探索（30秒間ブラウザを開いたまま）
    console.log('\n=== 探索完了 ===');
    console.log(`スクリーンショット保存先: ${SCREENSHOT_DIR}`);
    console.log('\n30秒間ブラウザを開いたままにします。手動で確認してください...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n=== エラー発生 ===');
    console.error(error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error_screenshot.png') });
    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
    console.log('ブラウザを閉じました');
  }
}

main().catch(console.error);
