// AQSh EPA AQI shkalasi. PM2.5 va PM10 uchun 24 soatlik breakpointlar.
// Indeks shu ikki ifloslantiruvchidan kattarog'i bo'yicha olinadi.

const PM25 = [
  [0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
]

const PM10 = [
  [0, 54, 0, 50],
  [55, 154, 51, 100],
  [155, 254, 101, 150],
  [255, 354, 151, 200],
  [355, 424, 201, 300],
  [425, 504, 301, 400],
  [505, 604, 401, 500],
]

function piece(concentration, table) {
  if (concentration == null || Number.isNaN(concentration)) return null
  if (concentration < 0) return null
  const row = table.find(([lo, hi]) => concentration >= lo && concentration <= hi)
  if (!row) return concentration > table[table.length - 1][1] ? 500 : 0
  const [lo, hi, ilo, ihi] = row
  const value = ((ihi - ilo) / (hi - lo)) * (concentration - lo) + ilo
  return Math.round(value)
}

export function computeAqi(pm25, pm10) {
  const fromPm25 = piece(pm25, PM25)
  const fromPm10 = piece(pm10, PM10)
  const options = [
    fromPm25 == null ? null : { aqi: fromPm25, pollutant: 'PM2.5' },
    fromPm10 == null ? null : { aqi: fromPm10, pollutant: 'PM10' },
  ].filter(Boolean)
  if (!options.length) return { aqi: null, pollutant: null }
  return options.sort((a, b) => b.aqi - a.aqi)[0]
}

export function aqiCategory(aqi) {
  if (aqi == null) return null
  if (aqi <= 50) return { key: 'good', label: 'Yaxshi' }
  if (aqi <= 100) return { key: 'moderate', label: 'Qoniqarli' }
  if (aqi <= 150) return { key: 'sensitive', label: 'Noqulay' }
  if (aqi <= 200) return { key: 'unhealthy', label: 'Zararli' }
  if (aqi <= 300) return { key: 'very', label: 'Juda zararli' }
  return { key: 'hazard', label: 'Xavfli' }
}
