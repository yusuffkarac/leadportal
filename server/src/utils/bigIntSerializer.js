/**
 * BigInt değerlerini string'e çevirerek JSON serileştirmesini sağlar
 * Date objelerini de ISO string'e çevirir
 * @param {any} obj - Serileştirilecek obje
 * @returns {any} - BigInt değerleri string'e çevrilmiş obje
 */
export function serializeBigInt(obj) {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Date objelerini ISO string'e çevir
  if (obj instanceof Date) {
    return obj.toISOString()
  }

  if (typeof obj === 'bigint') {
    return obj.toString()
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item))
  }

  if (typeof obj === 'object') {
    const serialized = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeBigInt(obj[key])
      }
    }
    return serialized
  }

  return obj
}

/**
 * Express response için BigInt serileştirme middleware'i
 * res.json() çağrılmadan önce objeyi serileştirir
 */
export function bigIntJsonResponse(req, res, next) {
  const originalJson = res.json.bind(res)
  
  res.json = function(data) {
    const serialized = serializeBigInt(data)
    return originalJson(serialized)
  }
  
  next()
}

