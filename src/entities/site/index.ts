export {
  getHomePage as loadHomePage,
  getContacts as loadContacts,
  getSiteSettings as loadSiteSettings,
} from '@/shared/api';
export { getSeoSettings as loadSeoSettings } from '@/shared/api';
export {
  resolvePageSeo,
  seoPagePaths,
  sitemapXml,
  robotsTxt,
  serializeJsonLd,
} from './model/seo';
export type {
  HomePageDto,
  ContactDetailsDto,
  SiteSettingsDto,
  SeoSettingsDto,
  SeoPagesDto,
  PageSeoDto,
  NavigationItemDto,
  CaseStudyDto,
  StepDto,
} from '@/shared/api';
