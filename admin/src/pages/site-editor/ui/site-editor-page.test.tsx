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
    {
      id: 'telegram',
      label: 'Telegram-канал',
      url: 'https://t.me/coach_channel',
    },
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
  it('keeps story order and hidden slides in the saved draft', async () => {
    const id = 'b66d592e-b32e-4ea0-9876-74cacd4f5a25'
    const fixture = createCmsFixture()
    const slide = {
      id,
      mediaId: id,
      type: 'image' as const,
      caption: 'Первая подпись',
      durationSeconds: 5,
      linkLabel: '',
      linkUrl: '',
      enabled: true,
    }
    const first = {
      id,
      title: 'Знакомство',
      coverMediaId: id,
      enabled: true,
      slides: [
        slide,
        {
          ...slide,
          id: '06246e15-0669-427b-93c6-ab54c8d3f4cc',
          caption: 'Вторая подпись',
        },
      ],
    }
    const second = {
      ...first,
      id: 'bca228ab-149d-4783-97fa-a6908dbd93ac',
      title: 'Отзывы',
      slides: [],
    }
    const editor = show('?settings=stories', {
      home: { ...fixture.content.home, stories: [first, second] },
    })
    try {
      const user = userEvent.setup()
      await screen.findByLabelText('Название подборки')
      await user.click(
        screen.getByRole('button', { name: 'Опустить подборку «Знакомство»' }),
      )
      await user.click(screen.getByRole('button', { name: 'Опустить слайд 1' }))
      await user.click(
        screen.getByRole('switch', { name: 'Показывать слайд 1' }),
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await screen.findByText(
        'Черновик сохранён. На сайте пока прежняя версия.',
      )
      const stories = editor.writes[0].content.home.stories!
      expect(stories.map((story) => story.title)).toEqual([
        'Отзывы',
        'Знакомство',
      ])
      expect(
        stories[1].slides.map((item) => [item.caption, item.enabled]),
      ).toEqual([
        ['Вторая подпись', false],
        ['Первая подпись', true],
      ])
    } finally {
      editor.dispose()
    }
  })
  it('explains page and section destinations and preserves a manually edited anchor in the draft', async () => {
    const editor = show('?settings=site')
    try {
      const user = userEvent.setup()
      await screen.findByLabelText('Имя')
      const links = screen.getAllByRole('textbox', {
        name: 'Ссылка',
      }) as HTMLInputElement[]
      const about = links.find((input) => input.value === '/about/')!
      const approach = links.find((input) => input.value === '/#approach')!
      expect(about).toHaveAccessibleDescription('Отдельная страница «Обо мне».')
      expect(approach).toHaveAccessibleDescription(
        'Секция «Подход» на главной странице.',
      )
      await user.clear(about)
      await user.type(about, '/about/#approach')
      expect(about).toHaveAccessibleDescription(
        /Якорь ведёт к секции страницы/u,
      )
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await screen.findByText(
        'Черновик сохранён. На сайте пока прежняя версия.',
      )
      expect(editor.writes[0].content.site.navigation).toContainEqual({
        label: 'Обо мне',
        href: '/about/#approach',
      })
    } finally {
      editor.dispose()
    }
  })

  it('opens the shared contacts tab from the contact page without a duplicate inspector form', async () => {
    const editor = show('?page=contacts&section=details')
    try {
      const user = userEvent.setup()
      await screen.findByRole('heading', { name: 'Способы связи', level: 2 })
      expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('button', { name: 'Открыть контакты и соцсети' }),
      )
      expect(
        screen.getByRole('tab', { name: 'Контакты и соцсети' }),
      ).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByLabelText('Email')).toHaveValue('coach@example.com')
      expect(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      ).toBeDisabled()
      await user.click(screen.getByRole('tab', { name: 'Страницы' }))
      expect(
        screen.getByRole('heading', { name: 'Способы связи', level: 2 }),
      ).toBeVisible()
    } finally {
      editor.dispose()
    }
  })

  it('keeps edits across workspace tabs and saves site settings, contacts and section visibility in one draft', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      await screen.findByLabelText('Email')
      await user.clear(screen.getByLabelText('Email'))
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.click(screen.getByRole('tab', { name: 'Настройки сайта' }))
      await user.clear(screen.getByLabelText('Имя'))
      await user.type(screen.getByLabelText('Имя'), 'Новое имя')
      await user.click(screen.getByRole('tab', { name: 'Страницы' }))
      expect(
        screen.getByRole('switch', { name: 'Показывать: Первый экран' }),
      ).toBeDisabled()
      expect(
        screen.queryByRole('button', {
          name: 'Переместить секцию: Первый экран',
        }),
      ).not.toBeInTheDocument()
      await user.click(
        screen.getByRole('switch', { name: 'Показывать: Запросы' }),
      )
      await user.click(screen.getByRole('tab', { name: 'Контакты и соцсети' }))
      expect(screen.getByLabelText('Email')).toHaveValue('new@example.com')
      await user.click(screen.getByRole('tab', { name: 'Настройки сайта' }))
      expect(screen.getByLabelText('Имя')).toHaveValue('Новое имя')
      expect(
        screen.getByRole('button', { name: 'Опубликовать' }),
      ).toBeDisabled()
      await user.click(
        screen.getByRole('button', { name: 'Сохранить черновик' }),
      )
      await screen.findByText(
        'Черновик сохранён. На сайте пока прежняя версия.',
      )
      expect(editor.writes).toHaveLength(1)
      expect(editor.writes[0].content.contacts?.email).toBe('new@example.com')
      expect(editor.writes[0].content.site?.name).toBe('Новое имя')
      const home = editor.writes[0].content.pages?.find(
        (page) => page.key === 'home',
      )
      expect(home?.blocks[0]).toMatchObject({ id: 'hero', enabled: true })
      expect(
        home?.blocks.find((block) => block.id === 'concerns')?.enabled,
      ).toBe(false)
    } finally {
      editor.dispose()
    }
  })

  it('supports keyboard navigation between the visible workspace tabs', async () => {
    const editor = show('?settings=site')
    try {
      const user = userEvent.setup()
      const settings = await screen.findByRole('tab', {
        name: 'Настройки сайта',
      })
      settings.focus()
      await user.keyboard('{ArrowRight}{Enter}')
      expect(
        screen.getByRole('tab', { name: 'Контакты и соцсети' }),
      ).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByLabelText('Email')).toBeVisible()
      expect(
        screen.queryByRole('heading', { name: 'Настройки сайта', level: 2 }),
      ).not.toBeInTheDocument()
    } finally {
      editor.dispose()
    }
  })

  it('clears a contact and Telegram with one click, preserves other fields, and saves nulls', async () => {
    const editor = show()
    try {
      const user = userEvent.setup()
      await screen.findByLabelText('Telegram-канал')
      expect(screen.getByRole('status')).toHaveTextContent(
        'Заполнено ссылок: 2 из 18',
      )
      expect(screen.getAllByText('Вывод включён')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Очистить Email' }))
      expect(screen.getByLabelText('Email')).toHaveFocus()
      await user.click(
        screen.getByRole('button', { name: 'Очистить Telegram-канал' }),
      )
      expect(screen.getByLabelText('Telegram-канал')).toHaveFocus()
      expect(screen.getByLabelText('Telegram-канал')).toHaveValue('')
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
        telegramUrl: 'https://t.me/coach',
        phone: '+7 999 123-45-67',
        address: 'Екатеринбург',
      })
      expect(editor.writes[0].content.socials).toContainEqual({
        id: 'telegram',
        label: 'Telegram-канал',
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
