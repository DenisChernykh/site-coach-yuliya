import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

export function getConfirmError(error: unknown) {
  if (
    error instanceof ApiProblemError &&
    error.code === 'AUTH_TOKEN_INVALID_OR_EXPIRED'
  )
    return 'Ссылка недействительна или устарела'
  if (error instanceof ApiProblemError && error.code === 'RATE_LIMIT_EXCEEDED')
    return 'Слишком много запросов. Повторите попытку позже.'
  if (
    error instanceof ApiProblemError &&
    error.code === 'DEPENDENCY_UNAVAILABLE'
  )
    return 'Сервис временно недоступен.'
  if (error instanceof ApiProblemError && error.code === 'NOT_FOUND')
    return 'Регистрация и восстановление сейчас недоступны.'
  if (error instanceof ApiNetworkError)
    return 'Не удалось подключиться к серверу.'
  if (error instanceof ApiProtocolError)
    return 'Сервер вернул некорректный ответ.'
  if (error instanceof ApiProblemError)
    return `Не удалось подтвердить email. Код запроса: ${error.requestId}`
  return 'Не удалось подтвердить email.'
}
