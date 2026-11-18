export const MODULES = {
  water: {
    key: 'water',
    table: 'water_data',
    title: 'Suv',
    fields: [
      { key: 'temperature', label: 'Harorat', unit: '°C', min: -5, max: 50 },
      { key: 'ph', label: 'pH', unit: '', min: 0, max: 14 },
      { key: 'dissolved_oxygen', label: 'Erigan kislorod', unit: 'mg/l', min: 0, max: 25 },
      { key: 'conductivity', label: "Elektr o'tkazuvchanlik", unit: 'µS/sm', min: 0, max: 20000 },
      { key: 'turbidity', label: 'Loyqalik', unit: 'NTU', min: 0, max: 1000 },
      { key: 'nitrate', label: 'Nitrat', unit: 'mg/l', min: 0, max: 500 },
      { key: 'phosphate', label: 'Fosfat', unit: 'mg/l', min: 0, max: 100 },
    ],
  },
  air: {
    key: 'air',
    table: 'air_data',
    title: 'Havo',
    fields: [
      { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', min: 0, max: 1000 },
      { key: 'pm10', label: 'PM10', unit: 'µg/m³', min: 0, max: 1500 },
      { key: 'co2', label: 'CO₂', unit: 'ppm', min: 0, max: 20000 },
      { key: 'co', label: 'CO', unit: 'mg/m³', min: 0, max: 200 },
      { key: 'nox', label: 'NOₓ', unit: 'µg/m³', min: 0, max: 3000 },
      { key: 'so2', label: 'SO₂', unit: 'µg/m³', min: 0, max: 3000 },
      { key: 'o3', label: 'O₃', unit: 'µg/m³', min: 0, max: 2000 },
    ],
  },
  earth: {
    key: 'earth',
    table: 'earth_data',
    title: 'Tuproq',
    fields: [
      { key: 'moisture', label: 'Namlik', unit: '%', min: 0, max: 100 },
      { key: 'temperature', label: 'Harorat', unit: '°C', min: -20, max: 70 },
      { key: 'ph', label: 'pH', unit: '', min: 0, max: 14 },
      { key: 'organic_matter', label: 'Organik modda', unit: '%', min: 0, max: 100 },
      { key: 'nitrogen', label: 'Azot', unit: 'mg/kg', min: 0, max: 10000 },
      { key: 'phosphorus', label: 'Fosfor', unit: 'mg/kg', min: 0, max: 10000 },
      { key: 'potassium', label: 'Kaliy', unit: 'mg/kg', min: 0, max: 10000 },
    ],
  },
}

export const ROLES = ['admin', 'specialist', 'researcher', 'government']

export const ROLE_LABEL = {
  admin: 'Administrator',
  specialist: 'Ekolog-mutaxassis',
  researcher: 'Tadqiqotchi',
  government: 'Davlat tashkiloti vakili',
}

export function moduleOf(name) {
  return MODULES[name] || null
}
