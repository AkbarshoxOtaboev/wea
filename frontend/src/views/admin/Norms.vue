<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import { auth } from '../../auth'
import { fmt } from '../../format'

const rows = ref([])
const error = ref('')
const message = ref('')
const titles = { water: 'Suv', air: 'Havo', earth: 'Tuproq' }

onMounted(async () => { rows.value = await api('/api/norms') })

async function save(row) {
  error.value = ''
  try {
    const saved = await api(`/api/norms/${row.id}`, { method: 'PUT', body: { uz_min: row.uz_min, uz_max: row.uz_max, intl_min: row.intl_min, intl_max: row.intl_max } })
    rows.value = rows.value.map((item) => (item.id === saved.id ? saved : item))
    message.value = `${row.label} saqlandi`
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <div class="page-head"><div><h1>Me’yorlar</h1><p style="color:#64748b">Bo‘sh katak chegara yo‘q degani. O‘zgarish wea_db ga yoziladi.</p></div></div>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="message" class="note">{{ message }}</p>
  <article v-for="module in ['water', 'air', 'earth']" :key="module" class="panel" style="margin-bottom:.8rem">
    <h2>{{ titles[module] }}</h2>
    <table>
      <thead><tr><th>Ko‘rsatkich</th><th>O‘z min</th><th>O‘z max</th><th>Xalq min</th><th>Xalq max</th><th>Manba</th><th v-if="auth.user?.role === 'admin'" /></tr></thead>
      <tbody>
        <tr v-for="row in rows.filter((item) => item.module === module)" :key="row.id">
          <td>{{ row.label }}<div style="color:#64748b">{{ row.unit }}</div></td>
          <td v-for="key in ['uz_min', 'uz_max', 'intl_min', 'intl_max']" :key="key">
            <input v-if="auth.user?.role === 'admin'" v-model="row[key]" />
            <span v-else>{{ fmt(row[key]) }}</span>
          </td>
          <td><div>{{ row.uz_source }}</div><div style="color:#64748b">{{ row.intl_source }}</div></td>
          <td v-if="auth.user?.role === 'admin'"><button class="btn sm" type="button" @click="save(row)">Saqlash</button></td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
