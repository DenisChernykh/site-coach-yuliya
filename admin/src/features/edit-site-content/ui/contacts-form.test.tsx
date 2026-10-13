import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useContacts, useSocials } from '@/entities/site-content'
import { setCsrfToken, type WriteContactsDto } from '@/shared/api'
import { server } from '@/shared/lib/testing'
import { ContactsForm } from './settings-forms'

function Editor() {
  const contacts = useContacts()
  const socials = useSocials()
  if (!contacts.data || !socials.data) return null
  return <ContactsForm initial={contacts.data} socials={socials.data} />
}

function show() {
  let stored: WriteContactsDto = {
    email: 'coach@example.com',
    phone: '+7 999 123-45-67',
    address: 'Екатеринбург',
    telegramUrl: 'https://t.me/coach',
    links: [
      { id: 'telegram', label: 'Telegram', url: 'https://t.me/coach' },
      { id: 'vk', label: 'ВКонтакте', url: 'https://vk.com/coach' },
    ],
  }
  const writes: WriteContactsDto[] = []
  const origin = window.location.origin
  setCsrfToken('test-csrf')
  server.use(
    http.get(`${origin}/v1/admin/contacts`, () => {
      return HttpResponse.json({
        email: stored.email,
        phone: stored.phone,
        address: stored.address,
        telegramUrl: stored.telegramUrl,
      })
    }),
    http.get(`${origin}/v1/admin/social-links`, () =>
      HttpResponse.json(stored.links),
    ),
    http.put(`${origin}/v1/admin/contacts`, async ({ request }) => {
      stored = (await request.json()) as WriteContactsDto
      writes.push(stored)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([{ path: '/', element: <Editor /> }])
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

describe('contact editing', () => {
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
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await screen.findByText(
        'Изменения сохранены в черновике. Нажмите «Опубликовать сохранённое», чтобы обновить сайт.',
      )
      expect(editor.writes).toHaveLength(1)
      expect(editor.writes[0]).toMatchObject({
        email: null,
        telegramUrl: null,
        phone: '+7 999 123-45-67',
        address: 'Екатеринбург',
      })
      expect(editor.writes[0].links).toContainEqual({
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
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await waitFor(() =>
        expect(screen.queryByText('Не сохранено')).not.toBeInTheDocument(),
      )
      expect(screen.getAllByText('Вывод включён')).toHaveLength(3)
      expect(editor.writes[0].links).toContainEqual({
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
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      expect(
        await screen.findByText('Проверьте заполненные поля и ссылки.'),
      ).toBeVisible()
      expect(editor.writes).toHaveLength(0)
    } finally {
      editor.dispose()
    }
  })
})
