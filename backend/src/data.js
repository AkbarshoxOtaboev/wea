import ExcelJS from 'exceljs'
import { one, query } from './db.js'
import { bad } from './http.js'
import { MODULES, ROLES, moduleOf } from './modules.js'
import { aqiCategory, computeAqi } from './aqi.js'
import { assertPassword, hashPassword } from './auth.js'

export function assertModule(name) {
  const meta = moduleOf(name)
  if (!meta) throw bad('Modul topilmadi', 404)
  return meta
}

function whereOf(filter, options = {}) {
  const parts = []
  const params = []
  const add = (clause, value) => {
    if (value == null || value === '') return
    params.push(value)
    parts.push(clause.replaceAll('$?', `$${params.length}`))
  }
  add('s.region_id = $?', filter.regionId)
  add('s.type = $?', filter.type)
  add('d.station_id = $?', filter.stationId)
  add('d.measured_at >= $?', filter.from)
  add('d.measured_at <= $?', filter.to)
  if (filter.q) add('s.name ILIKE $?', `%${String(filter.q).slice(0, 80)}%`)
  if (options.stationOnly) {
    const stationParts = parts.filter((part) => !part.startsWith('d.'))
    const stationParams = []
    const rebuilt = []
    let index = 0
    const source = []
    if (filter.regionId) source.push(['s.region_id = $?', filter.regionId])
    if (filter.type) source.push(['s.type = $?', filter.type])
    if (filter.q) source.push(['s.name ILIKE $?', `%${String(filter.q).slice(0, 80)}%`])
    for (const [clause, value] of source) {
      index += 1
      stationParams.push(value)
      rebuilt.push(clause.replaceAll('$?', `$${index}`))
    }
    return {
      sql: rebuilt.length ? `WHERE ${rebuilt.join(' AND ')}` : '',
      params: stationParams,
    }
  }
  return {
    sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '',
    params,
  }
}

export function judge(value, norm) {
  if (value == null || !norm) return { uz: null, intl: null }
  return {
    uz: band(Number(value), norm.uz_min, norm.uz_max),
    intl: band(Number(value), norm.intl_min, norm.intl_max),
  }
}

function band(value, min, max) {
  if (min == null && max == null) return null
  if (min != null && value < Number(min)) return 'out'
  if (max != null && value > Number(max)) return 'out'
  return 'ok'
}

function rollup(flags) {
  let uz = 'none'
  let intl = 'none'
  for (const flag of Object.values(flags)) {
    if (flag.uz === 'out') uz = 'out'
    else if (flag.uz === 'ok' && uz !== 'out') uz = 'ok'
    if (flag.intl === 'out') intl = 'out'
    else if (flag.intl === 'ok' && intl !== 'out') intl = 'ok'
  }
  const state = uz === 'out' || intl === 'out' ? 'out' : uz === 'ok' || intl === 'ok' ? 'ok' : 'none'
  return { uz, intl, state }
}

export async function normsFor(module) {
  return query('SELECT * FROM norms WHERE module = $1 ORDER BY id', [module])
}

export async function listNorms(module) {
  if (module) {
    assertModule(module)
    return normsFor(module)
  }
  return query('SELECT * FROM norms ORDER BY module, id')
}

function decorate(row, meta, norms) {
  const flags = {}
  for (const field of meta.fields) {
    const norm = norms.find((item) => item.indicator === field.key)
    flags[field.key] = judge(row[field.key], norm)
  }
  const summary = rollup(flags)
  return {
    ...row,
    flags,
    ...summary,
    aqiCategory: row.aqi == null ? null : aqiCategory(Number(row.aqi)),
  }
}

function summaryLine(module, row) {
  const num = (value) => (value == null ? '—' : Number(value))
  if (module === 'water') return `pH ${num(row.ph)} · nitrat ${num(row.nitrate)} mg/l`
  if (module === 'air') return `PM2.5 ${num(row.pm25)} · AQI ${num(row.aqi)}`
  return `pH ${num(row.ph)} · organik ${num(row.organic_matter)}%`
}

