<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { auth, logout } from '../auth'
import { ROLE_LABEL } from '../modules'
import NavIcon from '../components/NavIcon.vue'

const route = useRoute()
const router = useRouter()
const open = ref(false)
const account = ref(false)
const query = ref('')
const title = computed(() => route.meta.title || 'Boshqaruv')
const initial = computed(() => (auth.user?.fullName || 'W').slice(0, 1))

const links = [
  { to: '/admin', label: 'Boshqaruv', icon: 'grid' },
  { to: '/admin/suv', label: 'Suv', icon: 'water' },
  { to: '/admin/havo', label: 'Havo', icon: 'air' },
  { to: '/admin/tuproq', label: 'Tuproq', icon: 'earth' },
  { to: '/admin/stansiyalar', label: 'Stansiyalar', icon: 'pin' },
  { to: '/admin/xarita', label: 'Xarita', icon: 'map' },
  { to: '/admin/hisobot', label: 'Hisobot', icon: 'chart' },
  { to: '/admin/meyorlar', label: "Me'yorlar", icon: 'sliders' },
  { to: '/admin/murojaatlar', label: 'Murojaatlar', icon: 'mail', admin: true },
  { to: '/admin/foydalanuvchilar', label: 'Foydalanuvchilar', icon: 'users', admin: true },
  { to: '/admin/jurnal', label: 'Jurnal', icon: 'journal', admin: true },
]

const visibleLinks = computed(() => links.filter((link) => !link.admin || auth.user?.role === 'admin'))

function search() {
  router.push({ path: '/admin/stansiyalar', query: query.value ? { q: query.value } : {} })
  open.value = false
}

function exit() {
  account.value = false
  logout()
  router.push('/')
}

function onDocumentClick(event) {
  if (!event.target.closest('.dx-account')) account.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
watch(() => route.fullPath, () => { account.value = false })
</script>

<template>
  <div class="dx">
    <aside class="dx-side" :class="{ open }">
      <RouterLink to="/" class="dx-brand" @click="open = false"><b>WEA</b><small>monitoring paneli</small></RouterLink>
      <nav class="dx-nav">
        <RouterLink
          v-for="link in visibleLinks"
          :key="link.to"
          :to="link.to"
          class="dx-link"
          @click="open = false"
        >
          <NavIcon :name="link.icon" />
          {{ link.label }}
        </RouterLink>
      </nav>
    </aside>
    <div class="dx-main">
      <header class="dx-top">
        <button class="menu-btn" type="button" @click="open = !open">Menyu</button>
        <input v-model="query" class="dx-search" placeholder="Stansiya qidirish" @keyup.enter="search" />
        <div class="dx-account">
          <button class="avatar-btn" type="button" :aria-expanded="account" aria-label="Hisob" @click.stop="account = !account">
            <span class="avatar">{{ initial }}</span>
          </button>
          <div v-if="account" class="dx-pop">
            <strong>{{ auth.user?.fullName }}</strong>
            <span>{{ ROLE_LABEL[auth.user?.role] }}</span>
            <span v-if="auth.user?.regionName">{{ auth.user.regionName }}</span>
            <RouterLink class="dx-link" to="/admin/profil" @click="account = false">
              <NavIcon name="user" />
              Profil
            </RouterLink>
            <button class="btn light dx-exit" type="button" @click="exit">
              <NavIcon name="logout" />
              Chiqish
            </button>
          </div>
        </div>
      </header>
      <div class="dx-body">
        <div class="crumb">Boshqaruv / {{ title }}</div>
        <RouterView />
      </div>
    </div>
  </div>
</template>
