import { Injectable } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import type { Request } from 'express'

import type {
  PreBodyAccessPolicy,
  ProtectedRequestTarget,
} from '@/platform/http/policy/protected-json-body.contracts'
import { AuthorizationDeniedError } from '../../public-contracts/auth-errors'
import { AuthenticationGuard } from './authentication.guard'
import { BrowserOriginGuard } from './browser-origin.guard'
import { SessionCsrfGuard } from './session-csrf.guard'
import { PermissionGuard } from './permission.guard'

@Injectable()
export class PreBodyAccessPolicyAdapter implements PreBodyAccessPolicy {
  public constructor(
    private readonly authentication: AuthenticationGuard,
    private readonly origin: BrowserOriginGuard,
    private readonly csrf: SessionCsrfGuard,
    private readonly permission: PermissionGuard,
  ) {}

  public async authorize(
    request: Request,
    target: ProtectedRequestTarget,
  ): Promise<void> {
    // Admission must not attach a principal to the later, freshly checked request.
    const admissionRequest = {
      method: request.method,
      headers: request.headers,
    }
    const context = new ExecutionContextHost(
      [admissionRequest],
      target.controller,
      target.handler,
    )
    context.setType('http')
    for (const guard of [
      this.authentication,
      this.origin,
      this.csrf,
      this.permission,
    ]) {
      if (!(await guard.canActivate(context)))
        throw new AuthorizationDeniedError()
    }
  }
}
