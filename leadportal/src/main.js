import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import api from './utils/axios.js'
import { syncServerTime } from './utils/serverTime.js'

// Global axios instance'ı window'a ekle (eski kodlar için)
window.api = api

// Server time sync'i başlat
syncServerTime().catch(console.error)

// Her 5 dakikada bir server time'ı sync et
setInterval(() => {
  syncServerTime().catch(console.error)
}, 5 * 60 * 1000)

const app = createApp(App)

app.use(router)

app.mount('#app')
