import { api } from './lib/client.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const FEATURES = ['HomeView', 'ListView', 'DetailView'];
const OUT = 'canvases';

await mkdir(OUT, { recursive: true });

for (const feature of FEATURES) {
  const { status, json } = await api.listViews(feature);
  if (status !== 200) {
    console.warn(`[skip] ${feature} list status=${status}`);
    continue;
  }
  const views = json?.canvas_view || [];
  console.log(`[${feature}] ${views.length} view(s)`);
  for (const v of views) {
    const detail = await api.getView(v.id);
    if (detail.status !== 200) {
      console.warn(`  [skip] ${v.id} detail status=${detail.status}`);
      continue;
    }
    const dir = join(OUT, feature);
    await mkdir(dir, { recursive: true });
    const safe = (v.name || v.id).replace(/[\\/:*?"<>|]/g, '_');
    const file = join(dir, `${v.id}__${safe}.json`);
    await writeFile(file, JSON.stringify({ list_meta: v, detail: detail.json }, null, 2), 'utf8');
    console.log(`  pulled  ${file}`);
  }
}
