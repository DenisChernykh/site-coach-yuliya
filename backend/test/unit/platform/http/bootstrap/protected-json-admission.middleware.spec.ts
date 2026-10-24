import { EventEmitter } from 'node:events'
import type { Request, Response } from 'express'

import { createProtectedJsonAdmission } from '@/platform/http/bootstrap/protected-json-admission.middleware'
import type { ProtectedJsonBody } from '@/platform/http/policy/protected-json-body.contracts'
import { completeProtectedRequest } from '@/platform/http/policy/protected-request-completion'

interface AdmissionCall {
  req: EventEmitter & { ip: string; complete: boolean; get: () => undefined }
  res: EventEmitter & {
    destroyed: boolean
    writableFinished: boolean
    setHeader: jest.Mock<void, [string, string]>
    destroy: () => unknown
  }
  next: jest.Mock<void, [error?: unknown]>
}

interface AdmissionHarness {
  start: (ip?: string) => AdmissionCall & { done: Promise<void> }
  call: (ip?: string) => Promise<AdmissionCall>
  admitted: WeakSet<object>
  authorize: jest.Mock<Promise<void>, []>
}

describe('protected JSON upload resource admission', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  const setup = (
    overrides: Partial<ProtectedJsonBody> = {},
  ): AdmissionHarness => {
    const authorize = jest.fn(() => Promise.resolve())
    const admitted = new WeakSet<object>()
    const policy: ProtectedJsonBody = {
      path: '/upload',
      limitBytes: 1024,
      target: { controller: class {}, handler: () => undefined },
      accessPolicy: { authorize },
      maxConcurrent: 2,
      requestsPerWindow: 60,
      windowMs: 60_000,
      timeoutMs: 30_000,
      ...overrides,
    }
    const middleware = createProtectedJsonAdmission(policy, admitted)
    const start = (
      ip = '203.0.113.1',
    ): AdmissionCall & { done: Promise<void> } => {
      const req = Object.assign(new EventEmitter(), {
        ip,
        complete: false,
        get: () => undefined,
      })
      const res = Object.assign(new EventEmitter(), {
        destroyed: false,
        writableFinished: false,
        setHeader: jest.fn<void, [string, string]>(),
        destroy() {
          this.destroyed = true
          res.emit('close')
          return this
        },
      })
      const next = jest.fn<void, [error?: unknown]>()
      const done = Promise.resolve(
        middleware(req as unknown as Request, res as unknown as Response, next),
      ).then(() => undefined)
      return { req, res, next, done }
    }
    const call = async (ip?: string): Promise<AdmissionCall> => {
      const result = start(ip)
      await result.done
      return result
    }
    return { call, start, admitted, authorize }
  }

  it('bounds simultaneous uploads and releases on response finish and parser errors', async () => {
    const { call, admitted } = setup()
    const first = await call(),
      second = await call(),
      denied = await call()
    expect(admitted.has(first.req)).toBe(true)
    expect(admitted.has(second.req)).toBe(true)
    expect(admitted.has(denied.req)).toBe(false)
    expect(denied.res.setHeader).toHaveBeenCalledWith('Retry-After', '1')
    expect(denied.next.mock.calls[0]?.[0]).toMatchObject({ status: 429 })
    first.res.emit('finish')
    first.res.emit('close')
    const third = await call()
    expect(admitted.has(third.req)).toBe(true)
    second.res.emit('finish')
    third.res.emit('finish')
  })

  it('releases incomplete aborted bodies and enforces the upload deadline', async () => {
    const { call, admitted } = setup({ maxConcurrent: 1 })
    const first = await call()
    first.req.emit('aborted')
    const second = await call()
    expect(admitted.has(second.req)).toBe(true)
    jest.advanceTimersByTime(30_000)
    expect(second.res.destroyed).toBe(true)
    const third = await call()
    expect(admitted.has(third.req)).toBe(true)
    third.res.emit('finish')
  })

  it('retains a reservation past disconnect and deadline until the handler settles', async () => {
    const { call, admitted } = setup({ maxConcurrent: 1 })
    const first = await call()
    first.req.complete = true
    first.res.destroy()
    expect(admitted.has((await call()).req)).toBe(false)
    jest.advanceTimersByTime(30_000)
    expect(admitted.has((await call()).req)).toBe(false)
    completeProtectedRequest(first.req)
    const next = await call()
    expect(admitted.has(next.req)).toBe(true)
    next.res.emit('finish')
  })

  it('cannot bypass the authorization concurrency cap by aborting the client', async () => {
    let approve!: () => void
    const decision = new Promise<void>((resolve) => {
      approve = resolve
    })
    const policy = { authorize: jest.fn(() => decision) }
    const { start, call, admitted } = setup({
      maxConcurrent: 1,
      accessPolicy: policy,
    })
    const first = start()
    first.req.emit('aborted')
    expect(admitted.has((await call()).req)).toBe(false)
    jest.advanceTimersByTime(30_000)
    expect(admitted.has((await call()).req)).toBe(false)
    expect(policy.authorize).toHaveBeenCalledTimes(1)
    approve()
    await first.done
    const next = await call()
    expect(admitted.has(next.req)).toBe(true)
    expect(admitted.has(first.req)).toBe(false)
    next.res.emit('finish')
  })

  it('limits attempts before authentication and expires each IP window', async () => {
    const { call, admitted, authorize } = setup({ requestsPerWindow: 2 })
    for (let index = 0; index < 2; index++) (await call()).res.emit('finish')
    const denied = await call()
    expect(admitted.has(denied.req)).toBe(false)
    expect(authorize).toHaveBeenCalledTimes(2)
    expect(denied.res.setHeader).toHaveBeenCalledWith('Retry-After', '60')
    const other = await call('203.0.113.2')
    expect(admitted.has(other.req)).toBe(true)
    other.res.emit('finish')
    jest.advanceTimersByTime(60_000)
    const renewed = await call()
    expect(admitted.has(renewed.req)).toBe(true)
    renewed.res.emit('finish')
  })

  it('does not admit an authentication result that arrives after timeout', async () => {
    let approve!: () => void
    const policy = {
      authorize: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            approve = resolve
          }),
      ),
    }
    const { call, admitted } = setup({ accessPolicy: policy })
    const pending = call()
    jest.advanceTimersByTime(30_000)
    approve()
    const result = await pending
    expect(result.res.destroyed).toBe(true)
    expect(result.next).not.toHaveBeenCalled()
    expect(admitted.has(result.req)).toBe(false)
  })
})
