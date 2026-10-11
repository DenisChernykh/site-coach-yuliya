import { Alert, AlertDescription, Button } from '@/shared/ui'

import { hasVisibleLogoutError } from '../model/errors'
import { useLogout } from '../model/use-logout'

/**
 * Отображает кнопку выхода и сообщение о неустранимой ошибке выхода.
 *
 * @remarks Не показывает ошибку `AUTHENTICATION_REQUIRED`: `useLogout` уже
 * очищает истёкшую сессию и перенаправляет пользователя на login.
 */
export function LogoutButton() {
  const logout = useLogout()
  const visibleFailure = hasVisibleLogoutError(logout.error)

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        isLoading={logout.isPending}
        loadingLabel="Выходим"
        onClick={() => logout.mutate()}
      >
        Выйти
      </Button>
      {visibleFailure && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>
            Не удалось выйти. Повторите попытку.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
