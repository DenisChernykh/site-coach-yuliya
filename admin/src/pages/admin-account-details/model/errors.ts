import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

type DetailErrorPresentation = Readonly<{
  message: string
  requestId?: string
  retryable: boolean
}>

export function getDetailErrorPresentation(
  error: unknown,
): DetailErrorPresentation {
  if (error instanceof ApiNetworkError) {
    return { message: 'Не удалось подключиться к серверу.', retryable: true }
  }
  if (error instanceof ApiProtocolError) {
    return {
      message: 'Сервер вернул некорректный ответ.',
      retryable: false,
    }
  }
  if (error instanceof ApiProblemError) {
    if (error.code === 'NOT_FOUND') {
      return {
        message: 'Аккаунт не существует или раздел недоступен.',
        requestId: error.requestId,
        retryable: false,
      }
    }
    if (error.code === 'AUTHORIZATION_DENIED') {
      return {
        message: 'У вас нет доступа к этому аккаунту.',
        requestId: error.requestId,
        retryable: false,
      }
    }
    if (error.code === 'DEPENDENCY_UNAVAILABLE') {
      return {
        message: 'Сервис временно недоступен.',
        requestId: error.requestId,
        retryable: true,
      }
    }
    return {
      message: 'Не удалось загрузить аккаунт.',
      requestId: error.requestId,
      retryable: error.code === 'INTERNAL_ERROR',
    }
  }
  return { message: 'Аккаунт недоступен.', retryable: false }
}
