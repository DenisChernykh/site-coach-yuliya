export function mediaRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | undefined | 'invalid' {
  if (!header) return undefined
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header)
  if (!match || (!match[1] && !match[2])) return 'invalid'
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]))
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= size ||
    end < start ||
    (!match[1] && Number(match[2]) === 0)
  )
    return 'invalid'
  return { start, end }
}
