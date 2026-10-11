import { ApiProblemError } from '@/shared/api'

export function getActionError(error: unknown): string {
  if (
    error instanceof ApiProblemError &&
    error.code === 'AUTH_ACCOUNT_PRECONDITION_FAILED'
  )
    return 'Данные аккаунта изменились. Они обновлены.'
  if (error instanceof ApiProblemError && error.code === 'CONFLICT')
    return 'Действие недоступно для текущего состояния аккаунта.'
  if (error instanceof ApiProblemError)
    return `Не удалось выполнить действие. Код запроса: ${error.requestId}`
  return 'Не удалось выполнить действие.'
}

export function getProtocolRecoveryMessage(refreshed: boolean): string {
  return refreshed
    ? 'Сервер вернул некорректный ответ. Данные аккаунта перечитаны.'
    : 'Сервер вернул некорректный ответ. Актуальные данные аккаунта получить не удалось.'
}
