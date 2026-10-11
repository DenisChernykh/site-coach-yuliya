import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import { PeriodicMaintenanceRunner } from '@/platform/maintenance/periodic-maintenance-runner'
import type { StructuredLogger } from '@/platform/logging/logging.contracts'
import type { PublishSiteContent } from '../application/publication.service'

export class SitePublicationRunner implements OnModuleInit, OnModuleDestroy {
  private readonly shutdown = new AbortController()
  private running: Promise<void> | undefined
  public constructor(
    private readonly enabled: boolean,
    private readonly publisher: PublishSiteContent,
    private readonly lifecycle: ApplicationLifecycleState,
    private readonly logger: StructuredLogger,
  ) {}
  public onModuleInit(): void {
    if (!this.enabled) return
    this.running = new PeriodicMaintenanceRunner(
      async (signal) => {
        if (this.lifecycle.phase !== 'ready') return
        try {
          await this.publisher.runOnce(signal)
        } catch {
          this.logger.write({
            level: 'warn',
            event: 'site_publication_cycle_failed',
            module: 'CoachSite',
            attributes: { reasonCode: 'PUBLICATION_DEPENDENCY_UNAVAILABLE' },
          })
        }
      },
      { delayMs: 5000, shutdownGraceMs: 11000 },
    ).run(this.shutdown.signal)
  }
  public async onModuleDestroy(): Promise<void> {
    this.shutdown.abort()
    await this.running
  }
}
