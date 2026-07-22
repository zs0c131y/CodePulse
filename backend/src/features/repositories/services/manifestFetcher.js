import { parsePackageJsonManifest, parseRequirementsTxtManifest } from './manifestParser.js'

const knownManifestFiles = [
  { path: 'package.json', parse: parsePackageJsonManifest },
  { path: 'requirements.txt', parse: parseRequirementsTxtManifest },
]

function buildRawContentUrl(repoFullName, ref, path) {
  return `https://raw.githubusercontent.com/${repoFullName}/${ref}/${path}`
}

export async function fetchRepositoryManifests({ repoFullName, defaultBranch, fetchImpl = fetch }) {
  if (!repoFullName) return []

  const ref = defaultBranch || 'main'
  const manifests = []

  for (const manifestFile of knownManifestFiles) {
    const url = buildRawContentUrl(repoFullName, ref, manifestFile.path)
    let response

    try {
      response = await fetchImpl(url)
    } catch {
      continue
    }

    if (!response.ok) continue

    const content = await response.text()
    const parsed = manifestFile.parse(content)
    if (parsed) manifests.push(parsed)
  }

  return manifests
}
