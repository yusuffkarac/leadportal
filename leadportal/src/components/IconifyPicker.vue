<template>
  <div class="iconify-picker-card" @keydown.esc.stop.prevent="$emit('close')">
    <div class="picker-header">
      <div class="tabs">
        <button
          v-for="set in sets"
          :key="set.prefix"
          class="tab"
          :class="{ active: activeSet === set.prefix }"
          @click="changeSet(set.prefix)"
        >
          {{ set.label }}
        </button>
      </div>
      <div class="search">
        <input v-model="search" type="text" placeholder="İkon ara (örn: car, home)" />
        <button class="btn" @click="$emit('close')">Kapat</button>
      </div>
    </div>

    <div class="preview" v-if="modelValue">
      <Icon :icon="modelValue" width="28" height="28" />
      <span class="preview-name">{{ modelValue }} • {{ countLabel }}</span>
    </div>

    <div class="grid" :class="{ loading }">
      <button
        v-for="opt in filtered"
        :key="opt.id"
        type="button"
        class="grid-item"
        @click="select(opt)"
      >
        <Icon :icon="opt.id" width="24" height="24" />
        <span>{{ opt.name }}</span>
      </button>
      <div v-if="!loading && filtered.length === 0" class="empty">Sonuç bulunamadı</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  defaultSet: { type: String, default: 'mdi' }
})
const emit = defineEmits(['update:modelValue', 'close'])

const sets = [
  { prefix: 'mdi', label: 'Material' },
  { prefix: 'lucide', label: 'Lucide' },
  { prefix: 'bi', label: 'Bootstrap' }
]

const fallbacks = {
  mdi: ['home','account','car','file','briefcase','heart','paw','calendar','email','phone'],
  lucide: ['home','user','car','file','briefcase','heart','dog','calendar','mail','phone'],
  bi: ['house','person','car-front','file','briefcase','heart','calendar','envelope','telephone']
}

const activeSet = ref(props.defaultSet)
const search = ref('')
const loading = ref(false)
const names = ref([])
const searchResults = ref([])
let searchTimer = null

async function loadSet(prefix) {
  loading.value = true
  try {
    names.value = []
    // Prefer lightweight collection endpoint (returns icons as array)
    let res = await fetch(`https://api.iconify.design/collection?prefix=${encodeURIComponent(prefix)}`, { mode: 'cors' })
    if (!res.ok) throw new Error('collection endpoint failed')
    let json = await res.json()
    if (Array.isArray(json.icons) && json.icons.length) {
      names.value = [...json.icons]
    } else {
      // Fallback to full JSON
      res = await fetch(`https://api.iconify.design/${encodeURIComponent(prefix)}.json`, { mode: 'cors' })
      json = await res.json()
      if (Array.isArray(json.icons)) {
        names.value = [...json.icons]
      } else if (json.icons && typeof json.icons === 'object') {
        names.value = Object.keys(json.icons)
      }
      // Second fallback to CDN raw if still empty
      if (!names.value.length) {
        res = await fetch(`https://raw.githubusercontent.com/iconify/icon-sets/master/json/${encodeURIComponent(prefix)}.json`)
        if (res.ok) {
          json = await res.json()
          if (json && json.icons && typeof json.icons === 'object') {
            names.value = Object.keys(json.icons)
          }
        }
      }
    }
    console.log('[IconifyPicker] loaded', prefix, names.value.length)
  } catch (e) {
    console.error('Iconify load error', e)
    names.value = []
  } finally {
    if (!names.value.length && fallbacks[prefix]) {
      names.value = [...fallbacks[prefix]]
    }
    loading.value = false
  }
}

function changeSet(prefix) {
  activeSet.value = prefix
  loadSet(prefix)
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = (q.length >= 2 && Array.isArray(searchResults.value) && searchResults.value.length)
    ? searchResults.value
    : (Array.isArray(names.value) ? names.value : [])

  return base.slice(0, 400).map((n) => {
    const full = String(n)
    const hasPrefix = full.includes(':')
    const id = hasPrefix ? full : `${activeSet.value}:${full}`
    const name = hasPrefix ? full.split(':')[1] : full
    return { id, name }
  })
})

const countLabel = computed(() => `${filtered.value.length} ikon`)

function select(opt) {
  emit('update:modelValue', opt.id)
  emit('close')
}

onMounted(() => loadSet(activeSet.value))

watch(() => activeSet.value, () => { search.value = '' })

watch(() => search.value, (q) => {
  const query = (q || '').trim()
  if (searchTimer) clearTimeout(searchTimer)
  if (query.length < 2) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefixes=${encodeURIComponent(activeSet.value)}`)
      if (!res.ok) throw new Error('search failed')
      const json = await res.json()
      let results = Array.isArray(json.icons) ? json.icons : []
      // Validasyon: aktif set json'unda var olanları tut
      if (results.length) {
        const names = results.map((s) => String(s).includes(':') ? String(s).split(':')[1] : String(s))
        const checkUrl = `https://api.iconify.design/${encodeURIComponent(activeSet.value)}.json?icons=${encodeURIComponent(names.slice(0,200).join(','))}`
        const r2 = await fetch(checkUrl)
        if (r2.ok) {
          const j2 = await r2.json()
          const existing = j2 && j2.icons ? Object.keys(j2.icons) : []
          results = results.filter((s) => {
            const name = String(s).includes(':') ? String(s).split(':')[1] : String(s)
            return existing.includes(name)
          })
        }
      }
      searchResults.value = results
    } catch (e) {
      console.error('Iconify search error', e)
      searchResults.value = []
    }
  }, 250)
})
</script>

<style scoped>
.iconify-picker-card { width: 720px; max-width: 95vw; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 12px 28px rgba(0,0,0,.12); padding: 14px; display: grid; gap: 12px; }
.picker-header { display: grid; gap: 10px; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; cursor: pointer; font-weight: 600; color: #334155; }
.tab.active { background: #eef2ff; border-color: #c7d2fe; color: #1d4ed8; }
.search { display: flex; gap: 8px; }
.search input { flex: 1; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; }
.btn { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f3f4f6; cursor: pointer; }
.preview { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 10px; }
.preview-name { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #475569; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; max-height: 360px; overflow: auto; }
.grid.loading { opacity: .6; pointer-events: none; }
.grid-item { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: .2s ease; color: #111827; }
.grid-item:hover { background: #eef2ff; border-color: #c7d2fe; transform: translateY(-1px); }
.grid-item span { font-size: 12px; color: #475569; text-overflow: ellipsis; overflow: hidden; max-width: 100%; }
.grid-item .iconify { color: #111827; width: 24px; height: 24px; }
.preview .iconify { color: #111827; }
.empty { text-align: center; color: #64748b; padding: 18px 0; }
@media (max-width: 640px) { .iconify-picker-card { padding: 10px; } .grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); } }
</style>
