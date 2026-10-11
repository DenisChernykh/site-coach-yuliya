import type { PublicationPort, SiteBuilderPort } from './publication.port'

export class PublishSiteContent {
  public constructor(
    public readonly publications: PublicationPort,
    private readonly builder: SiteBuilderPort,
  ) {}

  public async runOnce(signal: AbortSignal): Promise<void> {
    const current = await this.publications.get()
    if (
      current.status === 'BUILDING' &&
      current.workflowRunId !== null &&
      current.activeRevision !== null
    ) {
      if (
        current.dispatchedAt !== null &&
        Date.now() - current.dispatchedAt.getTime() > 45 * 60_000
      ) {
        await this.publications.failed(undefined, 'SITE_BUILD_TIMEOUT', false)
        return
      }
      const result = await this.builder.check(
        current.workflowRunId,
        current.activeRevision,
        signal,
      )
      if (result.status === 'success')
        await this.publications.completed(result.deployedRevision)
      else if (result.status === 'failed')
        await this.publications.failed(undefined, result.errorCode, false)
      return
    }
    const claim = await this.publications.claim(new Date())
    if (claim === undefined || signal.aborted) return
    const result = await this.builder.dispatch(claim.revision, signal)
    if ('runId' in result)
      await this.publications.dispatched(claim, result.runId)
    else
      await this.publications.failed(
        claim.claimToken,
        result.errorCode,
        result.permanent,
      )
  }
}
