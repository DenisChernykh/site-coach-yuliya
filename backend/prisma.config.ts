import 'dotenv/config'

import { defineConfig } from 'prisma/config'

const databaseUrl =
  process.env['DATABASE_URL'] || process.env['DB_CONNECTION_STRING']

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  ...(databaseUrl === undefined
    ? {}
    : {
        datasource: {
          url: databaseUrl,
        },
      }),
})
