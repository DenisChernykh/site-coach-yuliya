import { GithubSiteBuilder } from '@/modules/coach-site/infrastructure/github-site-builder'

const config = {
  enabled: true,
  repository: 'example/coach',
  ref: 'main',
  token: 'example-private-token',
  siteOrigin: 'https://coach.example',
}

describe('GitHub content publication', () => {
  it('requests a site-only build for the configured branch and persists the returned workflow identity', async () => {
    const fetcher = jest.fn(
      (...arguments_: Parameters<typeof fetch>): Promise<Response> => {
        void arguments_
        return Promise.resolve(Response.json({ workflow_run_id: 123 }))
      },
    )
    expect(
      await new GithubSiteBuilder(config, fetcher).dispatch(
        7,
        new AbortController().signal,
      ),
    ).toEqual({ runId: '123' })
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toEqual({
      ref: 'main',
      inputs: { target: 'site', initialize_admin: false, content_revision: 7 },
    })
  })

  it('stops dispatch retries when repository permissions are missing', async () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(Response.json({ message: config.token }, { status: 403 }))
    expect(
      await new GithubSiteBuilder(config, fetcher).dispatch(
        7,
        new AbortController().signal,
      ),
    ).toEqual({ errorCode: 'GITHUB_DISPATCH_403', permanent: true })
  })

  it('requires both a successful workflow and the published content revision', async () => {
    let count = 0
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        Response.json(
          count++ === 0
            ? { status: 'completed', conclusion: 'success' }
            : { contentRevision: 9 },
        ),
      )
    expect(
      await new GithubSiteBuilder(config, fetcher).check(
        '123',
        7,
        new AbortController().signal,
      ),
    ).toEqual({ status: 'success', deployedRevision: 9 })
  })

  it('does not mark a stale static release as published', async () => {
    let count = 0
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        Response.json(
          count++ === 0
            ? { status: 'completed', conclusion: 'success' }
            : { contentRevision: 6 },
        ),
      )
    expect(
      await new GithubSiteBuilder(config, fetcher).check(
        '123',
        7,
        new AbortController().signal,
      ),
    ).toEqual({ status: 'failed', errorCode: 'SITE_REVISION_MISMATCH' })
  })

  it('reports a build failure while the previous deployed version remains available', async () => {
    const fetcher = (): Promise<Response> =>
      Promise.resolve(
        Response.json({ status: 'completed', conclusion: 'failure' }),
      )
    expect(
      await new GithubSiteBuilder(config, fetcher).check(
        '123',
        7,
        new AbortController().signal,
      ),
    ).toEqual({ status: 'failed', errorCode: 'SITE_WORKFLOW_FAILED' })
  })
})
