<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../../api'
import { ROLE_LABEL } from '../../modules'

const rows = ref([])
const regions = ref([])
const error = ref('')
const form = reactive({ fullName: '', email: '', password: '', role: 'researcher', regionId: '' })

async function load() {
  rows.value = await api('/api/users')
  regions.value = await api('/api/regions')
}
onMounted(() => load().catch((err) => { error.value = err.message }))

async function create() {
  error.value = ''
  try {
    await api('/api/users', { method: 'POST', body: { ...form, regionId: form.role === 'government' ? Number(form.regionId) : null } })
    Object.assign(form, { fullName: '', email: '', password: '', role: 'researcher', regionId: '' })
    await load()
  } catch (err) { error.value = err.message }
}

async function patch(id, body) {
  try {
    await api(`/api/users/${id}`, { method: 'PATCH', body })
    await load()
  } catch (err) { error.value = err.message }
}
</script>

<template>
  <div class="page-head"><h1>Foydalanuvchilar</h1></div>
  <p v-if="error" class="error">{{ error }}</p>
  <form class="panel form-row" @submit.prevent="create">
    <label class="field"><span>Ism</span><input v-model="form.fullName" placeholder="To‘liq ism" required /></label>
    <label class="field"><span>Email</span><input v-model="form.email" type="email" placeholder="ism@wea.uz" required /></label>
    <label class="field"><span>Parol</span><input v-model="form.password" type="password" placeholder="Kamida 8 belgi" minlength="8" required /></label>
    <label class="field"><span>Rol</span>
      <select v-model="form.role"><option v-for="(label, key) in ROLE_LABEL" :key="key" :value="key">{{ label }}</option></select>
    </label>
    <label v-if="form.role === 'government'" class="field"><span>Hudud</span>
      <select v-model="form.regionId" required><option value="">Tanlang</option><option v-for="region in regions" :key="region.id" :value="region.id">{{ region.name }}</option></select>
    </label>
    <button class="btn blue">Qo‘shish</button>
  </form>
  <article class="panel" style="margin-top:.8rem">
    <table>
      <thead><tr><th>Ism</th><th>Email</th><th>Rol</th><th>Hudud</th><th>Holat</th><th /></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>{{ row.fullName }}</td>
          <td>{{ row.email }}</td>
          <td>{{ ROLE_LABEL[row.role] }}</td>
          <td>{{ row.regionName || '—' }}</td>
          <td>{{ row.status === 'active' ? 'Faol' : 'Blok' }}</td>
          <td><button class="btn light sm" type="button" @click="patch(row.id, { status: row.status === 'active' ? 'blocked' : 'active' })">{{ row.status === 'active' ? 'Bloklash' : 'Ochish' }}</button></td>
        </tr>
      </tbody>
    </table>
  </article>
</template>
