import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const { convertImage } = await import('../src/lib/convert.js')

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
