import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRevalidator } from 'react-router'
import { contentKeys } from '@/entities/site-content'
import {
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminCreateProgram,
  adminUpdateProgram,
  adminDeleteProgram,
  adminUpdateContacts,
  adminUpdateSite,
  adminUpdateHome,
  adminUpdateFaq,
  adminUpdateSocialLinks,
  isProblemCode,
  type WriteArticleDto,
  type WriteProgramDto,
  type ContactDetailsDto,
  type SiteSettingsDto,
  type HomePageDto,
  type FaqItemDto,
  type SocialLinkDto,
} from '@/shared/api'

export function useContentMutation<T, R>(
  mutationFn: (input: T) => Promise<R>,
  kind: keyof typeof contentKeys,
) {
  const client = useQueryClient()
  const revalidator = useRevalidator()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: contentKeys[kind]() }),
        client.invalidateQueries({ queryKey: contentKeys.publication() }),
      ])
    },
    onError: (error) => {
      if (isProblemCode(error, 'AUTHENTICATION_REQUIRED'))
        void revalidator.revalidate()
    },
  })
}
export function useSaveArticle(id?: string) {
  return useContentMutation(
    (input: WriteArticleDto) =>
      id ? adminUpdateArticle({ id }, input) : adminCreateArticle(input),
    'articles',
  )
}
export function useSaveProgram(id?: string) {
  return useContentMutation(
    (input: WriteProgramDto) =>
      id ? adminUpdateProgram({ id }, input) : adminCreateProgram(input),
    'programs',
  )
}
export function useDeleteArticle() {
  return useContentMutation(
    (id: string) => adminDeleteArticle({ id }),
    'articles',
  )
}
export function useDeleteProgram() {
  return useContentMutation(
    (id: string) => adminDeleteProgram({ id }),
    'programs',
  )
}
export function useSaveContacts() {
  return useContentMutation(
    (input: ContactDetailsDto) => adminUpdateContacts(input),
    'contacts',
  )
}
export function useSaveSite() {
  return useContentMutation(
    (input: SiteSettingsDto) => adminUpdateSite(input),
    'site',
  )
}
export function useSaveHome() {
  return useContentMutation(
    (input: HomePageDto) => adminUpdateHome(input),
    'home',
  )
}
export function useSaveFaq() {
  return useContentMutation(
    (items: FaqItemDto[]) => adminUpdateFaq({ items }),
    'faq',
  )
}
export function useSaveSocials() {
  return useContentMutation(
    (links: SocialLinkDto[]) => adminUpdateSocialLinks({ links }),
    'socials',
  )
}