async function latestMap(filter) {
  const map = new Map()
  for (const module of Object.keys(MODULES)) {
    const meta = MODULES[module]
    const norms = await normsFor(module)
    const { sql, params } = whereOf({ ...filter, type: null }, {})
    const moduleSql = sql
      ? `${sql} AND s.type = $${params.length + 1}`
      : 'WHERE s.type = $1'
    const moduleParams = sql ? [...params, module] : [module]
    const rows = await query(
      `SELECT DISTINCT ON (d.station_id)
          d.*, s.name AS station_name, s.type, r.name AS region_name, r.id AS region_id
       FROM ${meta.table} d
       JOIN stations s ON s.id = d.station_id
       JOIN regions r ON r.id = s.region_id
       ${moduleSql}
       ORDER BY d.station_id, d.measured_at DESC`,
      moduleParams,
    )
    for (const row of rows) {
      const decorated = decorate(row, meta, norms)
      map.set(row.station_id, {
        measuredAt: row.measured_at,
        uz: decorated.uz,
        intl: decorated.intl,
        state: decorated.state,
        summary: summaryLine(module, row),
        module,
      })
    }
  }
  return map
}

export async function listRegions() {
  return query('SELECT id, name, code, lat, lng FROM regions ORDER BY name')
}

export async function listStations(filter) {
  const { sql, params } = whereOf(filter, { stationOnly: true })
  const stations = await query(
    `SELECT s.*, r.name AS region_name
     FROM stations s
     JOIN regions r ON r.id = s.region_id
     ${sql}
     ORDER BY s.type, s.name`,
    params,
  )
  const latest = await latestMap(filter)
  return stations.map((station) => ({
    ...station,
    latest: latest.get(station.id) || null,
  }))
}

export async function getStation(id, filter) {
  const params = [id]
  let regionSql = ''
  if (filter.regionId) {
    params.push(filter.regionId)
    regionSql = `AND s.region_id = $${params.length}`
  }
  const station = await one(
    `SELECT s.*, r.name AS region_name
     FROM stations s
     JOIN regions r ON r.id = s.region_id
     WHERE s.id = $1 ${regionSql}`,
    params,
  )
  if (!station) throw bad('Stansiya topilmadi', 404)
  const readings = await listMeasurements(station.type, { ...filter, stationId: id }, 100)
  return { ...station, readings }
}

function readCoord(value, kind) {
  const number = Number(value)
  if (!Number.isFinite(number)) throw bad(kind === 'lat' ? "Kenglik noto'g'ri" : "Uzunlik noto'g'ri")
  if (kind === 'lat' && (number < 37 || number > 46.5)) {
    throw bad("Kenglik O'zbekiston atrofida bo'lishi kerak (37–46.5)")
  }
  if (kind === 'lng' && (number < 55 || number > 74)) {
    throw bad("Uzunlik O'zbekiston atrofida bo'lishi kerak (55–74)")
  }
  return number
}

