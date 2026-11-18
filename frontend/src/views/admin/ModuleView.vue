<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { api, download, qs } from '../../api'
import { auth } from '../../auth'
import { MODULES } from '../../modules'
import { dayKey, fmt, normHint, toLocalInput, when } from '../../format'

Chart.register(...registerables)
const props = defineProps({ module: String })
const meta = computed(() => MODULES[props.module])
const canWrite = computed(() => ['admin', 'specialist'].includes(auth.user?.role))
const rows = ref([])
const stations = ref([])
const regions = ref([])
const norms = ref([])
const filters = reactive({ regionId: auth.user?.regionId || '', stationId: '', from: '', to: '', q: '' })
const form = reactive({ stationId: '', measuredAt: toLocalInput() })
const editing = ref(null)
const chartKey = ref('ph')
const error = ref('')
const message = ref('')
const csv = ref('')
const busy = ref(false)
const canvas = ref(null)
let chart

const normByKey = computed(() => Object.fromEntries(norms.value.map((norm) => [norm.indicator, norm])))

function resetForm() {
  form.stationId = ''
  form.measuredAt = toLocalInput()
  meta.value.fields.forEach((field) => { form[field.key] = '' })
}

async function load() {
  const [list, stationList, regionList, normList] = await Promise.all([
    api(`/api/measurements/${props.module}${qs(filters)}`),
    api(`/api/stations${qs({ ...filters, type: props.module })}`),
    api('/api/regions'),
    api(`/api/norms?module=${props.module}`),
  ])
  rows.value = list
  stations.value = stationList
  regions.value = regionList
  norms.value = normList
  draw()
}

function draw() {
  const key = chartKey.value
  const buckets = new Map()
  ;[...rows.value].reverse().forEach((row) => {
    if (row[key] == null) return
    const label = filters.stationId ? when(row.measured_at) : dayKey(row.measured_at).slice(5)
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label).push(Number(row[key]))
  })
  const labels = [...buckets.keys()]
  const values = labels.map((label) => {
    const list = buckets.get(label)
    return Math.round((list.reduce((sum, item) => sum + item, 0) / list.length) * 100) / 100
  })
  if (chart) chart.destroy()
  if (!canvas.value) return
  chart = new Chart(canvas.value, {
    type: 'line',
    data: { labels, datasets: [{ label: key, data: values, borderColor: '#2f6fed', tension: .3 }] },
    options: { responsive: true, maintainAspectRatio: false },
  })
}

