import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { setCsrfToken } from '@/shared/api'
import { server } from '@/shared/lib/testing'
import { ContentFields } from './content-fields'

const mediaPath = '/v1/story-media/a7b563f2-661d-4c18-a842-82b1c3707530'
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

describe('content image picker', () => {
  it('offers file upload without an address field, preserves the image on failure, then replaces and clears it', async () => {
    setCsrfToken('test-csrf')
    let attempts = 0
    server.use(
      http.post(
        `${window.location.origin}/v1/admin/story-media`,
        ({ request }) => {
          expect(request.headers.get('x-csrf-token')).toBe('test-csrf')
          attempts++
          return attempts === 1
            ? HttpResponse.error()
            : HttpResponse.json({
                id: mediaPath.split('/').at(-1),
                mimeType: 'image/png',
                type: 'image',
                size: 8,
              })
        },
      ),
    )
    render(<Editor />)
    const user = userEvent.setup()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const image = screen.getByAltText('Превью: изображение')
    expect(image).toHaveAttribute('src', '/images/education/diploma.jpg')
    const file = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
      'diploma.png',
      { type: 'image/png' },
    )
    await user.upload(screen.getByLabelText('Файл: изображение'), file)
    await screen.findByRole('alert')
    expect(image).toHaveAttribute('src', '/images/education/diploma.jpg')
    await user.upload(screen.getByLabelText('Файл: изображение'), file)
    await waitFor(() => expect(image).toHaveAttribute('src', mediaPath))
    expect(attempts).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Убрать изображение' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Загрузить изображение' }),
    ).toBeEnabled()
  })
})
