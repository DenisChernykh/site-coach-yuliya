import { defineProblemDefinition } from '@/platform/http/errors/problem-registry'

export const INVALID_PROGRAM_PROBLEM = defineProblemDefinition({
  slug: 'invalid-program',
  code: 'INVALID_PROGRAM',
  status: 400,
  title: 'Invalid program',
  detail: 'The selected program is not available.',
})
