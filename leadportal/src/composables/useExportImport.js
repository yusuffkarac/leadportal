import { ref } from 'vue'
import { useAlert } from './useAlert.js'

/**
 * Generic export/import composable
 * Herhangi bir sayfada veri export/import için kullanılabilir
 * 
 * @param {Object} options
 * @param {Function} options.getData - Export edilecek veriyi döndüren fonksiyon
 * @param {Function} options.setData - Import edilen veriyi ayarlayan fonksiyon
 * @param {Function} options.validateData - İsteğe bağlı: Import edilen veriyi validate eden fonksiyon
 * @param {String} options.fileName - Export dosya adı (varsayılan: 'export')
 * @param {String} options.fileExtension - Export dosya uzantısı (varsayılan: 'json')
 * @returns {Object} exportData, importData, isExporting, isImporting
 */
export function useExportImport(options = {}) {
  const { success, error } = useAlert()
  
  const {
    getData,
    setData,
    validateData,
    fileName = 'export',
    fileExtension = 'json'
  } = options

  const isExporting = ref(false)
  const isImporting = ref(false)

  /**
   * Veriyi JSON formatında export eder ve indirir
   */
  const exportData = async () => {
    if (!getData) {
      error('Export fonksiyonu tanımlanmamış')
      return
    }

    try {
      isExporting.value = true

      // Veriyi al
      const data = await getData()
      
      if (!data) {
        error('Export edilecek veri bulunamadı')
        return
      }

      // JSON'a çevir
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      // Dosya adını oluştur (tarih-saat ekle)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const fullFileName = `${fileName}_${timestamp}.${fileExtension}`
      
      // İndir
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fullFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      success('Veriler başarıyla export edildi')
    } catch (err) {
      console.error('Export hatası:', err)
      error('Veriler export edilemedi: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      isExporting.value = false
    }
  }

  /**
   * JSON dosyasını import eder ve veriyi yükler
   */
  const importData = async (file) => {
    if (!setData) {
      error('Import fonksiyonu tanımlanmamış')
      return
    }

    try {
      isImporting.value = true

      // Dosyayı oku
      const text = await file.text()
      
      // JSON parse et
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        error('Geçersiz JSON dosyası')
        return false
      }

      // Validate et (eğer fonksiyon tanımlıysa)
      if (validateData) {
        const validationResult = validateData(data)
        if (validationResult !== true) {
          error(validationResult || 'Veri doğrulama hatası')
          return false
        }
      }

      // Veriyi ayarla
      await setData(data)

      success('Veriler başarıyla import edildi')
      return true
    } catch (err) {
      console.error('Import hatası:', err)
      error('Veriler import edilemedi: ' + (err.message || 'Bilinmeyen hata'))
      return false
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Dosya seçici açar ve import işlemini başlatır
   */
  const triggerImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = `.${fileExtension},application/json`
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      await importData(file)
    }

    input.click()
  }

  return {
    exportData,
    importData,
    triggerImport,
    isExporting,
    isImporting
  }
}
