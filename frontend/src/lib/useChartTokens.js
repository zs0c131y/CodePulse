import { useEffect, useState } from 'react'

/**
 * Resolve design tokens to concrete colour values for chart libraries.
 *
 * SVG presentation attributes (`fill="…"`, `stroke="…"`) do NOT resolve
 * `var()` — recharts sets colours as attributes, so it needs real values.
 * This hook reads the computed custom properties and re-reads them whenever
 * the theme changes, so charts follow light/dark like everything else.
 *
 * Spec: docs/design.md §5
 */

const TOKENS = [
  'series-1', 'series-2', 'series-3', 'series-4', 'series-5', 'series-6',
  'heat-1', 'heat-2', 'heat-3', 'heat-4', 'heat-5',
  'sev-nominal', 'sev-low', 'sev-medium', 'sev-high', 'sev-critical',
  'ink-1', 'ink-2', 'ink-3', 'ink-4',
  'surface-1', 'surface-2', 'surface-overlay',
  'line-1', 'line-2',
  'chart-grid', 'chart-axis',
  'accent',
]

function read() {
  if (typeof window === 'undefined') return {}

  const styles = getComputedStyle(document.documentElement)
  const resolved = {}

  for (const token of TOKENS) {
    resolved[token] = styles.getPropertyValue(`--${token}`).trim()
  }

  return resolved
}

export function useChartTokens() {
  const [tokens, setTokens] = useState(read)

  useEffect(() => {
    const refresh = () => setTokens(read())

    // Explicit theme stamp changes.
    const observer = new MutationObserver(refresh)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    // OS-level scheme changes, for users who never stamped a preference.
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', refresh)

    // Custom properties are not readable until the stylesheet has applied.
    refresh()

    return () => {
      observer.disconnect()
      media.removeEventListener('change', refresh)
    }
  }, [])

  return tokens
}

/** Shared recharts tooltip styling, themed. */
export function tooltipStyle(tokens) {
  return {
    backgroundColor: tokens['surface-overlay'] || 'Canvas',
    border: `1px solid ${tokens['line-2'] || 'CanvasText'}`,
    borderRadius: 10,
    fontSize: 12,
    color: tokens['ink-1'] || 'CanvasText',
    boxShadow: 'var(--shadow-e3)',
    padding: '8px 10px',
  }
}

/** Shared axis tick styling, themed. */
export function axisTick(tokens) {
  return {
    fontSize: 12,
    fill: tokens['ink-3'] || 'CanvasText',
    fontVariantNumeric: 'tabular-nums',
  }
}
