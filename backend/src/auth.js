import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { one } from './db.js'
import { bad } from './http.js'

const SECRET = process.env.JWT_SECRET || 'wea-local-defense-secret'

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10)
}

export function checkPassword(password, hash) {
  return bcrypt.compareSync(password, hash)
}

export function signUser(user) {
  return jwt.sign({ uid: user.id }, SECRET, { expiresIn: '12h' })
}

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    regionId: row.region_id,
    regionName: row.region_name || null,
    createdAt: row.created_at,
  }
}

export async function userById(id) {
  return one(
    `SELECT u.*, r.name AS region_name
     FROM users u
     LEFT JOIN regions r ON r.id = u.region_id
     WHERE u.id = $1`,
    [id],
  )
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) {
    res.status(401).json({ error: 'Kirish talab qilinadi' })
    return
  }
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await userById(payload.uid)
    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Sessiya yaroqsiz' })
      return
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Sessiya yaroqsiz' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Bu amal uchun ruxsat yo'q" })
      return
    }
    next()
  }
}

export function assertPassword(password) {
  if (!password || String(password).length < 8) {
    throw bad("Parol kamida 8 ta belgidan iborat bo'lsin")
  }
}
