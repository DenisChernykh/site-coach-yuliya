import { access } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'

export async function configureAdminUi(
  app: NestExpressApplication,
  directory: string,
): Promise<void> {
  if (directory === '') return
  await access(join(directory, 'index.html'))
  app.useStaticAssets(directory, {
    prefix: '/admin',
    dotfiles: 'deny',
    index: false,
    redirect: false,
    setHeaders: (response: ServerResponse): void => {
      response.setHeader('Cache-Control', 'no-cache')
    },
  })
  app.use(
    '/admin',
    (request: Request, response: Response, next: NextFunction): void => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        next()
        return
      }
      // Missing asset files must stay 404 instead of returning HTML to module imports.
      if (request.path.includes('.')) {
        next()
        return
      }
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Robots-Tag', 'noindex, nofollow')
      response.sendFile(join(directory, 'index.html'))
    },
  )
}
