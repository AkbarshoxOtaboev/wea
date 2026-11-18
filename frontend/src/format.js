export function fmt(value) {
  if (value == null || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return '—'
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100)
}

export function when(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dayKey(value) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' })
}

export function toLocalInput(value) {
  const date = value ? new Date(value) : new Date()
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function rangeText(min, max) {
  if (min == null && max == null) return null
  if (min != null && max != null) return `${fmt(min)}–${fmt(max)}`
  if (max != null) return `≤ ${fmt(max)}`
  return `≥ ${fmt(min)}`
}

export function normHint(norm) {
  if (!norm) return ''
  const uz = rangeText(norm.uz_min, norm.uz_max)
  const intl = rangeText(norm.intl_min, norm.intl_max)
  return [uz ? `O'z ${uz}` : null, intl ? `Xalq ${intl}` : null].filter(Boolean).join(' · ')
}
