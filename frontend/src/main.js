import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { bootAuth } from './auth'
import 'leaflet/dist/leaflet.css'
import './styles.css'

bootAuth().finally(() => {
  createApp(App).use(router).mount('#app')
})
