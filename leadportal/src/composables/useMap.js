import { ref, onMounted, onUnmounted } from 'vue'

export function useMap(mapKey = 'default') {
  // Harita görünürlüğü
  const showMap = ref(localStorage.getItem(`showMap_${mapKey}`) !== 'false') // Default true
  
  // Harita state'leri
  const zipcodeIndex = ref(new Map())
  const mapRoot = ref(null)
  let leafletMap = null
  let markersLayer = null

  // Harita görünürlüğünü değiştir
  function toggleMapVisibility() {
    const wasVisible = showMap.value
    showMap.value = !showMap.value
    localStorage.setItem(`showMap_${mapKey}`, showMap.value.toString())

    // Harita kapatılıyorsa temizle
    if (wasVisible && leafletMap) {
      leafletMap.remove()
      leafletMap = null
      markersLayer = null
    }

    // Harita açıldığında yeniden initialize et
    if (showMap.value) {
      // DOM'un güncellenmesini bekle
      setTimeout(() => {
        if (mapRoot.value) {
          initMap()
          updateMapMarkers()
        }
      }, 100)
    }
  }

  // Zipcodes yükle
  async function ensureZipcodesLoaded() {
    if (zipcodeIndex.value.size > 0) return
    try {
      const res = await fetch('/zipcodes.json')
      const arr = await res.json()
      const m = new Map()
      for (const z of arr) {
        if (z.postal) m.set(String(z.postal), { lat: Number(z.lat), lon: Number(z.lon), name: z.name })
      }
      zipcodeIndex.value = m
    } catch (e) {
      console.error('Zipcodes yüklenemedi', e)
    }
  }

  // Harita initialize et
  function initMap() {
    if (!window.L || !mapRoot.value || leafletMap) return

    // Almanya sınırları (yaklaşık)
    const germanyBounds = [
      [47.0, 5.8],   // Güneybatı köşe
      [55.8, 15.2]   // Kuzeydoğu köşe
    ]

    leafletMap = window.L.map(mapRoot.value, {
      maxBounds: germanyBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 5  // Minimum zoom seviyesi (dünyaya zoom out engelle)
    }).setView([51.1657, 10.4515], 6)

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(leafletMap)
    markersLayer = window.L.layerGroup().addTo(leafletMap)
  }

  // Harita marker'larını güncelle
  function updateMapMarkers(leads = [], settings = { defaultCurrency: 'EUR' }, getInsuranceTypeIcon = () => 'mdi:file', formatPrice = (price, currency) => `${currency} ${price}`) {
    if (!leafletMap || !markersLayer) return
    markersLayer.clearLayers()
    const bounds = []
    const germanyBounds = [
      [47.0, 5.8],   // Güneybatı köşe
      [55.8, 15.2]   // Kuzeydoğu köşe
    ]

    for (const lead of leads) {
      // Satın alınan lead'ler için farklı veri yapısı
      const leadData = lead.lead || lead // Eğer lead.lead varsa (satın alınan lead), yoksa direkt lead
      const pc = leadData.postalCode || leadData.postal || ''
      const info = zipcodeIndex.value.get(String(pc))
      if (!info || isNaN(info.lat) || isNaN(info.lon)) continue

      const marker = window.L.marker([info.lat, info.lon])
      const price = lead.amount || (leadData.bids && leadData.bids[0]?.amount) || leadData.startPrice
      const currency = settings?.defaultCurrency || 'EUR'
      const insType = leadData.insuranceType || ''
      const iconifyName = getInsuranceTypeIcon(insType)
      const insIcon = insType ? `<span class="iconify" data-icon="${iconifyName}" style="font-size:14px;color:#475569"></span>` : ''
      const chip = insType ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#f8fafc;color:#334155;font-size:12px">${insIcon}<span>${insType}</span></span>` : ''
      const postalChip = pc ? `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#334155;font-size:12px"><span class="iconify" data-icon="mdi:map-marker-outline" style="font-size:14px;color:#64748b"></span><span>${pc}</span></span>` : ''
      const tags = (chip || postalChip) ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px">${chip}${postalChip}</div>` : ''

      // Satın alınan lead'ler için farklı popup
      const isPurchased = lead.amount !== undefined
      const priceLabel = isPurchased ? 'Satın Alma Fiyatı' : 'Fiyat'
      const priceColor = isPurchased ? '#059669' : '#0f766e'

      const popupHtml = `
        <div style="min-width:220px;max-width:280px">
          <div style="font-weight:700;margin-bottom:2px;color:#0f172a;font-size:14px">${leadData.title}</div>
          ${tags}
          <div style="font-size:12px;margin-bottom:10px;color:#475569;line-height:1.4">${(leadData.description||'').slice(0,120)}</div>
          <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">
            <span style="font-size:12px;color:#64748b">${priceLabel}:</span>
            <span style="font-weight:700;color:${priceColor};font-size:16px">${formatPrice(price, currency)}</span>
          </div>
          <a href="/lead/${leadData.id}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;color:#1d4ed8;text-decoration:none;background:#ffffff">Detaya git <span aria-hidden>→</span></a>
        </div>
      `
      marker.bindPopup(popupHtml)
      marker.addTo(markersLayer)
      bounds.push([info.lat, info.lon])
    }

    // Haritayı leads'e göre fit et, ama almanya sınırlarını aşma
    if (bounds.length > 0) {
      leafletMap.fitBounds(bounds, { padding: [20, 20], maxZoom: 10 })
    } else {
      // Lead yoksa almanya bounds'una fit et
      leafletMap.fitBounds(germanyBounds, { padding: [20, 20], maxZoom: 6 })
    }
  }

  // Cleanup
  function cleanup() {
    if (leafletMap) {
      leafletMap.remove()
      leafletMap = null
      markersLayer = null
    }
  }

  return {
    showMap,
    mapRoot,
    toggleMapVisibility,
    ensureZipcodesLoaded,
    initMap,
    updateMapMarkers,
    cleanup
  }
}
