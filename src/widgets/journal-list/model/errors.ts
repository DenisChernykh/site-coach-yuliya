import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
  isProblemCode,
} from '@/shared/api';

export function getJournalErrorMessage(error: unknown): string {
  if (error instanceof ApiNetworkError) {
    return 'Не удалось обновить журнал. Проверь соединение и попробуй ещё раз.';
  }
  if (error instanceof ApiProtocolError) {
    return 'Не удалось обновить журнал: сервер вернул некорректный ответ.';
  }
  if (isProblemCode(error, 'DEPENDENCY_UNAVAILABLE')) {
    return 'Журнал временно недоступен. Попробуй открыть страницу позже.';
  }
  if (error instanceof ApiProblemError) {
    return `Не удалось обновить журнал. Попробуй открыть страницу ещё раз. Код запроса: ${error.requestId}`;
  }
  return 'Не удалось обновить журнал. Попробуй открыть страницу ещё раз.';
}
