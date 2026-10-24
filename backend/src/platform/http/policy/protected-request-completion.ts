const completions = new WeakMap<object, () => void>()

export function registerProtectedRequestCompletion(
  request: object,
  complete: () => void,
): void {
  completions.set(request, complete)
}

export function completeProtectedRequest(request: object): void {
  const complete = completions.get(request)
  completions.delete(request)
  complete?.()
}

export function forgetProtectedRequestCompletion(request: object): void {
  completions.delete(request)
}
