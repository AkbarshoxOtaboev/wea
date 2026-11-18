import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seed } from './seed.js'
import { bad, limit, readOptionalDate, readOptionalInt, wrap } from './http.js'
import { checkPassword, publicUser, requireAuth, requireRole, signUser, userById } from './auth.js'
import { one, query } from './db.js'
import {
  audit,
  changeOwnPassword,
  createMeasurement,
  createStation,
  createUser,
  dashboard,
  deleteMeasurement,
  deleteStation,
  exportMeasurements,
  getStation,
  importCsv,
  listAudit,
  listMeasurements,
  listNorms,
  listRegions,
  listStations,
  listUsers,
  publicOverview,
  registerUser,
  report,
  setUserPassword,
  templateCsv,
  updateMeasurement,
  updateNorm,
  updateProfile,
  updateStation,
  updateUser,
} from './data.js'

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '2mb' }))

function scope(req) {
  if (req.user?.role === 'government') {
    return {
      regionId: req.user.region_id || -1,
      stationId: readOptionalInt(req.query.stationId),
      from: readOptionalDate(req.query.from),
      to: readOptionalDate(req.query.to, true),
      type: ['water', 'air', 'earth'].includes(req.query.type) ? req.query.type : null,
      q: req.query.q || null,
    }
  }
  return {
    regionId: readOptionalInt(req.query.regionId),
    stationId: readOptionalInt(req.query.stationId),
    from: readOptionalDate(req.query.from),
    to: readOptionalDate(req.query.to, true),
    type: ['water', 'air', 'earth'].includes(req.query.type) ? req.query.type : null,
    q: req.query.q || null,
  }
}

app.get('/api/health', wrap(async (_req, res) => {
  res.json({ ok: true, name: 'WEA' })
}))

app.get('/api/regions', wrap(async (_req, res) => {
  res.json(await listRegions())
}))

app.get('/api/norms', wrap(async (req, res) => {
  res.json(await listNorms(req.query.module || null))
}))

app.get('/api/public/overview', wrap(async (_req, res) => {
  res.json(await publicOverview())
}))

app.get('/api/public/stations', wrap(async (_req, res) => {
  res.json(await listStations({}))
}))

