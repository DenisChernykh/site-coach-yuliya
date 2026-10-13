import { useQuery } from '@tanstack/react-query'
import {
  adminGetCms,
  getAdminGetCmsQueryKey,
  isProblemCode,
} from '@/shared/api'
export const cmsKey = getAdminGetCmsQueryKey
export function useCms() {
  return useQuery({
    queryKey: cmsKey(),
    queryFn: ({ signal }) => adminGetCms(undefined, signal),
    throwOnError: (error) => isProblemCode(error, 'AUTHENTICATION_REQUIRED'),
  })
}
