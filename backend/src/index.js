import bcrypt from 'bcryptjs'
import express from 'express'
import { ensureIndexes, getUsersCollection, pingDatabase } from './db.js'

const app = express()
const port = Number(process.env.API_PORT || process.env.PORT || 3000)

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
    id: row._id.toString(),
    name: row.name,
    email: row.email,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

app.get('/api/health', async (_request, response, next) => {
  try {
    await pingDatabase()
    const users = await getUsersCollection()
    response.json({
      status: 'ok',
      store: 'mongodb',
      users: await users.estimatedDocumentCount(),
    })
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
    const users = await getUsersCollection()
    const createdAt = new Date()
    const result = await users.insertOne({
      name,
      email,
      password_hash: passwordHash,
      created_at: createdAt,
    })

    response.status(201).json({
      message: 'Account created.',
      user: toPublicUser({
        _id: result.insertedId,
        name,
        email,
        created_at: createdAt,
      }),
    })
  } catch (error) {
    if (error.code === 11000) {
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

    const users = await getUsersCollection()
    const user = await users.findOne({ email })

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

ensureIndexes().catch(error => {
  console.error('MongoDB index setup failed:', error.message)
})
