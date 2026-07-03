import { pingDatabase, getUsersCollection } from '../../db/index.js'

export async function checkHealth(_request, response, next) {
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
}
