// Para birimi sembolleri
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€',
  'GBP': '£'
}

// Para birimi sembolünü al
export function getCurrencySymbol(currency = 'EUR') {
  return CURRENCY_SYMBOLS[currency] || '€'
}

// Para birimi ile birlikte fiyatı formatla
export function formatPrice(amount, currency = 'EUR') {
  const symbol = getCurrencySymbol(currency)
  return `${symbol}${amount.toLocaleString('de-DE')}`
}

// Para birimi ile birlikte label oluştur
  export function getCurrencyLabel(currency = 'EUR') {
  const symbols = {
    'TRY': '₺',
    'USD': '$',
    'EUR': '€',
    'GBP': '£'
  }
  return symbols[currency] || '€'
}
