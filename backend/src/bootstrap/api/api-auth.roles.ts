import {
  SYSTEM_ADMIN_PERMISSIONS,
  type RoleDefinition,
} from '@/modules/identity-access/composition/role-catalog'
import { COACH_SITE_PERMISSIONS } from '@/modules/coach-site/composition/coach-site.roles'

/** Immutable product-owned role definitions installed by the API root. */
export const API_ROLE_DEFINITIONS: readonly RoleDefinition[] = Object.freeze([
  Object.freeze({
    key: 'system.admin',
    permissions: Object.freeze([
      ...SYSTEM_ADMIN_PERMISSIONS,
      ...COACH_SITE_PERMISSIONS,
    ]),
  }),
])
