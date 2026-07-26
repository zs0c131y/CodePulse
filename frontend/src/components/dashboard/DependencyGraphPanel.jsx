import { useId, useMemo, useState } from 'react'
import { Network } from 'lucide-react'
import { EmptyPanel } from './shared'

function shortName(path) {
  const parts = String(path || '').split('/')
  return parts[parts.length - 1] || 'unknown'
}

export default function DependencyGraphPanel({ edges = [], total = 0 }) {
  const [view, setView] = useState('graph')
  const titleId = useId()
  const graph = useMemo(() => {
    const visibleEdges = edges.slice(0, 28)
    const names = [...new Set(visibleEdges.flatMap(edge => [edge.sourceFile, edge.targetFile]).filter(Boolean))].slice(0, 18)
    const nodes = names.map((name, index) => {
      const angle = (index / Math.max(names.length, 1)) * Math.PI * 2 - Math.PI / 2
      return {
        name,
        x: 300 + Math.cos(angle) * 205,
        y: 170 + Math.sin(angle) * 125,
      }
    })
    const byName = new Map(nodes.map(node => [node.name, node]))
    return {
      nodes,
      edges: visibleEdges.filter(edge => byName.has(edge.sourceFile) && byName.has(edge.targetFile)),
      byName,
    }
  }, [edges])

  if (edges.length === 0) {
    return (
      <EmptyPanel
        title="No dependency edges found"
        description="Import relationships appear here after Repository Intelligence maps supported JavaScript, TypeScript, or Python sources."
        icon={Network}
      />
    )
  }

  return (
    <section className="panel min-w-0 p-5 sm:p-6" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-sm font-semibold text-[var(--ink-1)]">Dependency graph</h3>
          <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--ink-3)]">
            {total || edges.length} stored import edges. Showing a readable subset of the graph.
          </p>
        </div>
        <div className="inline-flex rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-2)] p-0.5" role="group" aria-label="Dependency graph view">
          {['graph', 'table'].map(option => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={view === option
                ? 'rounded-[var(--r-sm)] bg-[var(--surface-1)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--ink-1)] shadow-[var(--shadow-e1)]'
                : 'rounded-[var(--r-sm)] px-2.5 py-1 text-xs font-medium capitalize text-[var(--ink-3)] hover:text-[var(--ink-1)]'}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {view === 'graph' ? (
        <div className="mt-5 overflow-hidden rounded-[var(--r-md)] border border-[var(--line-1)] bg-[var(--surface-sunken)]">
          <svg
            viewBox="0 0 600 340"
            className="h-auto min-h-72 w-full"
            role="img"
            aria-label={`Dependency graph with ${graph.nodes.length} visible files and ${graph.edges.length} visible import edges.`}
          >
            {graph.edges.map((edge, index) => {
              const source = graph.byName.get(edge.sourceFile)
              const target = graph.byName.get(edge.targetFile)
              return (
                <line
                  key={`${edge.sourceFile}-${edge.targetFile}-${index}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  strokeWidth="1.25"
                  strokeDasharray={edge.resolved ? undefined : '4 4'}
                  style={{ stroke: edge.resolved ? 'var(--line-3)' : 'var(--sev-medium)' }}
                />
              )
            })}
            {graph.nodes.map((node, index) => (
              <g key={node.name}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="7"
                  strokeWidth="3"
                  style={{
                    fill: `var(--series-${(index % 6) + 1})`,
                    stroke: 'var(--surface-1)',
                  }}
                />
                <text
                  x={node.x}
                  y={node.y + (node.y < 170 ? -14 : 22)}
                  textAnchor="middle"
                  fontSize="10"
                  style={{ fill: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}
                >
                  {shortName(node.name).slice(0, 22)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="mt-5 max-h-80 overflow-auto rounded-[var(--r-md)] border border-[var(--line-1)]">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <caption className="sr-only">Stored dependency edges</caption>
            <thead className="sticky top-0 bg-[var(--surface-2)]">
              <tr className="overline text-[var(--ink-3)]">
                <th className="px-3 py-2 font-semibold">Source</th>
                <th className="px-3 py-2 font-semibold">Target</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Resolution</th>
              </tr>
            </thead>
            <tbody>
              {edges.map((edge, index) => (
                <tr key={`${edge.sourceFile}-${edge.targetFile}-${index}`} className="border-t border-[var(--line-1)]">
                  <td className="max-w-64 truncate px-3 py-2 font-mono text-xs text-[var(--ink-2)]">{edge.sourceFile}</td>
                  <td className="max-w-64 truncate px-3 py-2 font-mono text-xs text-[var(--ink-2)]">{edge.targetFile || edge.importPath}</td>
                  <td className="px-3 py-2 text-[var(--ink-3)]">{edge.type || 'import'}</td>
                  <td className="px-3 py-2 text-[var(--ink-3)]">{edge.resolved ? 'Resolved' : 'Unresolved'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
