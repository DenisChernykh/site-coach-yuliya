import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { createElement } from 'react'
import { RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '@/shared/lib/testing'

const apiOrigin = 'http://localhost:3000'
const currentUser = {
  userId: '6a9f79ea-b651-4dc2-870b-c4e9f2da4d58',
  normalizedEmail: 'admin@example.test',
  roleKeys: ['system.admin'],
  permissions: ['site.content.manage', 'site.consultations.manage'],
}
const activeRouters = new Set<{ dispose: () => void }>()
const activeQueryClients = new Set<{ clear: () => void }>()
const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')
function authenticationRequired() {
  return HttpResponse.json(
    {
      type: 'https://nest-js-starter.invalid/problems/authentication-required',
      title: 'Authentication required',
      status: 401,
      detail: 'Valid authentication is required.',
      instance: 'urn:request:expired-session',
      code: 'AUTHENTICATION_REQUIRED',
      requestId: 'expired-session',
    },
    { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
  )
}
async function start(path: string) {
  window.history.replaceState({}, '', path)
  vi.resetModules()
  const [{ router }, { queryClient }, api, session] = await Promise.all([
    import('./router'),
    import('../config/query-client'),
    import('@/shared/api'),
    import('@/entities/session'),
  ])
  activeRouters.add(router)
  activeQueryClients.add(queryClient)
  return { api, queryClient, router, session }
}
function display({ router, queryClient }: Awaited<ReturnType<typeof start>>) {
  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RouterProvider, { router }),
    ),
  )
}
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
  server.use(
    http.get(`${apiOrigin}/v1/admin/social-links`, () => HttpResponse.json([])),
    http.get(`${apiOrigin}/v1/admin/publication`, () =>
      HttpResponse.json({
        status: 'IDLE',
        requestedRevision: 0,
        deployedRevision: 0,
        activeRevision: null,
        attempts: 0,
        automaticPublicationEnabled: false,
        nextAttemptAt: '2026-10-11T00:00:00.000Z',
        requestedAt: null,
        dispatchedAt: null,
        lastErrorCode: null,
        workflowRunId: null,
        workflowUrl: null,
      }),
    ),
  )
})
afterEach(() => {
  for (const router of activeRouters) router.dispose()
  activeRouters.clear()
  for (const client of activeQueryClients) client.clear()
  activeQueryClients.clear()
  if (originalMatchMedia === undefined)
    Reflect.deleteProperty(window, 'matchMedia')
  else Object.defineProperty(window, 'matchMedia', originalMatchMedia)
})
describe('site admin session guard', () => {
  it('redirects a private deep link to login under /admin without requesting private data', async () => {
    let privateRequests = 0
    server.use(
      http.get(`${apiOrigin}/v1/auth/me`, authenticationRequired),
      http.get(`${apiOrigin}/v1/admin/contacts`, () => {
        privateRequests += 1
        return HttpResponse.json({})
      }),
    )
    const application = await start('/admin/contacts')
    display(application)
    await waitFor(() =>
      expect(application.router.state.location.pathname).toBe('/admin/login'),
    )
    expect(
      new URLSearchParams(application.router.state.location.search).get(
        'returnTo',
      ),
    ).toBe('/contacts')
    expect(await screen.findByLabelText('Пароль')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: /создать аккаунт|регистрация/iu }),
    ).not.toBeInTheDocument()
    expect(privateRequests).toBe(0)
  })
  it('checks the live session even when a principal was cached and clears cached credentials', async () => {
    server.use(http.get(`${apiOrigin}/v1/auth/me`, authenticationRequired))
    const application = await start('/admin/articles')
    application.queryClient.setQueryData(
      application.session.currentSessionQueryKey(),
      currentUser,
    )
    application.api.setCsrfToken('cached-csrf-token')
    display(application)
    await waitFor(() =>
      expect(application.router.state.location.pathname).toBe('/admin/login'),
    )
    expect(
      application.queryClient.getQueryData(
        application.session.currentSessionQueryKey(),
      ),
    ).toBeUndefined()
    expect(application.api.peekCsrfToken()).toBeNull()
  })
  it('loads a contact deep link only after authenticating the administrator', async () => {
    const events: string[] = []
    server.use(
      http.get(`${apiOrigin}/v1/auth/me`, () => {
        events.push('session')
        return HttpResponse.json(currentUser)
      }),
      http.get(`${apiOrigin}/v1/admin/contacts`, () => {
        events.push('contacts')
        return HttpResponse.json({
          email: 'coach@example.com',
          phone: null,
          telegramUrl: null,
          address: null,
        })
      }),
    )
    const application = await start('/admin/contacts')
    display(application)
    expect(await screen.findByRole('textbox', { name: 'Email' })).toHaveValue(
      'coach@example.com',
    )
    expect(application.router.state.location.pathname).toBe('/admin/contacts')
    expect(events.indexOf('session')).toBeLessThan(events.indexOf('contacts'))
  })
  it('returns to login when a protected request discovers an expired session', async () => {
    let expired = false
    server.use(
      http.get(`${apiOrigin}/v1/auth/me`, () =>
        expired ? authenticationRequired() : HttpResponse.json(currentUser),
      ),
      http.get(`${apiOrigin}/v1/admin/articles`, () => {
        expired = true
        return authenticationRequired()
      }),
    )
    const application = await start('/admin/articles')
    application.api.setCsrfToken('active-csrf-token')
    display(application)
    await waitFor(() =>
      expect(application.router.state.location.pathname).toBe('/admin/login'),
    )
    expect(
      application.queryClient.getQueryData(
        application.session.currentSessionQueryKey(),
      ),
    ).toBeUndefined()
    expect(application.api.peekCsrfToken()).toBeNull()
  })
})
