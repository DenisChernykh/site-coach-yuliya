import { describe, expect, it } from 'vitest'
import { createCmsFixture } from '@/shared/lib/testing'
import { articleSeoFallbacks } from './seo'

describe('article SEO fallbacks', () => {
  it('fills missing article metadata from website defaults and skips whitespace', () => {
    const workspace = createCmsFixture().content
    const result = articleSeoFallbacks(
      { title: '  ', description: '\n ', coverImage: '', coverAlt: '\t' },
      workspace,
    )
    expect(result).toEqual({
      title: workspace.seo.siteName,
      description: workspace.site.description,
      ogImage: workspace.seo.defaultImage,
      ogImageAlt: workspace.seo.defaultImageAlt,
    })
  })

  it('prefers article metadata and uses the configured author name', () => {
    const workspace = createCmsFixture().content
    workspace.site.name = 'Имя автора'
    const result = articleSeoFallbacks(
      {
        title: 'Название статьи',
        description: 'Описание статьи',
        coverImage: '/articles/cover.webp',
        coverAlt: 'Обложка статьи',
      },
      workspace,
    )
    expect(result).toEqual({
      title: 'Название статьи — Имя автора',
      description: 'Описание статьи',
      ogImage: '/articles/cover.webp',
      ogImageAlt: 'Обложка статьи',
    })
  })
})
