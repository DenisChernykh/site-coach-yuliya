import type { Type } from '@nestjs/common'
import type { Request } from 'express'

export interface ProtectedRequestTarget {
  readonly controller: Type<unknown>
  readonly handler: (...arguments_: never[]) => unknown
}

export interface PreBodyAccessPolicy {
  authorize(request: Request, target: ProtectedRequestTarget): Promise<void>
}

export const PRE_BODY_ACCESS_POLICY = Symbol('platform:http:pre-body-access')

export interface ProtectedJsonRoute {
  readonly bodyType?: 'raw' | 'json'
  readonly path: string
  readonly limitBytes: number
  readonly target: ProtectedRequestTarget
}

export interface ProtectedJsonBody extends ProtectedJsonRoute {
  readonly accessPolicy: PreBodyAccessPolicy
  readonly maxConcurrent: number
  readonly requestsPerWindow: number
  readonly windowMs: number
  readonly timeoutMs: number
}
