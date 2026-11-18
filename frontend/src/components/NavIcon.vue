<script setup>
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg class="dx-ico" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'grid'">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </template>
    <path v-else-if="name === 'water'" d="M12 3.2s6.2 6.4 6.2 10.3a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 3.2 12 3.2z" />
    <template v-else-if="name === 'air'">
      <path d="M3.5 8.5h10.2a2.8 2.8 0 1 0-2.4-2.8" />
      <path d="M3.5 12.5h13.8a2.8 2.8 0 1 1-2.6 2.8" />
      <path d="M3.5 16.5h7" />
    </template>
    <template v-else-if="name === 'earth'">
      <path d="m12 3.2-9 4.6 9 4.6 9-4.6-9-4.6z" />
      <path d="m3 12.2 9 4.6 9-4.6" />
      <path d="m3 16.4 9 4.4 9-4.4" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 21s6.5-5.8 6.5-10.2a6.5 6.5 0 1 0-13 0C5.5 15.2 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.1" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="m9 4.2-6 2.2v13.2l6-2.2 6 2.2 6-2.2V4.2l-6 2.2-6-2.2z" />
      <path d="M9 4.2v13.2M15 6.4v13.2" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 19.5V5" />
      <path d="M4 19.5h16" />
      <path d="M8 16v-4.2M12 16V8.2M16 16v-6" />
    </template>
    <template v-else-if="name === 'sliders'">
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8" cy="7" r="2.1" />
      <circle cx="15" cy="12" r="2.1" />
      <circle cx="10" cy="17" r="2.1" />
    </template>
    <template v-else-if="name === 'mail'">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </template>
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8.2" r="2.8" />
      <path d="M3.8 19.2a5.2 5.2 0 0 1 10.4 0" />
      <circle cx="17" cy="9" r="2.1" />
      <path d="M16.2 19.2a4.4 4.4 0 0 1 4-3.6" />
    </template>
    <template v-else-if="name === 'journal'">
      <path d="M8 3.8h9.2A1.8 1.8 0 0 1 19 5.6V20H8.2A2.2 2.2 0 0 1 6 17.8V6a2.2 2.2 0 0 1 2-2.2z" />
      <path d="M8 3.8v14.2" />
      <path d="M11 9h5.5M11 13h5.5" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.1" />
      <path d="M5.2 19.4a6.8 6.8 0 0 1 13.6 0" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 7V5.2A1.8 1.8 0 0 1 11.8 3.4H19v17.2h-7.2A1.8 1.8 0 0 1 10 18.8V17" />
      <path d="M4 12h10.5" />
      <path d="m11.5 8.2 3.8 3.8-3.8 3.8" />
    </template>
  </svg>
</template>
