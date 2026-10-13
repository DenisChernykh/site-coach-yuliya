import type { PageSeoDto } from '@/shared/api'

export const emptyPageSeo: PageSeoDto = {
  title: '',
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogImageAlt: '',
  noIndex: false,
}
