import { MediaUploadController } from '../presentation/media-upload.controller'
import type { ProtectedJsonRoute } from '@/platform/http/policy/protected-json-body.contracts'
import { AdminStoryMediaController } from '../presentation/story-media.controller'

export const STORY_MEDIA_UPLOAD: ProtectedJsonRoute = Object.freeze({
  path: '/v1/admin/story-media',
  limitBytes: 41 * 1024 * 1024,
  target: Object.freeze({
    controller: AdminStoryMediaController,
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Metadata reference, never invoked here.
    handler: AdminStoryMediaController.prototype.upload,
  }),
})

export const MEDIA_CHUNK_UPLOAD: ProtectedJsonRoute = Object.freeze({
  path: '/v1/admin/media-uploads/:id/chunks/:index',
  limitBytes: 1024 * 1024,
  bodyType: 'raw',
  target: Object.freeze({
    controller: MediaUploadController,
    // eslint-disable-next-line @typescript-eslint/unbound-method -- Metadata reference.
    handler: MediaUploadController.prototype.chunk,
  }),
})
