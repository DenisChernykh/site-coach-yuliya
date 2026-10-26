import { resolve } from 'node:path'
import { MediaUploadService } from '../application/media-upload.service'
import { PrismaMediaUploadAdapter } from '../infrastructure/prisma-media-upload.adapter'
import { DiskMediaFiles } from '../infrastructure/disk-media-files'
import { MediaUploadController } from '../presentation/media-upload.controller'
import {
  TRANSACTION_PORT,
  type TransactionPort,
} from '@/shared/application/transaction.port'
import { Module, type DynamicModule } from '@nestjs/common'
import type { CoachSiteRuntimeConfig } from '@/platform/config/coach-site.config'
import { RuntimeConfigService } from '@/platform/config/runtime-config.service'
import { DatabaseModule } from '@/platform/database/database.module'
import { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import { LifecycleModule } from '@/platform/lifecycle/lifecycle.module'
import { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import {
  STRUCTURED_LOGGER,
  type StructuredLogger,
} from '@/platform/logging/logging.contracts'
import { SiteContentService } from '../application/content.service'
import { SiteCmsService } from '../application/cms.service'
import { PrismaCmsAdapter } from '../infrastructure/prisma-cms.adapter'
import { DraftContentAdapter } from '../infrastructure/draft-content.adapter'
import { PrismaStoryMediaAdapter } from '../infrastructure/prisma-story-media.adapter'
import { StoryMediaService } from '../application/story-media.service'
import {
  AdminStoryMediaController,
  PublicStoryMediaController,
} from '../presentation/story-media.controller'
import {
  CmsController,
  PublicCmsController,
} from '../presentation/cms.controller'
import {
  ConsultationsService,
  DeliverTelegramNotifications,
} from '../application/consultations.service'
import { PrismaSiteContentAdapter } from '../infrastructure/prisma-content.adapter'
import { PrismaConsultationsAdapter } from '../infrastructure/prisma-consultations.adapter'
import { PostgresConsultationLimiter } from '../infrastructure/postgres-consultation-limiter'
import { TelegramAdapter } from '../infrastructure/telegram.adapter'
import { TelegramNotificationRunner } from '../infrastructure/telegram-runner'
import { PublishSiteContent } from '../application/publication.service'
import { PrismaPublicationAdapter } from '../infrastructure/prisma-publication.adapter'
import { GithubSiteBuilder } from '../infrastructure/github-site-builder'
import { SitePublicationRunner } from '../infrastructure/site-publication-runner'
import {
  PublicationController,
  PUBLICATION_PRESENTATION_CONFIG,
} from '../presentation/publication.controller'
import { PublicSiteController } from '../presentation/public.controller'
import {
  AdminContentController,
  AdminConsultationsController,
} from '../presentation/admin.controller'

@Module({})
export class CoachSiteModule {
  public static forRoot(config: CoachSiteRuntimeConfig): DynamicModule {
    return {
      module: CoachSiteModule,
      imports: [DatabaseModule, LifecycleModule],
      controllers: [
        AdminStoryMediaController,
        MediaUploadController,
        PublicStoryMediaController,
        PublicSiteController,
        AdminContentController,
        AdminConsultationsController,
        PublicationController,
        CmsController,
        PublicCmsController,
      ],
      providers: [
        {
          provide: DiskMediaFiles,
          useFactory: () =>
            new DiskMediaFiles(config.mediaDirectory ?? resolve('var/media')),
        },
        {
          provide: PrismaMediaUploadAdapter,
          inject: [PrismaClientProvider, TRANSACTION_PORT],
          useFactory: (db: PrismaClientProvider, tx: TransactionPort) =>
            new PrismaMediaUploadAdapter(db, tx),
        },
        {
          provide: MediaUploadService,
          inject: [PrismaMediaUploadAdapter, DiskMediaFiles],
          useFactory: (
            store: PrismaMediaUploadAdapter,
            files: DiskMediaFiles,
          ) => new MediaUploadService(store, files),
        },
        {
          provide: PrismaStoryMediaAdapter,
          inject: [PrismaClientProvider],
          useFactory: (database: PrismaClientProvider) =>
            new PrismaStoryMediaAdapter(database),
        },
        {
          provide: StoryMediaService,
          inject: [PrismaStoryMediaAdapter],
          useFactory: (media: PrismaStoryMediaAdapter) =>
            new StoryMediaService(media),
        },
        {
          provide: PrismaCmsAdapter,
          inject: [
            PrismaClientProvider,
            TRANSACTION_PORT,
            PrismaSiteContentAdapter,
          ],
          useFactory: (
            database: PrismaClientProvider,
            transaction: TransactionPort,
            legacy: PrismaSiteContentAdapter,
          ) => new PrismaCmsAdapter(database, transaction, legacy),
        },
        {
          provide: SiteCmsService,
          inject: [PrismaCmsAdapter, StoryMediaService],
          useFactory: (cms: PrismaCmsAdapter, media: StoryMediaService) =>
            new SiteCmsService(cms, new DraftContentAdapter(cms), media),
        },
        {
          provide: PUBLICATION_PRESENTATION_CONFIG,
          useValue: {
            enabled: config.publication.enabled,
            repository: config.publication.repository,
          },
        },
        {
          provide: PrismaPublicationAdapter,
          inject: [PrismaClientProvider, TRANSACTION_PORT, STRUCTURED_LOGGER],
          useFactory: (
            database: PrismaClientProvider,
            transaction: TransactionPort,
            logger: StructuredLogger,
          ): PrismaPublicationAdapter =>
            new PrismaPublicationAdapter(database, transaction, logger),
        },
        {
          provide: GithubSiteBuilder,
          useFactory: (): GithubSiteBuilder =>
            new GithubSiteBuilder(config.publication),
        },
        {
          provide: PublishSiteContent,
          inject: [PrismaPublicationAdapter, GithubSiteBuilder],
          useFactory: (
            publications: PrismaPublicationAdapter,
            builder: GithubSiteBuilder,
          ): PublishSiteContent =>
            new PublishSiteContent(publications, builder),
        },
        {
          provide: SitePublicationRunner,
          inject: [
            PublishSiteContent,
            ApplicationLifecycleState,
            STRUCTURED_LOGGER,
          ],
          useFactory: (
            publisher: PublishSiteContent,
            lifecycle: ApplicationLifecycleState,
            logger: StructuredLogger,
          ): SitePublicationRunner =>
            new SitePublicationRunner(
              config.publication.enabled,
              publisher,
              lifecycle,
              logger,
            ),
        },
        {
          provide: PrismaSiteContentAdapter,
          inject: [PrismaClientProvider, TRANSACTION_PORT],
          useFactory: (
            database: PrismaClientProvider,
            transaction: TransactionPort,
          ): PrismaSiteContentAdapter =>
            new PrismaSiteContentAdapter(database, transaction),
        },
        {
          provide: PrismaConsultationsAdapter,
          inject: [PrismaClientProvider, TRANSACTION_PORT],
          useFactory: (
            database: PrismaClientProvider,
            transaction: TransactionPort,
          ): PrismaConsultationsAdapter =>
            new PrismaConsultationsAdapter(database, transaction),
        },
        {
          provide: PostgresConsultationLimiter,
          inject: [PrismaClientProvider, RuntimeConfigService],
          useFactory: (
            database: PrismaClientProvider,
            runtime: RuntimeConfigService,
          ): PostgresConsultationLimiter =>
            new PostgresConsultationLimiter(
              database,
              runtime.auth.rateLimitKeySecret,
            ),
        },
        {
          provide: SiteContentService,
          inject: [PrismaSiteContentAdapter],
          useFactory: (content: PrismaSiteContentAdapter): SiteContentService =>
            new SiteContentService(content),
        },
        {
          provide: ConsultationsService,
          inject: [
            PrismaConsultationsAdapter,
            PrismaSiteContentAdapter,
            PostgresConsultationLimiter,
          ],
          useFactory: (
            requests: PrismaConsultationsAdapter,
            content: PrismaSiteContentAdapter,
            limiter: PostgresConsultationLimiter,
          ): ConsultationsService =>
            new ConsultationsService(requests, content, limiter),
        },
        {
          provide: TelegramAdapter,
          inject: [STRUCTURED_LOGGER],
          useFactory: (logger: StructuredLogger): TelegramAdapter =>
            new TelegramAdapter(config.telegram, fetch, logger),
        },
        {
          provide: DeliverTelegramNotifications,
          inject: [PrismaConsultationsAdapter, TelegramAdapter],
          useFactory: (
            requests: PrismaConsultationsAdapter,
            sender: TelegramAdapter,
          ): DeliverTelegramNotifications =>
            new DeliverTelegramNotifications(requests, sender),
        },
        {
          provide: TelegramNotificationRunner,
          inject: [
            DeliverTelegramNotifications,
            ApplicationLifecycleState,
            STRUCTURED_LOGGER,
          ],
          useFactory: (
            deliver: DeliverTelegramNotifications,
            lifecycle: ApplicationLifecycleState,
            logger: StructuredLogger,
          ): TelegramNotificationRunner =>
            new TelegramNotificationRunner(
              config.telegram.enabled,
              deliver,
              lifecycle,
              logger,
            ),
        },
      ],
    }
  }
}
