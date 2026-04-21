import { Page, Locator, expect } from '@playwright/test';

/**
 * Contact 編集ページの Page Object。
 *
 * Zoho CRM (lyte-input ベース) のセレクタ規則:
 *   API名 "Mailing_Zip" → DOM 属性 data-zcqa="MAILINGZIP"
 *                      → id="Crm_Contacts_MAILINGZIP_LInput"
 * （アンダースコア除去 + 大文字化）
 */
export class ContactEditPage {
  constructor(private readonly page: Page) {}

  async goto(contactId: string) {
    await this.page.goto(`/crm/tab/Contacts/${contactId}/edit`);
    await this.page.waitForLoadState('networkidle');
    await this.page.locator('lyte-input[data-zcqa]').first().waitFor({ timeout: 30_000 });
  }

  private toZcqa(apiName: string): string {
    return apiName.replace(/_/g, '').toUpperCase();
  }

  field(apiName: string): Locator {
    const zcqa = this.toZcqa(apiName);
    return this.page.locator(`lyte-input[data-zcqa="${zcqa}"] input`).first();
  }

  async setField(apiName: string, value: string) {
    const input = this.field(apiName);
    await input.click();
    await input.fill('');
    await input.fill(value);
  }

  async commitField(apiName: string) {
    await this.field(apiName).press('Tab');
  }
}
