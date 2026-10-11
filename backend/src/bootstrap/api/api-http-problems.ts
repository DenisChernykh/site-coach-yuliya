import { AUTH_HTTP_PROBLEM_CONTRIBUTION } from '@/modules/identity-access/composition/auth-http-problem.contribution'
import { COACH_SITE_HTTP_PROBLEMS } from '@/modules/coach-site/composition/coach-site-problems'
import { CORE_HTTP_PROBLEM_CONTRIBUTION } from '@/platform/http/errors/http-problem.mapper'
import { HttpProblemRegistry } from '@/platform/http/errors/http-problem.registry'
import type { HttpProblemContribution } from '@/platform/http/errors/problem.contracts'

/** Ordered problem contributions installed by the API process root. */
export const API_HTTP_PROBLEM_CONTRIBUTIONS: readonly HttpProblemContribution[] =
  Object.freeze([
    CORE_HTTP_PROBLEM_CONTRIBUTION,
    AUTH_HTTP_PROBLEM_CONTRIBUTION,
    COACH_SITE_HTTP_PROBLEMS,
  ])

/** Deterministic complete public problem catalog exposed by the API process. */
export const API_PROBLEM_CATALOG = new HttpProblemRegistry(
  API_HTTP_PROBLEM_CONTRIBUTIONS,
).definitions
