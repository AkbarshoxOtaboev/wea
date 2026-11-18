<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import { api } from '../../api'
import { auth } from '../../auth'
import { TYPE_LABEL } from '../../modules'
import { when } from '../../format'

Chart.register(...registerables)
const data = ref(null)
const error = ref('')
const canvas = ref(null)
let chart

onMounted(async () => {
  try {
    data.value = await api('/api/dashboard')
    await nextTick()
    chart = new Chart(canvas.value, {
      type: 'line',
      data: {
        labels: data.value.series.airAqi.map((item) => item.day),
        datasets: [
          { label: 'Suv pH', data: data.value.series.waterPh.map((item) => item.value), borderColor: '#2f6fed', tension: .35 },
          { label: 'Havo AQI', data: data.value.series.airAqi.map((item) => item.value), borderColor: '#14b8a6', tension: .35 },
          { label: 'Organik %', data: data.value.series.earthOrganic.map((item) => item.value), borderColor: '#f0c14b', tension: .35 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
    })
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <div v-else-if="data">
    <div class="page-head">
      <div>
        <h1>Boshqaruv</h1>
        <p style="color:#64748b">Xush kelibsiz, {{ auth.user?.fullName }}. {{ auth.user?.regionName || 'O‘zbekiston bo‘yicha ko‘rinish' }}.</p>
      </div>
    </div>
    <section class="kpis">
      <article class="kpi"><span>Stansiyalar</span><b>{{ data.stations }}</b><em>faol nuqtalar</em></article>
      <article class="kpi"><span>O‘lchovlar</span><b>{{ data.readings }}</b><em>bazada</em></article>
      <article class="kpi"><span>Me’yorda</span><b>{{ data.counts.ok }}</b><em>so‘nggi holat</em></article>
      <article class="kpi"><span>Tashqari</span><b>{{ data.counts.out }}</b><em>e’tibor kerak</em></article>
    </section>
    <section class="two">
      <article class="panel">
        <h2>Kunlik tendensiya</h2>
        <div class="chart-box"><canvas ref="canvas" /></div>
      </article>
      <article class="panel">
        <h2>Me’yor farqi</h2>
        <div class="metric"><span>Ikkalasi ham me’yor</span><b>{{ data.split.bothOk }}</b></div>
        <div class="metric"><span>Faqat xalqaro tashqari</span><b>{{ data.split.onlyIntl }}</b></div>
        <div class="metric"><span>Faqat mahalliy tashqari</span><b>{{ data.split.onlyUz }}</b></div>
        <div class="metric"><span>Ikkalasi ham tashqari</span><b>{{ data.split.bothOut }}</b></div>
      </article>
    </section>
    <article class="panel" style="margin-top:.8rem">
      <h2>So‘nggi yozuvlar</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Sana</th><th>Modul</th><th>Stansiya</th><th>Hudud</th><th>Holat</th></tr></thead>
          <tbody>
            <tr v-for="row in data.recent" :key="`${row.module}-${row.id}`">
              <td>{{ when(row.measured_at) }}</td>
              <td>{{ TYPE_LABEL[row.module] }}</td>
              <td><RouterLink :to="`/admin/stansiya/${row.station_id}`">{{ row.station_name }}</RouterLink></td>
              <td>{{ row.region_name }}</td>
              <td><span class="pill" :class="row.state">{{ row.state === 'out' ? 'tashqari' : "me'yor" }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </div>
  <p v-else>Yuklanmoqda…</p>
</template>
