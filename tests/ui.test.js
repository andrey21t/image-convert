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

  it('keeps images with empty MIME if type starts with image/', () => {
    const files = [new File(['a'], 'a.avif', { type: 'image/avif' })]
    const result = filterAccepted(files)
    expect(result).toHaveLength(1)
  })
})
