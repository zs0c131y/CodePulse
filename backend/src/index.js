import bcrypt from 'bcryptjs'
import express from 'express'
import { countUsers, createUser, findUserByEmail } from './userStore.js'

const app = express()
const port = Number(process.env.API_PORT || process.env.PORT || 4000)

app.use(express.json({ limit: '1mb' }))

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function validatePassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    /\d/.test(password) &&
    /[A-Z]/.test(password)
  )
}

function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  }
}

app.get('/api/health', async (_request, response, next) => {
  try {
    const users = await countUsers()
    response.json({ status: 'ok', store: 'local-json', users })
  } catch (error) {
    next(error)
  }
})

app.post('/api/auth/signup', async (request, response, next) => {
  try {
    const name = String(request.body.name || '').trim()
    const email = normalizeEmail(request.body.email)
    const password = request.body.password

    if (!name || !email || !validatePassword(password)) {
      response.status(400).json({
        message:
          'Name, valid email, and a password with 8+ characters, one number, and one uppercase letter are required.',
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await createUser({ name, email, passwordHash })

    response.status(201).json({
      message: 'Account created.',
      user: toPublicUser(user),
    })
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      response.status(409).json({ message: 'An account already exists for this email.' })
      return
    }

    next(error)
  }
})

app.post('/api/auth/signin', async (request, response, next) => {
  try {
    const email = normalizeEmail(request.body.email)
    const password = request.body.password

    if (!email || typeof password !== 'string') {
      response.status(400).json({ message: 'Email and password are required.' })
      return
    }

    const user = await findUserByEmail(email)

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      response.status(401).json({ message: 'Invalid email or password.' })
      return
    }

    response.json({
      message: 'Signed in.',
      user: toPublicUser(user),
    })
  } catch (error) {
    next(error)
  }
})

app.use((_request, response) => {
  response.status(404).json({ message: 'Route not found.' })
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({ message: 'Unexpected server error.' })
})

app.listen(port, () => {
  console.log(`CodePulse API listening on http://localhost:${port}`)
})
