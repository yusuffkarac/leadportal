// Para birimi sembolleri
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€',
  'GBP': '£'
}

// Para birimi sembolünü al
export function getCurrencySymbol(currency = 'TRY') {
  return CURRENCY_SYMBOLS[currency] || '₺'
}

// Para birimi ile birlikte fiyatı formatla
export function formatPrice(amount, currency = 'TRY') {
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toLocaleString('tr-TR')}`
}

// Para birimi ile birlikte label oluştur
export function getCurrencyLabel(currency = 'TRY') {
  const symbols = {
    'TRY': '₺',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || '₺'
}
