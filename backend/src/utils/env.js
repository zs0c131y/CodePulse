import fs from 'node:fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Resolve .env relative to this file (backend/.env), not process.cwd() — running
// from a different working directory would otherwise make dotenv miss it
// entirely and silently fall back to unset env vars.
const targetFile = fileURLToPath(new URL('../.env', import.meta.url))
const otherFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (fs.existsSync(targetFile)) {
    dotenv.config({ path: targetFile, quiet: true })
} else if (fs.existsSync(otherFile)) {
    dotenv.config({ path: otherFile, quiet: true })
} else {
    console.log(`No .env file found at ${targetFile}; using process environment as-is.`)
}
