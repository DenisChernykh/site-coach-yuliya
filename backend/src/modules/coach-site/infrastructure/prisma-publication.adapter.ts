import { Prisma } from '@/generated/prisma/client'
import { randomUUID } from 'node:crypto'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import type { PublicationPort } from '../application/publication.port'
import type { PublicationClaim, SitePublication } from '../domain/publication'
import { DeliveryRetryConflictError } from '../application/site-errors'

export class PrismaPublicationAdapter implements PublicationPort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly transaction: TransactionPort,
  ) {}

  public async get(): Promise<SitePublication> {
    const row = await this.database.withClient((client) =>
      client.sitePublication.findUnique({ where: { id: 'site' } }),
    )
    if (row === null)
      return {
        requestedRevision: 0,
        deployedRevision: 0,
        activeRevision: null,
        status: 'IDLE',
        requestedAt: null,
        dispatchedAt: null,
        attempts: 0,
        nextAttemptAt: new Date(0),
        workflowRunId: null,
        lastErrorCode: null,
      }
    return {
      requestedRevision: row.requestedRevision,
      deployedRevision: row.deployedRevision,
      activeRevision: row.activeRevision,
      status: row.status,
      requestedAt: row.requestedAt,
      dispatchedAt: row.dispatchedAt,
      attempts: row.attempts,
      nextAttemptAt: row.nextAttemptAt,
      workflowRunId: row.workflowRunId,
      lastErrorCode: row.lastErrorCode,
    }
  }

  public async retry(): Promise<void> {
    const row = await this.get()
    if (row.status !== 'FAILED') throw new DeliveryRetryConflictError()
    await this.database.withClient((client) =>
      client.sitePublication.updateMany({
        where: { id: 'site', status: 'FAILED' },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          lastErrorCode: null,
        },
      }),
    )
  }

  public async claim(now: Date): Promise<PublicationClaim | undefined> {
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        await client.sitePublication.updateMany({
          where: {
            id: 'site',
            status: 'DISPATCHING',
            claimedUntil: { lte: now },
            attempts: { gte: 3 },
          },
          data: {
            status: 'FAILED',
            claimToken: null,
            claimedUntil: null,
            lastErrorCode: 'SITE_DISPATCH_ATTEMPTS_EXHAUSTED',
          },
        })
        const due = {
          id: 'site',
          OR: [
            { status: 'PENDING' as const, nextAttemptAt: { lte: now } },
            { status: 'DISPATCHING' as const, claimedUntil: { lte: now } },
          ],
        }
        const row = await client.sitePublication.findFirst({ where: due })
        if (row === null) return undefined
        const claimToken = randomUUID()
        const claimed = await client.sitePublication.updateMany({
          where: due,
          data: {
            status: 'DISPATCHING',
            claimToken,
            activeRevision: row.requestedRevision,
            claimedUntil: new Date(now.getTime() + 30_000),
            attempts: { increment: 1 },
          },
        })
        return claimed.count === 0
          ? undefined
          : { revision: row.requestedRevision, claimToken }
      }),
    )
  }

  public async dispatched(
    claim: PublicationClaim,
    runId: string,
  ): Promise<void> {
    await this.database.withClient((client) =>
      client.sitePublication.updateMany({
        where: {
          id: 'site',
          status: 'DISPATCHING',
          claimToken: claim.claimToken,
        },
        data: {
          status: 'BUILDING',
          workflowRunId: runId,
          dispatchedAt: new Date(),
          claimedUntil: null,
          claimToken: null,
          lastErrorCode: null,
        },
      }),
    )
  }

  public async failed(
    claimToken: string | undefined,
    errorCode: string,
    permanent: boolean,
  ): Promise<void> {
    await this.transaction.run(() =>
      this.database.withClient(async (client) => {
        await client.$queryRaw(
          Prisma.sql`SELECT id FROM site_publications WHERE id = 'site' FOR UPDATE`,
        )
        const row = await client.sitePublication.findFirst({
          where: {
            id: 'site',
            ...(claimToken === undefined
              ? { status: 'BUILDING' }
              : { status: 'DISPATCHING', claimToken }),
          },
        })
        if (row === null) return
        await client.sitePublication.update({
          where: { id: 'site' },
          data: {
            status: permanent || row.attempts >= 3 ? 'FAILED' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + 60_000 * 2 ** row.attempts),
            claimToken: null,
            claimedUntil: null,
            workflowRunId: null,
            activeRevision: null,
            lastErrorCode: errorCode,
          },
        })
      }),
    )
  }

  public async completed(deployedRevision: number): Promise<void> {
    await this.transaction.run(() =>
      this.database.withClient(async (client) => {
        await client.$queryRaw(
          Prisma.sql`SELECT id FROM site_publications WHERE id = 'site' FOR UPDATE`,
        )
        const row = await client.sitePublication.findUniqueOrThrow({
          where: { id: 'site' },
        })
        if (row.status !== 'BUILDING') return
        await client.sitePublication.update({
          where: { id: 'site' },
          data: {
            deployedRevision: Math.max(
              row.deployedRevision,
              Math.min(row.requestedRevision, deployedRevision),
            ),
            status:
              row.requestedRevision > deployedRevision ? 'PENDING' : 'IDLE',
            attempts: 0,
            lastErrorCode: null,
            claimToken: null,
            claimedUntil: null,
            workflowRunId: null,
            activeRevision: null,
            nextAttemptAt: new Date(
              Math.max(Date.now(), (row.requestedAt?.getTime() ?? 0) + 30_000),
            ),
          },
        })
      }),
    )
  }
}
