import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { extractOptimizableImageUrls } from './remote-image-utils.mjs';

const root = resolve('dist');
const failures = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function outputExists(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }

  const normalized = decoded.replace(/^\/+/, '');
  if (!normalized) return existsSync(join(root, 'index.html'));
  const direct = join(root, normalized);
  if (extname(normalized)) return existsSync(direct);
  return existsSync(direct) || existsSync(`${direct}.html`) || existsSync(join(direct, 'index.html'));
}

if (!existsSync(root)) {
  console.error('dist/ tidak ditemukan. Jalankan npm run build terlebih dahulu.');
  process.exit(1);
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const remainingRemoteCmsImages = new Set();
const optimizedCmsImages = new Set();
const requiredPages = [
  '/', '/en/', '/zh/',
  '/tentang-kami/', '/en/tentang-kami/', '/zh/tentang-kami/',
  '/layanan/', '/en/layanan/', '/zh/layanan/',
  '/info-bisnis/', '/en/info-bisnis/', '/zh/info-bisnis/',
  '/kontak/', '/en/kontak/', '/zh/kontak/',
  '/login/', '/en/login/', '/zh/login/',
  '/lacak/', '/en/lacak/', '/zh/lacak/',
  '/mitra/', '/en/mitra/', '/zh/mitra/',
  '/404.html',
];

for (const page of requiredPages) {
  if (!outputExists(page)) failures.push(`Route wajib tidak dibangun: ${page}`);
}

for (const file of htmlFiles) {
  const relativeFile = relative(root, file).split(sep).join('/');
  const pagePath = relativeFile === 'index.html'
    ? '/'
    : relativeFile.endsWith('/index.html')
      ? `/${relativeFile.slice(0, -'index.html'.length)}`
      : `/${relativeFile}`;
  const html = readFileSync(file, 'utf8');
  for (const imageUrl of extractOptimizableImageUrls(html)) remainingRemoteCmsImages.add(imageUrl);
  for (const match of html.matchAll(/\/?_media\/cms\/[A-Za-z0-9._-]+\.webp/g)) {
    optimizedCmsImages.add(`/${match[0].replace(/^\//, '')}`);
  }
  const attributes = html.matchAll(/\b(?:href|src)=(?:"([^"]+)"|'([^']+)')/gi);

  for (const match of attributes) {
    const value = match[1] || match[2];
    if (!value || value.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(value)) continue;

    const url = new URL(value, `https://awankusuma.com${pagePath}`);
    if (url.origin !== 'https://awankusuma.com') continue;
    if (!outputExists(url.pathname)) failures.push(`Link internal rusak di ${pagePath}: ${value}`);
  }
}

if (remainingRemoteCmsImages.size > 0) {
  failures.push(
    `Masih ada ${remainingRemoteCmsImages.size} remote image yang wajib dilokalkan di HTML; `
    + 'langkah optimize:remote-images kemungkinan terlewat.',
  );
}

for (const imagePath of optimizedCmsImages) {
  if (!outputExists(imagePath)) failures.push(`Artifact CMS image tidak ditemukan: ${imagePath}`);
}

const sitemap = files
  .filter((file) => /sitemap.*\.xml$/.test(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');
for (const privatePath of ['/login', '/lacak', '/mitra', '/faq', '/404']) {
  if (sitemap.includes(`awankusuma.com${privatePath}`)
    || sitemap.includes(`awankusuma.com/en${privatePath}`)
    || sitemap.includes(`awankusuma.com/zh${privatePath}`)) {
    failures.push(`Route privat/noindex masuk sitemap: ${privatePath}`);
  }
}

const htaccessPath = join(root, '.htaccess');
if (!existsSync(htaccessPath)) {
  failures.push('dist/.htaccess tidak tersedia.');
} else {
  const htaccess = readFileSync(htaccessPath, 'utf8');
  for (const legacyRoute of [
    'about-us',
    'tracking',
    'info-bisnisperubahan-cara-migrasi-kbli-2025',
    'blogPost',
    'auth',
    'layanan/[0-9]+',
    'cookie|privacy',
    'mitra/orders',
    'category=',
  ]) {
    if (!htaccess.includes(legacyRoute)) failures.push(`Redirect Apache belum mencakup: ${legacyRoute}`);
  }
}

const robotsPath = join(root, 'robots.txt');
if (!existsSync(robotsPath)) {
  failures.push('dist/robots.txt tidak tersedia.');
} else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!robots.includes('User-agent: *')) failures.push('robots.txt tidak memiliki aturan user-agent global.');
  if (process.env.MIGRATION_NOINDEX !== 'false' && !robots.includes('Disallow: /')) {
    failures.push('Build staging tidak memblokir crawler melalui robots.txt.');
  }
}

if (failures.length > 0) {
  console.error(`Validasi static output gagal (${failures.length} masalah):`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...dan ${failures.length - 40} masalah lainnya.`);
  process.exit(1);
}

console.log(`Static output valid: ${htmlFiles.length} HTML, ${files.length} total file, seluruh link internal dan sitemap gate lulus.`);
