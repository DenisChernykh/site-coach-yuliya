import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ContentValue } from '../model/content-fields'
import { HomeSections } from './home-sections'
import { ContentFields } from './content-fields'

function HomeEditor() {
  const [value, setValue] = useState<ContentValue>({
    hero: { description: 'Первый экран' },
    about: { title: 'О Юлии' },
  })
  return <HomeSections value={value} onChange={setValue} />
}

describe('home editing', () => {
  it('shows one section and preserves edits when switching sections', async () => {
    const user = userEvent.setup()
    render(<HomeEditor />)
    expect(screen.queryByLabelText('Заголовок')).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Описание'))
    await user.type(screen.getByLabelText('Описание'), 'Новый текст')
    await user.click(screen.getByRole('button', { name: 'О специалисте' }))
    expect(screen.getByLabelText('Заголовок')).toHaveValue('О Юлии')
    expect(screen.queryByLabelText('Описание')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Первый экран' }))
    expect(screen.getByLabelText('Описание')).toHaveValue('Новый текст')
  })
  it('generates distinct IDs for new content without asking the editor', async () => {
    const change = vi.fn()
    render(<ContentFields value={[]} field="concerns" onChange={change} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Добавить пункт' }))
    await user.click(screen.getByRole('button', { name: 'Добавить пункт' }))
    const first = change.mock.calls[0][0][0].id
    const second = change.mock.calls[1][0][0].id
    expect(first).toMatch(/^[a-f0-9-]{36}$/u)
    expect(first).not.toBe(second)
    expect(screen.queryByLabelText('Идентификатор')).not.toBeInTheDocument()
  })
})
