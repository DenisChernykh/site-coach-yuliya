export {
  getHomePage as loadHomePage,
  getContacts as loadContacts,
} from '@/shared/api';
export { loadSiteSettings } from './model/site-settings';
export type {
  HomePageDto,
  ContactDetailsDto,
  SiteSettingsDto,
  NavigationItemDto,
  CaseStudyDto,
  StepDto,
} from '@/shared/api';
