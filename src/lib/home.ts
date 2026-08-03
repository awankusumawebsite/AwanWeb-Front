import type { Locale } from '../config/site';
import type { ArticleSummary } from './articles';
import { cms } from './cms';

interface DataResponse<T> {
  data: T;
}

interface ArticleListResponse {
  data: ArticleSummary[];
}

export interface HomeTestimonial {
  id?: number;
  name: string;
  role?: string | null;
  avatar?: string | null;
  quote: string;
}

export interface HomeFaq {
  id?: number;
  question: string;
  answer: string;
}

export interface HomePartner {
  id?: number;
  name: string;
  logo_url?: string | null;
  logo?: string | null;
}

export interface HomeMarqueeImage {
  id?: number;
  image_url: string;
  alt_text?: string | null;
}

export interface HomeData {
  articles: ArticleSummary[];
  testimonials: HomeTestimonial[];
  faqs: HomeFaq[];
  partners: HomePartner[];
  marqueeImages: HomeMarqueeImage[];
}

export async function getHomeData(locale: Locale): Promise<HomeData> {
  const encodedLocale = encodeURIComponent(locale);
  const [articles, testimonials, faqs, partners, marqueeImages] = await Promise.all([
    cms.requestOnce<ArticleListResponse>(`/blog/articles?locale=${encodedLocale}&per_page=2`),
    cms.requestOnce<DataResponse<HomeTestimonial[]>>(`/testimonials?locale=${encodedLocale}`),
    cms.requestOnce<DataResponse<HomeFaq[]>>(`/faqs?locale=${encodedLocale}&location=home`),
    cms.requestOnce<DataResponse<HomePartner[]>>('/partners'),
    cms.requestOnce<DataResponse<HomeMarqueeImage[]>>('/marquee-images'),
  ]);

  return {
    articles: articles?.data ?? [],
    testimonials: testimonials?.data ?? [],
    faqs: faqs?.data ?? [],
    partners: partners?.data ?? [],
    marqueeImages: marqueeImages?.data ?? [],
  };
}

export function mediaHasRenderableFrame(readyState: number): boolean {
  return readyState >= 2;
}

export function homeMediaUrl(value?: string | null): string {
  if (!value) return '/images/mockups/photo-1560250097-0b93528c311a.webp';
  if (value.startsWith('/') || /^https?:\/\//i.test(value)) return value;
  const path = value.trim().replace(/^\/+/, '');
  return new URL(path.startsWith('storage/') ? `/${path}` : `/storage/${path}`, 'https://cms.awankusuma.com').href;
}
