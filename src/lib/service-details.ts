import type { Locale } from '../config/site';
import type { ServiceMenuGroup } from './site-data';
import { cms } from './cms';
import { serviceParentSlug } from './services';

interface DataResponse<T> {
  data: T;
}

export interface ServiceBenefit {
  title: string;
  description: string;
}

export interface ServiceAboutAndBenefits {
  title?: string | null;
  description?: string | null;
  benefitsTitle?: string | null;
  benefits: ServiceBenefit[];
}

export interface ServiceWorkflow {
  title: string;
  description: string;
}

export interface ServicePackage {
  name: string;
  price?: string | null;
  price_raw?: number | null;
  is_contact_price?: boolean;
  description?: string | null;
  isPopular?: boolean;
  features?: string[];
  requirements?: string[];
}

export interface ServicePricingData {
  packages: ServicePackage[];
}

export interface ServiceSubService {
  id?: string | null;
  name: string;
  description?: string | null;
  pricingData: ServicePricingData;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface ServiceTestimonial {
  name: string;
  role?: string | null;
  quote: string;
  avatar?: string | null;
}

export interface ServiceDetail {
  name: string;
  slug: string;
  description?: string | null;
  hero_description?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  aboutAndBenefits?: ServiceAboutAndBenefits | null;
  clients_count?: number | null;
  processing_time?: string | null;
  workflow_title?: string | null;
  workflows?: ServiceWorkflow[];
  pricingData?: ServicePricingData | null;
  subServices?: ServiceSubService[] | null;
  addonsData?: ServicePricingData | null;
  faqs?: ServiceFaq[];
  testimonials?: ServiceTestimonial[];
  updated_at?: string | null;
}

export interface ServiceRoute {
  slug: string;
  category: string;
}

export interface ServiceDetailEntry extends ServiceRoute {
  service: ServiceDetail;
}

const localeEntries = new Map<Locale, Promise<ServiceDetailEntry[]>>();

export function uniqueServiceRoutes(groups: ServiceMenuGroup[]): ServiceRoute[] {
  const routes = new Map<string, ServiceRoute>();

  for (const group of groups) {
    for (const item of group.items) {
      const slug = serviceParentSlug(item.slug).trim();
      if (!slug || routes.has(slug)) continue;
      routes.set(slug, { slug, category: group.category });
    }
  }

  return [...routes.values()];
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

async function fetchServiceEntries(locale: Locale): Promise<ServiceDetailEntry[]> {
  const menu = await cms.requestOnce<DataResponse<ServiceMenuGroup[]>>(
    `/services?locale=${encodeURIComponent(locale)}`,
  );
  const routes = uniqueServiceRoutes(menu?.data ?? []);

  return mapWithConcurrency(routes, 3, async (route) => {
    const response = await cms.requestOnce<DataResponse<ServiceDetail>>(
      `/services/${encodeURIComponent(route.slug)}?locale=${encodeURIComponent(locale)}`,
    );

    if (!response?.data) {
      throw new Error(`CMS tidak mengembalikan detail layanan untuk slug ${route.slug}.`);
    }

    return { ...route, service: response.data };
  });
}

export function getServiceDetailEntries(locale: Locale): Promise<ServiceDetailEntry[]> {
  const existing = localeEntries.get(locale);
  if (existing) return existing;

  const pending = fetchServiceEntries(locale).catch((error) => {
    localeEntries.delete(locale);
    throw error;
  });
  localeEntries.set(locale, pending);
  return pending;
}
