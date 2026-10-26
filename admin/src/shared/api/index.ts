import '@/shared/config'
export { adminUploadStoryMedia } from './generated/story-media/story-media'
export type { StoryGroupDto, StorySlideDto } from './generated/model'
export {
  adminGetCms,
  adminSaveCmsDraft,
  adminPublishCms,
  getAdminGetCmsQueryKey,
} from './generated/cms/cms'
export type {
  CmsWorkspaceDto,
  CmsDocumentDto,
  CmsPageContentDto,
  CmsPageDto,
  CmsBlockDto,
} from './generated/model'
export { AdminSaveCmsDraftBody as cmsDraftSchema } from './generated-zod/cms/cms.zod'

export {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
  isProblemCode,
  normalizeApiError,
} from './client/api-errors'
export type {
  ApiClientError,
  ProblemCode,
  ProblemDocumentLike,
} from './client/api-errors'
export type { ApiResponse } from './client/orval-mutator'
export {
  clearCsrfToken,
  peekCsrfToken,
  setCsrfToken,
} from './client/csrf-token'
export {
  authAcceptAccountInvitation,
  authConfirmEmailVerification,
  authConfirmPasswordReset,
  authGetCsrfToken,
  authGetMe,
  authLogin,
  authLogout,
  authRegister,
  authRequestPasswordReset,
  authResendEmailVerification,
  getAuthGetMeQueryKey,
  getAuthGetMeQueryOptions,
} from './generated/auth/auth'
export {
  adminAuthCreateAccountInvitation,
  adminAuthGetAccount,
  adminAuthListAccounts,
  adminAuthListRoles,
  adminAuthLogoutAll,
  adminAuthReplaceAccountRoles,
  adminAuthRequestPasswordReset,
  adminAuthResendAccountInvitation,
  adminAuthRetireAccount,
  adminAuthUpdateAccountStatus,
  getAdminAuthGetAccountQueryKey,
  getAdminAuthListAccountsQueryKey,
  getAdminAuthListRolesQueryKey,
} from './generated/admin-auth/admin-auth'
export type {
  AcceptAccountInvitationRequestDto,
  AccountMailDeliveryResponseDto,
  AdminAccountListResponseDto,
  AdminAccountResponseDto,
  AdminAccountResponseDtoState,
  AdminAuthListAccountsParams,
  AdminRoleCatalogResponseDto,
  ConfirmEmailVerificationRequestDto,
  ConfirmPasswordResetRequestDto,
  CreateAccountInvitationRequestDto,
  CurrentUserResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  ProblemResponseDto,
  RegisterUserRequestDto,
  ReplaceAccountRolesRequestDto,
  SelfServiceEmailRequestDto,
  UpdateAccountStatusRequestDto,
  ValidationProblemResponseDto,
} from './generated/model'
export {
  AdminAuthCreateAccountInvitationBody as adminAccountInvitationSchema,
  AdminAuthGetAccountParams as adminAccountPathSchema,
  AdminAuthReplaceAccountRolesBody as adminAccountRolesSchema,
  AdminAuthUpdateAccountStatusBody as adminAccountStatusSchema,
} from './generated-zod/admin-auth/admin-auth.zod'
export {
  AuthAcceptAccountInvitationBody as authAcceptAccountInvitationSchema,
  AuthConfirmEmailVerificationBody as authConfirmEmailVerificationSchema,
  AuthConfirmPasswordResetBody as authConfirmPasswordResetSchema,
  AuthLoginBody as authLoginSchema,
  AuthRegisterBody as authRegisterSchema,
  AuthRequestPasswordResetBody as authRequestPasswordResetSchema,
  AuthResendEmailVerificationBody as authResendEmailVerificationSchema,
} from './generated-zod/auth/auth.zod'

export {
  adminListArticles,
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminListPrograms,
  adminCreateProgram,
  adminUpdateProgram,
  adminDeleteProgram,
  adminGetContacts,
  adminUpdateContacts,
  adminGetSite,
  adminUpdateSite,
  adminGetSeo,
  adminUpdateSeo,
  getAdminGetSeoQueryKey,
  adminGetHome,
  adminUpdateHome,
  adminGetFaq,
  adminUpdateFaq,
  adminGetSocialLinks,
  adminUpdateSocialLinks,
  getAdminListArticlesQueryKey,
  getAdminListProgramsQueryKey,
  getAdminGetContactsQueryKey,
  getAdminGetSiteQueryKey,
  getAdminGetHomeQueryKey,
  getAdminGetFaqQueryKey,
  getAdminGetSocialLinksQueryKey,
} from './generated/admin-content/admin-content'
export {
  adminListConsultations,
  adminGetConsultation,
  adminUpdateConsultation,
  adminRetryTelegram,
  getAdminListConsultationsQueryKey,
  getAdminGetConsultationQueryKey,
} from './generated/admin-consultations/admin-consultations'
export {
  adminGetPublication,
  adminRetryPublication,
  getAdminGetPublicationQueryKey,
} from './generated/publication/publication'
export type {
  ArticleDto,
  ServiceDto,
  ManagedArticleDto,
  ManagedProgramDto,
  WriteArticleDto,
  WriteProgramDto,
  WriteContactsDto,
  ContactDetailsDto,
  SiteSettingsDto,
  SeoSettingsDto,
  SeoPagesDto,
  PageSeoDto,
  HomePageDto,
  FaqItemDto,
  SocialLinkDto,
  AdminConsultationDto,
  AdminConsultationDtoStatus,
  ConsultationPageDto,
  UpdateConsultationDto,
  PublicationStatusDto,
} from './generated/model'
export type { AdminListConsultationsParams } from './generated/operation'
export {
  AdminCreateArticleBody as writeArticleSchema,
  AdminCreateProgramBody as writeProgramSchema,
  AdminUpdateContactsBody as contactsSchema,
  AdminUpdateSiteBody as siteSchema,
  AdminUpdateSeoBody as seoSchema,
  AdminUpdateHomeBody as homeSchema,
  AdminUpdateFaqBody as faqSchema,
  AdminUpdateSocialLinksBody as socialsSchema,
} from './generated-zod/admin-content/admin-content.zod'

export { AdminUpdateArticleParams as articlePathSchema } from './generated-zod/admin-content/admin-content.zod'

export {
  adminCreateMediaUpload,
  adminUploadMediaChunk,
  adminGetMediaUpload,
  adminCompleteMediaUpload,
  adminRetryMediaUpload,
  adminListMediaUploads,
  getAdminListMediaUploadsQueryOptions,
  getAdminListMediaUploadsQueryKey,
} from './generated/media-uploads/media-uploads'
export type { MediaUploadDto, MediaUploadDtoPurpose } from './generated/model'
