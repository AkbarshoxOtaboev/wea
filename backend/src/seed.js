import { exec, one, query } from './db.js'
import { hashPassword } from './auth.js'
import { computeAqi } from './aqi.js'
import fs from 'node:fs'

const REGIONS = [
  ['Qoraqalpogʻiston Respublikasi', 'qr', 42.46, 59.6],
  ['Andijon viloyati', 'an', 40.78, 72.34],
  ['Buxoro viloyati', 'bu', 39.77, 64.42],
  ['Jizzax viloyati', 'ji', 40.12, 67.84],
  ['Qashqadaryo viloyati', 'qa', 38.86, 65.79],
  ['Navoiy viloyati', 'nv', 40.1, 65.38],
  ['Namangan viloyati', 'na', 41.0, 71.67],
  ['Samarqand viloyati', 'sa', 39.65, 66.96],
  ['Surxondaryo viloyati', 'su', 37.94, 67.58],
  ['Sirdaryo viloyati', 'si', 40.49, 68.78],
  ['Toshkent viloyati', 'tv', 41.05, 69.35],
  ['Fargʻona viloyati', 'fa', 40.39, 71.79],
  ['Xorazm viloyati', 'xo', 41.55, 60.63],
  ['Toshkent shahri', 'ts', 41.31, 69.28],
]

const NORMS = [
  ['water', 'ph', 'pH', '', 6, 9, 6.5, 8.5,
    "O'z DSt 950:2011 / O'zMSt 133: pH 6–9",
    'JSST ichimlik suvi: qabul qilish oraligʻi 6,5–8,5'],
  ['water', 'nitrate', 'Nitrat', 'mg/l', null, 45, null, 50,
    "O'z DSt 950:2011: nitratlar 45 mg/dm³",
    'JSST: nitrat 50 mg/l'],
  ['water', 'turbidity', 'Loyqalik', 'NTU', null, 1.5, null, 5,
    "O'z DSt 950:2011: loyqalik 1,5 mg/dm³ (kaolin). Raqamli solishtirish.",
    'JSST: ichimlik suvida loyqalik odatda 5 NTU dan oshmasligi tavsiya etiladi'],
  ['water', 'dissolved_oxygen', 'Erigan kislorod', 'mg/l', 4, null, 5, null,
    'Suv havzalari solishtirmasi: erigan kislorod 4 mg/dm³ dan kam boʻlmasin',
    'Suv ekotizimi uchun keng qoʻllaniladigan pastki chegara 5 mg/l'],
  ['air', 'pm25', 'PM2.5', 'µg/m³', null, 35, null, 15,
    'Aholi punktlari havosi, sutkalik spravochnik chegara. Administrator tahrirlashi mumkin.',
    'JSST 2021: PM2.5 sutkalik 15 µg/m³'],
  ['air', 'pm10', 'PM10', 'µg/m³', null, 60, null, 45,
    'Aholi punktlari havosi, sutkalik spravochnik chegara. Administrator tahrirlashi mumkin.',
    'JSST 2021: PM10 sutkalik 45 µg/m³'],
  ['air', 'nox', 'NOₓ', 'µg/m³', null, 40, null, 25,
    'NO₂ sutkalik spravochnik chegarasi. NOₓ shu qiymat bilan solishtiriladi.',
    'JSST 2021: NO₂ sutkalik 25 µg/m³'],
  ['air', 'so2', 'SO₂', 'µg/m³', null, 50, null, 40,
    'Aholi punktlari havosi, sutkalik spravochnik chegara.',
    'JSST 2021: SO₂ sutkalik 40 µg/m³'],
  ['air', 'o3', 'O₃', 'µg/m³', null, 30, null, 100,
    'Aholi punktlari havosi, sutkalik spravochnik chegara.',
    'JSST 2021: O₃ 8 soatlik 100 µg/m³'],
  ['air', 'co', 'CO', 'mg/m³', null, 3, null, 4,
    'Aholi punktlari havosi, sutkalik spravochnik chegara.',
    'JSST 2021: CO sutkalik 4 mg/m³'],
  ['earth', 'ph', 'pH', '', 6.5, 8.5, 6, 7.5,
    "Sugʻoriladigan tuproq uchun agrokimyoviy maqbullik oraligʻi (spravochnik)",
    "FAO: koʻp ekinlar uchun umumiy maqbullik oraligʻi"],
  ['earth', 'organic_matter', 'Organik modda', '%', 1, null, 2, null,
    'Past unumdorlik chegarasi, milliy spravochnik (1% dan yuqori)',
    'Umumiy agrokimyoviy pastki chegara (2%)'],
]

function mix(base, story, back, amp, floor = null) {
  const value = back === 0 ? story : base + Math.sin(back) * amp
  const rounded = Math.round(value * 10) / 10
  return floor == null ? rounded : Math.max(floor, rounded)
}

function days() {
  const list = []
  for (let back = 12; back >= 0; back -= 1) {
    const date = new Date(Date.UTC(2026, 10, 13 - back, 3, 0, 0))
    list.push({ back, at: date.toISOString() })
  }
  return list
}

