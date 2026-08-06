import type { Locale } from '../config/site';
import { cms } from './cms';

const ARTICLES_PER_PAGE = 9;
const ARTICLE_FETCH_CONCURRENCY = 2;
const CMS_RESPONSE_ATTEMPTS = 5;

function describePublicMessage(value: unknown): string {
  if (typeof value !== 'string') return '';

  const normalized = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\p{L}\p{N} .,;:!?()/_-]/gu, '?')
    .trim()
    .slice(0, 160);

  return normalized ? `;message=${JSON.stringify(normalized)}` : '';
}

function describeResponseShape(response: unknown): string {
  if (response === null) return 'payload=null';
  if (Array.isArray(response)) return 'payload=array';
  if (typeof response !== 'object') return `payload=${typeof response}`;

  const record = response as Record<string, unknown>;
  const data = record.data;
  const dataType = Array.isArray(data)
    ? 'array'
    : data === null
      ? 'null'
      : typeof data;
  const keys = Object.keys(record).sort().slice(0, 20).join(',') || 'none';

  return `payload=object;data=${dataType};keys=${keys}${describePublicMessage(record.message)}`;
}

interface DataResponse<T> {
  data: T;
}

export interface ArticleCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  articles_count?: number;
  is_active?: boolean;
}

export interface ArticleAuthor {
  id?: number;
  name: string;
  avatar?: string | null;
}

export interface ArticleAdSlot {
  id: number;
  slug: string;
  placement?: string | null;
  variant: 'banner' | 'rectangle' | 'inline' | string;
  title: string;
  description?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  image?: string | null;
}

export interface ArticleSummary {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  og_image?: string | null;
  image?: string | null;
  category?: ArticleCategory | null;
  author?: ArticleAuthor | null;
  published_at?: string | null;
  reading_time_minutes?: number | null;
}

export function findArticleListing(
  data: ArticleBuildData,
  category: string | null,
  page: number,
): ArticleListingEntry {
  const entry = data.listings.find((listing) => (
    listing.category === category && listing.page === page
  ));
  if (!entry) {
    throw new Error(`Listing artikel tidak ditemukan untuk ${category ?? 'semua'}/page/${page}.`);
  }
  return entry;
}

export function articleCategoryLastPages(data: ArticleBuildData): Record<string, number> {
  return Object.fromEntries(data.categories.map((category) => {
    const firstPage = findArticleListing(data, category.slug, 1);
    return [category.slug, firstPage.response.last_page];
  }));
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  canonical_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  updated_at?: string | null;
  related_articles?: ArticleSummary[];
  ad_slots?: ArticleAdSlot[];
  show_bottom_cta?: boolean;
  show_inline_ad?: boolean;
  show_sidebar_ad?: boolean;
}

