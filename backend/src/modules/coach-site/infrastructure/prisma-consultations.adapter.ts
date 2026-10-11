import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import type {
  Consultation as ConsultationRow,
  TelegramDelivery as DeliveryRow,
} from '@/generated/prisma/client'
import type { PrismaClientProvider } from '@/platform/database/prisma-client.provider'
import type { TransactionPort } from '@/shared/application/transaction.port'
import type { ConsultationRequestDto } from '../domain/content'
import type {
  ClaimedDelivery,
  Consultation,
  ConsultationPage,
  ConsultationStatus,
} from '../domain/consultation'
import type {
  ConsultationFilters,
  ConsultationsPort,
  TelegramSendResult,
} from '../application/consultations.port'
import {
  DeliveryRetryConflictError,
  SiteRecordNotFoundError,
} from '../application/site-errors'

function mapConsultation(
  row: ConsultationRow & { delivery: DeliveryRow | null },
): Consultation {
  const { delivery, ...consultation } = row
  return {
    ...consultation,
    delivery:
      delivery === null
        ? null
        : {
            status: delivery.status,
            attempts: delivery.attempts,
            nextAttemptAt: delivery.nextAttemptAt,
            sentAt: delivery.sentAt,
            lastErrorCode: delivery.lastErrorCode,
          },
  }
}

export class PrismaConsultationsAdapter implements ConsultationsPort {
  public constructor(
    private readonly database: PrismaClientProvider,
    private readonly transaction: TransactionPort,
  ) {}

  public async create(
    input: ConsultationRequestDto,
    serviceTitle: string | null,
  ): Promise<Consultation> {
    const fields = {
      name: input.name.trim(),
      contact: input.contact.trim(),
      message: input.message?.trim() ?? '',
      serviceId: input.serviceId?.trim() ?? null,
    }
    const digest = createHash('sha256')
      .update(JSON.stringify(['coach-consultation', fields]))
      .digest()
    const lockId = digest.readBigInt64BE()
    return this.transaction.run(() =>
      this.database.withClient(async (client) => {
        await client.$executeRaw(
          Prisma.sql`SELECT pg_advisory_xact_lock(${lockId}::bigint)`,
        )
        const existing = await client.consultation.findFirst({
          where: {
            ...fields,
            createdAt: { gte: new Date(Date.now() - 600_000) },
          },
          include: { delivery: true },
        })
        if (existing !== null) return mapConsultation(existing)
        const created = await client.consultation.create({
          data: {
            ...fields,
            serviceTitle,
            consentVersion: '2026-10-11',
            delivery: { create: {} },
          },
          include: { delivery: true },
        })
        return mapConsultation(created)
      }),
    )
  }

  public async list(filters: ConsultationFilters): Promise<ConsultationPage> {
    const where = {
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.search === undefined
        ? {}
        : {
            OR: [
              {
                name: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                contact: {
                  contains: filters.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }),
    }
    const [rows, total] = await this.database.withClient((client) =>
      Promise.all([
        client.consultation.findMany({
          where,
          include: { delivery: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        client.consultation.count({ where }),
      ]),
    )
    return {
      items: rows.map(mapConsultation),
      total,
      page: filters.page,
      limit: filters.limit,
    }
  }

  public async find(id: string): Promise<Consultation | undefined> {
    const row = await this.database.withClient((client) =>
      client.consultation.findUnique({
        where: { id },
        include: { delivery: true },
      }),
    )
    return row === null ? undefined : mapConsultation(row)
  }

  public async update(
    id: string,
    patch: {
      readonly status?: ConsultationStatus
      readonly adminNote?: string
    },
  ): Promise<Consultation> {
    const result = await this.database.withClient((client) =>
      client.consultation.updateMany({ where: { id }, data: patch }),
    )
    if (result.count === 0) throw new SiteRecordNotFoundError()
    const updated = await this.find(id)
    if (updated === undefined) throw new SiteRecordNotFoundError()
    return updated
  }

  public async retryDelivery(id: string): Promise<void> {
    if ((await this.find(id)) === undefined) throw new SiteRecordNotFoundError()
    const result = await this.database.withClient((client) =>
      client.telegramDelivery.updateMany({
        where: { consultationId: id, status: 'FAILED' },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date(),
          lastErrorCode: null,
          claimedUntil: null,
          claimToken: null,
        },
      }),
    )
    if (result.count === 0) throw new DeliveryRetryConflictError()
  }

  public async claimDelivery(now: Date): Promise<ClaimedDelivery | undefined> {
    return this.database.withClient(async (client) => {
      await client.telegramDelivery.updateMany({
        where: {
          status: 'PROCESSING',
          claimedUntil: { lte: now },
          attempts: { gte: 8 },
        },
        data: {
          status: 'FAILED',
          lastErrorCode: 'DELIVERY_ATTEMPTS_EXHAUSTED',
          claimToken: null,
          claimedUntil: null,
        },
      })
      const due = {
        OR: [
          { status: 'PENDING' as const, nextAttemptAt: { lte: now } },
          {
            status: 'PROCESSING' as const,
            claimedUntil: { lte: now },
            attempts: { lt: 8 },
          },
        ],
      }
      const row = await client.telegramDelivery.findFirst({
        where: due,
        orderBy: { nextAttemptAt: 'asc' },
      })
      if (row === null) return undefined
      const claimToken = randomUUID()
      const claimed = await client.telegramDelivery.updateMany({
        where: { consultationId: row.consultationId, ...due },
        data: {
          status: 'PROCESSING',
          claimToken,
          claimedUntil: new Date(now.getTime() + 45000),
          attempts: { increment: 1 },
        },
      })
      if (claimed.count === 0) return undefined
      const consultation = await client.consultation.findUniqueOrThrow({
        where: { id: row.consultationId },
        include: { delivery: true },
      })
      return {
        consultation: mapConsultation(consultation),
        claimToken,
        attempts: row.attempts + 1,
      }
    })
  }

  public async finishDelivery(
    claim: ClaimedDelivery,
    outcome: TelegramSendResult,
  ): Promise<void> {
    const now = new Date()
    const data =
      'messageId' in outcome
        ? {
            status: 'SENT' as const,
            sentAt: now,
            messageId: outcome.messageId,
            lastErrorCode: null,
          }
        : {
            status:
              outcome.permanent || claim.attempts >= 8
                ? ('FAILED' as const)
                : ('PENDING' as const),
            nextAttemptAt: new Date(
              now.getTime() +
                Math.max(
                  outcome.retryAfterMs,
                  Math.min(3600000, 5000 * 2 ** (claim.attempts - 1)),
                ),
            ),
            lastErrorCode: outcome.errorCode,
          }
    await this.database.withClient((client) =>
      client.telegramDelivery.updateMany({
        where: {
          consultationId: claim.consultation.id,
          status: 'PROCESSING',
          claimToken: claim.claimToken,
        },
        data: { ...data, claimToken: null, claimedUntil: null },
      }),
    )
  }
}