export async function createStation(body) {
  const name = String(body.name || '').trim()
  if (name.length < 3) throw bad('Stansiya nomi kamida 3 ta belgi')
  if (!MODULES[body.type]) throw bad("Stansiya turi: suv, havo yoki tuproq")
  const region = await one('SELECT id FROM regions WHERE id = $1', [Number(body.regionId)])
  if (!region) throw bad('Hudud topilmadi', 404)
  const description = String(body.description || '').trim().slice(0, 500)
  const row = await one(
    `INSERT INTO stations (name, type, region_id, lat, lng, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [name, body.type, region.id, readCoord(body.lat, 'lat'), readCoord(body.lng, 'lng'), description],
  )
  return getStation(row.id, {})
}

export async function updateStation(id, body) {
  const current = await one('SELECT * FROM stations WHERE id = $1', [id])
  if (!current) throw bad('Stansiya topilmadi', 404)
  const name = String(body.name ?? current.name).trim()
  const type = body.type ?? current.type
  if (name.length < 3) throw bad('Stansiya nomi kamida 3 ta belgi')
  if (!MODULES[type]) throw bad("Stansiya turi noto'g'ri")
  const regionId = Number(body.regionId ?? current.region_id)
  const region = await one('SELECT id FROM regions WHERE id = $1', [regionId])
  if (!region) throw bad('Hudud topilmadi', 404)
  if (type !== current.type) {
    const used = await one(
      `SELECT
         (SELECT COUNT(*)::int FROM water_data WHERE station_id = $1) +
         (SELECT COUNT(*)::int FROM air_data WHERE station_id = $1) +
         (SELECT COUNT(*)::int FROM earth_data WHERE station_id = $1) AS n`,
      [id],
    )
    if (used.n > 0) throw bad("O'lchovi bor stansiya turini o'zgartirib bo'lmaydi")
  }
  await query(
    `UPDATE stations SET name=$1, type=$2, region_id=$3, lat=$4, lng=$5, description=$6 WHERE id=$7`,
    [
      name,
      type,
      region.id,
      readCoord(body.lat ?? current.lat, 'lat'),
      readCoord(body.lng ?? current.lng, 'lng'),
      String(body.description ?? current.description).trim().slice(0, 500),
      id,
    ],
  )
  return getStation(id, {})
}

export async function deleteStation(id) {
  const row = await one('DELETE FROM stations WHERE id = $1 RETURNING id', [id])
  if (!row) throw bad('Stansiya topilmadi', 404)
}

function readNumber(raw, field) {
  if (raw == null || raw === '') return null
  const number = Number(String(raw).replace(',', '.'))
  if (!Number.isFinite(number)) throw bad(`${field.label} son bo'lishi kerak`)
  if (field.min != null && number < field.min) throw bad(`${field.label} juda kichik`)
  if (field.max != null && number > field.max) throw bad(`${field.label} juda katta`)
  return Math.round(number * 1000) / 1000
}

async function stationForModule(module, stationId, regionId) {
  const station = await one('SELECT * FROM stations WHERE id = $1', [stationId])
  if (!station) throw bad('Stansiya topilmadi', 404)
  if (station.type !== module) throw bad('Stansiya turi bu modulga mos emas')
  if (regionId && station.region_id !== regionId) throw bad('Bu hudud uchun ruxsat yoʻq', 403)
  return station
}

function valuesFrom(meta, body) {
  const values = {}
  for (const field of meta.fields) values[field.key] = readNumber(body[field.key], field)
  if (meta.fields.every((field) => values[field.key] == null)) {
    throw bad("Kamida bitta ko'rsatkich kiriting")
  }
  return values
}

async function measurementById(module, id) {
  const rows = await listMeasurements(module, {}, 2000)
  return rows.find((row) => Number(row.id) === Number(id)) || null
}

export async function listMeasurements(module, filter, limit = 500) {
  const meta = assertModule(module)
  const norms = await normsFor(module)
  const { sql, params } = whereOf(filter)
  const rows = await query(
    `SELECT d.*, s.name AS station_name, s.type, r.name AS region_name, r.id AS region_id,
            u.full_name AS author
     FROM ${meta.table} d
     JOIN stations s ON s.id = d.station_id
     JOIN regions r ON r.id = s.region_id
     LEFT JOIN users u ON u.id = d.created_by
     ${sql}
     ORDER BY d.measured_at DESC
     LIMIT ${Number(limit)}`,
    params,
  )
  return rows.map((row) => decorate(row, meta, norms))
}

export async function createMeasurement(module, body, user) {
  const meta = assertModule(module)
  const measuredAt = new Date(body.measuredAt || body.measured_at)
  if (Number.isNaN(measuredAt.getTime())) throw bad('Sana kiriting')
  const station = await stationForModule(module, Number(body.stationId || body.station_id), user.role === 'government' ? user.region_id : null)
  const values = valuesFrom(meta, body)
  const columns = ['station_id', 'measured_at', ...meta.fields.map((field) => field.key), 'created_by']
  const params = [station.id, measuredAt.toISOString(), ...meta.fields.map((field) => values[field.key]), user.id]
  if (module === 'air') {
    const aqi = computeAqi(values.pm25, values.pm10)
    columns.push('aqi', 'aqi_pollutant')
    params.push(aqi.aqi, aqi.pollutant)
  }
  const marks = params.map((_, index) => `$${index + 1}`).join(', ')
  const row = await one(
    `INSERT INTO ${meta.table} (${columns.join(', ')}) VALUES (${marks}) RETURNING id`,
    params,
  )
  return measurementById(module, row.id)
}

export async function updateMeasurement(module, id, body, user) {
  const meta = assertModule(module)
  const current = await one(`SELECT * FROM ${meta.table} WHERE id = $1`, [id])
  if (!current) throw bad("O'lchov topilmadi", 404)
  const stationId = Number(body.stationId || body.station_id || current.station_id)
  const station = await stationForModule(module, stationId, user.role === 'government' ? user.region_id : null)
  const measuredAt = new Date(body.measuredAt || body.measured_at || current.measured_at)
  if (Number.isNaN(measuredAt.getTime())) throw bad("Sana noto'g'ri")
  const merged = { ...current, ...body }
  const values = valuesFrom(meta, merged)
  const sets = ['station_id = $1', 'measured_at = $2']
  const params = [station.id, measuredAt.toISOString()]
  for (const field of meta.fields) {
    params.push(values[field.key])
    sets.push(`${field.key} = $${params.length}`)
  }
  if (module === 'air') {
    const aqi = computeAqi(values.pm25, values.pm10)
    params.push(aqi.aqi, aqi.pollutant)
    sets.push(`aqi = $${params.length - 1}`, `aqi_pollutant = $${params.length}`)
  }
  params.push(id)
  await query(`UPDATE ${meta.table} SET ${sets.join(', ')} WHERE id = $${params.length}`, params)
  return measurementById(module, id)
}

export async function deleteMeasurement(module, id) {
  const meta = assertModule(module)
  const row = await one(`DELETE FROM ${meta.table} WHERE id = $1 RETURNING id`, [id])
  if (!row) throw bad("O'lchov topilmadi", 404)
}

function splitCsvLine(line) {
  const cells = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted && char === '"' && line[i + 1] === '"') {
      current += '"'
      i += 1
    } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else current += char
  }
  cells.push(current.trim())
  return cells
}

