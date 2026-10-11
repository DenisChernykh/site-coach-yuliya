import type { CoachSiteRuntimeConfig } from '@/platform/config/coach-site.config'
import type {
  BuildResult,
  DispatchResult,
  SiteBuilderPort,
} from '../application/publication.port'

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export class GithubSiteBuilder implements SiteBuilderPort {
  public constructor(
    private readonly config: CoachSiteRuntimeConfig['publication'],
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.config.token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      'Content-Type': 'application/json',
      'User-Agent': 'coach-yuliya-publication',
    }
  }

  public async dispatch(
    revision: number,
    signal: AbortSignal,
  ): Promise<DispatchResult> {
    try {
      const response = await this.fetcher(
        `https://api.github.com/repos/${this.config.repository}/actions/workflows/deploy-netangels.yml/dispatches`,
        {
          method: 'POST',
          headers: this.headers(),
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
          body: JSON.stringify({
            ref: this.config.ref,
            inputs: {
              target: 'site',
              initialize_admin: false,
              content_revision: revision,
            },
          }),
        },
      )
      if (!response.ok)
        return {
          errorCode: `GITHUB_DISPATCH_${response.status}`,
          permanent: [401, 403, 404, 422].includes(response.status),
        }
      const body: unknown = await response.json()
      if (
        !record(body) ||
        typeof body['workflow_run_id'] !== 'number' ||
        !Number.isSafeInteger(body['workflow_run_id']) ||
        body['workflow_run_id'] < 1
      )
        return {
          errorCode: 'GITHUB_INVALID_DISPATCH_RESPONSE',
          permanent: false,
        }
      return { runId: String(body['workflow_run_id']) }
    } catch {
      return { errorCode: 'GITHUB_UNAVAILABLE', permanent: false }
    }
  }

  public async check(
    runId: string,
    expectedRevision: number,
    signal: AbortSignal,
  ): Promise<BuildResult> {
    if (!/^[1-9]\d*$/u.test(runId))
      return { status: 'failed', errorCode: 'GITHUB_INVALID_RUN_ID' }
    try {
      const response = await this.fetcher(
        `https://api.github.com/repos/${this.config.repository}/actions/runs/${runId}`,
        {
          headers: this.headers(),
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        },
      )
      if ([401, 403, 404].includes(response.status))
        return { status: 'failed', errorCode: `GITHUB_RUN_${response.status}` }
      if (!response.ok) return { status: 'waiting' }
      const run: unknown = await response.json()
      if (!record(run) || run['status'] !== 'completed')
        return { status: 'waiting' }
      if (run['conclusion'] !== 'success')
        return { status: 'failed', errorCode: 'SITE_WORKFLOW_FAILED' }
      const deployed = await this.fetcher(
        `${this.config.siteOrigin}/release.json?content=${expectedRevision}`,
        {
          headers: { 'Cache-Control': 'no-cache' },
          redirect: 'error',
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        },
      )
      if (!deployed.ok) return { status: 'waiting' }
      const release: unknown = await deployed.json()
      if (
        !record(release) ||
        typeof release['contentRevision'] !== 'number' ||
        !Number.isSafeInteger(release['contentRevision']) ||
        release['contentRevision'] < expectedRevision
      )
        return { status: 'failed', errorCode: 'SITE_REVISION_MISMATCH' }
      return { status: 'success', deployedRevision: release['contentRevision'] }
    } catch {
      return { status: 'waiting' }
    }
  }
}
