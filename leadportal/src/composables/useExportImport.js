import { ref } from 'vue'
import { useAlert } from './useAlert.js'

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

  const exportData = async () => {
    if (!getData) {
      error('Export-Funktion ist nicht definiert')
      return
    }

    try {
      isExporting.value = true

      const data = await getData()
      
      if (!data) {
        error('Keine Daten zum Exportieren gefunden')
        return
      }

      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const fullFileName = `${fileName}_${timestamp}.${fileExtension}`
      
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fullFileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      success('Daten wurden erfolgreich exportiert')
    } catch (err) {
      console.error('Export-Fehler:', err)
      error('Daten konnten nicht exportiert werden: ' + (err.message || 'Unbekannter Fehler'))
    } finally {
      isExporting.value = false
    }
  }

  const importData = async (file) => {
    if (!setData) {
      error('Import-Funktion ist nicht definiert')
      return
    }

    try {
      isImporting.value = true

      const text = await file.text()
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        error('Ungültige JSON-Datei')
        return false
      }

      if (validateData) {
        const validationResult = validateData(data)
        if (validationResult !== true) {
          error(validationResult || 'Fehler bei der Datenvalidierung')
          return false
        }
      }

      await setData(data)

      success('Daten wurden erfolgreich importiert')
      return true
    } catch (err) {
      console.error('Import-Fehler:', err)
      error('Daten konnten nicht importiert werden: ' + (err.message || 'Unbekannter Fehler'))
      return false
    } finally {
      isImporting.value = false
    }
  }

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
