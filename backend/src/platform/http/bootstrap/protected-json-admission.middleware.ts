import {
  HttpException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common'
import type { RequestHandler } from 'express'

import type { ProtectedJsonBody } from '../policy/protected-json-body.contracts'
import {
  registerProtectedRequestCompletion,
  forgetProtectedRequestCompletion,
} from '../policy/protected-request-completion'

const maxTrackedIps = 1024

export function createProtectedJsonAdmission(
  policy: ProtectedJsonBody,
  admitted: WeakSet<object>,
  now: () => number = Date.now,
): RequestHandler {
  const buckets = new Map<string, { count: number; resetAtMs: number }>()
  let active = 0
  return async (request, response, next): Promise<void> => {
    const reject = (error: unknown): void => {
      response.setHeader('Connection', 'close')
      next(error)
    }
    const rejectLimit = (retryAfterMs: number): void => {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
      )
      reject(new HttpException('Upload admission limit exceeded', 429))
    }
    const nowMs = now()
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown'
    let bucket = buckets.get(ip)
    if (bucket !== undefined && bucket.resetAtMs <= nowMs) {
      buckets.delete(ip)
      bucket = undefined
    }
    if (bucket === undefined) {
      if (buckets.size >= maxTrackedIps) {
        for (const [key, value] of buckets) {
          if (value.resetAtMs <= nowMs) buckets.delete(key)
        }
      }
      if (buckets.size >= maxTrackedIps) {
        rejectLimit(policy.windowMs)
        return
      }
      bucket = { count: 0, resetAtMs: nowMs + policy.windowMs }
      buckets.set(ip, bucket)
    }
    bucket.count += 1
    if (bucket.count > policy.requestsPerWindow) {
      rejectLimit(bucket.resetAtMs - nowMs)
      return
    }
    if (active >= policy.maxConcurrent) {
      rejectLimit(1000)
      return
    }
    active += 1
    let complete = false
    let authorizing = true
    let bodyAdmitted = false
    let workSettled = false
    let transportClosed = false
    const release = (): void => {
      if (complete) return
      complete = true
      clearTimeout(timer)
      response.off('finish', finished)
      response.off('close', closed)
      request.off('aborted', closed)
      forgetProtectedRequestCompletion(request)
      active -= 1
    }
    const releaseIfSettled = (): void => {
      if (
        transportClosed &&
        !authorizing &&
        (!bodyAdmitted || !request.complete || workSettled)
      )
        release()
    }
    const closed = (): void => {
      transportClosed = true
      releaseIfSettled()
    }
    const finished = (): void => {
      workSettled = true
      closed()
    }
    const timer = setTimeout(() => {
      response.destroy()
      closed()
    }, policy.timeoutMs)
    timer.unref()
    response.once('finish', finished)
    response.once('close', closed)
    request.once('aborted', closed)
    try {
      await policy.accessPolicy.authorize(request, policy.target)
      authorizing = false
      if (transportClosed || response.destroyed) {
        closed()
        return
      }
      const encoding = request.get('content-encoding')?.trim().toLowerCase()
      if (encoding !== undefined && encoding !== 'identity')
        throw new UnsupportedMediaTypeException()
      const length = request.get('content-length')
      if (length !== undefined && Number(length) > policy.limitBytes)
        throw new PayloadTooLargeException()
      registerProtectedRequestCompletion(request, () => {
        workSettled = true
        releaseIfSettled()
      })
      bodyAdmitted = true
      admitted.add(request)
      next()
    } catch (error: unknown) {
      authorizing = false
      if (!complete && !response.destroyed) reject(error)
      else closed()
    }
  }
}
