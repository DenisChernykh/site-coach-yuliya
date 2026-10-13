import type { CmsWorkspaceDto } from '@/shared/api'
import initialContent from '../../../../../backend/content/initial.json'
import { initialPages } from '../../../../../backend/src/modules/coach-site/domain/cms'

export function createCmsFixture(): CmsWorkspaceDto {
  return {
    revision: 1,
    publishedRevision: 1,
    content: {
      site: structuredClone(initialContent.settings),
      home: structuredClone(initialContent.home),
      contacts: structuredClone(initialContent.contacts),
      faq: structuredClone(initialContent.faq),
      socials: structuredClone(
        initialContent.socials,
      ) as CmsWorkspaceDto['content']['socials'],
      seo: structuredClone(initialContent.seo),
      pages: initialPages(),
      articles: [],
      programs: [],
    },
  }
}
