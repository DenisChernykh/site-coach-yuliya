import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { ApplicationLifecycleState } from '@/platform/lifecycle/application-lifecycle.state'
import { PeriodicMaintenanceRunner } from '@/platform/maintenance/periodic-maintenance-runner'
import type { StructuredLogger } from '@/platform/logging/logging.contracts'
import type { DeliverTelegramNotifications } from '../application/consultations.service'

export class TelegramNotificationRunner
  implements OnModuleInit, OnModuleDestroy
{
  private readonly shutdown = new AbortController()
  private running: Promise<void> | undefined
  public constructor(
    private readonly enabled: boolean,
    private readonly deliver: DeliverTelegramNotifications,
    private readonly lifecycle: ApplicationLifecycleState,
    private readonly logger: StructuredLogger,
  ) {}

  public onModuleInit(): void {
    if (!this.enabled) return
    const runner = new PeriodicMaintenanceRunner(
      async (signal) => {
        if (this.lifecycle.phase !== 'ready') return
        try {
          await this.deliver.runOnce(signal)
        } catch {
          this.logger.write({
            level: 'warn',
            event: 'telegram_delivery_cycle_failed',
            module: 'CoachSite',
            attributes: { reasonCode: 'DELIVERY_DEPENDENCY_UNAVAILABLE' },
          })
        }
      },
      { delayMs: 5000, shutdownGraceMs: 9000 },
    )
    this.running = runner.run(this.shutdown.signal)
  }

  public async onModuleDestroy(): Promise<void> {
    this.shutdown.abort()
    await this.running
  }
}
