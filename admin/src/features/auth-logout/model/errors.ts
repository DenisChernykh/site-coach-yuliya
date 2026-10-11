import { isProblemCode } from '@/shared/api'

export function hasVisibleLogoutError(error: unknown): boolean {
  return error !== null && !isProblemCode(error, 'AUTHENTICATION_REQUIRED')
}
