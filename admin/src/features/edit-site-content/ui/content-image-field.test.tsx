import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setCsrfToken, type MediaUploadDto } from '@/shared/api'
import { server } from '@/shared/lib/testing'
import { ContentFields } from './content-fields'

function Editor() {
  const [value, setValue] = useState('/images/education/diploma.jpg')
  return (
    <ContentFields
      field="image"
      value={value}
      onChange={(next) => setValue(String(next))}
    />
  )
}
function show() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Editor />
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  setCsrfToken('test-csrf')
  localStorage.clear()
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
describe('content image picker', () => {
  it('keeps the saved image on failure and replaces it only after binary upload completes', async () => {
    let attempts = 0
    let upload: MediaUploadDto
    const chunks: number[] = []
    server.use(
      http.post('*/v1/admin/media-uploads', async ({ request }) => {
        expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
        attempts++
        if (attempts === 1) return HttpResponse.error()
        upload = {
          ...((await request.json()) as MediaUploadDto),
          status: 'UPLOADING',
          attempts: 0,
          error: null,
          output: null,
          receivedChunks: [],
        }
        return HttpResponse.json(upload)
      }),
      http.get('*/v1/admin/media-uploads/:id', () => HttpResponse.json(upload)),
      http.post(
        '*/v1/admin/media-uploads/:id/chunks/:index',
        async ({ request, params }) => {
          expect(request.headers.get('content-type')).toBe(
            'application/octet-stream',
          )
          expect((await request.arrayBuffer()).byteLength).toBeGreaterThan(0)
          chunks.push(Number(params.index))
          return new HttpResponse(null, { status: 204 })
        },
      ),
      http.post('*/v1/admin/media-uploads/:id/complete', () =>
        HttpResponse.json({
          ...upload,
          status: 'READY',
          output: {
            url: '/media/main.webp',
            previewUrl: '/media/preview.webp',
            mobileUrl: '/media/mobile.webp',
            mimeType: 'image/webp',
            size: 6,
            width: 10,
            height: 10,
          },
        }),
      ),
    )
    show()
    const user = userEvent.setup()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const image = screen.getByAltText('Превью: изображение')
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      'diploma.png',
      { type: 'image/png' },
    )
    await user.upload(screen.getByLabelText('Файл: изображение'), file)
    await screen.findByRole('alert')
    expect(image).toHaveAttribute('src', '/images/education/diploma.jpg')
    await user.upload(screen.getByLabelText('Файл: изображение'), file)
    await waitFor(() =>
      expect(image.getAttribute('src')).toMatch(/^\/v1\/story-media\//),
    )
    expect(attempts).toBe(2)
    expect(chunks).toEqual([0])
    await user.click(screen.getByRole('button', { name: 'Убрать изображение' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('recovers a ready upload from the server library after a remount', async () => {
    const media = {
      id: 'a7b563f2-661d-4c18-a842-82b1c3707530',
      name: 'diploma.png',
      mimeType: 'image/png',
      size: 8,
      sha256: 'a'.repeat(64),
      purpose: 'document',
      contextKey: 'saved',
      status: 'READY',
      attempts: 1,
      error: null,
      output: {
        url: '/media/main.webp',
        previewUrl: '/media/preview.webp',
        mobileUrl: '/media/mobile.webp',
        mimeType: 'image/webp',
        size: 6,
        width: 10,
        height: 10,
      },
    }
    server.use(
      http.get('*/v1/admin/media-uploads', () => HttpResponse.json([media])),
    )
    const first = show()
    first.unmount()
    show()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Загруженные файлы' }))
    await user.click(await screen.findByRole('button', { name: 'Выбрать' }))
    expect(screen.getByAltText('Превью: изображение')).toHaveAttribute(
      'src',
      `/v1/story-media/${media.id}`,
    )
  })
})
