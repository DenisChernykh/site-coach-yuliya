import { definePermissions } from '@/shared/application/permission'
import type { PermissionKey } from '@/shared/application/permission'

export const COACH_SITE_PERMISSIONS: readonly PermissionKey[] =
  definePermissions(['site.content.manage', 'site.consultations.manage'])

export const MANAGE_SITE_CONTENT: PermissionKey = COACH_SITE_PERMISSIONS[0]!
export const MANAGE_CONSULTATIONS: PermissionKey = COACH_SITE_PERMISSIONS[1]!
