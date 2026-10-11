export interface CoachSiteRuntimeConfig {
  readonly adminDirectory: string
  readonly telegram: {
    readonly enabled: boolean
    readonly botToken: string
    readonly chatId: string
  }
  readonly publication: {
    readonly enabled: boolean
    readonly repository: string
    readonly ref: string
    readonly token: string
    readonly siteOrigin: string
  }
}

export function buildCoachSiteConfig(
  input: Record<string, unknown>,
): CoachSiteRuntimeConfig {
  const adminDirectory = input['ADMIN_STATIC_DIR'] ?? ''
  if (
    typeof adminDirectory !== 'string' ||
    (adminDirectory !== '' &&
      (!adminDirectory.startsWith('/') ||
        adminDirectory.includes('\0') ||
        adminDirectory.split('/').includes('..')))
  )
    throw new Error('ADMIN_STATIC_DIR must be an absolute directory path')
  const mode = input['TELEGRAM_NOTIFICATIONS_MODE'] ?? 'disabled'
  const token = input['TELEGRAM_BOT_TOKEN'] ?? ''
  const chat = input['TELEGRAM_CHAT_ID'] ?? ''
  if (mode !== 'enabled' && mode !== 'disabled')
    throw new Error('Invalid TELEGRAM_NOTIFICATIONS_MODE')
  if (typeof token !== 'string' || typeof chat !== 'string')
    throw new Error('Invalid Telegram configuration')
  if (
    mode === 'enabled' &&
    (!/^[0-9]+:[A-Za-z0-9_-]{20,}$/u.test(token) ||
      !/^(?:-?[0-9]+|@[A-Za-z0-9_]{5,})$/u.test(chat))
  )
    throw new Error(
      'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required in enabled mode',
    )
  const publicationMode = input['SITE_REBUILD_MODE'] ?? 'disabled'
  const repository = input['GITHUB_REPOSITORY'] ?? ''
  const ref = input['GITHUB_PUBLICATION_REF'] ?? ''
  const githubToken = input['GITHUB_ACTIONS_TOKEN'] ?? ''
  const siteUrl = input['PUBLIC_SITE_URL'] ?? ''
  if (publicationMode !== 'enabled' && publicationMode !== 'disabled')
    throw new Error('Invalid SITE_REBUILD_MODE')
  if (
    typeof repository !== 'string' ||
    typeof ref !== 'string' ||
    typeof githubToken !== 'string' ||
    typeof siteUrl !== 'string'
  )
    throw new Error('Invalid site publication configuration')
  if (
    publicationMode === 'enabled' &&
    (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) ||
      !/^[A-Za-z0-9_./-]{1,200}$/u.test(ref) ||
      ref.includes('..') ||
      githubToken.length < 20 ||
      !/^https:\/\/[a-z0-9.-]+\/?$/iu.test(siteUrl))
  )
    throw new Error(
      'GitHub repository, ref, token and HTTPS site URL are required for automatic publication',
    )
  return Object.freeze({
    adminDirectory,
    telegram: Object.freeze({
      enabled: mode === 'enabled',
      botToken: token,
      chatId: chat,
    }),
    publication: Object.freeze({
      enabled: publicationMode === 'enabled',
      repository,
      ref,
      token: githubToken,
      siteOrigin: siteUrl.replace(/\/$/u, ''),
    }),
  })
}

export function normalizeNetAngelsEnvironment(
  input: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...input,
    ...(input['APP_IP'] === undefined ? {} : { API_HOST: input['APP_IP'] }),
    ...(input['APP_PORT'] === undefined ? {} : { API_PORT: input['APP_PORT'] }),
    ...(input['DATABASE_URL']
      ? {}
      : input['DB_CONNECTION_STRING'] === undefined
        ? {}
        : { DATABASE_URL: input['DB_CONNECTION_STRING'] }),
  }
}
