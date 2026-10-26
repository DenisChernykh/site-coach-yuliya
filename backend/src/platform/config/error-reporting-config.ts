export interface ErrorReportingConfig {
  readonly environment: string | undefined
  readonly endpoint: string | undefined
  readonly key: string | undefined
  readonly release: string | undefined
}

export function createErrorReportingConfig(): ErrorReportingConfig {
  return {
    environment: process.env['NODE_ENV'],
    endpoint: process.env['MONITOR_URL'],
    key: process.env['MONITOR_KEY'],
    release: process.env['SERVICE_REVISION'],
  }
}
