<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api'
import { TYPE_LABEL } from '../modules'
import MapCanvas from '../components/MapCanvas.vue'

const overview = ref(null)
const stations = ref([])
const form = ref({ fullName: '', email: '', phone: '', message: '' })
const note = ref('')
const error = ref('')
const menu = ref(false)

const features = [
  { title: 'Suv', color: '#2f6fed', text: 'Daryo va kanallardagi pH, kislorod, nitrat va loyqalik qo‘lda kiritiladi.' },
  { title: 'Havo', color: '#14b8a6', text: 'PM2.5, PM10 va gazlar yoziladi. AQI shu qiymatlardan hisoblanadi.' },
  { title: 'Tuproq', color: '#f0c14b', text: 'Namlik, pH, organik modda va NPK hudud kesimida solishtiriladi.' },
]
const team = [
  ['Administrator', 'Foydalanuvchi, stansiya va me’yor spravochnigi.'],
  ['Ekolog', 'O‘lchovlarni kiritadi, tahrirlaydi va import qiladi.'],
  ['Tadqiqotchi', 'Ma’lumotni ko‘radi, filtrlaydi va Excelga oladi.'],
  ['Davlat vakili', 'Faqat o‘z hududi bo‘yicha hisobotni ko‘radi.'],
]
const reviews = [
  ['Bitta oyna', 'Suv, havo va tuproq endi alohida jadvallarda qolmaydi. Hudud bo‘yicha birga ko‘rinadi.'],
  ['Ikki me’yor', 'Har bir qiymat yonida O‘zbekiston va xalqaro chegara alohida belgi bilan turadi.'],
  ['Himoya uchun tayyor', 'Namuna stansiyalar va o‘lchovlar bilan tizimni darhol ko‘rsatish mumkin.'],
]

onMounted(async () => {
  overview.value = await api('/api/public/overview')
  stations.value = await api('/api/public/stations')
})

async function send(event) {
  event.preventDefault()
  error.value = ''
  note.value = ''
  try {
    await api('/api/public/contact', { method: 'POST', body: form.value })
    note.value = 'Xabar yuborildi. Administrator panelda ko‘radi.'
    form.value = { fullName: '', email: '', phone: '', message: '' }
  } catch (err) {
    error.value = err.message
  }
}
</script>

