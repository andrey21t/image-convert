import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { convertImage } = await import('../src/lib/convert.js')

/**
 * Resize math tests — convertImage должен корректно сохранять aspect ratio
 * для width-only / height-only, использовать exact values для both,
 * и Math.max(1, n) для boundary.
 */

function setupFake(naturalWidth, naturalHeight) {
  class FakeImage {
    constructor() {
      this.naturalWidth = naturalWidth
      this.naturalHeight = naturalHeight
      this.onload = null
      this.onerror = null
      this._src = null
    }
    set src(v) {
      this._src = v
      queueMicrotask(() => this.onload?.())
    }
    get src() {
      return this._src
    }
  }
  const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb) => cb(new Blob(['x']))),
  }
  return { FakeImage, ctx, canvas }
}

describe('resize math', () => {
  let originalImage
  let originalCreateElement

  beforeEach(() => {
    originalImage = global.Image
    originalCreateElement = document.createElement
  })

  afterEach(() => {
    global.Image = originalImage
    document.createElement.mockRestore?.()
  })

  it('resize.width only keeps aspect ratio (100x80 → 50 → 50x40)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png', resize: { width: 50 } })
    expect(canvas.width).toBe(50)
    expect(canvas.height).toBe(40)
    document.createElement.mockRestore()
  })

  it('resize.height only keeps aspect ratio (100x80 → 160 → 200x160)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png', resize: { height: 160 } })
    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(160)
    document.createElement.mockRestore()
  })

  it('resize both uses exact values (no aspect-ratio calc)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png', resize: { width: 30, height: 30 } })
    expect(canvas.width).toBe(30)
    expect(canvas.height).toBe(30)
    document.createElement.mockRestore()
  })

  it('no resize uses natural dimensions (100x80 → 100x80)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png' })
    expect(canvas.width).toBe(100)
    expect(canvas.height).toBe(80)
    document.createElement.mockRestore()
  })

  it('small resize rounds to ≥1px (Math.round edge case, 100x80 → 3 → 3x2)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    // width=3 → height = Math.round(80*3/100) = Math.round(2.4) = 2
    await convertImage(file, { format: 'png', resize: { width: 3 } })
    expect(canvas.width).toBe(3)
    expect(canvas.height).toBe(2)
    document.createElement.mockRestore()
  })

  it('huge resize (no clamp, browser-defined)', async () => {
    const { FakeImage, canvas } = setupFake(100, 80)
    global.Image = FakeImage
    vi.spyOn(document, 'createElement').mockImplementation((tag) =>
      tag === 'canvas' ? canvas : originalCreateElement.call(document, tag)
    )
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png', resize: { width: 10000, height: 8000 } })
    expect(canvas.width).toBe(10000)
    expect(canvas.height).toBe(8000)
    document.createElement.mockRestore()
  })
})
