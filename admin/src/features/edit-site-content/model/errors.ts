import { isProblemCode, ApiNetworkError } from '@/shared/api'
export function contentError(error: unknown): string {
  if (isProblemCode(error, 'VALIDATION_FAILED'))
    return 'Проверьте заполненные поля. В адресах используйте латинские буквы, цифры и дефисы; внешние ссылки должны начинаться с https://.'
  if (isProblemCode(error, 'CONFLICT'))
    return 'Запись с таким адресом уже существует. Измените адрес или обновите список.'
  if (isProblemCode(error, 'AUTHORIZATION_DENIED'))
    return 'Недостаточно прав для этого действия.'
  if (isProblemCode(error, 'AUTHENTICATION_REQUIRED'))
    return 'Сессия завершилась. Войдите снова.'
  if (error instanceof ApiNetworkError)
    return 'Нет соединения с сервером. Попробуйте снова.'
  return 'Не удалось выполнить действие. Попробуйте снова.'
}
