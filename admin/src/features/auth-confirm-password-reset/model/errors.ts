import {
  ApiNetworkError,
  ApiProblemError,
  ApiProtocolError,
} from '@/shared/api'

export function getResetError(error: unknown) {
  if (error instanceof ApiProblemError && error.code === 'VALIDATION_FAILED')
    return 'Проверьте введённые данные.'
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
    return `Не удалось изменить пароль. Код запроса: ${error.requestId}`
  return 'Не удалось изменить пароль.'
}
