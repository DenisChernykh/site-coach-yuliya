import 'dotenv/config'
import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { mediaDirectoryFromEnvironment } from '@/platform/config/coach-site.config'
import {
  createMediaProcessCommand,
  createMediaImportCommand,
  cleanupMediaFiles,
} from '@/modules/coach-site/composition/media-process.command'
import { createPostgresCommandRuntimeConfig } from '@/platform/config/postgres-command-config'
import { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { PrismaTransactionAdapter } from '@/platform/database/prisma-transaction.adapter'
import { PrismaTransactionContext } from '@/platform/database/prisma-transaction.context'

async function main(): Promise<void> {
  const config = createPostgresCommandRuntimeConfig()
  const directory = mediaDirectoryFromEnvironment() || resolve('var/media')
  const context = new PrismaTransactionContext()
  const database = new PrismaClientProvider(config, context)
  try {
    await database.connect(
      AbortSignal.timeout(config.database.connectionTimeoutMs),
    )
    if (process.argv.includes('--import-legacy')) {
      const imported = await createMediaImportCommand(
        database,
        new PrismaTransactionAdapter(database, context, config),
        directory,
      ).execute()
      process.stdout.write(`Imported ${imported} legacy media files.\n`)
      return
    }
    const processed = await createMediaProcessCommand(
      database,
      new PrismaTransactionAdapter(database, context, config),
      directory,
    ).run(randomUUID())
    await cleanupMediaFiles(database, directory)
    process.stdout.write(`Processed ${processed} media jobs.\n`)
  } finally {
    await database.close(AbortSignal.timeout(3000))
  }
}
void main().catch(() => {
  process.stderr.write('Media processing failed; queued jobs are retained.\n')
  process.exitCode = 1
})
