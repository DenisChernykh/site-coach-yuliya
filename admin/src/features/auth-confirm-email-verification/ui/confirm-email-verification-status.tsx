import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'

import { authConfirmEmailVerificationSchema } from '@/shared/api'
import { useConsumedFragmentParameter } from '@/shared/lib/hooks'
import { loginPath, resendEmailVerificationPath } from '@/shared/routes'
import { Alert, AlertDescription } from '@/shared/ui'

import { getConfirmError } from '../model/errors'
import { useConfirmEmailVerification } from '../model/use-confirm-email-verification'

export function ConfirmEmailVerificationStatus() {
  const token = useConsumedFragmentParameter('token')
  const location = useLocation()
  const confirm = useConfirmEmailVerification()
  const started = useRef(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const validToken = authConfirmEmailVerificationSchema.safeParse({
    token,
  }).success

  useEffect(() => {
    if (
      !validToken ||
      token === null ||
      location.hash.length > 0 ||
      started.current
    )
      return
    started.current = true
    void confirm.execute(token).catch((error: unknown) => {
      setErrorMessage(getConfirmError(error))
    })
  }, [confirm, location.hash, token, validToken])

  if (!validToken) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            Ссылка недействительна или устарела
          </AlertDescription>
        </Alert>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={resendEmailVerificationPath}
        >
          Запросить новое письмо
        </Link>
      </div>
    )
  }
  if (errorMessage !== null) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={resendEmailVerificationPath}
        >
          Запросить новое письмо
        </Link>
      </div>
    )
  }
  if (confirm.isSuccess) {
    return (
      <div className="space-y-4">
        <p>Email подтверждён</p>
        <Link
          className="text-primary underline-offset-4 hover:underline"
          to={loginPath}
        >
          Войти
        </Link>
      </div>
    )
  }
  return <p aria-live="polite">Подтверждаем email…</p>
}
