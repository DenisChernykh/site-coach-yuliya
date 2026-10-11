import { articleSlug } from '@/modules/coach-site/domain/content-identifiers'

describe('article addresses', () => {
  it('transliterates Russian titles and normalizes separators', () => {
    expect(articleSlug('Как найти своё дело?')).toBe('kak-nayti-svoyo-delo')
    expect(articleSlug('  Ёж, щука — и чай! ')).toBe('yozh-shchuka-i-chay')
  })
  it('bounds addresses and supplies a fallback for non-letter titles', () => {
    expect(articleSlug('🎨')).toBe('statya')
    expect(articleSlug('а'.repeat(200))).toHaveLength(80)
    expect(articleSlug('a'.repeat(79) + ' — конец')).not.toMatch(/-$/u)
  })
})
