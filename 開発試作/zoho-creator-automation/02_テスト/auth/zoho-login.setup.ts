import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../../03_実装/auth-state/zoho.json');

setup('Zohoログイン認証', async ({ page }) => {
  // Zohoログインページへ移動
  await page.goto('https://accounts.zoho.com/signin');
  
  // ログインIDの入力
  // 注意: 実際のメールアドレスは環境変数から取得すること
  const email = process.env.ZOHO_EMAIL || 'your-email@example.com';
  await page.locator('#login_id').fill(email);
  await page.locator('button#nextbtn').click();
  
  // パスワード画面が表示されるまで待機
  await page.waitForSelector('#password', { state: 'visible', timeout: 10000 });
  
  // パスワードの入力
  // 注意: 実際のパスワードは環境変数から取得すること
  const password = process.env.ZOHO_PASSWORD || 'your-password';
  await page.locator('#password').fill(password);
  
  // サインインボタンをクリック
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // ログイン成功の確認（Zohoホームまたはダッシュボードへのリダイレクト）
  await page.waitForURL(/zoho\.com/, { timeout: 30000 });
  
  // 認証状態を保存
  await page.context().storageState({ path: authFile });
  
  console.log('認証状態を保存しました:', authFile);
});