<template>
  <div>
    <header class="po-nav">
      <RouterLink to="/" class="po-brand">
        <span class="tiles" aria-hidden="true">
          <i style="background:#f0c14b" /><i style="background:#22c55e" /><i style="background:#d5d8dc" />
          <i style="background:#f0c14b" /><i style="background:#22c55e" /><i style="background:#3498db" />
          <i style="background:#3498db" /><i style="background:#d5d8dc" /><i style="background:#e74c3c" />
        </span>
        W E A
      </RouterLink>
      <nav class="po-links">
        <a href="#bosh">Bosh sahifa</a>
        <a href="#imkon">Imkoniyatlar</a>
        <a href="#galereya">Galereya</a>
        <a href="#jamoa">Jamoa</a>
        <a href="#sharh">Sharhlar</a>
        <a href="#aloqa">Aloqa</a>
      </nav>
      <RouterLink class="po-cta" to="/kirish">Kirish</RouterLink>
    </header>

    <section id="bosh" class="po-hero">
      <div>
        <p class="kicker">O‘zbekiston monitoringi</p>
        <h1>Juda aniq.</h1>
        <p class="lede">Suv, havo va tuproq holati bitta platformada. O‘lchov qo‘lda kiritiladi va darhol mahalliy hamda xalqaro me’yor bilan solishtiriladi.</p>
        <div class="po-actions">
          <RouterLink class="store" to="/kirish"><small>Panelni ochish</small><b>Administrator</b></RouterLink>
          <a class="store" href="#galereya" style="background:#1d4ed8"><small>Jonli xarita</small><b>Hududlar</b></a>
        </div>
      </div>
      <div class="phone">
        <div class="phone-top"><span>WEA</span><span>{{ overview?.stationCount || '—' }} stansiya</span></div>
        <div class="metric"><div><span class="dot" style="background:#2f6fed" /> Suv</div><b>{{ overview?.byType?.water ?? '—' }}</b></div>
        <div class="metric"><div><span class="dot" style="background:#14b8a6" /> Havo</div><b>{{ overview?.byType?.air ?? '—' }}</b></div>
        <div class="metric"><div><span class="dot" style="background:#f0c14b" /> Tuproq</div><b>{{ overview?.byType?.earth ?? '—' }}</b></div>
        <div class="metric"><div>O‘lchovlar</div><b>{{ overview?.readingCount ?? '—' }}</b></div>
      </div>
    </section>

    <section id="imkon" class="po-section alt">
      <div class="center">
        <p class="kicker">Imkoniyatlar</p>
        <h2>Uch modul, bitta baza</h2>
        <p class="sub">Ma’lumotlar PostgreSQL bazasida saqlanadi. Har bir modul alohida jadval va forma bilan yuradi.</p>
      </div>
      <div class="grid-3">
        <article v-for="item in features" :key="item.title" class="feature">
          <div class="icon" :style="{ background: item.color }">{{ item.title[0] }}</div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
    </section>

    <section id="galereya" class="po-section">
      <div class="center">
        <p class="kicker">Galereya</p>
        <h2>Kuzatuv nuqtalari</h2>
        <p class="sub">Yashil — me’yorda, qizil — me’yordan tashqari. Rang ikkala me’yordan yomonrog‘iga qarab qo‘yiladi.</p>
      </div>
      <div style="margin-top:1.4rem">
        <MapCanvas :stations="stations" :height="460" />
      </div>
      <div class="grid-3">
        <article v-for="station in stations.slice(0, 6)" :key="station.id" class="feature">
          <h3>{{ station.name }}</h3>
          <p>{{ TYPE_LABEL[station.type] }} · {{ station.region_name }}</p>
          <p style="margin-top:.4rem">{{ station.latest?.summary || 'O‘lchov yo‘q' }}</p>
        </article>
      </div>
    </section>

    <section id="jamoa" class="po-section alt">
      <div class="center">
        <p class="kicker">Jamoa</p>
        <h2>Kimlar ishlaydi</h2>
      </div>
      <div class="grid-4">
        <article v-for="person in team" :key="person[0]" class="team">
          <div class="icon" style="background:#0e1628">{{ person[0][0] }}</div>
          <h3>{{ person[0] }}</h3>
          <p>{{ person[1] }}</p>
        </article>
      </div>
    </section>

    <section id="sharh" class="po-section">
      <div class="center">
        <p class="kicker">Sharhlar</p>
        <h2>Nima uchun WEA</h2>
      </div>
      <div class="grid-3">
        <article v-for="item in reviews" :key="item[0]" class="review">
          <h3>{{ item[0] }}</h3>
          <p>{{ item[1] }}</p>
        </article>
      </div>
    </section>

    <section id="aloqa" class="po-section alt">
      <div class="grid-3" style="align-items:start">
        <div>
          <p class="kicker">Aloqa</p>
          <h2>Xabar qoldiring</h2>
          <p class="sub" style="margin-left:0">Xabar wea_db bazasidagi murojaatlar jadvaliga yoziladi.</p>
          <p style="margin-top:1rem;color:#64748b">Toshkent · wea@localhost · +998 71 000 00 00</p>
        </div>
        <form class="feature form-grid" style="grid-column: span 2" @submit="send">
          <p v-if="note" class="note">{{ note }}</p>
          <p v-if="error" class="error">{{ error }}</p>
          <label class="field">Ism<input v-model="form.fullName" required /></label>
          <label class="field">Email<input v-model="form.email" type="email" required /></label>
          <label class="field">Telefon<input v-model="form.phone" required /></label>
          <label class="field">Xabar<textarea v-model="form.message" required /></label>
          <button class="btn blue" type="submit">Yuborish</button>
        </form>
      </div>
    </section>

    <footer class="po-footer">
      <div><strong>W E A</strong><div>Suv · Havo · Tuproq</div></div>
      <div>O‘zbekiston ekologik monitoring platformasi</div>
    </footer>
  </div>
</template>
