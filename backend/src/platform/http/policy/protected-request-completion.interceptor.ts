import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common'
import { finalize, type Observable } from 'rxjs'

import { completeProtectedRequest } from './protected-request-completion'

export class ProtectedRequestCompletionInterceptor implements NestInterceptor {
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<object>()
    return next.handle().pipe(finalize(() => completeProtectedRequest(request)))
  }
}
