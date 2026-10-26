import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { AppProvider } from '@/app/config/app-provider'
import { router } from '@/app/router/router'
import '@/app/styles/index.css'
import { initializeMonitoring, reportError } from '@/shared/monitoring'

initializeMonitoring()

createRoot(document.getElementById('root')!, {
  onUncaughtError: (error) => reportError(error),
}).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
)
