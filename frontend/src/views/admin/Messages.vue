<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../api'
import { when } from '../../format'

const rows = ref([])
onMounted(async () => { rows.value = await api('/api/messages') })
</script>

<template>
  <div class="page-head"><h1>Murojaatlar</h1></div>
  <article class="panel">
    <table>
      <thead><tr><th>Sana</th><th>Ism</th><th>Email</th><th>Telefon</th><th>Xabar</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ when(row.created_at) }}</td>
          <td>{{ row.full_name }}</td>
          <td>{{ row.email }}</td>
          <td>{{ row.phone }}</td>
          <td>{{ row.message }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!rows.length" style="color:#64748b">Hali xabar yo‘q.</p>
  </article>
</template>
