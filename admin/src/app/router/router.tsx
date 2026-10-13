import { createBrowserRouter, Navigate } from 'react-router'

import { clearCurrentSession, currentSessionQueryKey } from '@/entities/session'
import { ConsultationsPage } from '@/pages/consultations'
import { ArticlesPage, ProgramsPage } from '@/pages/content-library'
import { SiteEditorPage } from '@/pages/site-editor'
import { SeoPage } from '@/pages/seo'
import { LoginPage } from '@/pages/login'
import { authGetMe } from '@/shared/api'
import { loginPath } from '@/shared/routes'

import { queryClient } from '../config/query-client'
import {
  createRedirectAuthenticatedLoader,
  createRequireSessionLoader,
} from './loaders'
import { RouteError } from './route-error'
import { ProtectedLayout } from './protected-layout'

async function loadSession(signal: AbortSignal) {
  const session = await authGetMe(undefined, signal)
  if (signal.aborted) {
    throw new DOMException('The session request was aborted', 'AbortError')
  }
  queryClient.setQueryData(currentSessionQueryKey(), session)
  return session
}

/**
 * Маршрутизатор приложения с общей защитой приватных маршрутов.
 *
 * @remarks Loader protected parent сохраняет успешно загруженную сессию в React
 * Query cache до монтирования dashboard и approval pages. Маршрут `/login`
 * остаётся sibling и перенаправляет уже аутентифицированного пользователя на
 * дашборд.
 */
export const router = createBrowserRouter(
  [
    {
      path: '/',
      loader: createRequireSessionLoader({
        load: loadSession,
        clear: () => clearCurrentSession(queryClient),
      }),
      element: <ProtectedLayout />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <p className="p-6 text-sm">Проверяем доступ…</p>,
      children: [
        { index: true, element: <ConsultationsPage /> },
        { path: 'editor', element: <SiteEditorPage /> },
        { path: 'articles', element: <ArticlesPage /> },
        { path: 'programs', element: <ProgramsPage /> },
        {
          path: 'contacts',
          element: <Navigate to="/editor?settings=contacts" replace />,
        },
        { path: 'home', element: <Navigate to="/editor?page=home" replace /> },
        {
          path: 'faq',
          element: <Navigate to="/editor?page=home&section=faq" replace />,
        },
        {
          path: 'socials',
          element: <Navigate to="/editor?settings=contacts" replace />,
        },
        {
          path: 'site',
          element: <Navigate to="/editor?settings=site" replace />,
        },
        { path: 'seo', element: <SeoPage /> },
      ],
    },
    {
      path: loginPath,
      loader: createRedirectAuthenticatedLoader({ load: loadSession }),
      element: <LoginPage />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <p className="p-6 text-sm">Проверяем доступ…</p>,
    },
  ],
  { basename: '/admin' },
)
