<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import MapCanvas from '../../components/MapCanvas.vue'

const stations = ref([])
onMounted(async () => { stations.value = await api('/api/stations') })
</script>

<template>
  <div class="page-head"><div><h1>Xarita</h1><p style="color:#64748b">Yashil me’yor, qizil tashqari.</p></div></div>
  <MapCanvas :stations="stations" :height="560" />
</template>
