import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import {
  setCsrfToken,
  type ManagedArticleDto,
  type WriteArticleDto,
} from '@/shared/api'
import { createCmsFixture, server } from '@/shared/lib/testing'
import initialContent from '../../../../../backend/content/initial.json'
import { ArticleForm } from './article-form'

const mediaId = 'a7b563f2-661d-4c18-a842-82b1c3707530'
const mediaPath = `/v1/story-media/${mediaId}`
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const image = () => new File([pngBytes], 'cover.png', { type: 'image/png' })

function show(existing = true) {
  const article: ManagedArticleDto = {
    id: 'bd3f9b79-4794-4394-8e41-37b069b0328d',
    content: {
      ...initialContent.articles[0],
      topic: 'finding-work',
      coverImage: 'art',
    },
    published: true,
    sortOrder: 0,
    updatedAt: '2026-10-26T00:00:00.000Z',
  }
  const writes: WriteArticleDto[] = []
  const origin = window.location.origin
  setCsrfToken('test-csrf')
  server.use(
    http.get(`${origin}/v1/admin/cms`, () =>
      HttpResponse.json(createCmsFixture()),
    ),
    http.put(
      `${origin}/v1/admin/articles/${article.id}`,
      async ({ request }) => {
        expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
        const input = (await request.json()) as WriteArticleDto
        writes.push(input)
        return HttpResponse.json({ ...article, ...input })
      },
    ),
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <ArticleForm
          article={existing ? article : undefined}
          onSaved={() => undefined}
        />
      ),
    },
  ])
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return {
    article,
    writes,
    dispose: () => {
      client.clear()
      router.dispose()
    },
  }
}

describe('article cover upload', () => {
  it('previews legacy covers, uploads with CSRF and saves the replacement without losing concurrent text edits', async () => {
    const editor = show()
    const uploads: { csrf: string | null; body: unknown }[] = []
    let finishUpload!: () => void
    const gate = new Promise<void>((resolve) => {
      finishUpload = resolve
    })
    server.use(
      http.post(
        `${window.location.origin}/v1/admin/story-media`,
        async ({ request }) => {
          uploads.push({
            csrf: request.headers.get('x-csrf-token'),
            body: await request.json(),
          })
          await gate
          return HttpResponse.json(
            { id: mediaId, mimeType: 'image/png', type: 'image', size: 8 },
            { status: 201 },
          )
        },
      ),
    )
    try {
      const user = userEvent.setup()
      expect(screen.getByAltText('Превью обложки статьи')).toHaveAttribute(
        'src',
        expect.stringContaining('art.png'),
      )
      expect(screen.queryByDisplayValue('art')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Обложка')).not.toBeInTheDocument()
      await user.upload(screen.getByLabelText('Файл обложки статьи'), image())
      expect(
        screen.getByRole('button', { name: 'Сохранить статью' }),
      ).toBeDisabled()
      expect(
        screen.getByRole('button', { name: 'Заменить обложку' }),
      ).toBeDisabled()
      const title = screen.getByLabelText('Заголовок')
      await user.clear(title)
      await user.type(title, 'Название во время загрузки')
      finishUpload()
      await waitFor(() => expect(uploads).toHaveLength(1))
      expect(uploads[0]).toEqual({
        csrf: 'test-csrf',
        body: {
          name: 'cover.png',
          mimeType: 'image/png',
          base64: 'iVBORw0KGgo=',
        },
      })
      await waitFor(() =>
        expect(screen.getByAltText('Превью обложки статьи')).toHaveAttribute(
          'src',
          mediaPath,
        ),
      )
      await user.click(screen.getByRole('button', { name: 'Сохранить статью' }))
      await screen.findByRole('status')
      expect(editor.writes).toHaveLength(1)
      expect(editor.writes[0].content).toMatchObject({
        coverImage: mediaPath,
        title: 'Название во время загрузки',
        coverAlt: editor.article.content.coverAlt,
      })
    } finally {
      finishUpload()
      editor.dispose()
    }
  })

  it('keeps the previous cover on upload failure and allows retrying the same file', async () => {
    const editor = show()
    let attempts = 0
    server.use(
      http.post(`${window.location.origin}/v1/admin/story-media`, () => {
        attempts++
        return attempts === 1
          ? HttpResponse.error()
          : HttpResponse.json({
              id: mediaId,
              mimeType: 'image/png',
              type: 'image',
              size: 8,
            })
      }),
    )
    try {
      const user = userEvent.setup()
      const file = image()
      const previous = screen
        .getByAltText('Превью обложки статьи')
        .getAttribute('src')
      await user.upload(screen.getByLabelText('Файл обложки статьи'), file)
      await screen.findByRole('alert')
      expect(screen.getByAltText('Превью обложки статьи')).toHaveAttribute(
        'src',
        previous,
      )
      await user.upload(screen.getByLabelText('Файл обложки статьи'), file)
      await waitFor(() =>
        expect(screen.getByAltText('Превью обложки статьи')).toHaveAttribute(
          'src',
          mediaPath,
        ),
      )
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(attempts).toBe(2)
    } finally {
      editor.dispose()
    }
  })

  it('starts new articles without a demo cover and rejects videos and oversized images before sending', async () => {
    const editor = show(false)
    try {
      const user = userEvent.setup({ applyAccept: false })
      expect(
        screen.getByRole('button', { name: 'Загрузить обложку' }),
      ).toBeEnabled()
      expect(
        screen.queryByAltText('Превью обложки статьи'),
      ).not.toBeInTheDocument()
      await user.upload(
        screen.getByLabelText('Файл обложки статьи'),
        new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Выберите изображение JPG, PNG или WebP.',
      )
      await user.upload(
        screen.getByLabelText('Файл обложки статьи'),
        new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'large.png', {
          type: 'image/png',
        }),
      )
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Файл слишком большой',
      )
      expect(
        screen.getByRole('button', { name: 'Сохранить статью' }),
      ).toBeEnabled()
    } finally {
      editor.dispose()
    }
  })
})
