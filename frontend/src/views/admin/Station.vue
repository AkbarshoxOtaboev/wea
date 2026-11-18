<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../../api'
import { MODULES, TYPE_LABEL } from '../../modules'
import { fmt, when } from '../../format'
import MapCanvas from '../../components/MapCanvas.vue'

const route = useRoute()
const station = ref(null)
const norms = ref([])
const error = ref('')

onMounted(async () => {
  try {
    station.value = await api(`/api/stations/${route.params.id}`)
    norms.value = await api(`/api/norms?module=${station.value.type}`)
  } catch (err) {
    error.value = err.message
  }
})
</script>

<template>
  <p v-if="error" class="error">{{ error }}</p>
  <div v-else-if="station">
    <div class="page-head">
      <div>
        <h1>{{ station.name }}</h1>
        <p style="color:#64748b">{{ TYPE_LABEL[station.type] }} · {{ station.region_name }}</p>
      </div>
    </div>
    <MapCanvas :stations="[station]" :height="300" />
    <article class="panel" style="margin-top:.8rem">
      <table>
        <thead>
          <tr>
            <th>Sana</th>
            <th v-for="field in MODULES[station.type].fields" :key="field.key">{{ field.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in station.readings" :key="row.id">
            <td>{{ when(row.measured_at) }}</td>
            <td v-for="field in MODULES[station.type].fields" :key="field.key">{{ fmt(row[field.key]) }}</td>
          </tr>
        </tbody>
      </table>
    </article>
  </div>
</template>
