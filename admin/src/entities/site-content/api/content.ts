import { useQuery } from '@tanstack/react-query'
import {
  adminGetContacts,
  adminGetFaq,
  adminGetHome,
  adminGetSite,
  adminGetSocialLinks,
  adminGetPublication,
  adminListArticles,
  adminListPrograms,
  isProblemCode,
  getAdminGetContactsQueryKey,
  getAdminGetFaqQueryKey,
  getAdminGetHomeQueryKey,
  getAdminGetSiteQueryKey,
  getAdminGetSocialLinksQueryKey,
  getAdminGetPublicationQueryKey,
  getAdminListArticlesQueryKey,
  getAdminListProgramsQueryKey,
} from '@/shared/api'

const authError = (error: unknown) =>
  isProblemCode(error, 'AUTHENTICATION_REQUIRED')
export const contentKeys = {
  articles: getAdminListArticlesQueryKey,
  programs: getAdminListProgramsQueryKey,
  contacts: getAdminGetContactsQueryKey,
  site: getAdminGetSiteQueryKey,
  home: getAdminGetHomeQueryKey,
  faq: getAdminGetFaqQueryKey,
  socials: getAdminGetSocialLinksQueryKey,
  publication: getAdminGetPublicationQueryKey,
}
export function useArticles() {
  return useQuery({
    queryKey: contentKeys.articles(),
    queryFn: ({ signal }) => adminListArticles(undefined, signal),
    throwOnError: authError,
  })
}
export function usePrograms() {
  return useQuery({
    queryKey: contentKeys.programs(),
    queryFn: ({ signal }) => adminListPrograms(undefined, signal),
    throwOnError: authError,
  })
}
export function useContacts() {
  return useQuery({
    queryKey: contentKeys.contacts(),
    queryFn: ({ signal }) => adminGetContacts(undefined, signal),
    throwOnError: authError,
  })
}
export function useSite() {
  return useQuery({
    queryKey: contentKeys.site(),
    queryFn: ({ signal }) => adminGetSite(undefined, signal),
    throwOnError: authError,
  })
}
export function useHome() {
  return useQuery({
    queryKey: contentKeys.home(),
    queryFn: ({ signal }) => adminGetHome(undefined, signal),
    throwOnError: authError,
  })
}
export function useFaq() {
  return useQuery({
    queryKey: contentKeys.faq(),
    queryFn: ({ signal }) => adminGetFaq(undefined, signal),
    throwOnError: authError,
  })
}
export function useSocials() {
  return useQuery({
    queryKey: contentKeys.socials(),
    queryFn: ({ signal }) => adminGetSocialLinks(undefined, signal),
    throwOnError: authError,
  })
}
export function usePublication() {
  return useQuery({
    queryKey: contentKeys.publication(),
    queryFn: ({ signal }) => adminGetPublication(undefined, signal),
    refetchInterval: 8000,
    throwOnError: authError,
  })
}
