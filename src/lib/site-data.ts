import type { Locale } from '../config/site';
import { cms } from './cms';

export interface ServiceMenuItem {
  name: string;
  slug: string;
  description?: string | null;
  icon_name?: string | null;
  hide_from_menu?: boolean;
  available_locales?: Locale[];
  requested_locale_available?: boolean;
}

export interface ServiceMenuGroup {
  category: string;
  slug?: string | null;
  items: ServiceMenuItem[];
}

export interface ContactInfo {
  whatsapp: string;
  whatsapp_display?: string | null;
  email?: string | null;
  address?: string | null;
  maps_url?: string | null;
  maps_embed?: string | null;
  hours?: string | null;
}

export interface SystemStatus {
  is_maintenance: boolean;
  maintenance_pages: string[];
}

interface DataResponse<T> {
  data: T;
}

export interface SiteShellData {
  categories: ServiceMenuGroup[];
  contact: ContactInfo;
  status: SystemStatus;
}

const FALLBACK_CONTACT: ContactInfo = {
  whatsapp: '6285159358044',
  whatsapp_display: '+62 851-5935-8044',
};

export async function getSiteShellData(locale: Locale): Promise<SiteShellData> {
  const [services, contact, status] = await Promise.all([
    cms.requestOnce<DataResponse<ServiceMenuGroup[]>>(`/services?locale=${encodeURIComponent(locale)}&strict_locale=1`),
    cms.requestOnce<DataResponse<ContactInfo>>('/contact'),
    cms.requestOnce<SystemStatus>('/system/status'),
  ]);

  return {
    categories: services?.data ?? [],
    contact: contact?.data ?? FALLBACK_CONTACT,
    status: status ?? { is_maintenance: false, maintenance_pages: [] },
  };
}

export function isPageInMaintenance(status: SystemStatus, path: string): boolean {
  return status.maintenance_pages.some((maintenancePath) => (
    maintenancePath === '/layanan'
      ? path === '/layanan' || path.startsWith('/layanan/')
      : maintenancePath === path
  ));
}
