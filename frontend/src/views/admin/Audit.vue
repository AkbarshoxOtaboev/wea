<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import { when } from '../../format'

const rows = ref([])
onMounted(async () => { rows.value = await api('/api/audit') })
</script>

<template>
  <div class="page-head"><h1>Jurnal</h1></div>
  <article class="panel">
    <table>
      <thead><tr><th>Sana</th><th>Foydalanuvchi</th><th>Amal</th><th>Obyekt</th><th>Izoh</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ when(row.created_at) }}</td>
          <td>{{ row.user_name || '—' }}</td>
          <td>{{ row.action }}</td>
          <td>{{ row.entity }}</td>
          <td>{{ row.detail }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
