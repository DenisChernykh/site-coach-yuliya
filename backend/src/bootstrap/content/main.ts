import 'dotenv/config'
import 'reflect-metadata'
import { readFile } from 'node:fs/promises'
import { createContentSeedCommand } from '@/modules/coach-site/composition/content-seed.command'
import { createPostgresCommandRuntimeConfig } from '@/platform/config/postgres-command-config'
import { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaTransactionAdapter } from '@/platform/database/prisma-transaction.adapter'
import { PrismaTransactionContext } from '@/platform/database/prisma-transaction.context'

async function main(): Promise<void> {
  const config = createPostgresCommandRuntimeConfig()
  const context = new PrismaTransactionContext()
  const provider = new PrismaClientProvider(config, context)
  try {
    await provider.connect(
      AbortSignal.timeout(config.database.connectionTimeoutMs),
    )
    const input: unknown = JSON.parse(
      await readFile('content/initial.json', 'utf8'),
    )
    await createContentSeedCommand(
      provider,
      new PrismaTransactionAdapter(provider, context, config),
    ).execute(input)
    process.stdout.write(
      'Initial site content is available. Existing records were preserved.\n',
    )
  } finally {
    await provider.close(AbortSignal.timeout(2000))
  }
}

void main().catch(() => {
  process.stderr.write('Content initialization failed.\n')
  process.exitCode = 1
})