export async function importCsv(module, text, user) {
  const meta = assertModule(module)
  const lines = String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
  if (lines.length < 2) throw bad("CSV da sarlavha va kamida bitta qator bo'lishi kerak")
  if (lines.length > 501) throw bad('Bir martada 500 qatordan oshmasin')
  const headers = splitCsvLine(lines[0]).map((item) => item.trim())
  let inserted = 0
  const errors = []
  for (let index = 1; index < lines.length; index += 1) {
    const cells = splitCsvLine(lines[index])
    const record = {}
    headers.forEach((header, cellIndex) => {
      record[header] = cells[cellIndex] ?? ''
    })
    try {
      let stationId = Number(record.station_id)
      if (!stationId && record.station_name) {
        const station = await one(
          'SELECT id, type FROM stations WHERE lower(name) = lower($1)',
          [record.station_name],
        )
        if (!station) throw bad('Stansiya topilmadi')
        stationId = station.id
      }
      await createMeasurement(module, { ...record, stationId, measuredAt: record.measured_at }, user)
      inserted += 1
    } catch (error) {
      errors.push({ line: index + 1, message: error.message || 'Xato' })
    }
  }
  return { inserted, errors }
}

function statusText(value) {
  if (value === 'ok') return "me'yor"
  if (value === 'out') return 'tashqari'
  return '—'
}

