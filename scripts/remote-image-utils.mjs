const CMS_IMAGE_PATTERN = /https:\/\/cdn\.awankusuma\.com\/[^\s"'<>\\]+?\.(?:avif|webp|png|jpe?g)(?:\?[^\s"'<>\\]*)?/gi;
const GOOGLE_AVATAR_PATTERN = /https:\/\/lh3\.googleusercontent\.com\/a(?:-|\/)[^\s"'<>\\]+/gi;

export function extractOptimizableImageUrls(html) {
  const urls = new Set();
  for (const pattern of [CMS_IMAGE_PATTERN, GOOGLE_AVATAR_PATTERN]) {
    for (const match of html.matchAll(pattern)) {
      urls.add(match[0].replaceAll('&amp;', '&'));
    }
  }
  return urls;
}

export function targetWidthForCmsImage(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'lh3.googleusercontent.com') return 320;
  const pathname = parsed.pathname.toLowerCase();
  if (/(?:avatar|logo|icon)/.test(pathname)) return 320;
  if (pathname.includes('/marquee/')) return 960;
  if (pathname.includes('/articles/') || pathname.includes('/article-images/')) return 1600;
  return 1280;
}

export function rewriteCmsImageUrls(html, replacements) {
  let rewritten = html;

  for (const [source, localPath] of replacements) {
    rewritten = rewritten.replaceAll(source, localPath);
    rewritten = rewritten.replaceAll(source.replaceAll('&', '&amp;'), localPath);
  }

  // Social metadata dan structured data membutuhkan URL absolut.
  rewritten = rewritten.replace(/<meta\b[^>]*>/gi, (tag) => {
    if (!/(?:property|name)="(?:og:image|twitter:image)"/i.test(tag)) return tag;
    return tag.replace('content="/_media/', 'content="https://awankusuma.com/_media/');
  });
  rewritten = rewritten.replace(
    /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi,
    (script) => script.replaceAll('"/_media/', '"https://awankusuma.com/_media/'),
  );

  return rewritten;
}
