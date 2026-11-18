-- WEA monitoring bazasi. PostgreSQL sintaksisi.
-- Koordinatalar kenglik (lat) va uzunlik (lng) ustunlarida saqlanadi.

CREATE TABLE IF NOT EXISTS regions (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'specialist', 'researcher', 'government')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  region_id INTEGER REFERENCES regions (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('water', 'air', 'earth')),
  region_id INTEGER NOT NULL REFERENCES regions (id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS norms (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module TEXT NOT NULL CHECK (module IN ('water', 'air', 'earth')),
  indicator TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  uz_min DOUBLE PRECISION,
  uz_max DOUBLE PRECISION,
  intl_min DOUBLE PRECISION,
  intl_max DOUBLE PRECISION,
  uz_source TEXT NOT NULL DEFAULT '',
  intl_source TEXT NOT NULL DEFAULT '',
  UNIQUE (module, indicator)
);

CREATE TABLE IF NOT EXISTS water_data (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  temperature DOUBLE PRECISION,
  ph DOUBLE PRECISION,
  dissolved_oxygen DOUBLE PRECISION,
  conductivity DOUBLE PRECISION,
  turbidity DOUBLE PRECISION,
  nitrate DOUBLE PRECISION,
  phosphate DOUBLE PRECISION,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS air_data (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  pm25 DOUBLE PRECISION,
  pm10 DOUBLE PRECISION,
  co2 DOUBLE PRECISION,
  co DOUBLE PRECISION,
  nox DOUBLE PRECISION,
  so2 DOUBLE PRECISION,
  o3 DOUBLE PRECISION,
  aqi INTEGER,
  aqi_pollutant TEXT,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS earth_data (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations (id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  moisture DOUBLE PRECISION,
  temperature DOUBLE PRECISION,
  ph DOUBLE PRECISION,
  organic_matter DOUBLE PRECISION,
  nitrogen DOUBLE PRECISION,
  phosphorus DOUBLE PRECISION,
  potassium DOUBLE PRECISION,
  created_by INTEGER REFERENCES users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER REFERENCES users (id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stations_region ON stations (region_id);
CREATE INDEX IF NOT EXISTS idx_water_station_time ON water_data (station_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_air_station_time ON air_data (station_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_earth_station_time ON earth_data (station_id, measured_at DESC);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_time ON contact_messages (created_at DESC);
