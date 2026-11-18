export const MODULES = {
  water: {
    key: 'water',
    title: 'Suv',
    path: '/suv',
    lead: 'Daryo, kanal va boshqa suv nuqtalaridagi laboratoriya o‘lchovlari.',
    fields: [
      { key: 'temperature', label: 'Harorat', unit: '°C' },
      { key: 'ph', label: 'pH', unit: '' },
      { key: 'dissolved_oxygen', label: 'Erigan kislorod', unit: 'mg/l' },
      { key: 'conductivity', label: "Elektr o'tkazuvchanlik", unit: 'µS/sm' },
      { key: 'turbidity', label: 'Loyqalik', unit: 'NTU' },
      { key: 'nitrate', label: 'Nitrat', unit: 'mg/l' },
      { key: 'phosphate', label: 'Fosfat', unit: 'mg/l' },
    ],
  },
  air: {
    key: 'air',
    title: 'Havo',
    path: '/havo',
    lead: 'Kuzatuv stansiyalaridagi havo sifati. AQI PM2.5 va PM10 dan hisoblanadi.',
    fields: [
      { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
      { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
      { key: 'co2', label: 'CO₂', unit: 'ppm' },
      { key: 'co', label: 'CO', unit: 'mg/m³' },
      { key: 'nox', label: 'NOₓ', unit: 'µg/m³' },
      { key: 'so2', label: 'SO₂', unit: 'µg/m³' },
      { key: 'o3', label: 'O₃', unit: 'µg/m³' },
    ],
  },
  earth: {
    key: 'earth',
    title: 'Tuproq',
    path: '/tuproq',
    lead: 'Hududiy tuproq namunalari: namlik, pH, organik modda va NPK.',
    fields: [
      { key: 'moisture', label: 'Namlik', unit: '%' },
      { key: 'temperature', label: 'Harorat', unit: '°C' },
      { key: 'ph', label: 'pH', unit: '' },
      { key: 'organic_matter', label: 'Organik modda', unit: '%' },
      { key: 'nitrogen', label: 'Azot', unit: 'mg/kg' },
      { key: 'phosphorus', label: 'Fosfor', unit: 'mg/kg' },
      { key: 'potassium', label: 'Kaliy', unit: 'mg/kg' },
    ],
  },
}

export const ROLE_LABEL = {
  admin: 'Administrator',
  specialist: 'Ekolog-mutaxassis',
  researcher: 'Tadqiqotchi',
  government: 'Davlat tashkiloti vakili',
}

export const TYPE_LABEL = { water: 'Suv', air: 'Havo', earth: 'Tuproq' }
