const dependencyFieldsByKind = [
  ['dependency', 'dependencies'],
  ['devDependency', 'devDependencies'],
]

export function parsePackageJsonManifest(content) {
  let data

  try {
    data = JSON.parse(content)
  } catch {
    return null
  }

  if (!data || typeof data !== 'object') return null

  const dependencies = []

  for (const [kind, field] of dependencyFieldsByKind) {
    for (const [name, version] of Object.entries(data[field] || {})) {
      dependencies.push({ name, version: String(version), kind })
    }
  }

  return {
    path: 'package.json',
    type: 'npm',
    name: data.name || null,
    version: data.version || null,
    dependencies,
  }
}

const requirementLinePattern = /^([A-Za-z0-9_.\-[\]]+)\s*(==|>=|<=|~=|!=|>|<)?\s*([^\s;]*)/

export function parseRequirementsTxtManifest(content) {
  const dependencies = []

  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (!line || line.startsWith('-')) continue

    const match = line.match(requirementLinePattern)
    if (!match) continue

    const [, name, operator, version] = match
    dependencies.push({
      name,
      version: operator && version ? `${operator}${version}` : null,
      kind: 'dependency',
    })
  }

  return {
    path: 'requirements.txt',
    type: 'pip',
    name: null,
    version: null,
    dependencies,
  }
}
