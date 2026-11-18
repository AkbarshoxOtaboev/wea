export function bad(message, status = 400) {
  const error = new Error(message)
  error.status = status
  return error
}

export function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

const hits = new Map()

export function limit(req, res, next) {
  const key = req.ip || 'local'
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((time) => now - time < 10 * 60 * 1000)
  if (recent.length >= 40) {
    res.status(429).json({ error: "Juda ko'p urinish. Biroz kuting." })
    return
  }
  recent.push(now)
  hits.set(key, recent)
  next()
}

export function readOptionalInt(value) {
  if (value == null || value === '') return null
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) throw bad("Raqam noto'g'ri")
  return number
}

export function readOptionalDate(value, end = false) {
  if (value == null || value === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? `${value}T23:59:59+05:00` : `${value}T00:00:00+05:00`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw bad("Sana noto'g'ri")
  return date.toISOString()
}
