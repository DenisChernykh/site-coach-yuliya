import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
  isProblemCode,
} from '@/shared/api';

export function getConsultationErrorMessage(error: unknown): string {
  if (isProblemCode(error, 'RATE_LIMIT_EXCEEDED')) {
    if (error.retryAfterMs === null) {
      return 'Слишком много попыток отправки. Подожди немного и попробуй снова.';
    }
    const minutes = Math.max(1, Math.ceil(error.retryAfterMs / 60_000));
    return `Слишком много попыток отправки. Подожди ${minutes} мин. и попробуй снова.`;
  }
  if (isProblemCode(error, 'VALIDATION_FAILED')) {
    return 'Проверь поля заявки и согласие на обработку данных.';
  }
  if (isProblemCode(error, 'DEPENDENCY_UNAVAILABLE')) {
    return 'Сервис временно недоступен. Попробуй отправить заявку позже.';
  }
  if (error instanceof ApiNetworkError) {
    return 'Не удалось подключиться к серверу. Проверь соединение и попробуй ещё раз.';
  }
  if (error instanceof ApiProtocolError) {
    return 'Сервер вернул некорректный ответ. Попробуй отправить заявку позже.';
  }
  if (error instanceof ApiProblemError) {
    return `Не получилось отправить заявку. Попробуй ещё раз. Код запроса: ${error.requestId}`;
  }
  return 'Не получилось отправить заявку. Попробуй ещё раз.';
}
