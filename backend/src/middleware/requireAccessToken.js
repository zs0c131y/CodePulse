import { ObjectId } from 'mongodb'
import { getUsersCollection } from '../db/index.js'
import { verifyAccessToken } from '../utils/token.js'

export async function requireAccessToken(request, response, next) {
  try {
    const header = request.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    const claims = verifyAccessToken(token)
    const users = await getUsersCollection()
    const user = await users.findOne({ _id: new ObjectId(claims.sub), email_verified: true })

    if (!user) {
      response.status(401).json({ message: 'Authentication is required.' })
      return
    }

    request.user = user
    next()
  } catch {
    response.status(401).json({ message: 'Authentication is required.' })
  }
}
