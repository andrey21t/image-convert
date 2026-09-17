import { zip } from 'fflate'

/**
 * @param {Record<string, Blob>} files
 * @returns {Promise<Blob>}
 */
export async function createZip(files) {
  const entries = Object.entries(files)
  if (entries.length === 0) {
    throw new Error('No files to zip')
  }
  const data = {}
  for (const [name, blob] of entries) {
    if (!blob || blob.size === 0) {
      throw new Error(`Empty blob for ${name}`)
    }
    data[name] = new Uint8Array(await blob.arrayBuffer())
  }
  return new Promise((resolve, reject) => {
    zip(data, (err, output) => {
      if (err) reject(err)
      else resolve(new Blob([output], { type: 'application/zip' }))
    })
  })
}
