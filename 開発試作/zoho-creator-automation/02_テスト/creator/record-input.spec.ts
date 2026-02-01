import { test, expect } from '@playwright/test';

test.describe('Zoho Creator レコード操作', () => {
  
  // テスト対象のアプリURL（実際のアプリURLに置き換え）
  const APP_URL = process.env.ZOHO_APP_URL || 'https://creator.zoho.com/appname';

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
  });

  test('フォームにレコードを入力する', async ({ page }) => {
    // フォーム入力画面へ移動（「追加」ボタンなど）
    const addButton = page.locator([
      'button:has-text("Add")',
      'button:has-text("追加")',
      '[data-action="add-record"]',
      '.add-record-btn'
    ].join(', ')).first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForLoadState('networkidle');
    }

    // フォームフィールドの入力例
    // 注意: 実際のフィールド名はアプリ構造に依存
    const testData = {
      'Name': 'テストレコード_' + Date.now(),
      'Email': 'test@example.com',
      'Description': 'Playwright自動入力テスト'
    };

    for (const [fieldName, value] of Object.entries(testData)) {
      // ラベルベースの入力を試行
      const field = page.getByLabel(fieldName).or(
        page.locator(`input[name*="${fieldName}"], textarea[name*="${fieldName}"]`)
      );
      
      if (await field.isVisible({ timeout: 3000 }).catch(() => false)) {
        await field.fill(value);
        console.log(`入力完了: ${fieldName} = ${value}`);
      } else {
        console.log(`フィールドが見つかりません: ${fieldName}`);
      }
    }

    // スクリーンショット
    await page.screenshot({ 
      path: '02_テスト/logs/record-input-form.png' 
    });
  });

  test('レコード一覧を表示する', async ({ page }) => {
    // レポート/一覧画面の検出
    const reportView = page.locator('.report-view, .list-view, [data-view-type="report"]');
    
    if (await reportView.isVisible({ timeout: 5000 }).catch(() => false)) {
      // テーブル行の取得
      const rows = page.locator('tr, .record-row, [data-record-id]');
      const rowCount = await rows.count();
      console.log(`レコード数: ${rowCount}`);
      
      await page.screenshot({ 
        path: '02_テスト/logs/record-list.png',
        fullPage: true 
      });
    }
  });
});
