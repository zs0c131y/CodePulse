import fs from 'node:fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Resolve .env relative to this file, not process.cwd(); running from a
// different working directory would otherwise make dotenv miss it.
const backendEnvFile = fileURLToPath(new URL('../../.env', import.meta.url))
const legacySrcEnvFile = fileURLToPath(new URL('../.env', import.meta.url))
const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url))

if (fs.existsSync(backendEnvFile)) {
    dotenv.config({ path: backendEnvFile, quiet: true })
} else if (fs.existsSync(legacySrcEnvFile)) {
    dotenv.config({ path: legacySrcEnvFile, quiet: true })
} else if (fs.existsSync(rootEnvFile)) {
    dotenv.config({ path: rootEnvFile, quiet: true })
} else {
    console.log(`No .env file found at ${backendEnvFile}; using process environment as-is.`)
}
