<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const total = 5
const totalMs = total * 1000

const remainingMs = ref(totalMs)
const progress = ref(0) // 0..1

const seconds = computed(() => Math.ceil(remainingMs.value / 1000))
const percent = computed(() => `${progress.value * 100}%`)

let startTs
let rafId

onMounted(() => {
  const tick = (ts) => {
    if (startTs === undefined) startTs = ts
    const elapsed = ts - startTs
    progress.value = Math.min(1, elapsed / totalMs)
    remainingMs.value = Math.max(0, totalMs - elapsed)
    if (elapsed >= totalMs) {
      router.replace({ name: 'home' })
      return
    }
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})

function goHome() {
  if (rafId) cancelAnimationFrame(rafId)
  router.replace({ name: 'home' })
}
</script>

<template>
  <div class="forbidden-wrap">
    <div class="forbidden-card">
      <div class="icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M17 8V7A5 5 0 0 0 7 7v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="4" y="8" width="16" height="12" rx="2.5" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="12" cy="14" r="1.25" fill="currentColor"/>
        </svg>
      </div>
      <div class="title">
        <span class="code">403</span>
        <h2>Erişim reddedildi</h2>
      </div>
      <p class="desc">Bu sayfaya yalnızca ADMIN rolüne sahip kullanıcılar erişebilir.</p>
      <div class="progress" role="progressbar" :aria-valuenow="seconds" :aria-valuemin="0" :aria-valuemax="total">
        <div class="bar" :style="{ width: percent }"></div>
      </div>
      <p class="meta">{{ seconds }} saniye içinde anasayfaya yönlendirileceksiniz.</p>
      <div class="actions">
        <button class="btn" @click="goHome">Anasayfaya dön</button>
        <router-link class="btn btn-ghost" to="/login">Giriş yap</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden-wrap {
  min-height: 70vh;
  display: grid;
  place-items: start center;
  padding: 16px;
}

.forbidden-card {
  width: 100%;
  max-width: 720px;
  padding: 28px;
  border-radius: 16px;
  background: rgba(255,255,255,.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
}

.icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  color: #2563eb;
  background: linear-gradient(135deg, rgba(59,130,246,.12), rgba(16,185,129,.12));
  border: 1px solid rgba(59,130,246,.25);
  border-radius: 14px;
}

.title {
  margin-top: 16px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.code {
  font-weight: 700;
  font-size: 18px;
  color: #2563eb;
  background: rgba(59,130,246,.12);
  border: 1px solid rgba(59,130,246,.25);
  padding: 4px 10px;
  border-radius: 999px;
}

h2 {
  margin: 0;
}

.desc {
  margin-top: 6px;
  color: #475569;
}

.progress {
  height: 8px;
  margin: 18px 0 6px;
  background: rgba(0,0,0,.06);
  border-radius: 999px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #10b981, #06b6d4);
  transition: width .08s linear;
}

.meta {
  color: #64748b;
}

.actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.btn-ghost {
  background: transparent;
  color: #1f2937;
  border: 1px solid rgba(0,0,0,.12);
}
</style>


