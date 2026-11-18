<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { login } from '../auth'

const router = useRouter()
const email = ref('admin@wea.uz')
const password = ref('Admin123!')
const error = ref('')
const busy = ref(false)
const demos = [
  ['Administrator', 'admin@wea.uz', 'Admin123!'],
  ['Ekolog', 'ekolog@wea.uz', 'Ekolog123!'],
  ['Tadqiqotchi', 'tadqiqot@wea.uz', 'Tadqiq123!'],
  ['Davlat vakili', 'davlat@wea.uz', 'Davlat123!'],
]

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await login(email.value, password.value)
    router.push('/admin')
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="split">
    <section class="split-copy">
      <div>
        <p class="kicker" style="color:#93c5fd">WEA ADMIN</p>
        <h1>Panelga xush kelibsiz.</h1>
        <p style="max-width:36ch;margin-top:.8rem">O‘lchovlar, stansiyalar va me’yorlar shu yerdan yuradi. Barcha yozuvlar wea_db bazasida.</p>
      </div>
      <RouterLink to="/" style="color:#fde68a">Bosh sahifa</RouterLink>
    </section>
    <form class="split-form" @submit.prevent="submit">
      <h2>Kirish</h2>
      <p v-if="error" class="error">{{ error }}</p>
      <label class="field">Email<input v-model="email" type="email" required /></label>
      <label class="field">Parol<input v-model="password" type="password" required /></label>
      <button class="btn blue" :disabled="busy" type="submit">{{ busy ? 'Kirilmoqda…' : 'Kirish' }}</button>
      <p>Hisob yo‘qmi? <RouterLink to="/royxat">Ro‘yxatdan o‘tish</RouterLink></p>
      <div class="demos">
        <button v-for="demo in demos" :key="demo[1]" class="demo" type="button" @click="email = demo[1]; password = demo[2]">
          <span>{{ demo[0] }}</span><span style="color:#64748b">{{ demo[1] }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
