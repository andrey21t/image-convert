export const SUPPORTED_FORMATS = ['png', 'jpeg', 'webp', 'avif']
export const SUPPORTED_INPUT_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
export const DEFAULT_QUALITY = 80
export const DEFAULT_FORMAT = 'webp'
export const MAX_FILES = 20
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif'
}

/**
 * Lossy target formats without alpha channel — need white background fill
 * before drawImage to avoid black background for transparent PNGs (D10 fix).
 * Donor: saoud30/offscreen.js — ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,w,h).
 * PNG keeps alpha (lossless, no fill). WebP/AVIF in canvas.toBlob with quality
 * param are lossy → fill for safety.
 */
export const FORMATS_NEEDING_WHITE_BG = {
  png: false,
  jpeg: true,
  webp: true,
  avif: true
}

export const EXT_BY_FORMAT = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
  avif: 'avif'
}
