export { ApiError, isMockMode } from './client/api-fetch';
export { getSiteSettings } from './generated/site/site';
export { getHomePage } from './generated/home/home';
export { getServices } from './generated/services/services';
export {
  getArticles,
  getArticle,
  useGetArticles,
  getGetArticlesQueryOptions,
} from './generated/articles/articles';
export { getFaq } from './generated/faq/faq';
export { getSocialLinks } from './generated/social-links/social-links';
export { getContacts } from './generated/contacts/contacts';
export {
  useCreateConsultation,
  createConsultation,
} from './generated/consultations/consultations';
export type {
  ArticleDto,
  ArticleDtoTopic,
  CaseStudyDto,
  ConsultationRequestDto,
  ContactDetailsDto,
  FaqItemDto,
  HomePageDto,
  NavigationItemDto,
  ServiceDto,
  SiteSettingsDto,
  SocialLinkDto,
  StepDto,
} from './generated/model';
