import { describe, it, expect, beforeEach, vi } from 'vitest'

const { filterAccepted } = await import('../src/lib/ui.js')

describe('ui — filterAccepted', () => {
  beforeEach(() => {
    global.MAX_FILES = 20
  })

  it('filters out non-image files', () => {
    const files = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
      new File(['c'], 'c.jpg', { type: 'image/jpeg' })
    ]
    const result = filterAccepted(files)
    expect(result.map((f) => f.name)).toEqual(['a.png', 'c.jpg'])
  })

  it('filters out unsupported image types (SVG/BMP/HEIC)', () => {
    const files = [
      new File(['a'], 'a.svg', { type: 'image/svg+xml' }),
      new File(['b'], 'b.bmp', { type: 'image/bmp' }),
      new File(['c'], 'c.png', { type: 'image/png' }),
      new File(['d'], 'd.heic', { type: 'image/heic' })
    ]
    const result = filterAccepted(files)
    expect(result.map((f) => f.name)).toEqual(['c.png'])
  })

  it('rejects oversized files (>50MB)', () => {
    const big = new File([new ArrayBuffer(50 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    const ok = new File([new ArrayBuffer(1024)], 'ok.png', { type: 'image/png' })
    const result = filterAccepted([big, ok])
    expect(result.map((f) => f.name)).toEqual(['ok.png'])
  })

  it('caps at MAX_FILES (20)', () => {
    const files = Array.from(
      { length: 30 },
      (_, i) => new File(['x'], `img-${i}.png`, { type: 'image/png' })
    )
    const result = filterAccepted(files)
    expect(result).toHaveLength(20)
  })

  it('handles empty input', () => {
    expect(filterAccepted([])).toEqual([])
  })

  it('keeps AVIF (supported format)', () => {
    const files = [new File(['a'], 'a.avif', { type: 'image/avif' })]
    const result = filterAccepted(files)
    expect(result).toHaveLength(1)
  })
})
