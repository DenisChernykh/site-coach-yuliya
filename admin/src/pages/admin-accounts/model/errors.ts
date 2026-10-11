import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

export function getListError(error: unknown): string {
  if (error instanceof ApiNetworkError)
    return 'Не удалось подключиться к серверу.'
  if (error instanceof ApiProtocolError)
    return 'Сервер вернул некорректный ответ.'
  if (error instanceof ApiProblemError && error.code === 'NOT_FOUND') {
    return 'Управление аккаунтами недоступно.'
  }
  if (error instanceof ApiProblemError) {
    return `Не удалось загрузить аккаунты. Код запроса: ${error.requestId}`
  }
  return 'Не удалось загрузить аккаунты.'
}
