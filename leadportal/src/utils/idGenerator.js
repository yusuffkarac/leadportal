// Lead ID Generator Utility
// Bu dosya farklı formatlarda lead ID'leri oluşturmak için kullanılır

/**
 * Lead ID oluşturucu sınıfı
 */
export class LeadIdGenerator {
  constructor(settings = {}) {
    this.settings = {
      leadIdFormat: 'numeric',
      customFormat: 'L{YYYY}{MM}{DD}-{NUM}',
      leadPrefix: 'LEAD',
      startingNumber: 1,
      ...settings
    }
  }

  /**
   * Yeni bir lead ID oluşturur
   * @param {number} sequenceNumber - Sıra numarası
   * @returns {string} Oluşturulan ID
   */
  generateId(sequenceNumber) {
    const num = this.settings.startingNumber + sequenceNumber - 1
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    switch (this.settings.leadIdFormat) {
      case 'numeric':
        return num.toString()
      
      case 'prefixed-numeric':
        return `${this.settings.leadPrefix}-${num}`
      
      case 'date-numeric':
        return `${year}${month}${day}-${num}`
      
      case 'custom':
        return this.settings.customFormat
          .replace('{YYYY}', year)
          .replace('{MM}', month)
          .replace('{DD}', day)
          .replace('{NUM}', num)
          .replace('{PREFIX}', this.settings.leadPrefix)
      
      default:
        return num.toString()
    }
  }

  /**
   * ID formatının önizlemesini oluşturur
   * @param {number} count - Kaç tane örnek oluşturulacağı
   * @returns {string[]} Örnek ID'ler
   */
  generatePreview(count = 3) {
    const previews = []
    for (let i = 1; i <= count; i++) {
      previews.push(this.generateId(i))
    }
    return previews
  }

  /**
   * Ayarları günceller
   * @param {object} newSettings - Yeni ayarlar
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
  }

  /**
   * Mevcut ID'den sıra numarasını çıkarır
   * @param {string} id - Mevcut ID
   * @returns {number} Sıra numarası
   */
  extractSequenceNumber(id) {
    switch (this.settings.leadIdFormat) {
      case 'numeric':
        return parseInt(id) || 0
      
      case 'prefixed-numeric':
        const prefixedMatch = id.match(new RegExp(`${this.settings.leadPrefix}-(\\d+)`))
        return prefixedMatch ? parseInt(prefixedMatch[1]) : 0
      
      case 'date-numeric':
        const dateMatch = id.match(/\d{8}-(\d+)/)
        return dateMatch ? parseInt(dateMatch[1]) : 0
      
      case 'custom':
        // Custom format için regex oluştur
        const customRegex = this.settings.customFormat
          .replace('{YYYY}', '\\d{4}')
          .replace('{MM}', '\\d{2}')
          .replace('{DD}', '\\d{2}')
          .replace('{NUM}', '(\\d+)')
          .replace('{PREFIX}', this.settings.leadPrefix)
        const customMatch = id.match(new RegExp(customRegex))
        return customMatch ? parseInt(customMatch[1]) : 0
      
      default:
        return parseInt(id) || 0
    }
  }

  /**
   * Bir sonraki sıra numarasını hesaplar
   * @param {string[]} existingIds - Mevcut ID'ler
   * @returns {number} Bir sonraki sıra numarası
   */
  getNextSequenceNumber(existingIds = []) {
    if (existingIds.length === 0) {
      return 1
    }

    const sequenceNumbers = existingIds
      .map(id => this.extractSequenceNumber(id))
      .filter(num => num > 0)
      .sort((a, b) => b - a)

    return sequenceNumbers.length > 0 ? sequenceNumbers[0] + 1 : 1
  }
}

/**
 * Varsayılan ID generator instance'ı
 */
export const defaultIdGenerator = new LeadIdGenerator()

/**
 * Hızlı ID oluşturma fonksiyonu
 * @param {number} sequenceNumber - Sıra numarası
 * @param {object} settings - Ayarlar
 * @returns {string} Oluşturulan ID
 */
export function generateLeadId(sequenceNumber, settings = {}) {
  const generator = new LeadIdGenerator(settings)
  return generator.generateId(sequenceNumber)
}

/**
 * Ayarlardan ID generator oluşturur
 * @param {object} settings - Ayarlar
 * @returns {LeadIdGenerator} ID generator instance'ı
 */
export function createIdGenerator(settings) {
  return new LeadIdGenerator(settings)
}

/**
 * ID formatını doğrular
 * @param {string} id - Doğrulanacak ID
 * @param {object} settings - Ayarlar
 * @returns {boolean} Geçerli mi?
 */
export function validateLeadId(id, settings = {}) {
  const generator = new LeadIdGenerator(settings)
  const sequenceNumber = generator.extractSequenceNumber(id)
  return sequenceNumber > 0
}

/**
 * ID formatı örnekleri
 */
export const ID_FORMAT_EXAMPLES = {
  numeric: ['1', '2', '3', '1001'],
  'prefixed-numeric': ['LEAD-1', 'LEAD-2', 'LEAD-1001'],
  'date-numeric': ['20241201-1', '20241201-2', '20241202-1'],
  custom: ['L20241201-1', 'L20241201-2', 'L20241202-1']
}

/**
 * Desteklenen formatlar
 */
export const SUPPORTED_FORMATS = [
  'numeric',
  'prefixed-numeric', 
  'date-numeric',
  'custom'
]
