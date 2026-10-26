export const MEDIA_CHUNK_BYTES = 1024 * 1024
export const MEDIA_PURPOSES = [
  'photo',
  'article-cover',
  'story',
  'document',
  'social',
] as const
export type MediaPurpose = (typeof MEDIA_PURPOSES)[number]
export type MediaStatus =
  'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
export interface MediaUploadInput {
  id: string
  name: string
  mimeType: string
  size: number
  sha256: string
  purpose: MediaPurpose
  contextKey: string
}
export interface MediaOutput {
  url: string
  previewUrl: string
  mobileUrl: string
  mimeType: string
  size: number
  width: number
  height: number
}
export interface MediaUpload extends MediaUploadInput {
  status: MediaStatus
  attempts: number
  error: string | null
  output: MediaOutput | null
}
export interface MediaUploadStorePort {
  create(input: MediaUploadInput): Promise<MediaUpload>
  get(id: string): Promise<MediaUpload | undefined>
  list(contextKey?: string): Promise<MediaUpload[]>
  enqueue(id: string): Promise<void>
  retry(id: string): Promise<void>
  acquire(token: string): Promise<boolean>
  release(token: string): Promise<void>
  claim(token: string): Promise<MediaUpload | undefined>
  complete(id: string, token: string, output: MediaOutput): Promise<boolean>
  fail(id: string, token: string, permanent: boolean): Promise<void>
  cleanup(): Promise<void>
}
export interface MediaFilesPort {
  chunk(input: MediaUpload, index: number, data: Uint8Array): Promise<void>
  chunks(input: MediaUpload): Promise<number[]>
  assemble(input: MediaUpload): Promise<void>
}
export interface MediaProcessorPort {
  process(input: MediaUpload, token: string): Promise<MediaOutput>
}
