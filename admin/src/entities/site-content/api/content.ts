import { useQuery } from '@tanstack/react-query'
import {
  adminGetSeo,
  getAdminGetSeoQueryKey,
  adminGetPublication,
  adminListArticles,
  adminListPrograms,
  isProblemCode,
  getAdminGetPublicationQueryKey,
  getAdminListArticlesQueryKey,
  getAdminListProgramsQueryKey,
} from '@/shared/api'

const authError = (error: unknown) =>
  isProblemCode(error, 'AUTHENTICATION_REQUIRED')
export const contentKeys = {
  articles: getAdminListArticlesQueryKey,
  programs: getAdminListProgramsQueryKey,
  seo: getAdminGetSeoQueryKey,
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
export function useSeo() {
  return useQuery({
    queryKey: contentKeys.seo(),
    queryFn: ({ signal }) => adminGetSeo(undefined, signal),
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
