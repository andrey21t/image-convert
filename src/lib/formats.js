import { SUPPORTED_FORMATS } from './constants.js'

const AVIF_CHECK_CACHE = new Map()

/**
 * @param {string} format
 * @returns {Promise<boolean>}
 */
async function checkFormatSupport(format) {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const mime = `image/${format}`
  try {
    return canvas.toDataURL(mime).startsWith(`data:${mime}`)
  } catch {
    return false
  }
}

/**
 * @param {string} format
 * @returns {Promise<boolean>}
 */
export async function isFormatSupported(format) {
  if (!SUPPORTED_FORMATS.includes(format)) return false
  if (AVIF_CHECK_CACHE.has(format)) return AVIF_CHECK_CACHE.get(format)
  const supported = await checkFormatSupport(format)
  AVIF_CHECK_CACHE.set(format, supported)
  return supported
}

/**
 * @returns {Promise<string[]>}
 */
export async function getSupportedOutputFormats() {
  const results = await Promise.all(
    SUPPORTED_FORMATS.map(async (f) => [f, await isFormatSupported(f)])
  )
  return results.filter(([, ok]) => ok).map(([f]) => f)
}
