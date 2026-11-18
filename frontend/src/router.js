import { createRouter, createWebHistory } from 'vue-router'
import { auth } from './auth'
import Landing from './views/Landing.vue'
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import AdminLayout from './layouts/AdminLayout.vue'
import Dashboard from './views/admin/Dashboard.vue'
import ModuleView from './views/admin/ModuleView.vue'
import Stations from './views/admin/Stations.vue'
import Station from './views/admin/Station.vue'
import MapView from './views/admin/MapView.vue'
import Report from './views/admin/Report.vue'
import Norms from './views/admin/Norms.vue'
import Users from './views/admin/Users.vue'
import Audit from './views/admin/Audit.vue'
import Messages from './views/admin/Messages.vue'
import Profile from './views/admin/Profile.vue'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    { path: '/', component: Landing },
    { path: '/kirish', component: Login },
    { path: '/royxat', component: Register },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { auth: true },
      children: [
        { path: '', component: Dashboard, meta: { title: 'Boshqaruv' } },
        { path: 'suv', component: ModuleView, props: { module: 'water' }, meta: { title: 'Suv' } },
        { path: 'havo', component: ModuleView, props: { module: 'air' }, meta: { title: 'Havo' } },
        { path: 'tuproq', component: ModuleView, props: { module: 'earth' }, meta: { title: 'Tuproq' } },
        { path: 'stansiyalar', component: Stations, meta: { title: 'Stansiyalar' } },
        { path: 'stansiya/:id', component: Station, meta: { title: 'Stansiya' } },
        { path: 'xarita', component: MapView, meta: { title: 'Xarita' } },
        { path: 'hisobot', component: Report, meta: { title: 'Hisobot' } },
        { path: 'meyorlar', component: Norms, meta: { title: "Me'yorlar" } },
        { path: 'murojaatlar', component: Messages, meta: { title: 'Murojaatlar', admin: true } },
        { path: 'foydalanuvchilar', component: Users, meta: { title: 'Foydalanuvchilar', admin: true } },
        { path: 'jurnal', component: Audit, meta: { title: 'Jurnal', admin: true } },
        { path: 'profil', component: Profile, meta: { title: 'Profil' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.auth && !auth.user) return '/kirish'
  if ((to.path === '/kirish' || to.path === '/royxat') && auth.user) return '/admin'
  if (to.meta.admin && auth.user?.role !== 'admin') return '/admin'
  return true
})
