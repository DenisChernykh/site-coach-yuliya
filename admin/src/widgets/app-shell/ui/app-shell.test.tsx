import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { currentSessionQueryKey } from '@/entities/session'
import type { CurrentUserResponseDto } from '@/shared/api'

vi.mock('@/features/publish-site', () => ({
  PublicationStatus: () => <p>Статус публикации</p>,
}))

import { AppShell } from './app-shell'

const currentUser: CurrentUserResponseDto = {
  userId: '8dc70a15-d91f-4c67-b5a6-479faa42433c',
  normalizedEmail: 'admin@example.com',
  roleKeys: ['admin'],
  permissions: ['site.content.manage', 'site.consultations.manage'],
}

const originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'innerWidth',
)
const originalMatchMediaDescriptor = Object.getOwnPropertyDescriptor(
  window,
  'matchMedia',
)

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: width < 768,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function expectOriginalViewportDescriptors() {
  expect(Object.getOwnPropertyDescriptor(window, 'innerWidth')).toEqual(
    originalInnerWidthDescriptor,
  )
  expect(Object.getOwnPropertyDescriptor(window, 'matchMedia')).toEqual(
    originalMatchMediaDescriptor,
  )
}

function restoreWindowProperty(
  property: 'innerWidth' | 'matchMedia',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor === undefined) {
    Reflect.deleteProperty(window, property)
  } else {
    Object.defineProperty(window, property, descriptor)
  }
}

function renderAppShell(
  initialEntry = '/',
  user: typeof currentUser = currentUser,
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(currentSessionQueryKey(), user)
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <AppShell>
            <p>Содержимое маршрута</p>
          </AppShell>
        ),
      },
      { path: '/login', element: <p>Вход</p> },
    ],
    { initialEntries: [initialEntry] },
  )

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

function getMenuButton(name: string) {
  const link = screen.getByRole('link', { name })
  const menuButton = link.closest('[data-sidebar="menu-button"]')

  if (menuButton === null) {
    throw new Error(`Не найдена кнопка меню для ${name}.`)
  }

  return menuButton
}

describe('AppShell', () => {
  beforeEach(() => {
    setViewport(1024)
  })

  afterEach(() => {
    restoreWindowProperty('innerWidth', originalInnerWidthDescriptor)
    restoreWindowProperty('matchMedia', originalMatchMediaDescriptor)
    expectOriginalViewportDescriptors()
  })

  it('renders consultation and content navigation on desktop', () => {
    renderAppShell()

    expect(screen.getByRole('link', { name: 'Заявки' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Статьи' })).toBeVisible()
  })

  it('shows content navigation with the content permission', () => {
    renderAppShell('/contacts', {
      ...currentUser,
      permissions: ['site.content.manage'],
    })

    expect(screen.getByRole('link', { name: 'Контакты' })).toBeVisible()
    expect(getMenuButton('Контакты')).toHaveAttribute('data-active')
  })

  it('hides content navigation without the content permission', () => {
    renderAppShell('/contacts', { ...currentUser, permissions: [] })

    expect(
      screen.queryByRole('link', { name: 'Контакты' }),
    ).not.toBeInTheDocument()
  })

  it('marks only consultations active at the exact root route', () => {
    renderAppShell('/')

    expect(getMenuButton('Заявки')).toHaveAttribute('data-active')
    expect(getMenuButton('Статьи')).not.toHaveAttribute('data-active')
  })

  it('marks articles active on its route', () => {
    renderAppShell('/articles')

    expect(getMenuButton('Заявки')).not.toHaveAttribute('data-active')
    expect(getMenuButton('Статьи')).toHaveAttribute('data-active')
  })

  it('renders the current session and logout action in the sidebar footer', () => {
    renderAppShell()

    const footer = document.querySelector<HTMLElement>(
      '[data-sidebar="footer"]',
    )

    if (footer === null) {
      throw new Error('Не найден footer sidebar.')
    }

    expect(within(footer).getByText(currentUser.normalizedEmail)).toBeVisible()
    expect(within(footer).getByRole('button', { name: 'Выйти' })).toBeVisible()
  })

  it('gives the sidebar trigger an accessible Russian name', () => {
    renderAppShell()

    expect(
      screen.getByRole('button', { name: 'Открыть навигацию' }),
    ).toBeVisible()
  })

  it.each([
    { path: '/', width: 1024, context: 'Заявки' },
    {
      path: '/articles',
      width: 390,
      context: 'Статьи',
    },
  ])(
    'shows the $context route context in the $width px header',
    ({ path, width, context }) => {
      setViewport(width)
      renderAppShell(path)

      expect(
        within(screen.getByRole('banner')).getByText(context),
      ).toBeVisible()
    },
  )

  it('renders children in the shell main content', () => {
    renderAppShell()

    const mainLandmarks = screen.getAllByRole('main')
    expect(mainLandmarks).toHaveLength(1)

    const mainContent = mainLandmarks[0].querySelector<HTMLElement>(
      '[data-slot="container"]',
    )

    if (mainContent === null) {
      throw new Error('Не найден main-контейнер shell.')
    }

    expect(within(mainContent).getByText('Содержимое маршрута')).toBeVisible()
  })

  it('opens mobile navigation and closes the sheet after navigation', async () => {
    setViewport(390)
    const user = userEvent.setup()
    renderAppShell()

    await user.click(screen.getByRole('button', { name: 'Открыть навигацию' }))

    const navigationSheet = await screen.findByRole('dialog', {
      name: 'Навигация',
    })
    expect(navigationSheet).toHaveAccessibleDescription(
      'Основная навигация приложения.',
    )
    await user.click(
      within(navigationSheet).getByRole('link', { name: 'Статьи' }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes mobile navigation after navigating to contacts', async () => {
    setViewport(390)
    const user = userEvent.setup()
    renderAppShell('/', {
      ...currentUser,
      permissions: ['site.content.manage'],
    })

    await user.click(screen.getByRole('button', { name: 'Открыть навигацию' }))
    const navigationSheet = await screen.findByRole('dialog', {
      name: 'Навигация',
    })
    await user.click(
      within(navigationSheet).getByRole('link', { name: 'Контакты' }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes mobile navigation with Escape and restores trigger focus', async () => {
    setViewport(390)
    const user = userEvent.setup()
    renderAppShell('/articles')
    const trigger = screen.getByRole('button', {
      name: 'Открыть навигацию',
    })

    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })
})
