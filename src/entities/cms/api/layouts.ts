import { getPageLayouts, isMockMode, ApiProblemError } from '@/shared/api';
import { defaultPageLayouts } from '../model/layout';

export async function loadPageLayouts() {
  if (isMockMode) return defaultPageLayouts();
  try {
    return await getPageLayouts();
  } catch (error) {
    if (error instanceof ApiProblemError && error.status === 404)
      return defaultPageLayouts();
    throw error;
  }
}
