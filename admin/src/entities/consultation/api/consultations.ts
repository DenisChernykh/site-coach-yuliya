import { useQuery } from '@tanstack/react-query'
import {
  adminListConsultations,
  getAdminListConsultationsQueryKey,
  isProblemCode,
  type AdminListConsultationsParams,
  type AdminConsultationDtoStatus,
} from '@/shared/api'
export const consultationKeys = getAdminListConsultationsQueryKey
export const consultationStatuses: Record<AdminConsultationDtoStatus, string> =
  {
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
    ARCHIVED: 'В архиве',
  }
export function useConsultations(params: AdminListConsultationsParams) {
  return useQuery({
    queryKey: consultationKeys(params),
    queryFn: ({ signal }) => adminListConsultations(params, undefined, signal),
    throwOnError: (error) => isProblemCode(error, 'AUTHENTICATION_REQUIRED'),
  })
}
