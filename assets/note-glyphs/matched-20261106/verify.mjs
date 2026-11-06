import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const notes = JSON.parse(await fs.readFile(path.join(root, 'docs/note-glyphs/manifest.json'), 'utf8')).filter(n => !n.existing);
const results = [];
for (const note of notes) {
  const file = path.join(dir, note.filename);
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  const alpha = stats.channels[3];
  if (!metadata.hasAlpha || !alpha || alpha.min !== 0 || alpha.max === 0) throw Error(`Invalid transparency: ${note.slug}`);
  const webp = path.join(dir, 'webp', `${note.slug}.webp`);
  const webMetadata = await sharp(webp).metadata();
  if (!webMetadata.hasAlpha || webMetadata.width !== 512 || webMetadata.height !== 512) throw Error(`Invalid WebP: ${note.slug}`);
  results.push({ slug: note.slug, width: metadata.width, height: metadata.height, alphaMin: alpha.min, alphaMax: alpha.max, pngBytes: (await fs.stat(file)).size, webpBytes: (await fs.stat(webp)).size });
}
await fs.writeFile(path.join(dir, 'validation.json'), JSON.stringify(results, null, 2) + '\n');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const cards = notes.map(n => `<article><img class="large" src="webp/${n.slug}.webp" alt="${esc(n.name)}"><h2>${esc(n.name)}</h2><div class="samples"><span><img src="webp/${n.slug}.webp" alt=""></span><span class="tint"><img src="webp/${n.slug}.webp" alt=""></span></div></article>`).join('');
await fs.writeFile(path.join(dir, 'preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Perfume note glyphs</title><style>*{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#30383a;font-family:Arial,sans-serif;padding:32px}header{margin:0 0 24px}h1{font-size:26px;font-weight:500;margin:0 0 8px}p{font-size:13px;color:#6f706a}main{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}article{background:#faf8f2;border:1px solid #ddd8cb;text-align:center;padding:16px 8px 12px;min-width:0}.large{width:112px;height:112px;object-fit:contain}h2{font-size:12px;font-weight:500;margin:10px 0 12px}.samples{display:flex;justify-content:center;gap:8px}.samples span{width:56px;height:56px;display:grid;place-items:center;border:1px solid #dedad1}.samples img{width:48px;height:48px}.tint{background:#d2c6ac}footer{font-size:11px;color:#747870;margin-top:18px}</style><header><h1>The note library</h1><p>36 transparent charcoal glyphs · Large preview + 48px on ivory and tinted backgrounds · Apple unchanged</p></header><main>${cards}</main><footer>512 × 512 lossless WebP · Transparent PNG masters retained</footer></html>`);
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/g/AppData/Local/Temp/gazaal-design-qa/node_modules/playwright');
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1800 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(dir, 'preview.html')).href);
  await page.evaluate(() => Promise.all(Array.from(document.images, image => image.decode())));
  await page.screenshot({ path: path.join(dir, 'preview.png'), fullPage: true });
} finally { await browser.close(); }
console.log(JSON.stringify({ validated: results.length, totalWebpKB: Math.round(results.reduce((sum,r) => sum+r.webpBytes,0)/1024), minWebpKB: Math.round(Math.min(...results.map(r=>r.webpBytes))/1024), maxWebpKB: Math.round(Math.max(...results.map(r=>r.webpBytes))/1024) }));
