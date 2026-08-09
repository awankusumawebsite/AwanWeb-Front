import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { extractOptimizableImageUrls } from './remote-image-utils.mjs';

const root = resolve('dist');
const failures = [];
// Production retains at most five releases. These ceilings allow roughly 9x
// growth from the August 2026 baseline (56.96 MiB / 803 files) while keeping
// the worst-case retained footprint near 2.5 GiB on the 12 GiB hosting plan.
const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const MAX_ARTIFACT_FILES = 10_000;

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
  const dynamicTool = normalized.match(/^(?:(en|zh)\/)?tools\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  if (dynamicTool && dynamicTool[2] !== 'runner') {
    const runner = dynamicTool[1]
      ? join(root, dynamicTool[1], 'tools', 'runner', 'index.html')
      : join(root, 'tools', 'runner', 'index.html');
    return existsSync(runner);
  }
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
const artifactBytes = files.reduce((total, file) => total + statSync(file).size, 0);
const remainingRemoteCmsImages = new Set();
const optimizedCmsImages = new Set();
let indexablePages = 0;
const requiredPages = [
  '/', '/en/', '/zh/',
  '/tentang-kami/', '/en/tentang-kami/', '/zh/tentang-kami/',
  '/layanan/', '/en/layanan/', '/zh/layanan/',
  '/info-bisnis/', '/en/info-bisnis/', '/zh/info-bisnis/',
  '/kontak/', '/en/kontak/', '/zh/kontak/',
  '/login/', '/en/login/', '/zh/login/',
  '/lacak/', '/en/lacak/', '/zh/lacak/',
  '/mitra/', '/en/mitra/', '/zh/mitra/',
  '/tools/', '/en/tools/', '/zh/tools/',
  '/tools/runner/', '/en/tools/runner/', '/zh/tools/runner/',
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
  if (/AuthNavIsland|LanguageSwitcherIsland/.test(html)) {
    failures.push(`Navbar React global kembali masuk artifact di ${pagePath}`);
  }
  if (html.includes('data-cms-responsive')) {
    failures.push(`Marker responsive image belum diproses optimizer di ${pagePath}`);
  }
  const robotsContent = html.match(/<meta\s+[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i)?.[1]
    || html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i)?.[1]
    || '';
  const isIndexable = !/\bnoindex\b/i.test(robotsContent);

  if (isIndexable) {
    indexablePages += 1;
    const titles = [...html.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi)];
    const descriptions = [...html.matchAll(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/gi)];
    const canonicalUrls = [...html.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1]);
    const h1Count = [...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length;
    const hreflangLinks = [...html.matchAll(/<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => ({ language: match[1].toLowerCase(), href: match[2] }));
    const hreflangs = new Set(hreflangLinks.map(({ language }) => language));
    const pageLocale = pagePath.startsWith('/en/') ? 'en' : pagePath.startsWith('/zh/') ? 'zh' : 'id';
    const jsonLdBlocks = [...html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

    if (titles.length !== 1 || !titles[0]?.[1].trim()) failures.push(`Title SEO tidak valid di ${pagePath}`);
    if (descriptions.length !== 1) failures.push(`Meta description SEO tidak valid di ${pagePath}`);
    if (canonicalUrls.length !== 1 || !canonicalUrls[0].startsWith('https://awankusuma.com/')) {
      failures.push(`Canonical SEO tidak valid di ${pagePath}`);
    }
    if (h1Count !== 1) failures.push(`Jumlah H1 harus tepat satu di ${pagePath}, ditemukan ${h1Count}`);
    for (const locale of [pageLocale, 'x-default']) {
      if (!hreflangs.has(locale)) failures.push(`Hreflang ${locale} tidak tersedia di ${pagePath}`);
    }
    for (const { language, href } of hreflangLinks) {
      if (!['id', 'en', 'zh', 'x-default'].includes(language)) {
        failures.push(`Hreflang tidak dikenal di ${pagePath}: ${language}`);
      }
      const alternateUrl = new URL(href, 'https://awankusuma.com');
      if (alternateUrl.origin !== 'https://awankusuma.com' || !outputExists(alternateUrl.pathname)) {
        failures.push(`Target hreflang tidak dibangun di ${pagePath}: ${href}`);
      }
    }
    if (jsonLdBlocks.length === 0) failures.push(`JSON-LD tidak tersedia di ${pagePath}`);
    for (const [, json] of jsonLdBlocks) {
      try {
        JSON.parse(json);
      } catch {
        failures.push(`JSON-LD tidak valid di ${pagePath}`);
      }
    }
  }

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

for (const [assetPath, maxBytes] of [
  ['assets/image/logo-160.webp', 10_000],
  ['images/mockups/image-5.webp', 60_000],
  ['images/mockups/photo-1589994965851-a8f479c573a9.webp', 40_000],
  ['images/mockups/image-1-640.webp', 30_000],
  ['images/mockups/image-2-320.webp', 10_000],
  ['images/mockups/image-3-640.webp', 25_000],
  ['images/mockups/image-4-320.webp', 20_000],
]) {
  const file = join(root, assetPath);
  if (!existsSync(file)) failures.push(`Asset budget tidak ditemukan: /${assetPath}`);
  else if (statSync(file).size > maxBytes) failures.push(`Asset /${assetPath} melewati budget ${maxBytes} byte.`);
}

const baseCss = files.find((file) => /[/\\]_astro[/\\]BaseLayout\.[^/\\]+\.css$/.test(file));
if (!baseCss) {
  failures.push('Bundle CSS BaseLayout tidak ditemukan.');
} else {
  const compressedBytes = gzipSync(readFileSync(baseCss), { level: 9 }).byteLength;
  if (compressedBytes > 25_000) failures.push(`CSS BaseLayout gzip melewati budget 25 KB: ${compressedBytes} byte.`);
}
if (artifactBytes > MAX_ARTIFACT_BYTES) {
  failures.push(
    `Total artifact melewati budget ${MAX_ARTIFACT_BYTES / 1024 / 1024} MiB: `
    + `${(artifactBytes / 1024 / 1024).toFixed(2)} MiB.`,
  );
}
if (files.length > MAX_ARTIFACT_FILES) {
  failures.push(`Jumlah artifact melewati budget ${MAX_ARTIFACT_FILES} file: ${files.length}.`);
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
    'DirectorySlash Off',
    'www\\.awankusuma\\.com',
    'about-us',
    'tracking',
    'info-bisnisperubahan-cara-migrasi-kbli-2025',
    'blogPost',
    'auth',
    'layanan/[0-9]+',
    'cookie|privacy',
    'mitra/orders',
    'category=',
    'THE_REQUEST',
    'REQUEST_FILENAME}/index.html',
    'tools/runner/index.html',
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
  if (process.env.MIGRATION_NOINDEX === 'false' && /^Disallow: \/$/m.test(robots)) {
    failures.push('Build production masih memblokir seluruh crawler melalui robots.txt.');
  }
  if (process.env.MIGRATION_NOINDEX === 'false'
    && !robots.includes('Sitemap: https://awankusuma.com/sitemap-index.xml')) {
    failures.push('Build production tidak menunjuk sitemap production pada robots.txt.');
  }
}

if (failures.length > 0) {
  console.error(`Validasi static output gagal (${failures.length} masalah):`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`- ...dan ${failures.length - 40} masalah lainnya.`);
  process.exit(1);
}

console.log(
  `Static output valid: ${htmlFiles.length} HTML (${indexablePages} indexable), ${files.length} total file; `
  + 'metadata SEO, performance budget, JSON-LD, link internal, dan sitemap gate lulus.',
);