async function save() {
  busy.value = true
  error.value = ''
  try {
    const body = { ...form, stationId: Number(form.stationId) }
    if (editing.value) await api(`/api/measurements/${props.module}/${editing.value}`, { method: 'PATCH', body })
    else await api(`/api/measurements/${props.module}`, { method: 'POST', body })
    message.value = 'Saqlandi'
    editing.value = null
    resetForm()
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

function beginEdit(row) {
  editing.value = row.id
  form.stationId = String(row.station_id)
  form.measuredAt = toLocalInput(row.measured_at)
  meta.value.fields.forEach((field) => { form[field.key] = row[field.key] ?? '' })
}

async function remove(row) {
  if (!window.confirm('O‘chirilsinmi?')) return
  await api(`/api/measurements/${props.module}/${row.id}`, { method: 'DELETE' })
  await load()
}

async function sendCsv() {
  busy.value = true
  error.value = ''
  try {
    const result = await api(`/api/measurements/${props.module}/import`, { method: 'POST', body: { csv: csv.value } })
    message.value = `${result.inserted} qator qo‘shildi`
    if (result.errors.length) error.value = result.errors.map((item) => `${item.line}: ${item.message}`).join(' ')
    csv.value = ''
    await load()
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  chartKey.value = meta.value.fields[0].key
  resetForm()
  load().catch((err) => { error.value = err.message })
})
watch(() => props.module, () => {
  chartKey.value = meta.value.fields[0].key
  resetForm()
  editing.value = null
  load().catch((err) => { error.value = err.message })
})
watch(chartKey, draw)
</script>

<template>
  <div class="page-head">
    <div>
      <h1>{{ meta.title }}</h1>
      <p style="color:#64748b">{{ meta.lead }}</p>
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap">
      <button class="btn light" type="button" @click="download(`/api/measurements/${module}/export${qs(filters)}`, `wea-${module}.csv`)">CSV</button>
      <button class="btn light" type="button" @click="download(`/api/measurements/${module}/export${qs({ ...filters, format: 'xlsx' })}`, `wea-${module}.xlsx`)">Excel</button>
    </div>
  </div>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="message" class="note">{{ message }}</p>
  <form class="panel filters" @submit.prevent="load">
    <label v-if="!auth.user?.regionId" class="field"><span>Hudud</span>
      <select v-model="filters.regionId"><option value="">Barchasi</option><option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option></select>
    </label>
    <label class="field"><span>Stansiya</span>
      <select v-model="filters.stationId"><option value="">Barchasi</option><option v-for="station in stations" :key="station.id" :value="station.id">{{ station.name }}</option></select>
    </label>
    <label class="field"><span>Dan</span><input v-model="filters.from" type="date" /></label>
    <label class="field"><span>Gacha</span><input v-model="filters.to" type="date" /></label>
    <button class="btn" type="submit">Filtrlash</button>
  </form>

  <form v-if="canWrite" class="panel" style="margin-top:.8rem" @submit.prevent="save">
    <h2>{{ editing ? 'Tahrirlash' : 'Yangi o‘lchov' }}</h2>
    <div class="form-row" style="margin-top:.7rem">
      <label class="field"><span>Stansiya</span>
        <select v-model="form.stationId" required><option value="">Tanlang</option><option v-for="station in stations" :key="station.id" :value="station.id">{{ station.name }}</option></select>
        <small />
      </label>
      <label class="field"><span>Sana</span><input v-model="form.measuredAt" type="datetime-local" required /><small /></label>
      <label v-for="field in meta.fields" :key="field.key" class="field">
        <span>{{ field.label }}<i v-if="field.unit">{{ field.unit }}</i></span>
        <input v-model="form[field.key]" inputmode="decimal" :placeholder="field.unit || '0'" />
        <small>{{ normHint(normByKey[field.key]) }}</small>
      </label>
    </div>
    <div class="form-actions">
      <button class="btn blue" :disabled="busy">{{ editing ? 'Saqlash' : 'Qo‘shish' }}</button>
      <button v-if="editing" class="btn light" type="button" @click="editing = null; resetForm()">Bekor</button>
    </div>
  </form>

  <article class="panel" style="margin-top:.8rem">
    <div class="page-head">
      <h2>Grafik</h2>
      <select v-model="chartKey" class="chart-pick">
        <option v-for="field in meta.fields" :key="field.key" :value="field.key">{{ field.label }}</option>
        <option v-if="module === 'air'" value="aqi">AQI</option>
      </select>
    </div>
    <div class="chart-box"><canvas ref="canvas" /></div>
  </article>

  <article class="panel" style="margin-top:.8rem">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sana</th><th>Stansiya</th><th>Hudud</th>
            <th v-for="field in meta.fields" :key="field.key">{{ field.label }}</th>
            <th v-if="module === 'air'">AQI</th>
            <th v-if="canWrite" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ when(row.measured_at) }}</td>
            <td><RouterLink :to="`/admin/stansiya/${row.station_id}`">{{ row.station_name }}</RouterLink></td>
            <td>{{ row.region_name }}</td>
            <td v-for="field in meta.fields" :key="field.key">
              {{ fmt(row[field.key]) }}
              <div v-if="row.flags?.[field.key]?.uz || row.flags?.[field.key]?.intl">
                <span v-if="row.flags[field.key].uz" class="pill" :class="row.flags[field.key].uz">O‘z</span>
                <span v-if="row.flags[field.key].intl" class="pill" :class="row.flags[field.key].intl">Xalq</span>
              </div>
            </td>
            <td v-if="module === 'air'">{{ fmt(row.aqi) }} <span v-if="row.aqiCategory">{{ row.aqiCategory.label }}</span></td>
            <td v-if="canWrite">
              <button class="btn light sm" type="button" @click="beginEdit(row)">Tahrir</button>
              <button class="btn danger sm" type="button" @click="remove(row)">O‘chirish</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <form v-if="canWrite" class="panel" style="margin-top:.8rem" @submit.prevent="sendCsv">
    <h2>CSV import</h2>
    <textarea v-model="csv" placeholder="station_id,measured_at,ph" />
    <button class="btn" :disabled="busy">Import</button>
  </form>
</template>
