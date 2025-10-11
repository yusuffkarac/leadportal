import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import api from './utils/axios.js'

// Global axios instance'ı window'a ekle (eski kodlar için)
window.api = api

const app = createApp(App)

app.use(router)

app.mount('#app')
