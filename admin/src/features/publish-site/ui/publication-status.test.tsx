import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/shared/lib/testing'
import { setCsrfToken } from '@/shared/api'
import { PublicationStatus } from './publication-status'

function show(status = 'IDLE', enabled = true) {
  server.use(
    http.get('http://localhost:3000/v1/admin/publication', () =>
      HttpResponse.json({
        status,
        automaticPublicationEnabled: enabled,
        requestedRevision: 1,
        deployedRevision: 1,
        workflowUrl: null,
      }),
    ),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([
    { path: '/', element: <PublicationStatus /> },
  ])
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { client, router }
}

describe('website update action', () => {
  it('offers a manual update even when the website is up to date', async () => {
    let requested = 0
    setCsrfToken('test-csrf')
    server.use(
      http.post('http://localhost:3000/v1/admin/publication/retry', () => {
        requested += 1
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { client, router } = show()
    try {
      await userEvent
        .setup()
        .click(await screen.findByRole('button', { name: 'Обновить сайт' }))
      await waitFor(() => expect(requested).toBe(1))
    } finally {
      client.clear()
      router.dispose()
    }
  })
  it.each([
    ['BUILDING', true],
    ['IDLE', false],
  ])(
    'disables the action for %s with publication %s',
    async (status, enabled) => {
      const { client, router } = show(status as string, enabled as boolean)
      try {
        expect(
          await screen.findByRole('button', { name: 'Обновить сайт' }),
        ).toBeDisabled()
      } finally {
        client.clear()
        router.dispose()
      }
    },
  )
})
