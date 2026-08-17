import bcrypt from 'bcryptjs'

const oauthOnlyPasswordHash = '$2b$12$B/kvN2cVeJAVAWykoqS5U.nh1V06wt1cKpeRIdRgOCyq4n0E97HXy'

/**
 * Always runs one bcrypt comparison so unknown and OAuth-only accounts follow
 * the same expensive failure path without passing null into bcrypt.
 */
export async function passwordMatchesUser(password, user, compare = bcrypt.compare) {
  const hasPassword = typeof user?.password_hash === 'string'
  const matches = await compare(password, hasPassword ? user.password_hash : oauthOnlyPasswordHash)
  return Boolean(user && hasPassword && matches)
}
