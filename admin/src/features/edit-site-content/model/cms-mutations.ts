import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cmsKey, contentKeys } from '@/entities/site-content'
import {
  adminSaveCmsDraft,
  adminPublishCms,
  type CmsWorkspaceDto,
  type CmsPageContentDto,
} from '@/shared/api'

export function useCmsActions() {
  const client = useQueryClient()
  async function changed(workspace: CmsWorkspaceDto) {
    client.setQueryData(cmsKey(), workspace)
    await Promise.all(
      Object.values(contentKeys).map((key) =>
        client.invalidateQueries({ queryKey: key() }),
      ),
    )
  }
  const save = useMutation({
    mutationFn: (input: { revision: number; content: CmsPageContentDto }) =>
      adminSaveCmsDraft(input),
    onSuccess: changed,
  })
  const publish = useMutation({
    mutationFn: (revision: number) => adminPublishCms({ revision }),
    onSuccess: changed,
  })
  return { save, publish, pending: save.isPending || publish.isPending }
}
