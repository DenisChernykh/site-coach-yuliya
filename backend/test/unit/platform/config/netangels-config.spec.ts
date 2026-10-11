import {
  buildCoachSiteConfig,
  normalizeNetAngelsEnvironment,
} from '@/platform/config/coach-site.config'

describe('NetAngels environment', () => {
  it('uses hosting listener bindings and the managed database URL', () => {
    expect(
      normalizeNetAngelsEnvironment({
        APP_IP: '127.0.4.10',
        APP_PORT: '8042',
        API_PORT: '3000',
        DB_CONNECTION_STRING: 'postgresql://example',
      }),
    ).toMatchObject({
      API_HOST: '127.0.4.10',
      API_PORT: '8042',
      DATABASE_URL: 'postgresql://example',
    })
  })
  it('preserves an explicitly configured database', () => {
    expect(
      normalizeNetAngelsEnvironment({
        DATABASE_URL: 'postgresql://explicit',
        DB_CONNECTION_STRING: 'postgresql://hosting',
      })['DATABASE_URL'],
    ).toBe('postgresql://explicit')
  })
  it('keeps unconfigured external integrations disabled locally', () => {
    expect(buildCoachSiteConfig({})).toMatchObject({
      telegram: { enabled: false },
      publication: { enabled: false },
    })
  })
  it('refuses partially configured live notification/publication modes', () => {
    expect(() =>
      buildCoachSiteConfig({ TELEGRAM_NOTIFICATIONS_MODE: 'enabled' }),
    ).toThrow('TELEGRAM_BOT_TOKEN')
    expect(() =>
      buildCoachSiteConfig({ SITE_REBUILD_MODE: 'enabled' }),
    ).toThrow('GitHub repository')
  })
})
