import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { useSeo } from '@/entities/site-content'
import { setCsrfToken, type SeoSettingsDto } from '@/shared/api'
import { server } from '@/shared/lib/testing'
import initialContent from '../../../../../backend/content/initial.json'
import { SeoForm } from './seo-form'

function Editor() {
  const query = useSeo()
  return query.data ? <SeoForm initial={query.data} /> : null
}

function show() {
  let stored: SeoSettingsDto = structuredClone(initialContent.seo)
  const writes: SeoSettingsDto[] = []
  const origin = window.location.origin
  setCsrfToken('test-csrf')
  server.use(
    http.get(`${origin}/v1/admin/seo`, () => HttpResponse.json(stored)),
    http.put(`${origin}/v1/admin/seo`, async ({ request }) => {
      expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
      stored = (await request.json()) as SeoSettingsDto
      writes.push(stored)
      return HttpResponse.json(stored)
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

describe('SEO editor', () => {
  it('uploads social images without URL fields and preserves text edits while waiting', async () => {
    const editor = show()
    const id = 'a7b563f2-661d-4c18-a842-82b1c3707530'
    let finishUpload!: () => void
    const gate = new Promise<void>((resolve) => {
      finishUpload = resolve
    })
    server.use(
      http.post(
        `${window.location.origin}/v1/admin/media-uploads`,
        async ({ request }) => {
          expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
          await gate
          return HttpResponse.json({
            id,
            mimeType: 'image/png',
            type: 'image',
            status: 'READY',
            output: { mimeType: 'image/webp', size: 8 },
            size: 8,
          })
        },
      ),
    )
    try {
      const user = userEvent.setup()
      const input = await screen.findByLabelText(
        'Файл: общее изображение для соцсетей',
      )
      expect(
        screen.queryByRole('textbox', {
          name: 'Общее изображение для соцсетей',
        }),
      ).not.toBeInTheDocument()
      const file = new File(
        [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
        'social.png',
        { type: 'image/png' },
      )
      await user.upload(input, file)
      expect(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      ).toBeDisabled()
      expect(screen.getByLabelText('Страница')).toBeDisabled()
      const title = screen.getByLabelText('Название сайта')
      await user.clear(title)
      await user.type(title, 'Название во время загрузки')
      finishUpload()
      await waitFor(() =>
        expect(
          screen.getByAltText('Превью: общее изображение для соцсетей'),
        ).toHaveAttribute('src', `/v1/story-media/${id}`),
      )
      await user.click(
        screen.getByText('Превью в социальных сетях', { exact: true }),
      )
      expect(
        screen.queryByRole('textbox', {
          name: 'Изображение для соцсетей',
        }),
      ).not.toBeInTheDocument()
      await user.upload(
        screen.getByLabelText('Файл: изображение для соцсетей'),
        file,
      )
      await waitFor(() =>
        expect(
          screen.getByAltText('Превью: изображение для соцсетей'),
        ).toHaveAttribute('src', `/v1/story-media/${id}`),
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await waitFor(() => expect(editor.writes).toHaveLength(1))
      expect(editor.writes[0]).toMatchObject({
        siteName: 'Название во время загрузки',
        defaultImage: `/v1/story-media/${id}`,
        pages: { home: { ogImage: `/v1/story-media/${id}` } },
      })
      await user.click(
        screen.getByRole('button', { name: 'Использовать общее изображение' }),
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await waitFor(() => expect(editor.writes).toHaveLength(2))
      expect(editor.writes[1].pages.home.ogImage).toBe('')
    } finally {
      finishUpload()
      editor.dispose()
    }
  })

  it('preserves edits while switching pages and saves the complete SEO with CSRF', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      const title = await screen.findByLabelText('SEO-заголовок')
      await user.clear(title)
      await user.type(title, 'Новый заголовок главной')
      expect(screen.getByLabelText('Пример в поиске')).toHaveTextContent(
        'Новый заголовок главной',
      )
      await user.selectOptions(screen.getByLabelText('Страница'), 'contacts')
      const description = screen.getByLabelText('SEO-описание')
      await user.clear(description)
      await user.type(description, 'Запись на коучинг онлайн')
      await user.click(
        screen.getByLabelText('Скрыть эту страницу от поисковых систем'),
      )
      await user.selectOptions(screen.getByLabelText('Страница'), 'home')
      expect(screen.getByLabelText('SEO-заголовок')).toHaveValue(
        'Новый заголовок главной',
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await screen.findByRole('status')
      expect(editor.writes).toHaveLength(1)
      expect(editor.writes[0].pages.home.title).toBe('Новый заголовок главной')
      expect(editor.writes[0].pages.contacts).toMatchObject({
        description: 'Запись на коучинг онлайн',
        noIndex: true,
      })
      expect(editor.writes[0].pages.about).toEqual(
        initialContent.seo.pages.about,
      )
      expect(editor.writes[0].siteUrl).toBeNull()
    } finally {
      editor.dispose()
    }
  })

  it('rejects an invalid site address and lets the domain be cleared back to null', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      const address = await screen.findByLabelText('Основной адрес сайта')
      await user.type(address, 'https://coach.example.com/path')
      await user.click(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      expect(
        await screen.findByText('Проверьте заполненные поля и ссылки.'),
      ).toBeVisible()
      expect(editor.writes).toHaveLength(0)
      await user.clear(address)
      await user.click(
        screen.getByRole('button', { name: 'Сохранить изменения' }),
      )
      await screen.findByRole('status')
      expect(editor.writes[0].siteUrl).toBeNull()
    } finally {
      editor.dispose()
    }
  })
})
