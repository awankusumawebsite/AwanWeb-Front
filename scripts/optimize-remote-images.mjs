import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import {
  extractOptimizableImageUrls,
  rewriteCmsImageUrls,
  targetWidthForCmsImage,
} from './remote-image-utils.mjs';

const root = resolve('dist');
const outputDirectory = join(root, '_media', 'cms');
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY = 3;
const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  'cdn.awankusuma.com',
  'lh3.googleusercontent.com',
]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

async function download(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !ALLOWED_REMOTE_IMAGE_HOSTS.has(parsed.hostname)) {
    throw new Error('Remote image host tidak diizinkan.');
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error('Response bukan image.');
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_SOURCE_BYTES) throw new Error('Image melebihi batas 10 MB.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_SOURCE_BYTES) throw new Error('Image melebihi batas 10 MB.');
  return buffer;
}

async function optimize(url) {
  const input = await download(url);
  const transformer = sharp(input, { animated: true }).rotate();
  const metadata = await transformer.metadata();
  const targetWidth = targetWidthForCmsImage(url);

  let output;
  if ((metadata.pages || 1) > 1) {
    // Jangan merusak animasi yang mungkin sengaja diunggah.
    output = metadata.format === 'webp'
      ? input
      : await transformer.webp({ quality: 80, effort: 4 }).toBuffer();
  } else {
    output = await transformer
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    if (metadata.format === 'webp' && input.byteLength < output.byteLength) output = input;
  }

  // Gunakan content hash, bukan hanya URL. Walaupun upload CMS seharusnya
  // immutable, content hash mencegah cache browser/CDN menyajikan byte lama
  // bila sebuah object pernah diganti pada URL yang sama.
  const hash = createHash('sha256')
    .update(url)
    .update(output)
    .digest('hex')
    .slice(0, 20);
  const filename = `${hash}-${Math.min(metadata.width || targetWidth, targetWidth)}.webp`;
  writeFileSync(join(outputDirectory, filename), output);

  return {
    localPath: `/_media/cms/${filename}`,
    inputBytes: input.byteLength,
    outputBytes: output.byteLength,
  };
}

if (!existsSync(root)) {
  console.error('dist/ tidak ditemukan. Jalankan astro build terlebih dahulu.');
  process.exit(1);
}

const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
const urls = new Set();
for (const file of htmlFiles) {
  for (const url of extractOptimizableImageUrls(readFileSync(file, 'utf8'))) urls.add(url);
}

if (urls.size === 0) {
  console.log('Tidak ada remote CMS raster image yang perlu dioptimalkan.');
  process.exit(0);
}

mkdirSync(outputDirectory, { recursive: true });
const queue = [...urls];
const replacements = new Map();
let inputBytes = 0;
let outputBytes = 0;
let cursor = 0;

async function worker() {
  while (cursor < queue.length) {
    const index = cursor++;
    const url = queue[index];
    try {
      const result = await optimize(url);
      replacements.set(url, result.localPath);
      inputBytes += result.inputBytes;
      outputBytes += result.outputBytes;
    } catch (error) {
      throw new Error(`Optimasi CMS image gagal (${new URL(url).pathname}): ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()));

for (const file of htmlFiles) {
  const original = readFileSync(file, 'utf8');
  const rewritten = rewriteCmsImageUrls(original, replacements);
  if (rewritten !== original) writeFileSync(file, rewritten);
}

const saved = inputBytes - outputBytes;
const percentage = inputBytes > 0 ? Math.round((saved / inputBytes) * 100) : 0;
console.log(
  `Remote CMS images optimized: ${replacements.size} unique, `
  + `${(inputBytes / 1024 / 1024).toFixed(2)} MB -> ${(outputBytes / 1024 / 1024).toFixed(2)} MB (${percentage}% lebih kecil).`,
);
