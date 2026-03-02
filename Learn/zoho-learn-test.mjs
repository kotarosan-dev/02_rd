#!/usr/bin/env node
/**
 * Zoho Learn API 実装テスト（テスト環境用）
 * 親ディレクトリの .env を読み、トークン取得 → コース一覧 → コース作成 → レッスン作成 → レポート取得 を実行。
 * ポータルURLは .env に ZOHO_LEARN_PORTAL_URL を設定するか、第1引数で指定。
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const portalUrl = process.argv[2] || process.env.ZOHO_LEARN_PORTAL_URL;

async function main() {
  console.log('Zoho Learn API test');
  console.log('  ZOHO_ORG_ID=%s', process.env.ZOHO_ORG_ID ? '***' : '(not set)');
  console.log('  DC=%s', process.env.ZOHO_DC || process.env.ZOHO_DATA_CENTER || 'jp');
  console.log('  Portal=%s', portalUrl || '(not set - list/create/session will be skipped)');

  const mod = await import('./zoho-learn-api.mjs');

  try {
    console.log('\n--- Step 1: Token ---');
    const token = await mod.getAccessToken();
    console.log('Token obtained (length=%d)', token?.length || 0);
  } catch (e) {
    console.error('Token error:', e.message);
    if (e.message && e.message.includes('ZOHO_ORG_ID')) process.exit(1);
    throw e;
  }

  if (!portalUrl) {
    console.log('\nZOHO_LEARN_PORTAL_URL が未設定のため、コースAPIのテストをスキップします。');
    console.log('例: .env に ZOHO_LEARN_PORTAL_URL=your-portal を追加するか、実行時に node zoho-learn-test.mjs your-portal');
    process.exit(0);
  }

  console.log('\n--- Step 2: List courses ---');
  const listRes = await mod.listCourses(portalUrl, { limit: 5, view: 'all' });
  console.log('Status:', listRes.STATUS);
  const courses = listRes.DATA || [];
  console.log('Courses count:', courses.length);
  if (courses.length > 0) {
    console.log('First course:', courses[0].name, courses[0].id);
  }

  console.log('\n--- Step 3: Create course ---');
  const courseName = 'API Test Course ' + Date.now();
  const createRes = await mod.createCourse(portalUrl, courseName, 'Created by zoho-learn-test.mjs');
  const courseId = createRes.COURSE?.id || createRes.course?.id || createRes.id;
  if (!courseId) {
    console.log('Create response (no course id):', JSON.stringify(createRes, null, 2));
  } else {
    console.log('Created course id:', courseId);
  }

  if (courseId) {
    console.log('\n--- Step 4: Create lesson (known issue: 500 on JP DC) ---');
    try {
      const lessonRes = await mod.createLesson(portalUrl, courseId, 'Test Lesson 1', 'TEXT');
      console.log('Lesson result:', lessonRes.LESSON ? '✅ ok' : JSON.stringify(lessonRes).slice(0, 200));
    } catch (e) {
      console.log(`⚠️  Lesson creation error (status=${e.status}): ${e.message || '(no message)'}`);
      console.log('   → JP DC で全レッスンタイプが 500 を返す既知の問題。コース管理・一覧・作成は正常動作。');
    }

    console.log('\n--- Step 5: Course status (lesson view) ---');
    try {
      const statusRes = await mod.getCourseStatus(portalUrl, courseId, false);
      console.log('Status keys:', Object.keys(statusRes));
    } catch (e) {
      console.log('Status error:', e.message);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
