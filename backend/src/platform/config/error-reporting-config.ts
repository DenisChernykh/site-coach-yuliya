export interface ErrorReportingConfig {
  readonly environment: string | undefined
  readonly dsn: string | undefined
  readonly release: string | undefined
}

export function createErrorReportingConfig(): ErrorReportingConfig {
  return {
    environment: process.env['NODE_ENV'],
    dsn: process.env['SENTRY_DSN'],
    release: process.env['SERVICE_REVISION'],
  }
}
