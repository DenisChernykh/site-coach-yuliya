import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  setCsrfToken,
  type adminSaveCmsDraft,
  type CmsDocumentDto,
} from '@/shared/api'
import { createCmsFixture, server } from '@/shared/lib/testing'
import { SiteEditorPage } from './site-editor-page'

type DraftWrite = Parameters<typeof adminSaveCmsDraft>[0]

function show(
  search = '?settings=contacts',
  overrides: Partial<CmsDocumentDto> = {},
) {
  let stored = createCmsFixture()
  stored.content.contacts = {
    email: 'coach@example.com',
    phone: '+7 999 123-45-67',
    address: 'Екатеринбург',
    telegramUrl: 'https://t.me/coach',
  }
  stored.content.socials = [
    { id: 'telegram', label: 'Telegram', url: 'https://t.me/coach' },
    { id: 'vk', label: 'ВКонтакте', url: 'https://vk.com/coach' },
  ]
  stored.content = { ...stored.content, ...overrides }
  const writes: DraftWrite[] = []
  const origin = window.location.origin
  setCsrfToken('test-csrf')
  server.use(
    http.get(`${origin}/v1/admin/cms`, () => HttpResponse.json(stored)),
    http.put(`${origin}/v1/admin/cms/draft`, async ({ request }) => {
      expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
      const input = (await request.json()) as DraftWrite
      expect(input.revision).toBe(stored.revision)
      writes.push(input)
      stored = {
        ...stored,
        revision: stored.revision + 1,
        content: { ...stored.content, ...input.content },
      }
      return HttpResponse.json(stored)
    }),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(
    [{ path: '/', element: <SiteEditorPage /> }],
    { initialEntries: ['/' + search] },
  )
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return {
    writes,
    dispose: () => {
      client.clear()
      router.dispose()
    },
  }
}

describe('unified CMS editing', () => {
  it('clears a contact and Telegram with one click, preserves other fields, and saves nulls', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      await screen.findByLabelText('Telegram')
      expect(screen.getByRole('status')).toHaveTextContent(
        'Заполнено ссылок: 2 из 18',
      )
      expect(screen.getAllByText('Вывод включён')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Очистить Email' }))
      expect(screen.getByLabelText('Email')).toHaveFocus()
      await user.click(
        screen.getByRole('button', { name: 'Очистить Telegram' }),
      )
      expect(screen.getByLabelText('Telegram')).toHaveFocus()
      expect(screen.getByLabelText('Telegram')).toHaveValue('')
      expect(screen.getByText('Будет скрыто')).toBeVisible()
      expect(
        screen.queryByRole('link', { name: 'Открыть ссылку Telegram' }),
      ).not.toBeInTheDocument()
      expect(screen.getByLabelText('ВКонтакте')).toHaveValue(
        'https://vk.com/coach',
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await screen.findByText(
        'Черновик сохранён. На сайте пока прежняя версия.',
      )
      expect(editor.writes).toHaveLength(1)
      expect(editor.writes[0].content.contacts).toMatchObject({
        email: null,
        telegramUrl: null,
        phone: '+7 999 123-45-67',
        address: 'Екатеринбург',
      })
      expect(editor.writes[0].content.socials).toContainEqual({
        id: 'telegram',
        label: 'Telegram',
        url: null,
      })
      expect(screen.queryByText('Будет скрыто')).not.toBeInTheDocument()
    } finally {
      editor.dispose()
    }
  })

  it('shows network examples and marks a new link as unsaved until saving succeeds', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      const whatsapp = await screen.findByLabelText('WhatsApp')
      expect(whatsapp).toHaveAccessibleDescription(
        /https:\/\/wa.me\/79991234567/u,
      )
      expect(whatsapp).toHaveAccessibleDescription(/без \+, пробелов и скобок/u)
      await user.type(whatsapp, 'https://wa.me/79991234567')
      expect(screen.getByText('Не сохранено')).toBeVisible()
      expect(
        screen.getByRole('link', { name: 'Открыть ссылку WhatsApp' }),
      ).toHaveAttribute('href', 'https://wa.me/79991234567')
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await waitFor(() =>
        expect(screen.queryByText('Не сохранено')).not.toBeInTheDocument(),
      )
      expect(screen.getAllByText('Вывод включён')).toHaveLength(3)
      expect(editor.writes[0].content.socials).toContainEqual({
        id: 'whatsapp',
        label: 'WhatsApp',
        url: 'https://wa.me/79991234567',
      })
    } finally {
      editor.dispose()
    }
  })

  it('does not preview or save a link without a valid HTTPS website address', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      const whatsapp = await screen.findByLabelText('WhatsApp')
      await user.type(whatsapp, 'https://username')
      expect(whatsapp).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByText('Проверьте ссылку')).toBeVisible()
      expect(
        screen.queryByRole('link', { name: 'Открыть ссылку WhatsApp' }),
      ).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      expect(
        await screen.findByText('Проверьте заполненные поля и ссылки.'),
      ).toBeVisible()
      expect(editor.writes).toHaveLength(0)
    } finally {
      editor.dispose()
    }
  })
  it('adds a structured question when FAQ is empty and saves it in the same draft', async () => {
    const editor = show('?page=home&section=faq', { faq: [] })
    try {
      const user = userEvent.setup()
      await user.click(
        await screen.findByRole('button', { name: 'Добавить пункт' }),
      )
      await user.type(
        screen.getByLabelText('Вопрос'),
        'Как проходит знакомство?',
      )
      await user.type(screen.getByLabelText('Ответ'), 'Онлайн, до 30 минут.')
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await screen.findByText(
        'Черновик сохранён. На сайте пока прежняя версия.',
      )
      expect(editor.writes[0].content.faq).toEqual([
        {
          id: expect.any(String),
          question: 'Как проходит знакомство?',
          answer: 'Онлайн, до 30 минут.',
        },
      ])
    } finally {
      editor.dispose()
    }
  })
})
