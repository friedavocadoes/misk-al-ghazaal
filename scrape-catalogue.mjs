import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Enter your live storefront domain or .myshopify.com domain here
const STORE_DOMAIN = 'https://gazaal.com'; // e.g. https://store.myshopify.com

const IMAGES_DIR = path.join(__dirname, 'public', 'products');
const OUTPUT_DATA_FILE = path.join(__dirname, 'lib', 'mock-products.json');

if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(OUTPUT_DATA_FILE))) fs.mkdirSync(path.dirname(OUTPUT_DATA_FILE), { recursive: true });

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
}

async function fetchAllProducts() {
  let page = 1;
  let allProducts = [];

  while (true) {
    const endpoint = `${STORE_DOMAIN.replace(/\/$/, '')}/products.json?limit=250&page=${page}`;
    console.log(`Fetching: ${endpoint}`);

    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.error(`Failed to fetch page ${page}. Status: ${res.status}`);
        break;
      }

      const data = await res.json();
      if (!data.products || data.products.length === 0) break;

      allProducts = allProducts.concat(data.products);
      page++;
    } catch (err) {
      console.error(`Network error on page ${page}:`, err.message);
      break;
    }
  }

  return allProducts;
}

async function run() {
  console.log(`Starting catalog scrape from ${STORE_DOMAIN}...`);
  const products = await fetchAllProducts();
  console.log(`Found ${products.length} products.\n`);

  const formattedCatalog = [];

  for (const p of products) {
    const localImages = [];

    for (let i = 0; i < p.images.length; i++) {
      const rawUrl = p.images[i].src;
      const cleanUrl = rawUrl.split('?')[0];
      const ext = path.extname(cleanUrl) || '.jpg';
      const fileName = `${p.handle}-${i + 1}${ext}`;
      const destPath = path.join(IMAGES_DIR, fileName);

      try {
        await downloadFile(rawUrl, destPath);
        console.log(`  ✓ Saved image: ${fileName}`);
        localImages.push(`/products/${fileName}`);
      } catch (err) {
        console.warn(`  ✗ Failed image ${rawUrl}:`, err.message);
      }
    }

    formattedCatalog.push({
      id: String(p.id),
      title: p.title,
      handle: p.handle,
      description: p.body_html || '',
      vendor: p.vendor,
      product_type: p.product_type,
      tags: typeof p.tags === 'string' ? p.tags.split(',').map((t) => t.trim()) : p.tags,
      images: localImages,
      variants: p.variants.map((v) => ({
        id: String(v.id),
        title: v.title,
        price: parseFloat(v.price),
        compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : null,
        sku: v.sku,
        available: v.available,
      })),
    });
  }

  fs.writeFileSync(OUTPUT_DATA_FILE, JSON.stringify(formattedCatalog, null, 2));
  console.log(`\nCatalog saved to: ${OUTPUT_DATA_FILE}`);
  console.log(`All images stored in: public/products/`);
}

run();