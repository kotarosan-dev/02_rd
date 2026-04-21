import { test, expect } from '@playwright/test';
import { ContactEditPage } from '../pages/ContactEditPage';

const CONTACT_ID = process.env.TEST_CONTACT_ID ?? '';

test.skip(!CONTACT_ID, 'TEST_CONTACT_ID 未設定（.env を作成してください）');

test('郵便番号→住所自動入力（setAddress / onChange）', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Client Script 由来の uncaught 例外のみ拾う（CRM 本体の console.error ノイズは無視）
  const pageErrors: string[] = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  const zipApiCalls: string[] = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('zipcloud') || url.includes('zip')) {
      zipApiCalls.push(`${req.method()} ${url}`);
    }
  });

  const contact = new ContactEditPage(page);
  await contact.goto(CONTACT_ID);

  await contact.setField('Mailing_Zip', '1000001');
  await contact.commitField('Mailing_Zip');

  await expect(contact.field('Mailing_State')).toHaveValue('東京都', { timeout: 10_000 });
  await expect(contact.field('Mailing_City')).toHaveValue(/千代田/);

  expect(zipApiCalls.length, `zipcloud への呼び出しが観測されなかった\nlogs:\n${consoleLogs.join('\n')}`).toBeGreaterThan(0);

  expect(pageErrors, `Client Script で uncaught 例外\n${pageErrors.join('\n')}`).toEqual([]);
});
