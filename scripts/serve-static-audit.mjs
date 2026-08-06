import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve('dist');
const port = Number(process.env.AUDIT_PORT || 4325);
const host = '127.0.0.1';

const contentTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const compressible = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
const immutable = new Set(['.css', '.js', '.woff2']);
const cachedMedia = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.mp4', '.png', '.svg', '.webm', '.webp']);

function resolveRequest(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const candidate = resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  const indexFile = resolve(candidate, 'index.html');
  if (indexFile.startsWith(`${root}${sep}`) && existsSync(indexFile)) return indexFile;
  return null;
}

function resolveRuntimeTool(pathname) {
  const match = pathname.match(/^\/(?:en\/|zh\/)?tools\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/);
  if (!match || pathname.endsWith('/tools/runner') || pathname.endsWith('/tools/runner/')) return null;

  const locale = pathname.match(/^\/(en|zh)\//)?.[1];
  const runner = resolve(root, locale ? `${locale}/tools/runner/index.html` : 'tools/runner/index.html');
  return existsSync(runner) ? runner : null;
}

function cacheControl(extension) {
  if (extension === '.html') return 'public, max-age=0, must-revalidate';
  if (immutable.has(extension)) return 'public, max-age=31536000, immutable';
  if (cachedMedia.has(extension)) return 'public, max-age=2592000, stale-while-revalidate=86400';
  return 'public, max-age=0, must-revalidate';
}

function securityHeaders(response) {
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('X-DNS-Prefetch-Control', 'on');
}

if (!existsSync(root)) {
  console.error('dist/ tidak ditemukan. Jalankan npm run build terlebih dahulu.');
  process.exit(1);
}

const server = createServer((request, response) => {
  securityHeaders(response);
  const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
  let file = resolveRequest(url.pathname) || resolveRuntimeTool(url.pathname);
  let status = 200;
  if (!file) {
    file = resolve(root, '404.html');
    status = 404;
  }

  const extension = extname(file).toLowerCase();
  const raw = readFileSync(file);
  const etag = `"${createHash('sha1').update(raw).digest('hex').slice(0, 20)}"`;
  response.setHeader('Content-Type', contentTypes.get(extension) || 'application/octet-stream');
  response.setHeader('Cache-Control', cacheControl(extension));
  response.setHeader('ETag', etag);

  if (request.headers['if-none-match'] === etag) {
    response.writeHead(304);
    response.end();
    return;
  }

  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range && !compressible.has(extension)) {
    const start = Number(range[1]);
    const requestedEnd = range[2] ? Number(range[2]) : raw.length - 1;
    const end = Math.min(requestedEnd, raw.length - 1);
    if (start <= end && start < raw.length) {
      const body = raw.subarray(start, end + 1);
      response.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Content-Length': body.length,
        'Content-Range': `bytes ${start}-${end}/${raw.length}`,
      });
      if (request.method !== 'HEAD') response.end(body);
      else response.end();
      return;
    }
  }

  const acceptsGzip = /(?:^|,)\s*gzip\s*(?:,|$)/i.test(request.headers['accept-encoding'] || '');
  const shouldCompress = acceptsGzip && compressible.has(extension) && raw.length > 1024;
  const body = shouldCompress ? gzipSync(raw, { level: 6 }) : raw;
  if (shouldCompress) {
    response.setHeader('Content-Encoding', 'gzip');
    response.setHeader('Vary', 'Accept-Encoding');
  }
  response.setHeader('Content-Length', body.length);
  response.writeHead(status);
  if (request.method !== 'HEAD') response.end(body);
  else response.end();
});

server.listen(port, host, () => {
  console.log(`Static audit server: http://${host}:${port} (gzip, cache, range, security headers)`);
});
