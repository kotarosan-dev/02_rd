import { test, expect } from '@playwright/test';

test.describe('Zoho Creator フォーム作成', () => {
  
  test.beforeEach(async ({ page }) => {
    // Zoho Creatorホームページへ移動
    await page.goto('https://creator.zoho.com/');
    
    // ページ読み込み完了を待機
    await page.waitForLoadState('networkidle');
  });

  test('Creatorダッシュボードにアクセスできる', async ({ page }) => {
    // ダッシュボードの存在確認
    // 注意: セレクターはZoho UIの構造に応じて調整が必要
    await expect(page).toHaveURL(/creator\.zoho\.com/);
    
    // スクリーンショットを保存
    await page.screenshot({ 
      path: '02_テスト/logs/creator-dashboard.png',
      fullPage: true 
    });
  });

  test('新規アプリケーション作成画面を開く', async ({ page }) => {
    // 「新しいアプリケーション」ボタンを探す
    // 複数のセレクター戦略を試行
    const createAppButton = page.locator([
      'button:has-text("Create Application")',
      'button:has-text("新しいアプリケーション")',
      '[data-testid="create-app-btn"]',
      '.create-app-button',
      'a:has-text("Create")'
    ].join(', ')).first();

    // ボタンが存在する場合はクリック
    if (await createAppButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createAppButton.click();
      
      // 作成画面のスクリーンショット
      await page.screenshot({ 
        path: '02_テスト/logs/create-app-dialog.png' 
      });
    } else {
      // ボタンが見つからない場合は現在のページ構造を記録
      console.log('Create Applicationボタンが見つかりません。UI構造を確認してください。');
      await page.screenshot({ 
        path: '02_テスト/logs/page-structure.png',
        fullPage: true 
      });
    }
  });

  test('既存アプリ一覧を取得する', async ({ page }) => {
    // アプリ一覧の取得
    // 注意: セレクターはZoho UIの構造に応じて調整が必要
    const appCards = page.locator('.app-card, [data-type="application"], .application-item');
    
    const count = await appCards.count();
    console.log(`検出されたアプリ数: ${count}`);
    
    if (count > 0) {
      // 各アプリの名前を取得
      for (let i = 0; i < count; i++) {
        const appName = await appCards.nth(i).textContent();
        console.log(`アプリ ${i + 1}: ${appName}`);
      }
    }
    
    // 一覧のスクリーンショット
    await page.screenshot({ 
      path: '02_テスト/logs/app-list.png',
      fullPage: true 
    });
  });
});
