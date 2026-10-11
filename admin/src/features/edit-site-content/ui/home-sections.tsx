import { useState } from 'react'
import { Button } from '@/shared/ui'
import { labelFor, type ContentValue } from '../model/content-fields'
import { ContentFields } from './content-fields'

export function HomeSections({
  value,
  onChange,
}: {
  value: ContentValue
  onChange: (value: ContentValue) => void
}) {
  const [active, setActive] = useState('hero')
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
      <nav
        aria-label="Разделы главной страницы"
        className="flex flex-wrap gap-1 lg:sticky lg:top-4 lg:flex-col"
      >
        {[
          'hero',
          'concerns',
          'about',
          'approach',
          'process',
          'caseStudies',
          'artPractice',
          'products',
        ]
          .filter((key) => key in value)
          .map((key) => (
            <Button
              key={key}
              type="button"
              variant={active === key ? 'secondary' : 'ghost'}
              className="justify-start"
              aria-current={active === key ? 'true' : undefined}
              onClick={() => setActive(key)}
            >
              {labelFor(key)}
            </Button>
          ))}
      </nav>
      <section className="min-w-0 space-y-5" aria-label={labelFor(active)}>
        <h2 className="text-lg font-medium">{labelFor(active)}</h2>
        <ContentFields
          key={active}
          value={value[active]}
          field={active}
          onChange={(next) => onChange({ ...value, [active]: next })}
        />
      </section>
    </div>
  )
}
