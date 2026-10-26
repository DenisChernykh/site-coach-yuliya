import { pruneMediaStaging } from '../infrastructure/media-file-retention'
import { LegacyMediaImporter } from '../infrastructure/legacy-media-importer'

import { resolve } from 'node:path'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import { ProcessMediaUploads } from '../application/media-upload.service'
import { PrismaMediaUploadAdapter } from '../infrastructure/prisma-media-upload.adapter'
import { DiskMediaFiles } from '../infrastructure/disk-media-files'
import { SharpMediaProcessor } from '../infrastructure/sharp-media-processor'

export function createMediaProcessCommand(
  database: PrismaClientProvider,
  transaction: TransactionPort,
  directory: string,
): ProcessMediaUploads {
  return new ProcessMediaUploads(
    new PrismaMediaUploadAdapter(database, transaction),
    new SharpMediaProcessor(new DiskMediaFiles(resolve(directory))),
  )
}

export function createMediaImportCommand(
  database: PrismaClientProvider,
  transaction: TransactionPort,
  directory: string,
): { execute(): Promise<number> } {
  return new LegacyMediaImporter(
    database,
    new PrismaMediaUploadAdapter(database, transaction),
    new DiskMediaFiles(resolve(directory)),
  )
}

export function cleanupMediaFiles(
  database: PrismaClientProvider,
  directory: string,
): Promise<void> {
  return pruneMediaStaging(database, resolve(directory))
}
