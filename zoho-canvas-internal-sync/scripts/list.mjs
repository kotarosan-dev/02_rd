import { api } from './lib/client.mjs';

const feature = process.argv[2] || 'HomeView';
const { status, json, text } = await api.listViews(feature);
if (status !== 200) {
  console.error(`[ERROR] status=${status}\n${text}`);
  process.exit(1);
}
const views = json?.canvas_view || [];
console.log(`feature=${feature}  count=${views.length}`);
for (const v of views) {
  console.log(`  ${v.id}\t${v.name}\t(module=${v.module?.api_name}, modified=${v.modified_time})`);
}
