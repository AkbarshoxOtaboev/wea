<script setup>
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '../../api'
import { auth } from '../../auth'
import { TYPE_LABEL } from '../../modules'
import MapCanvas from '../../components/MapCanvas.vue'

const route = useRoute()
const stations = ref([])
const regions = ref([])
const error = ref('')
const form = reactive({ name: '', type: 'water', regionId: '', lat: '', lng: '', description: '' })

async function load() {
  stations.value = await api(`/api/stations${route.query.q ? `?q=${encodeURIComponent(route.query.q)}` : ''}`)
  regions.value = await api('/api/regions')
  if (!form.regionId) form.regionId = regions.value[0]?.id || ''
}

onMounted(() => load().catch((err) => { error.value = err.message }))

async function create() {
  error.value = ''
  try {
    await api('/api/stations', { method: 'POST', body: { ...form, regionId: Number(form.regionId), lat: Number(form.lat), lng: Number(form.lng) } })
    form.name = ''
    form.lat = ''
    form.lng = ''
    form.description = ''
    await load()
  } catch (err) {
    error.value = err.message
  }
}

async function remove(station) {
  if (!window.confirm('Stansiya o‘chirilsinmi?')) return
  await api(`/api/stations/${station.id}`, { method: 'DELETE' })
  await load()
}

function pick(point) {
  form.lat = point.lat.toFixed(5)
  form.lng = point.lng.toFixed(5)
}
</script>

<template>
  <div class="page-head"><h1>Stansiyalar</h1></div>
  <p v-if="error" class="error">{{ error }}</p>
  <MapCanvas :stations="stations" :height="340" />
  <form v-if="auth.user?.role === 'admin'" class="panel" style="margin-top:.8rem" @submit.prevent="create">
    <h2>Yangi stansiya</h2>
    <p style="color:#64748b">Xaritani bosing, koordinata yoziladi.</p>
    <MapCanvas :stations="form.lat ? [{ id: 'new', name: form.name, type: form.type, lat: form.lat, lng: form.lng }] : []" :height="220" @pick="pick" />
    <div class="form-row" style="margin-top:.7rem">
      <label class="field"><span>Nomi</span><input v-model="form.name" placeholder="Stansiya nomi" required /></label>
      <label class="field"><span>Turi</span>
        <select v-model="form.type"><option value="water">Suv</option><option value="air">Havo</option><option value="earth">Tuproq</option></select>
      </label>
      <label class="field"><span>Hudud</span>
        <select v-model="form.regionId"><option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option></select>
      </label>
      <label class="field"><span>Kenglik</span><input v-model="form.lat" inputmode="decimal" placeholder="41.3111" required /></label>
      <label class="field"><span>Uzunlik</span><input v-model="form.lng" inputmode="decimal" placeholder="69.2797" required /></label>
      <label class="field"><span>Izoh</span><input v-model="form.description" placeholder="Qisqa izoh" /></label>
    </div>
    <div class="form-actions"><button class="btn blue">Qo‘shish</button></div>
  </form>
  <article class="panel" style="margin-top:.8rem">
    <table>
      <thead><tr><th>Nomi</th><th>Turi</th><th>Hudud</th><th>So‘nggi</th><th>Holat</th><th v-if="auth.user?.role === 'admin'" /></tr></thead>
      <tbody>
        <tr v-for="station in stations" :key="station.id">
          <td><RouterLink :to="`/admin/stansiya/${station.id}`">{{ station.name }}</RouterLink></td>
          <td>{{ TYPE_LABEL[station.type] }}</td>
          <td>{{ station.region_name }}</td>
          <td>{{ station.latest?.summary || '—' }}</td>
          <td>{{ station.latest?.state === 'out' ? 'Tashqari' : station.latest?.state === 'ok' ? "Me'yor" : '—' }}</td>
          <td v-if="auth.user?.role === 'admin'"><button class="btn danger sm" type="button" @click="remove(station)">O‘chirish</button></td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
