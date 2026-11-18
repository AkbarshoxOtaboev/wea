import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'wea_db',
})

export async function query(sql, params = []) {
  const result = await pool.query(sql, params)
  return result.rows
}

export async function one(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

export async function exec(sql) {
  await pool.query(sql)
}

export async function closePool() {
  await pool.end()
}
