import { MIME_BY_FORMAT } from './constants.js'

/**
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage(file) {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Cannot load image: ${file.name}`))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * @param {HTMLImageElement} img
 * @param {{width?: number, height?: number}} [resize]
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
function createCanvas(img, resize) {
  let w = img.naturalWidth
  let h = img.naturalHeight
  if (resize?.width && resize?.height) {
    w = resize.width
    h = resize.height
  } else if (resize?.width) {
    h = Math.round((img.naturalHeight * resize.width) / img.naturalWidth)
    w = resize.width
  } else if (resize?.height) {
    w = Math.round((img.naturalWidth * resize.height) / img.naturalHeight)
    h = resize.height
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { canvas, ctx }
}

/**
 * @param {File} file
 * @param {{format: string, quality?: number, resize?: {width?: number, height?: number}}} opts
 * @returns {Promise<Blob>}
 */
export async function convertImage(file, opts) {
  const img = await loadImage(file)
  const { canvas } = createCanvas(img, opts.resize)
  const mime = MIME_BY_FORMAT[opts.format]
  const quality = Math.min(1, Math.max(0, (opts.quality ?? 80) / 100))
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`Conversion failed: ${file.name}`))),
      mime,
      quality
    )
  })
  if (!blob) throw new Error(`Conversion failed: ${file.name}`)
  return blob
}
