import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config({ quiet: true })

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/codepulse'
const databaseName = process.env.MONGO_DB_NAME || 'codepulse'

const client = new MongoClient(mongoUri, {
  serverSelectionTimeoutMS: 5000,
})

let database

export async function getDatabase() {
  if (!database) {
    await client.connect()
    database = client.db(databaseName)
  }

  return database
}

export async function getUsersCollection() {
  const db = await getDatabase()
  return db.collection('users')
}

export async function ensureIndexes() {
  const users = await getUsersCollection()
  await users.createIndex({ email: 1 }, { unique: true })
}

export async function pingDatabase() {
  const db = await getDatabase()
  await db.command({ ping: 1 })
}
