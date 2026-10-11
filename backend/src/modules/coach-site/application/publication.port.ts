import type { PublicationClaim, SitePublication } from '../domain/publication'

export interface PublicationPort {
  get(): Promise<SitePublication>
  retry(): Promise<void>
  claim(now: Date): Promise<PublicationClaim | undefined>
  dispatched(claim: PublicationClaim, runId: string): Promise<void>
  failed(
    claimToken: string | undefined,
    errorCode: string,
    permanent: boolean,
  ): Promise<void>
  completed(deployedRevision: number): Promise<void>
}

export type DispatchResult =
  | { readonly runId: string }
  | { readonly errorCode: string; readonly permanent: boolean }
export type BuildResult =
  | { readonly status: 'waiting' }
  | { readonly status: 'success'; readonly deployedRevision: number }
  | { readonly status: 'failed'; readonly errorCode: string }

export interface SiteBuilderPort {
  dispatch(revision: number, signal: AbortSignal): Promise<DispatchResult>
  check(
    runId: string,
    expectedRevision: number,
    signal: AbortSignal,
  ): Promise<BuildResult>
}
