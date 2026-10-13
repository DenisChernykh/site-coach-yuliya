import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRevalidator } from 'react-router'
import { contentKeys, cmsKey } from '@/entities/site-content'
import {
  adminCreateArticle,
  adminUpdateArticle,
  adminDeleteArticle,
  adminCreateProgram,
  adminUpdateProgram,
  adminDeleteProgram,
  adminUpdateSeo,
  isProblemCode,
  type WriteArticleDto,
  type WriteProgramDto,
  type SeoSettingsDto,
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
        client.invalidateQueries({ queryKey: cmsKey() }),
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
export function useSaveSeo() {
  return useContentMutation(
    (input: SeoSettingsDto) => adminUpdateSeo(input),
    'seo',
  )
}
