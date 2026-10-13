import type {
  CmsDocument,
  CmsPage,
  CmsPageContent,
  CmsWorkspace,
} from '../domain/cms'

export interface SiteCmsPort {
  get(): Promise<CmsWorkspace>
  save(revision: number, content: CmsPageContent): Promise<CmsWorkspace>
  publish(revision: number): Promise<CmsWorkspace>
  mutate<T>(change: (document: CmsDocument) => T): Promise<T>
  publishedPages(): Promise<CmsPage[]>
}
