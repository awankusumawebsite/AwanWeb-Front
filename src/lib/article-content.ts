export interface ArticleHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface PreparedArticleContent {
  html: string;
  headings: ArticleHeading[];
}

function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function headingId(text: string, index: number, used: Set<string>): string {
  const base = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `bagian-${index + 1}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function normalizeImageAttributes(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_match, rawAttributes: string) => {
    let attributes = rawAttributes;
    attributes = attributes.replace(
      /\bsrc=(['"])\/?storage\//i,
      'src=$1https://cms.awankusuma.com/storage/',
    );
    if (!/\bloading=/i.test(attributes)) attributes += ' loading="lazy"';
    if (!/\bdecoding=/i.test(attributes)) attributes += ' decoding="async"';
    if (!/\bwidth=/i.test(attributes)) attributes += ' width="800"';
    if (!/\bheight=/i.test(attributes)) attributes += ' height="450"';
    return `<img${attributes}>`;
  });
}

export function prepareArticleContent(input: string): PreparedArticleContent {
  const usedIds = new Set<string>();
  const headings: ArticleHeading[] = [];
  const withHeadings = input.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, rawAttributes: string, innerHtml: string) => {
      const level = Number(tag.slice(1)) as 2 | 3;
      const text = plainText(innerHtml);
      const existingId = rawAttributes.match(/\bid=(['"])([^'"]+)\1/i)?.[2];
      const id = existingId || headingId(text, headings.length, usedIds);
      usedIds.add(id);
      headings.push({ id, text, level });
      const attributes = existingId ? rawAttributes : `${rawAttributes} id="${id}"`;
      return `<${tag}${attributes}>${innerHtml}</${tag}>`;
    },
  );

  return { html: normalizeImageAttributes(withHeadings), headings };
}

export function splitArticleForInlineAd(html: string, interval = 3): string[] {
  if (!html || interval < 1) return [html];
  const paragraphs = html.split(/(<\/p>)/i);
  let meaningfulParagraphs = 0;
  let splitIndex = -1;

  for (let index = 0; index < paragraphs.length; index += 2) {
    const fragment = paragraphs[index] || '';
    if (plainText(fragment).length > 10) meaningfulParagraphs += 1;
    if (meaningfulParagraphs >= interval) {
      splitIndex = Math.min(paragraphs.length, index + 2);
      break;
    }
  }

  if (splitIndex <= 0 || splitIndex >= paragraphs.length) return [html];
  return [paragraphs.slice(0, splitIndex).join(''), paragraphs.slice(splitIndex).join('')];
}
