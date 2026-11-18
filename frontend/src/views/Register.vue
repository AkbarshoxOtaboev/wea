<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { register } from '../auth'

const router = useRouter()
const form = reactive({ fullName: '', email: '', password: '' })
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await register(form)
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
        <p class="kicker" style="color:#93c5fd">WEA</p>
        <h1>Tadqiqotchi sifatida qo‘shiling.</h1>
        <p style="margin-top:.8rem;max-width:36ch">Yangi hisob ma’lumotni ko‘radi. Yozish huquqini administrator beradi.</p>
      </div>
      <RouterLink to="/kirish" style="color:#fde68a">Kirish</RouterLink>
    </section>
    <form class="split-form" @submit.prevent="submit">
      <h2>Ro‘yxat</h2>
      <p v-if="error" class="error">{{ error }}</p>
      <label class="field">Ism<input v-model="form.fullName" required /></label>
      <label class="field">Email<input v-model="form.email" type="email" required /></label>
      <label class="field">Parol<input v-model="form.password" type="password" minlength="8" required /></label>
      <button class="btn blue" :disabled="busy">Hisob ochish</button>
    </form>
  </div>
</template>
