<script setup>
import { ref } from 'vue'
import { api } from '../../api'
import { auth } from '../../auth'
import { ROLE_LABEL } from '../../modules'

const fullName = ref(auth.user?.fullName || '')
const current = ref('')
const next = ref('')
const message = ref('')
const error = ref('')

async function saveName() {
  error.value = ''
  try {
    auth.user = await api('/api/auth/profile', { method: 'PATCH', body: { fullName: fullName.value } })
    message.value = 'Ism saqlandi'
  } catch (err) { error.value = err.message }
}

async function savePassword() {
  error.value = ''
  try {
    await api('/api/auth/password', { method: 'POST', body: { current: current.value, next: next.value } })
    current.value = ''
    next.value = ''
    message.value = 'Parol yangilandi'
  } catch (err) { error.value = err.message }
}
</script>

<template>
  <div class="page-head"><h1>Profil</h1></div>
  <p v-if="error" class="error">{{ error }}</p>
  <p v-if="message" class="note">{{ message }}</p>
  <form class="panel form-grid" style="max-width:460px" @submit.prevent="saveName">
    <label class="field"><span>Ism</span><input v-model="fullName" /></label>
    <p style="color:#64748b">{{ auth.user?.email }} · {{ ROLE_LABEL[auth.user?.role] }}</p>
    <button class="btn blue">Saqlash</button>
  </form>
  <form class="panel form-grid" style="max-width:460px;margin-top:.8rem" @submit.prevent="savePassword">
    <h2>Parol</h2>
    <label class="field"><span>Joriy parol</span><input v-model="current" type="password" autocomplete="current-password" required /></label>
    <label class="field"><span>Yangi parol</span><input v-model="next" type="password" autocomplete="new-password" minlength="8" placeholder="Kamida 8 belgi" required /></label>
    <button class="btn">Yangilash</button>
  </form>
</template>