export async function seed() {
  const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  await exec(schema)

  const existing = await one('SELECT COUNT(*)::int AS n FROM users')
  if (existing.n > 0) return

  for (const [name, code, lat, lng] of REGIONS) {
    await query('INSERT INTO regions (name, code, lat, lng) VALUES ($1, $2, $3, $4)', [name, code, lat, lng])
  }
  for (const row of NORMS) {
    await query(
      `INSERT INTO norms (module, indicator, label, unit, uz_min, uz_max, intl_min, intl_max, uz_source, intl_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      row,
    )
  }

  const regionRows = await query('SELECT id, code FROM regions')
  const regionId = Object.fromEntries(regionRows.map((row) => [row.code, row.id]))

  const adminHash = hashPassword('Admin123!')
  const ekologHash = hashPassword('Ekolog123!')
  const researchHash = hashPassword('Tadqiq123!')
  const govHash = hashPassword('Davlat123!')

  const admin = await one(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,'admin') RETURNING id`,
    ['Sardor Adminov', 'admin@wea.uz', adminHash],
  )
  const ekolog = await one(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,'specialist') RETURNING id`,
    ['Nilufar Karimova', 'ekolog@wea.uz', ekologHash],
  )
  await query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,'researcher')`,
    ['Jasur Toshpoʻlatov', 'tadqiqot@wea.uz', researchHash],
  )
  await query(
    `INSERT INTO users (full_name, email, password_hash, role, region_id) VALUES ($1,$2,$3,'government',$4)`,
    ['Bekzod Rahimov', 'davlat@wea.uz', govHash, regionId.ts],
  )

  const stations = [
    ['chirchiq', 'Chirchiq daryosi', 'water', 'tv', 41.47, 69.58, 'Chirchiq daryosining Toshkent viloyati kuzatuv nuqtasi'],
    ['bozsuv', "Boʻzsuv kanali", 'water', 'ts', 41.33, 69.29, 'Toshkent shahri ichidagi kanal'],
    ['zarafshon', 'Zarafshon daryosi', 'water', 'sa', 39.66, 66.98, 'Samarqand yaqinidagi daryo nuqtasi'],
    ['amudaryo', 'Amudaryo', 'water', 'xo', 41.56, 60.62, 'Xorazm viloyati, Amudaryo'],
    ['toshkent-havo', 'Toshkent havo stansiyasi', 'air', 'ts', 41.31, 69.24, 'Shahar markazidagi kuzatuv nuqtasi'],
    ['buxoro-havo', 'Buxoro havo stansiyasi', 'air', 'bu', 39.77, 64.42, 'Buxoro shahri'],
    ['nukus-havo', 'Nukus havo stansiyasi', 'air', 'qr', 42.46, 59.61, 'Nukus shahri'],
    ['fargona-tuproq', "Fargʻona tuproq nuqtasi", 'earth', 'fa', 40.38, 71.78, "Sugʻoriladigan ekin maydoni"],
    ['qarshi-tuproq', 'Qarshi tuproq nuqtasi', 'earth', 'qa', 38.86, 65.8, 'Qashqadaryo viloyati'],
    ['jizzax-tuproq', 'Jizzax tuproq nuqtasi', 'earth', 'ji', 40.12, 67.84, 'Jizzax viloyati'],
  ]

  const stationId = {}
  for (const [key, name, type, code, lat, lng, description] of stations) {
    const row = await one(
      `INSERT INTO stations (name, type, region_id, lat, lng, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, type, regionId[code], lat, lng, description],
    )
    stationId[key] = row.id
  }

  const author = ekolog.id
  for (const { back, at } of days()) {
    await insertWater(stationId.chirchiq, at, author, {
      temperature: mix(14, 14.5, back, 0.6),
      ph: mix(7.5, 7.4, back, 0.1),
      dissolved_oxygen: mix(8.2, 8.0, back, 0.3, 0),
      conductivity: mix(420, 430, back, 15, 0),
      turbidity: mix(1.0, 1.1, back, 0.1, 0),
      nitrate: mix(8, 9, back, 0.8, 0),
      phosphate: mix(0.08, 0.09, back, 0.01, 0),
    })
    await insertWater(stationId.bozsuv, at, author, {
      temperature: mix(15, 16, back, 0.5),
      ph: mix(7.6, 8.8, back, 0.08),
      dissolved_oxygen: mix(7.4, 6.8, back, 0.2, 0),
      conductivity: mix(510, 540, back, 10, 0),
      turbidity: mix(1.2, 1.3, back, 0.05, 0),
      nitrate: mix(12, 18, back, 1, 0),
      phosphate: mix(0.12, 0.2, back, 0.02, 0),
    })
    await insertWater(stationId.zarafshon, at, author, {
      temperature: mix(13, 13.5, back, 0.5),
      ph: mix(7.7, 7.6, back, 0.1),
      dissolved_oxygen: mix(8.5, 8.4, back, 0.2, 0),
      conductivity: mix(380, 390, back, 12, 0),
      turbidity: mix(0.8, 0.9, back, 0.08, 0),
      nitrate: mix(6, 7, back, 0.5, 0),
      phosphate: mix(0.05, 0.06, back, 0.01, 0),
    })
    await insertWater(stationId.amudaryo, at, author, {
      temperature: mix(16, 17, back, 0.4),
      ph: mix(7.8, 7.9, back, 0.08),
      dissolved_oxygen: mix(6.5, 5.6, back, 0.2, 0),
      conductivity: mix(640, 700, back, 20, 0),
      turbidity: mix(1.3, 1.4, back, 0.05, 0),
      nitrate: mix(20, 52, back, 1.5, 0),
      phosphate: mix(0.15, 0.28, back, 0.02, 0),
    })

    await insertAir(stationId['toshkent-havo'], at, author, {
      pm25: mix(18, 28, back, 1.5, 0),
      pm10: mix(36, 55, back, 2, 0),
      co2: mix(430, 445, back, 8, 0),
      co: mix(0.6, 0.8, back, 0.05, 0),
      nox: mix(20, 30, back, 1, 0),
      so2: mix(8, 12, back, 0.6, 0),
      o3: mix(42, 48, back, 2, 0),
    })
    await insertAir(stationId['buxoro-havo'], at, author, {
      pm25: mix(10, 11, back, 0.8, 0),
      pm10: mix(28, 32, back, 1.5, 0),
      co2: mix(420, 425, back, 5, 0),
      co: mix(0.4, 0.4, back, 0.05, 0),
      nox: mix(14, 16, back, 1, 0),
      so2: mix(6, 7, back, 0.4, 0),
      o3: mix(40, 44, back, 2, 0),
    })
    await insertAir(stationId['nukus-havo'], at, author, {
      pm25: mix(32, 86, back, 2, 0),
      pm10: mix(58, 140, back, 3, 0),
      co2: mix(440, 470, back, 6, 0),
      co: mix(1.1, 2.4, back, 0.1, 0),
      nox: mix(28, 55, back, 1.5, 0),
      so2: mix(12, 22, back, 1, 0),
      o3: mix(36, 40, back, 2, 0),
    })

    await insertEarth(stationId['fargona-tuproq'], at, author, {
      moisture: mix(27, 28, back, 1, 0),
      temperature: mix(16, 17, back, 0.6),
      ph: mix(7.2, 7.3, back, 0.08),
      organic_matter: mix(1.4, 1.5, back, 0.05, 0),
      nitrogen: mix(24, 26, back, 1, 0),
      phosphorus: mix(18, 19, back, 0.8, 0),
      potassium: mix(180, 190, back, 6, 0),
    })
    await insertEarth(stationId['qarshi-tuproq'], at, author, {
      moisture: mix(16, 14, back, 0.8, 0),
      temperature: mix(18, 19, back, 0.5),
      ph: mix(7.7, 8.9, back, 0.08),
      organic_matter: mix(1.2, 0.8, back, 0.05, 0),
      nitrogen: mix(14, 11, back, 0.6, 0),
      phosphorus: mix(12, 10, back, 0.5, 0),
      potassium: mix(160, 150, back, 5, 0),
    })
    await insertEarth(stationId['jizzax-tuproq'], at, author, {
      moisture: mix(24, 25, back, 1, 0),
      temperature: mix(15, 15.5, back, 0.4),
      ph: mix(7.3, 7.4, back, 0.06),
      organic_matter: mix(2.3, 2.4, back, 0.05, 0),
      nitrogen: mix(28, 30, back, 1, 0),
      phosphorus: mix(22, 23, back, 0.7, 0),
      potassium: mix(210, 220, back, 5, 0),
    })
  }

  await query(
    `INSERT INTO audit_logs (user_id, action, entity, detail) VALUES ($1, 'seed', 'system', $2)`,
    [admin.id, "Boshlangʻich hududlar, stansiyalar va namuna o'lchovlar yozildi"],
  )
}

async function insertWater(stationId, at, author, v) {
  await query(
    `INSERT INTO water_data
      (station_id, measured_at, temperature, ph, dissolved_oxygen, conductivity, turbidity, nitrate, phosphate, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [stationId, at, v.temperature, v.ph, v.dissolved_oxygen, v.conductivity, v.turbidity, v.nitrate, v.phosphate, author],
  )
}

async function insertAir(stationId, at, author, v) {
  const { aqi, pollutant } = computeAqi(v.pm25, v.pm10)
  await query(
    `INSERT INTO air_data
      (station_id, measured_at, pm25, pm10, co2, co, nox, so2, o3, aqi, aqi_pollutant, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [stationId, at, v.pm25, v.pm10, v.co2, v.co, v.nox, v.so2, v.o3, aqi, pollutant, author],
  )
}

async function insertEarth(stationId, at, author, v) {
  await query(
    `INSERT INTO earth_data
      (station_id, measured_at, moisture, temperature, ph, organic_matter, nitrogen, phosphorus, potassium, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [stationId, at, v.moisture, v.temperature, v.ph, v.organic_matter, v.nitrogen, v.phosphorus, v.potassium, author],
  )
}
