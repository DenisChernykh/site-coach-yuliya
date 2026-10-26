import {
  getAdminListMediaUploadsQueryOptions,
  getAdminListMediaUploadsQueryKey,
} from '@/shared/api'
export const mediaUploadsQueryKey = getAdminListMediaUploadsQueryKey
export const mediaUploadsQueryOptions = (enabled: boolean) =>
  getAdminListMediaUploadsQueryOptions(undefined, {
    query: { enabled, refetchInterval: enabled ? 3000 : false },
  })
