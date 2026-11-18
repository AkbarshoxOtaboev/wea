<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { api, qs } from '../../api'
import { auth } from '../../auth'
import { MODULES } from '../../modules'
import { fmt } from '../../format'

Chart.register(...registerables)
const module = ref('water')
const indicator = ref('ph')
const from = ref('2026-11-01')
const to = ref('2026-11-13')
const regionId = ref(auth.user?.regionId || '')
const regions = ref([])
const data = ref(null)
const error = ref('')
const canvas = ref(null)
let chart
const meta = computed(() => MODULES[module.value])

async function load() {
  error.value = ''
  data.value = await api(`/api/reports/${module.value}${qs({ from: from.value, to: to.value, regionId: regionId.value })}`)
  const rows = data.value.regions.map((row) => ({
    name: row.region.replace(' viloyati', '').replace(' Respublikasi', ''),
    value: row.averages[indicator.value],
  }))
  if (chart) chart.destroy()
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: { labels: rows.map((row) => row.name), datasets: [{ data: rows.map((row) => row.value), backgroundColor: '#2f6fed' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  })
}

onMounted(async () => {
  regions.value = await api('/api/regions')
  await load()
})
watch(module, () => {
  indicator.value = MODULES[module.value].fields[0].key
  load().catch((err) => { error.value = err.message })
})
</script>

<template>
  <div class="page-head"><div><h1>Hisobot</h1><p style="color:#64748b">Hududlar bo‘yicha o‘rtacha. PDF uchun brauzer chop etishidan foydalaning.</p></div><button class="btn light" type="button" @click="window.print()">PDF</button></div>
  <form class="panel filters" @submit.prevent="load">
    <label class="field"><span>Modul</span>
      <select v-model="module"><option value="water">Suv</option><option value="air">Havo</option><option value="earth">Tuproq</option></select>
    </label>
    <label class="field"><span>Ko‘rsatkich</span>
      <select v-model="indicator">
        <option v-for="field in meta.fields" :key="field.key" :value="field.key">{{ field.label }}</option>
        <option v-if="module === 'air'" value="aqi">AQI</option>
      </select>
    </label>
    <label v-if="!auth.user?.regionId" class="field"><span>Hudud</span>
      <select v-model="regionId"><option value="">Barchasi</option><option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option></select>
    </label>
    <label class="field"><span>Dan</span><input v-model="from" type="date" /></label>
    <label class="field"><span>Gacha</span><input v-model="to" type="date" /></label>
    <button class="btn">Hisoblash</button>
  </form>
  <p v-if="error" class="error">{{ error }}</p>
  <article class="panel" style="margin-top:.8rem"><div class="chart-box"><canvas ref="canvas" /></div></article>
  <article class="panel" style="margin-top:.8rem">
    <table>
      <thead><tr><th>Hudud</th><th>Soni</th><th v-for="field in meta.fields" :key="field.key">{{ field.label }}</th></tr></thead>
      <tbody>
        <tr v-for="row in data?.regions || []" :key="row.region">
          <td>{{ row.region }}</td><td>{{ row.count }}</td>
          <td v-for="field in meta.fields" :key="field.key">{{ fmt(row.averages[field.key]) }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
