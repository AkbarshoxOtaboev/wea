import fs from 'node:fs'
import { closePool, exec } from './db.js'

const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
await exec(schema)
await exec(`
  TRUNCATE TABLE
    contact_messages,
    audit_logs,
    water_data,
    air_data,
    earth_data,
    stations,
    norms,
    users,
    regions
  RESTART IDENTITY CASCADE
`)
console.log('wea_db tozalandi. Server qayta ishga tushganda namuna yoziladi.')
await closePool()
