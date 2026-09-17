import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { convertImage } = await import('../src/lib/convert.js')
const { MIME_BY_FORMAT } = await import('../src/lib/constants.js')

/**
 * Set up fake Image + fake canvas + fake 2d context.
 * Returns spies on ctx methods and the canvas.toBlob mock.
 */
function setupFakeCanvas({ toBlobError = false } = {}) {
  const ctx = {
    fillStyle: '#000000',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }
  const blob = new Blob(['x'], { type: 'image/jpeg' })
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((cb) => {
      if (toBlobError) cb(null)
      else cb(blob)
    }),
  }
  return { ctx, canvas, blob }
}

function setupFakeImage(naturalWidth = 100, naturalHeight = 80) {
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
  return FakeImage
}

describe('convert — loadImage timeout (W4 fix)', () => {
  let originalImage

  beforeEach(() => {
    vi.useFakeTimers()
    originalImage = global.Image
    global.Image = class {
      set src(value) {
        this._src = value
      }
      get src() {
        return this._src
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    global.Image = originalImage
  })

  it('rejects with timeout message after 30s when image never loads', async () => {
    const file = new File(['x'], 'broken.png', { type: 'image/png' })
    const promise = convertImage(file, { format: 'webp', quality: 80 })
    promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(30000)
    await expect(promise).rejects.toThrow(/Image load timeout: broken\.png/)
  })
})

describe('convert — D10 white-bg fill for transparent PNG (lossy formats)', () => {
  let originalImage
  let originalCreateElement
  let ctx
  let canvas

  beforeEach(() => {
    originalImage = global.Image
    originalCreateElement = document.createElement
    global.Image = setupFakeImage(100, 80)
    const fake = setupFakeCanvas()
    ctx = fake.ctx
    canvas = fake.canvas
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas
      return originalCreateElement.call(document, tag)
    })
  })

  afterEach(() => {
    global.Image = originalImage
    document.createElement.mockRestore?.()
  })

  it('PNG target does NOT call fillRect (alpha preserved)', async () => {
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'png', quality: 80 })
    expect(ctx.fillRect).not.toHaveBeenCalled()
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)
  })

  it('JPEG target fills white background before drawImage', async () => {
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'jpeg', quality: 80 })
    expect(ctx.fillStyle).toBe('#FFFFFF')
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
    expect(ctx.drawImage).toHaveBeenCalledTimes(1)
  })

  it('WebP target fills white background before drawImage', async () => {
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'webp', quality: 80 })
    expect(ctx.fillStyle).toBe('#FFFFFF')
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
  })

  it('AVIF target fills white background before drawImage', async () => {
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'avif', quality: 80 })
    expect(ctx.fillStyle).toBe('#FFFFFF')
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
  })

  it('calls fillRect with canvas dimensions (0,0,w,h) before drawImage', async () => {
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await convertImage(file, { format: 'jpeg', quality: 80 })
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    // Order: fillRect BEFORE drawImage
    expect(ctx.fillRect.mock.invocationCallOrder[0]).toBeLessThan(
      ctx.drawImage.mock.invocationCallOrder[0]
    )
  })
})

describe('convert — conversion matrix (4 inputs × 4 targets)', () => {
  let originalImage
  let originalCreateElement

  beforeEach(() => {
    originalImage = global.Image
    originalCreateElement = document.createElement
    global.Image = setupFakeImage(100, 80)
  })

  afterEach(() => {
    global.Image = originalImage
    document.createElement.mockRestore?.()
  })

  const inputs = [
    { name: 'PNG', type: 'image/png' },
    { name: 'JPEG', type: 'image/jpeg' },
    { name: 'WebP', type: 'image/webp' },
    { name: 'AVIF', type: 'image/avif' },
  ]
  const targets = ['png', 'jpeg', 'webp', 'avif']

  for (const input of inputs) {
    for (const target of targets) {
      it(`${input.name} → ${target} resolves with correct MIME`, async () => {
        const fake = setupFakeCanvas()
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
          if (tag === 'canvas') return fake.canvas
          return originalCreateElement.call(document, tag)
        })
        const file = new File(['x'], `in.${input.name.toLowerCase()}`, { type: input.type })
        const result = await convertImage(file, { format: target, quality: 80 })
        expect(result).toBeInstanceOf(Blob)
        expect(fake.canvas.toBlob).toHaveBeenCalledWith(
          expect.any(Function),
          MIME_BY_FORMAT[target],
          0.8
        )
        document.createElement.mockRestore()
      })
    }
  }
})

describe('convert — quality clamping', () => {
  let originalImage
  let originalCreateElement

  beforeEach(() => {
    originalImage = global.Image
    originalCreateElement = document.createElement
    global.Image = setupFakeImage(100, 80)
  })

  afterEach(() => {
    global.Image = originalImage
    document.createElement.mockRestore?.()
  })

  const cases = [
    { q: 0, expected: 0 },
    { q: 50, expected: 0.5 },
    { q: 100, expected: 1 },
    { q: undefined, expected: 0.8 }, // DEFAULT_QUALITY = 80
    { q: 150, expected: 1 }, // clamp high
    { q: -10, expected: 0 }, // clamp low
  ]

  for (const { q, expected } of cases) {
    it(`quality=${q} → toBlob quality=${expected}`, async () => {
      const fake = setupFakeCanvas()
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return fake.canvas
        return originalCreateElement.call(document, tag)
      })
      const file = new File(['x'], 'in.png', { type: 'image/png' })
      const opts = { format: 'jpeg' }
      if (q !== undefined) opts.quality = q
      await convertImage(file, opts)
      expect(fake.canvas.toBlob).toHaveBeenCalledWith(
        expect.any(Function),
        'image/jpeg',
        expected
      )
      document.createElement.mockRestore()
    })
  }
})

describe('convert — toBlob error path', () => {
  let originalImage
  let originalCreateElement

  beforeEach(() => {
    originalImage = global.Image
    originalCreateElement = document.createElement
    global.Image = setupFakeImage(100, 80)
  })

  afterEach(() => {
    global.Image = originalImage
    document.createElement.mockRestore?.()
  })

  it('rejects when canvas.toBlob returns null', async () => {
    const fake = setupFakeCanvas({ toBlobError: true })
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return fake.canvas
      return originalCreateElement.call(document, tag)
    })
    const file = new File(['x'], 'in.png', { type: 'image/png' })
    await expect(convertImage(file, { format: 'jpeg' })).rejects.toThrow(
      /Conversion failed: in\.png/
    )
    document.createElement.mockRestore()
  })
})

describe('convert — image load error path', () => {
  let originalImage

  beforeEach(() => {
    originalImage = global.Image
  })

  afterEach(() => {
    global.Image = originalImage
  })

  it('rejects when image.onerror fires', async () => {
    class ErrorImage {
      constructor() {
        this.onload = null
        this.onerror = null
        this._src = null
      }
      set src(v) {
        this._src = v
        queueMicrotask(() => this.onerror?.(new Error('fail')))
      }
      get src() {
        return this._src
      }
    }
    global.Image = ErrorImage
    const file = new File(['x'], 'broken.png', { type: 'image/png' })
    await expect(convertImage(file, { format: 'jpeg' })).rejects.toThrow(
      /Cannot load image: broken\.png/
    )
  })
})
