const CMS_IMAGE_PATTERN = /https:\/\/cdn\.awankusuma\.com\/[^\s"'<>\\]+?\.(?:avif|webp|png|jpe?g)(?:\?[^\s"'<>\\]*)?/gi;
// Stop at `&` as well: Astro serializes island props into HTML-escaped JSON,
// so an avatar URL can be followed immediately by `&quot;],...`. Treating that
// suffix as part of the URL makes the post-build optimizer request malformed
// Google URLs and fail the otherwise-valid production build.
const GOOGLE_AVATAR_PATTERN = /https:\/\/lh3\.googleusercontent\.com\/a(?:-|\/)[^\s"'<>\\&]+/gi;

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
  if (/(?:avatar|logo|icon)/.test(pathname) || pathname.includes('/partners/')) return 320;
  if (pathname.includes('/marquee/')) return 960;
  if (pathname.includes('/articles/') || pathname.includes('/article-images/')) return 1600;
  return 1280;
}

export function responsiveWidthsForCmsImage(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.toLowerCase();
  if (pathname.includes('/articles/') || pathname.includes('/article-images/')) {
    return [160, 480, 960, 1600];
  }
  return [targetWidthForCmsImage(url)];
}

export function rewriteCmsImageUrls(html, replacements) {
  let rewritten = html;

  for (const [source, replacement] of replacements) {
    const localPath = typeof replacement === 'string' ? replacement : replacement.localPath;
    rewritten = rewritten.replaceAll(source, localPath);
    rewritten = rewritten.replaceAll(source.replaceAll('&', '&amp;'), localPath);

    if (typeof replacement !== 'string' && replacement.variants?.length > 1) {
      const srcset = replacement.variants
        .map((variant) => `${variant.localPath} ${variant.width}w`)
        .join(', ');
      rewritten = rewritten.replace(/<img\b[^>]*>/gi, (tag) => {
        if (!tag.includes(`src="${localPath}"`) || tag.includes('srcset=')) return tag;
        if (tag.includes('data-cms-responsive')) {
          return tag.replace(/\sdata-cms-responsive(?:="[^"]*")?/i, ` srcset="${srcset}"`);
        }
        return tag.replace(/>$/, ` srcset="${srcset}" sizes="(min-width: 1024px) 700px, calc(100vw - 3rem)">`);
      });
    }
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