function csvCell(value) {
  const raw = value == null ? '' : String(value)
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw
  if (/[",\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`
  return safe
}

export async function exportMeasurements(module, filter, format) {
  const meta = assertModule(module)
  const rows = await listMeasurements(module, filter, 2000)
  const headers = ['Sana', 'Stansiya', 'Hudud', ...meta.fields.map((field) => field.label)]
  if (module === 'air') headers.push('AQI', 'AQI toifa')
  headers.push("O'zbekiston", 'Xalqaro', 'Kiritgan')
  const matrix = rows.map((row) => {
    const line = [
      new Date(row.measured_at).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' }),
      row.station_name,
      row.region_name,
      ...meta.fields.map((field) => row[field.key] ?? ''),
    ]
    if (module === 'air') line.push(row.aqi ?? '', row.aqiCategory?.label || '')
    line.push(statusText(row.uz), statusText(row.intl), row.author || '')
    return line
  })
  const filename = `wea-${module}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(meta.title)
    sheet.addRow(headers)
    matrix.forEach((line) => sheet.addRow(line))
    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    return {
      name: filename,
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(buffer),
    }
  }
  const csv = `\uFEFF${[headers, ...matrix].map((line) => line.map(csvCell).join(',')).join('\n')}`
  return { name: filename, type: 'text/csv; charset=utf-8', buffer: Buffer.from(csv) }
}

export function templateCsv(module) {
  const meta = assertModule(module)
  const header = ['station_id', 'measured_at', ...meta.fields.map((field) => field.key)].join(',')
  return `\uFEFF${header}\n`
}

function dayKey(value) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' })
}

async function series(module, column, filter) {
  const meta = assertModule(module)
  const { sql, params } = whereOf({ ...filter, from: new Date(Date.now() - 60 * 86400000).toISOString() })
  const rows = await query(
    `SELECT d.measured_at, d.${column} AS value
     FROM ${meta.table} d
     JOIN stations s ON s.id = d.station_id
     ${sql}
     ORDER BY d.measured_at`,
    params,
  )
  const buckets = new Map()
  for (const row of rows) {
    if (row.value == null) continue
    const key = dayKey(row.measured_at)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(Number(row.value))
  }
  return [...buckets.entries()].map(([day, values]) => ({
    day: day.slice(5),
    value: Math.round((values.reduce((sum, item) => sum + item, 0) / values.length) * 10) / 10,
  }))
}

export async function dashboard(filter) {
  const stations = await listStations(filter)
  const counts = { water: 0, air: 0, earth: 0, out: 0, ok: 0 }
  const split = { bothOk: 0, onlyIntl: 0, onlyUz: 0, bothOut: 0 }
  for (const station of stations) {
    counts[station.type] += 1
    const latest = station.latest
    if (!latest) continue
    if (latest.state === 'out') counts.out += 1
    if (latest.state === 'ok') counts.ok += 1
    const uzOut = latest.uz === 'out'
    const intlOut = latest.intl === 'out'
    if (uzOut && intlOut) split.bothOut += 1
    else if (intlOut) split.onlyIntl += 1
    else if (uzOut) split.onlyUz += 1
    else if (latest.uz === 'ok' || latest.intl === 'ok') split.bothOk += 1
  }
  const recent = []
  for (const module of Object.keys(MODULES)) {
    const rows = await listMeasurements(module, filter, 6)
    recent.push(...rows.map((row) => ({ ...row, module })))
  }
  recent.sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))
  const readingRow = await one(
    `SELECT
       (SELECT COUNT(*)::int FROM water_data d JOIN stations s ON s.id = d.station_id ${filter.regionId ? 'WHERE s.region_id = $1' : ''}) +
       (SELECT COUNT(*)::int FROM air_data d JOIN stations s ON s.id = d.station_id ${filter.regionId ? 'WHERE s.region_id = $1' : ''}) +
       (SELECT COUNT(*)::int FROM earth_data d JOIN stations s ON s.id = d.station_id ${filter.regionId ? 'WHERE s.region_id = $1' : ''}) AS n`,
    filter.regionId ? [filter.regionId] : [],
  )
  return {
    stations: stations.length,
    counts,
    split,
    readings: readingRow.n,
    recent: recent.slice(0, 8),
    series: {
      waterPh: await series('water', 'ph', filter),
      airAqi: await series('air', 'aqi', filter),
      earthOrganic: await series('earth', 'organic_matter', filter),
    },
  }
}

export async function publicOverview() {
  const stations = await listStations({})
  const byType = { water: 0, air: 0, earth: 0 }
  const attention = []
  for (const station of stations) {
    byType[station.type] += 1
    if (station.latest?.state === 'out') {
      attention.push({
        id: station.id,
        name: station.name,
        region: station.region_name,
        type: station.type,
        summary: station.latest.summary,
        uz: station.latest.uz,
        intl: station.latest.intl,
      })
    }
  }
  const regions = await one('SELECT COUNT(*)::int AS n FROM regions')
  const readings = await one(
    `SELECT
      (SELECT COUNT(*)::int FROM water_data) +
      (SELECT COUNT(*)::int FROM air_data) +
      (SELECT COUNT(*)::int FROM earth_data) AS n`,
  )
  return {
    regionCount: regions.n,
    stationCount: stations.length,
    byType,
    readingCount: readings.n,
    attention: attention.slice(0, 6),
  }
}

export async function report(module, filter) {
  const meta = assertModule(module)
  const { sql, params } = whereOf(filter)
  const avgColumns = [
    ...meta.fields.map((field) => `ROUND(AVG(d.${field.key})::numeric, 2) AS ${field.key}`),
    ...(module === 'air' ? ['ROUND(AVG(d.aqi)::numeric, 0) AS aqi'] : []),
  ].join(', ')
  const rows = await query(
    `SELECT r.name AS region, COUNT(*)::int AS count, ${avgColumns}
     FROM ${meta.table} d
     JOIN stations s ON s.id = d.station_id
     JOIN regions r ON r.id = s.region_id
     ${sql}
     GROUP BY r.id, r.name
     ORDER BY r.name`,
    params,
  )
  const keys = [...meta.fields.map((field) => field.key), ...(module === 'air' ? ['aqi'] : [])]
  return {
    module,
    title: meta.title,
    fields: meta.fields,
    regions: rows.map((row) => ({
      region: row.region,
      count: row.count,
      averages: Object.fromEntries(keys.map((key) => [key, row[key] == null ? null : Number(row[key])])),
    })),
  }
}

export async function updateNorm(id, body) {
  const current = await one('SELECT * FROM norms WHERE id = $1', [id])
  if (!current) throw bad("Me'yor topilmadi", 404)
  const read = (camel, snake) => {
    const key = camel in body ? camel : snake
    if (!(key in body)) return current[snake]
    if (body[key] == null || body[key] === '') return null
    const number = Number(String(body[key]).replace(',', '.'))
    if (!Number.isFinite(number)) throw bad("Me'yor son bo'lishi kerak")
    return number
  }
  const uzMin = read('uzMin', 'uz_min')
  const uzMax = read('uzMax', 'uz_max')
  const intlMin = read('intlMin', 'intl_min')
  const intlMax = read('intlMax', 'intl_max')
  if (uzMin != null && uzMax != null && uzMin > uzMax) throw bad("O'zbekiston oralig'i noto'g'ri")
  if (intlMin != null && intlMax != null && intlMin > intlMax) throw bad("Xalqaro oralig'i noto'g'ri")
  await query(
    `UPDATE norms SET uz_min=$1, uz_max=$2, intl_min=$3, intl_max=$4 WHERE id=$5`,
    [uzMin, uzMax, intlMin, intlMax, id],
  )
  return one('SELECT * FROM norms WHERE id = $1', [id])
}

function cleanEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw bad("Email noto'g'ri")
  return value
}

export async function registerUser(body) {
  const fullName = String(body.fullName || body.full_name || '').trim()
  if (fullName.length < 3) throw bad('Ism kamida 3 ta belgi')
  assertPassword(body.password)
  const email = cleanEmail(body.email)
  try {
    const row = await one(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1,$2,$3,'researcher') RETURNING id`,
      [fullName, email, hashPassword(body.password)],
    )
    return row
  } catch (error) {
    if (error.code === '23505' || /unique/i.test(error.message || '')) {
      throw bad("Bu email allaqachon ro'yxatda", 409)
    }
    throw error
  }
}