app.post('/api/public/contact', limit, wrap(async (req, res) => {
  const fullName = String(req.body.fullName || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const phone = String(req.body.phone || '').trim()
  const message = String(req.body.message || '').trim()
  if (fullName.length < 2 || !email.includes('@') || phone.length < 5 || message.length < 5) {
    throw bad('Ism, email, telefon va xabar kerak')
  }
  const row = await one(
    `INSERT INTO contact_messages (full_name, email, phone, message)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [fullName, email, phone.slice(0, 40), message.slice(0, 2000)],
  )
  res.status(201).json(row)
}))

app.post('/api/auth/login', limit, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const user = await one(
    `SELECT u.*, r.name AS region_name
     FROM users u LEFT JOIN regions r ON r.id = u.region_id
     WHERE email = $1`,
    [email],
  )
  if (!user || !checkPassword(req.body.password || '', user.password_hash)) {
    throw bad("Email yoki parol noto'g'ri", 401)
  }
  if (user.status !== 'active') throw bad('Hisob bloklangan', 403)
  await audit(user.id, 'login', 'user', user.id, email)
  res.json({ token: signUser(user), user: publicUser(user) })
}))

app.post('/api/auth/register', limit, wrap(async (req, res) => {
  const created = await registerUser(req.body)
  const user = await userById(created.id)
  await audit(user.id, 'register', 'user', user.id, user.email)
  res.status(201).json({ token: signUser(user), user: publicUser(user) })
}))

app.use('/api', requireAuth)

app.get('/api/auth/me', wrap(async (req, res) => {
  res.json(publicUser(req.user))
}))

app.patch('/api/auth/profile', wrap(async (req, res) => {
  await updateProfile(req.user, req.body.fullName)
  await audit(req.user.id, 'update', 'user', req.user.id, 'profil')
  res.json(publicUser(await userById(req.user.id)))
}))

app.post('/api/auth/password', wrap(async (req, res) => {
  await changeOwnPassword(req.user, req.body.current, req.body.next)
  await audit(req.user.id, 'update', 'user', req.user.id, 'parol')
  res.json({ ok: true })
}))

app.get('/api/dashboard', wrap(async (req, res) => {
  res.json(await dashboard(scope(req)))
}))

app.get('/api/stations', wrap(async (req, res) => {
  res.json(await listStations(scope(req)))
}))

app.get('/api/stations/:id', wrap(async (req, res) => {
  res.json(await getStation(Number(req.params.id), scope(req)))
}))

app.post('/api/stations', requireRole('admin'), wrap(async (req, res) => {
  const station = await createStation(req.body)
  await audit(req.user.id, 'create', 'station', station.id, station.name)
  res.status(201).json(station)
}))

app.patch('/api/stations/:id', requireRole('admin'), wrap(async (req, res) => {
  const station = await updateStation(Number(req.params.id), req.body)
  await audit(req.user.id, 'update', 'station', station.id, station.name)
  res.json(station)
}))

app.delete('/api/stations/:id', requireRole('admin'), wrap(async (req, res) => {
  const id = Number(req.params.id)
  await deleteStation(id)
  await audit(req.user.id, 'delete', 'station', id, '')
  res.status(204).end()
}))

app.get('/api/measurements/:module', wrap(async (req, res) => {
  res.json(await listMeasurements(req.params.module, scope(req)))
}))

app.post('/api/measurements/:module', requireRole('admin', 'specialist'), wrap(async (req, res) => {
  const row = await createMeasurement(req.params.module, req.body, req.user)
  await audit(req.user.id, 'create', req.params.module, row.id, row.station_name)
  res.status(201).json(row)
}))

app.patch('/api/measurements/:module/:id', requireRole('admin', 'specialist'), wrap(async (req, res) => {
  const row = await updateMeasurement(req.params.module, Number(req.params.id), req.body, req.user)
  await audit(req.user.id, 'update', req.params.module, row.id, row.station_name)
  res.json(row)
}))

app.delete('/api/measurements/:module/:id', requireRole('admin', 'specialist'), wrap(async (req, res) => {
  const id = Number(req.params.id)
  await deleteMeasurement(req.params.module, id)
  await audit(req.user.id, 'delete', req.params.module, id, '')
  res.status(204).end()
}))

app.post('/api/measurements/:module/import', requireRole('admin', 'specialist'), wrap(async (req, res) => {
  const result = await importCsv(req.params.module, req.body.csv || '', req.user)
  await audit(req.user.id, 'import', req.params.module, null, `${result.inserted} qator`)
  res.json(result)
}))

app.get('/api/measurements/:module/template', wrap(async (req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="wea-${req.params.module}-namuna.csv"`)
  res.send(templateCsv(req.params.module))
}))

app.get('/api/measurements/:module/export', wrap(async (req, res) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv'
  const file = await exportMeasurements(req.params.module, scope(req), format)
  res.setHeader('Content-Type', file.type)
  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
  res.send(file.buffer)
}))

app.get('/api/reports/:module', wrap(async (req, res) => {
  res.json(await report(req.params.module, scope(req)))
}))

app.put('/api/norms/:id', requireRole('admin'), wrap(async (req, res) => {
  const norm = await updateNorm(Number(req.params.id), req.body)
  await audit(req.user.id, 'update', 'norm', norm.id, norm.label)
  res.json(norm)
}))

app.get('/api/users', requireRole('admin'), wrap(async (_req, res) => {
  const rows = await listUsers()
  res.json(rows.map(publicUser))
}))

app.post('/api/users', requireRole('admin'), wrap(async (req, res) => {
  const user = await createUser(req.body)
  await audit(req.user.id, 'create', 'user', user.id, user.email)
  res.status(201).json(publicUser(user))
}))

app.patch('/api/users/:id', requireRole('admin'), wrap(async (req, res) => {
  const user = await updateUser(Number(req.params.id), req.body, req.user)
  await audit(req.user.id, 'update', 'user', user.id, user.email)
  res.json(publicUser(user))
}))

app.post('/api/users/:id/password', requireRole('admin'), wrap(async (req, res) => {
  const id = Number(req.params.id)
  await setUserPassword(id, req.body.password)
  await audit(req.user.id, 'update', 'user', id, 'parol tiklandi')
  res.json({ ok: true })
}))

app.get('/api/audit', requireRole('admin'), wrap(async (_req, res) => {
  res.json(await listAudit())
}))

app.get('/api/messages', requireRole('admin'), wrap(async (_req, res) => {
  res.json(await query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200'))
}))

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Topilmadi' })
})

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'), (error) => error && next())
  })
}

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error)
  const status = error.status || 500
  if (status === 500) console.error(error)
  res.status(status).json({ error: status === 500 ? 'Server xatoligi' : error.message })
})

const port = Number(process.env.PORT || 4000)

seed()
  .then(() => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`WEA API http://127.0.0.1:${port}`)
    })
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
