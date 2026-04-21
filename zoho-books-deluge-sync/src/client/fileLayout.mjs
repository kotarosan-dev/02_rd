// .dg + .meta.json のローカルレイアウト管理
//   deluge/<entity>/<name>.dg          ← Deluge 本体
//   deluge/<entity>/<name>.meta.json   ← id, function_name, entity, description ほか
import fs from 'fs';
import path from 'path';

export const ROOT = path.resolve('deluge');

export function pathFor(entity, name) {
  return {
    dir: path.join(ROOT, entity),
    dg: path.join(ROOT, entity, `${name}.dg`),
    meta: path.join(ROOT, entity, `${name}.meta.json`),
  };
}

export function writeFunction({ entity, name, script, meta }) {
  const p = pathFor(entity, name);
  fs.mkdirSync(p.dir, { recursive: true });
  fs.writeFileSync(p.dg, script.endsWith('\n') ? script : script + '\n', 'utf8');
  fs.writeFileSync(p.meta, JSON.stringify(meta, null, 2) + '\n', 'utf8');
  return p;
}

export function readFunction(entity, name) {
  const p = pathFor(entity, name);
  if (!fs.existsSync(p.dg)) throw new Error(`Not found: ${p.dg}`);
  if (!fs.existsSync(p.meta)) throw new Error(`Not found: ${p.meta}`);
  return {
    script: fs.readFileSync(p.dg, 'utf8'),
    meta: JSON.parse(fs.readFileSync(p.meta, 'utf8')),
    paths: p,
  };
}

export function findByName(name) {
  if (!fs.existsSync(ROOT)) return null;
  for (const ent of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, ent);
    if (!fs.statSync(dir).isDirectory()) continue;
    const dg = path.join(dir, `${name}.dg`);
    if (fs.existsSync(dg)) return { entity: ent, ...pathFor(ent, name) };
  }
  return null;
}