export interface ArticleListingResponse {
  data: ArticleSummary[];
  featured: ArticleSummary | null;
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface ArticleSummaryResponse {
  data: ArticleSummary[];
  current_page?: number;
  last_page?: number;
}

export interface ArticleListingEntry {
  category: string | null;
  page: number;
  response: ArticleListingResponse;
}

export interface ArticleDetailEntry {
  slug: string;
  article: ArticleDetail;
}

export interface ArticleBuildData {
  categories: ArticleCategory[];
  listings: ArticleListingEntry[];
  details: ArticleDetailEntry[];
}

const localeBuildData = new Map<Locale, Promise<ArticleBuildData>>();

function positiveInteger(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeArticleSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

export function articleImageUrl(value?: string | null): string {
  if (!value) return '/images/mockups/photo-1560250097-0b93528c311a.webp';
  if (/^https?:\/\//i.test(value)) return value;

  const path = value.trim().replace(/^\/+/, '');
  return new URL(path.startsWith('storage/') ? `/${path}` : `/storage/${path}`, 'https://cms.awankusuma.com').href;
}

export function articleListingPath({
  category = null,
  page = 1,
}: {
  category?: string | null;
  page?: number;
} = {}): string {
  const normalizedPage = positiveInteger(page, 1);
  const normalizedCategory = normalizeArticleSlug(category);
  const categoryPath = normalizedCategory ? `/kategori/${normalizedCategory}` : '';
  const pagePath = normalizedPage > 1 ? `/page/${normalizedPage}` : '';

  return `/info-bisnis${categoryPath}${pagePath}`;
}

export function paginationItems(currentPage: number, lastPage: number): Array<number | string> {
  if (lastPage <= 1) return [];
  if (lastPage <= 7) return Array.from({ length: lastPage }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis-right', lastPage];
  if (currentPage >= lastPage - 3) {
    return [
      1,
      'ellipsis-left',
      lastPage - 4,
      lastPage - 3,
      lastPage - 2,
      lastPage - 1,
      lastPage,
    ];
  }

  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    lastPage,
  ];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      output[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return output;
}

function listingEndpoint(locale: Locale, category: string | null, page: number): string {
  const params = new URLSearchParams({
    locale,
    per_page: String(ARTICLES_PER_PAGE),
    page: String(page),
    include_hero: '1',
  });
  if (category) params.set('category', category);
  return `/blog/articles?${params.toString()}`;
}

async function fetchListing(
  locale: Locale,
  category: string | null,
  page: number,
): Promise<ArticleListingEntry> {
  const response = await cms.requestOnce<ArticleListingResponse>(
    listingEndpoint(locale, category, page),
  );

  if (!response?.data || !Array.isArray(response.data)) {
    throw new Error(`CMS tidak mengembalikan listing artikel ${locale}/${category ?? 'semua'}/${page}.`);
  }

  return {
    category,
    page,
    response: {
      ...response,
      featured: response.featured ?? null,
      current_page: positiveInteger(response.current_page, page),
      last_page: positiveInteger(response.last_page, 1),
      per_page: positiveInteger(response.per_page, ARTICLES_PER_PAGE),
      total: Math.max(0, Number(response.total) || 0),
      from: response.from ?? null,
      to: response.to ?? null,
    },
  };
}

async function fetchAllListings(
  locale: Locale,
  categories: ArticleCategory[],
): Promise<ArticleListingEntry[]> {
  const categorySlugs: Array<string | null> = [
    null,
    ...categories.flatMap((category) => {
      const slug = normalizeArticleSlug(category.slug);
      return slug ? [slug] : [];
    }),
  ];
  const firstPages = await mapWithConcurrency(
    categorySlugs,
    ARTICLE_FETCH_CONCURRENCY,
    (category) => fetchListing(locale, category, 1),
  );
  const remainingRoutes = firstPages.flatMap((entry) => Array.from(
    { length: Math.max(0, entry.response.last_page - 1) },
    (_, index) => ({ category: entry.category, page: index + 2 }),
  ));
  const remainingPages = await mapWithConcurrency(
    remainingRoutes,
    ARTICLE_FETCH_CONCURRENCY,
    ({ category, page }) => fetchListing(locale, category, page),
  );

  return [...firstPages, ...remainingPages];
}

async function fetchArticleDetails(
  locale: Locale,
  summaries: ArticleSummary[],
): Promise<ArticleDetailEntry[]> {
  const routes = new Map<string, ArticleSummary>();
  for (const article of summaries) {
    const slug = normalizeArticleSlug(article.slug);
    if (slug && !routes.has(slug)) routes.set(slug, article);
  }

  return mapWithConcurrency(
    [...routes.entries()],
    ARTICLE_FETCH_CONCURRENCY,
    async ([slug, summary]) => {
      const response = await cms.requestOnce<DataResponse<ArticleDetail>>(
        `/blog/articles/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
      );
      if (!response?.data) {
        throw new Error(`CMS tidak mengembalikan detail artikel untuk slug ${slug}.`);
      }

      const related = response.data.related_articles ?? [];
      if (related.length < 2) {
        const existingIds = new Set([response.data.id, ...related.map((article) => article.id)]);
        response.data.related_articles = [
          ...related,
          ...summaries.filter((article) => !existingIds.has(article.id)).slice(0, 2 - related.length),
        ];
      }

      return { slug, article: { ...summary, ...response.data } };
    },
  );
}

export async function fetchArticleSummaries(locale: Locale): Promise<ArticleSummary[]> {
  const endpoint = (page: number) => (
    `/blog/articles?locale=${encodeURIComponent(locale)}&per_page=100&page=${page}`
  );
  async function fetchSummaryPage(page: number): Promise<ArticleSummaryResponse> {
    const responseDiagnostics: string[] = [];

    for (let attempt = 0; attempt < CMS_RESPONSE_ATTEMPTS; attempt += 1) {
      // `requestOnce` deduplicates the normal build path. If the CMS temporarily
      // returns a malformed-but-200 response, bypass the cached result and give
      // the origin enough recovery time before trying again.
      const response = attempt === 0
        ? await cms.requestOnce<ArticleSummaryResponse>(endpoint(page))
        : await cms.request<ArticleSummaryResponse>(endpoint(page));
      if (response?.data && Array.isArray(response.data)) return response;

      responseDiagnostics.push(`attempt=${attempt + 1}:${describeResponseShape(response)}`);

      if (attempt < CMS_RESPONSE_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * (2 ** attempt)));
      }
    }

    const scope = page === 1 ? `untuk locale ${locale}` : `${locale}/page/${page}`;
    throw new Error(
      `CMS tidak mengembalikan ringkasan artikel ${scope}. `
      + `Diagnostic shape: ${responseDiagnostics.join(' | ')}`,
    );
  }

  const firstPage = await fetchSummaryPage(1);

  const lastPage = positiveInteger(firstPage.last_page, 1);
  const remainingPages = await mapWithConcurrency(
    Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) => index + 2),
    ARTICLE_FETCH_CONCURRENCY,
    async (page) => (await fetchSummaryPage(page)).data,
  );

  return [firstPage.data, ...remainingPages].flat();
}

async function fetchArticleBuildData(locale: Locale): Promise<ArticleBuildData> {
  const [categoryResponse, summaries] = await Promise.all([
    cms.requestOnce<DataResponse<ArticleCategory[]>>(
      `/blog/categories?locale=${encodeURIComponent(locale)}`,
    ),
    fetchArticleSummaries(locale),
  ]);
  const categories = (categoryResponse?.data ?? []).filter((category) => category.is_active !== false);
  const [listings, details] = await Promise.all([
    fetchAllListings(locale, categories),
    fetchArticleDetails(locale, summaries),
  ]);

  return { categories, listings, details };
}

export function getArticleBuildData(locale: Locale): Promise<ArticleBuildData> {
  const existing = localeBuildData.get(locale);
  if (existing) return existing;

  const pending = fetchArticleBuildData(locale).catch((error) => {
    localeBuildData.delete(locale);
    throw error;
  });
  localeBuildData.set(locale, pending);
  return pending;
}

export { ARTICLES_PER_PAGE };
