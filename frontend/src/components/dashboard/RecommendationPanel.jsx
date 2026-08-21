import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Select } from '../ui/select'
import { EmptyPanel, SeverityBadge } from './shared'

export default function RecommendationPanel({
  items = [],
  emptyTitle = 'No recommendations right now',
  emptyDescription = 'Recommended changes will appear after CodePulse has enough risk evidence from a completed scan.',
}) {
  const categories = useMemo(() => {
    const grouped = new Map()
    items.forEach(item => {
      const category = item.category || 'Maintainability'
      if (!grouped.has(category)) grouped.set(category, [])
      grouped.get(category).push(item)
    })
    return [...grouped.entries()].map(([name, categoryItems]) => ({ name, items: categoryItems }))
  }, [items])
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.some(category => category.name === selectedCategory)) {
      setSelectedCategory('all')
    }
  }, [categories, selectedCategory])

  if (items.length === 0) {
    return <EmptyPanel title={emptyTitle} description={emptyDescription} icon={Sparkles} />
  }

  const visibleCategories = selectedCategory === 'all'
    ? categories
    : categories.filter(category => category.name === selectedCategory)
  const categoryOptions = [
    { value: 'all', label: `All categories (${items.length})` },
    ...categories.map(category => ({
      value: category.name,
      label: `${category.name} (${category.items.length})`,
    })),
  ]

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">AI recommendations</h2>
          <p className="mt-1 max-w-2xl text-[0.8125rem] leading-5 text-[var(--ink-3)]">
            Review related changes together. Each recommendation explains why it matters and what to do next.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <span className="overline mb-1.5 block text-[var(--ink-3)]">Change category</span>
          <Select
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            ariaLabel="Filter recommendations by category"
          />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {visibleCategories.map(category => (
          <section key={category.name} aria-labelledby={`recommendation-category-${category.name.replace(/\s+/g, '-').toLowerCase()}`}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[var(--accent-ink)]" aria-hidden="true" />
              <h3 id={`recommendation-category-${category.name.replace(/\s+/g, '-').toLowerCase()}`} className="text-sm font-semibold text-[var(--ink-1)]">
                {category.name}
              </h3>
              <span className="text-xs text-[var(--ink-3)]">{category.items.length} {category.items.length === 1 ? 'change' : 'changes'}</span>
            </div>

            <ul className="mt-3 grid gap-3 xl:grid-cols-2">
              {category.items.map(item => (
                <li key={item.id || item.title}>
                  <article className="panel-2 panel-interactive h-full p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-[var(--ink-1)]">{item.title}</h4>
                      {/* Impact reuses the severity scale: it grades consequence. */}
                      <SeverityBadge severity={item.impact} className="shrink-0" />
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{item.reason}</p>

                    <p className="mt-3 text-xs font-semibold text-[var(--ink-3)]">
                      Estimated effort: <span className="tnum">{item.effort}</span>
                    </p>

                    <ul className="mt-3 space-y-2">
                      {(item.steps || []).map(step => (
                        <li key={step} className="flex gap-2 text-sm text-[var(--ink-2)]">
                          <CheckCircle2
                            size={15}
                            className="mt-0.5 shrink-0 text-[var(--sev-nominal-ink)]"
                            aria-hidden="true"
                          />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  )
}
