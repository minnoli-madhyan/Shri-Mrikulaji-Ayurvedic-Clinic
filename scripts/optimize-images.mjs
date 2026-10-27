// Converts the large PNG/JPG files in public/images to resized WebP.
// Usage: npm run optimize:images   (originals are kept in public/images/_originals, which is git-ignored)
import sharp from 'sharp';
import { readdir, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'public/images';
const BACKUP = path.join(ROOT, '_originals');
const MAX_WIDTH = { 'hero.jpg': 1600, 'ayurveda.png': 1200, 'SMAC_logo.png': 400, 'hero-cutout.png': 1200 };
const DEFAULT_MAX = 900; // doctor portraits etc.

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '_originals') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (/\.(png|jpe?g)$/i.test(e.name)) out.push(p);
  }
  return out;
}

for (const file of await walk(ROOT)) {
  const base = path.basename(file);
  const dest = file.replace(/\.(png|jpe?g)$/i, '.webp');
  await sharp(file)
    .resize({ width: MAX_WIDTH[base] ?? DEFAULT_MAX, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest);
  const backup = path.join(BACKUP, path.relative(ROOT, file));
  await mkdir(path.dirname(backup), { recursive: true });
  await rename(file, backup);
  const [a, b] = await Promise.all([stat(backup), stat(dest)]);
  console.log(`${file}: ${(a.size / 1024).toFixed(0)}KB → ${(b.size / 1024).toFixed(0)}KB`);
}