export async function listUsers() {
  return query(
    `SELECT u.id, u.full_name, u.email, u.role, u.status, u.region_id, u.created_at, r.name AS region_name
     FROM users u
     LEFT JOIN regions r ON r.id = u.region_id
     ORDER BY u.id`,
  )
}

export async function createUser(body) {
  const fullName = String(body.fullName || '').trim()
  if (fullName.length < 3) throw bad('Ism kamida 3 ta belgi')
  if (!ROLES.includes(body.role)) throw bad("Rol noto'g'ri")
  assertPassword(body.password)
  const email = cleanEmail(body.email)
  let regionId = null
  if (body.role === 'government') {
    regionId = Number(body.regionId)
    const region = await one('SELECT id FROM regions WHERE id = $1', [regionId])
    if (!region) throw bad('Davlat vakili uchun hudud kerak')
  }
  try {
    const row = await one(
      `INSERT INTO users (full_name, email, password_hash, role, region_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [fullName, email, hashPassword(body.password), body.role, regionId],
    )
    return one(
      `SELECT u.*, r.name AS region_name FROM users u LEFT JOIN regions r ON r.id = u.region_id WHERE u.id = $1`,
      [row.id],
    )
  } catch (error) {
    if (error.code === '23505' || /unique/i.test(error.message || '')) {
      throw bad("Bu email allaqachon ro'yxatda", 409)
    }
    throw error
  }
}

export async function updateUser(id, body, actor) {
  const user = await one('SELECT * FROM users WHERE id = $1', [id])
  if (!user) throw bad('Foydalanuvchi topilmadi', 404)
  const role = body.role ?? user.role
  const status = body.status ?? user.status
  const fullName = String(body.fullName ?? user.full_name).trim()
  if (!ROLES.includes(role)) throw bad("Rol noto'g'ri")
  if (!['active', 'blocked'].includes(status)) throw bad("Holat noto'g'ri")
  if (fullName.length < 3) throw bad('Ism kamida 3 ta belgi')
  if (actor.id === user.id && status === 'blocked') throw bad("O'zingizni bloklab bo'lmaydi")
  if (actor.id === user.id && role !== user.role) throw bad("O'z rolingizni o'zgartirib bo'lmaydi")
  let regionId = null
  if (role === 'government') {
    regionId = Number(body.regionId ?? user.region_id)
    const region = await one('SELECT id FROM regions WHERE id = $1', [regionId])
    if (!region) throw bad('Davlat vakili uchun hudud kerak')
  }
  await query(
    `UPDATE users SET full_name=$1, role=$2, status=$3, region_id=$4 WHERE id=$5`,
    [fullName, role, status, regionId, id],
  )
  return one(
    `SELECT u.*, r.name AS region_name FROM users u LEFT JOIN regions r ON r.id = u.region_id WHERE u.id = $1`,
    [id],
  )
}

export async function setUserPassword(id, password) {
  assertPassword(password)
  const user = await one('SELECT id FROM users WHERE id = $1', [id])
  if (!user) throw bad('Foydalanuvchi topilmadi', 404)
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashPassword(password), id])
}

export async function changeOwnPassword(user, current, next) {
  assertPassword(next)
  const { checkPassword } = await import('./auth.js')
  if (!checkPassword(current || '', user.password_hash)) throw bad("Joriy parol noto'g'ri")
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashPassword(next), user.id])
}

export async function updateProfile(user, fullName) {
  const name = String(fullName || '').trim()
  if (name.length < 3) throw bad('Ism kamida 3 ta belgi')
  await query('UPDATE users SET full_name=$1 WHERE id=$2', [name, user.id])
}

export async function listAudit() {
  return query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at, u.full_name AS user_name, u.email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT 200`,
  )
}

export async function audit(userId, action, entity, entityId, detail = '') {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, detail) VALUES ($1,$2,$3,$4,$5)`,
    [userId, action, entity, entityId ?? null, String(detail).slice(0, 300)],
  )
}
