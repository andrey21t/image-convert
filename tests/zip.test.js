import { describe, it, expect } from 'vitest'
import { unzipSync } from 'fflate'

const { createZip } = await import('../src/lib/zip.js')

describe('zip — createZip', () => {
  it('returns Blob with application/zip type', async () => {
    const files = { 'a.txt': new Blob(['hello'], { type: 'text/plain' }) }
    const result = await createZip(files)
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('application/zip')
    expect(result.size).toBeGreaterThan(0)
  })

  it('preserves filenames inside ZIP', async () => {
    const files = { 'image.webp': new Blob([new Uint8Array([1, 2, 3])]) }
    const result = await createZip(files)
    const buf = new Uint8Array(await result.arrayBuffer())
    const unzipped = unzipSync(buf)
    expect(Object.keys(unzipped)).toEqual(['image.webp'])
  })

  it('handles multiple files', async () => {
    const files = {
      'a.png': new Blob([new Uint8Array([1, 2])]),
      'b.jpg': new Blob([new Uint8Array([3, 4, 5])]),
      'c.webp': new Blob([new Uint8Array([6])])
    }
    const result = await createZip(files)
    const buf = new Uint8Array(await result.arrayBuffer())
    const unzipped = unzipSync(buf)
    expect(Object.keys(unzipped).sort()).toEqual(['a.png', 'b.jpg', 'c.webp'])
  })

  it('rejects on empty input', async () => {
    await expect(createZip({})).rejects.toThrow(/No files to zip/)
  })

  it('rejects on empty blob', async () => {
    const files = { 'x.png': new Blob([]) }
    await expect(createZip(files)).rejects.toThrow(/Empty blob for x\.png/)
  })

  it('preserves file content roundtrip', async () => {
    const content = new Uint8Array([10, 20, 30, 40, 50])
    const files = { 'data.bin': new Blob([content]) }
    const result = await createZip(files)
    const buf = new Uint8Array(await result.arrayBuffer())
    const unzipped = unzipSync(buf)
    expect(Array.from(unzipped['data.bin'])).toEqual([10, 20, 30, 40, 50])
  })
})
