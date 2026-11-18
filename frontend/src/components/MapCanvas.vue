<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'

const props = defineProps({
  stations: { type: Array, default: () => [] },
  height: { type: Number, default: 420 },
})
const emit = defineEmits(['pick'])
const el = ref(null)
let map
let layer

function colorOf(station) {
  const state = station.latest?.state
  if (state === 'out') return '#ef4444'
  if (state === 'ok') return '#22c55e'
  return '#94a3b8'
}

function draw() {
  if (!map) return
  if (layer) layer.remove()
  layer = L.layerGroup().addTo(map)
  props.stations.forEach((station) => {
    if (station.lat == null || station.lng == null) return
    const marker = L.circleMarker([Number(station.lat), Number(station.lng)], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: colorOf(station),
      fillOpacity: 1,
    })
    marker.bindPopup(`<strong>${station.name || 'Nuqta'}</strong><br>${station.region_name || ''}<br>${station.latest?.summary || ''}`)
    marker.addTo(layer)
  })
}

onMounted(() => {
  map = L.map(el.value, { scrollWheelZoom: false }).setView([41.3, 64.6], 6)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
  }).addTo(map)
  map.on('click', (event) => emit('pick', event.latlng))
  draw()
  setTimeout(() => map.invalidateSize(), 200)
})

watch(() => props.stations, draw, { deep: true })
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div ref="el" class="map-frame" :style="{ height: `${height}px` }" />
</template>
