import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = process.env.CODEPULSE_DATA_DIR || join(backendRoot, 'data')
const usersFile = join(dataDir, 'users.json')

async function readUsers() {
  try {
    const content = await readFile(usersFile, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function writeUsers(users) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(usersFile, `${JSON.stringify(users, null, 2)}\n`, 'utf8')
}

export async function countUsers() {
  const users = await readUsers()
  return users.length
}

export async function findUserByEmail(email) {
  const users = await readUsers()
  return users.find(user => user.email === email) || null
}

export async function createUser({ name, email, passwordHash }) {
  const users = await readUsers()

  if (users.some(user => user.email === email)) {
    const error = new Error('Duplicate email')
    error.code = 'DUPLICATE_EMAIL'
    throw error
  }

  const user = {
    id: randomUUID(),
    name,
    email,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  }

  users.push(user)
  await writeUsers(users)
  return user
}
