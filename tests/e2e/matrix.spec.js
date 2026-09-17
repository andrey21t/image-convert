import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const POPUP_URL = 'http://localhost:4173/popup/index.html'
const FIXTURES_DIR = join(__dirname, 'fixtures', 'matrix')
const REPORT_PATH = join(__dirname, 'matrix-report.json')

const SIZES = ['small', 'medium', 'large']
const INPUT_FORMATS = ['png', 'jpeg', 'webp', 'avif']
const TARGET_FORMATS = ['png', 'jpeg', 'webp', 'avif']
const QUALITIES = [30, 60, 90] // 3 quality levels

const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
}

function loadFixture(size, format) {
  const path = join(FIXTURES_DIR, `${size}.${format}`)
  return {
    name: `${size}.${format}`,
    mimeType: MIME_BY_FORMAT[format],
    buffer: readFileSync(path),
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 16)
}

/**
 * Matrix execution: 3 sizes × 4 input formats × 4 target formats × 3 qualities = 144 cases.
 * Collect: original size, result size, compression ratio, sha256, status.
 * Note: AVIF target may be unsupported in headless Chromium (no encoder).
 *       Such cases are marked 'skipped' (option disabled in popup), not 'error'.
 */
test.describe('Matrix 144 cases', () => {
  test('execute all 144 conversion cases', async ({ page }) => {
    const results = []

    // Detect supported target formats ONCE (popup.js filterUnsupportedOptions does this on init)
    await page.goto(POPUP_URL)
    const supportedTargets = await page.evaluate(() => {
      const select = document.getElementById('format-select')
      return Array.from(select.options)
        .filter((o) => !o.disabled)
        .map((o) => o.value)
    })

    for (const size of SIZES) {
      for (const inputFormat of INPUT_FORMATS) {
        const fixture = loadFixture(size, inputFormat)
        const originalSize = fixture.buffer.length

        for (const targetFormat of TARGET_FORMATS) {
          // Skip unsupported targets (e.g. AVIF in headless Chromium)
          if (!supportedTargets.includes(targetFormat)) {
            for (const quality of QUALITIES) {
              results.push({
                label: `${size}/${inputFormat}→${targetFormat}@q${quality}`,
                size,
                input: inputFormat,
                target: targetFormat,
                quality,
                originalBytes: originalSize,
                status: 'skipped',
                reason: 'target format not supported in this browser',
              })
            }
            continue
          }

          for (const quality of QUALITIES) {
            const label = `${size}/${inputFormat}→${targetFormat}@q${quality}`

            // Fresh context: clear IndexedDB to avoid restoreFromIDB polution
            await page.context().clearCookies()
            await page.evaluate(() => {
              return new Promise((resolve) => {
                const req = indexedDB.deleteDatabase('image-convert')
                req.onsuccess = () => resolve()
                req.onerror = () => resolve()
                req.onblocked = () => resolve()
              })
            })

            await page.goto(POPUP_URL)
            await expect(page.getByTestId('dropzone')).toBeVisible()
            await page.setInputFiles('#file-input', fixture)
            await page.locator('#format-select').selectOption(targetFormat)
            await page.locator('#quality-slider').fill(String(quality))
            await page.getByTestId('convert-btn').click()

            try {
              await expect(page.locator('[data-job-status]')).toHaveText('done', {
                timeout: 15000,
              })
              const meta = await page.locator('[data-job-meta]').textContent()
              const match = meta?.match(/→\s*([\d.]+\s*[KMG]?B)/i)
              const resultSizeStr = match ? match[1] : 'parse fail'

              results.push({
                label,
                size,
                input: inputFormat,
                target: targetFormat,
                quality,
                originalBytes: originalSize,
                status: 'done',
                resultSizeStr,
              })
            } catch (e) {
              results.push({
                label,
                size,
                input: inputFormat,
                target: targetFormat,
                quality,
                originalBytes: originalSize,
                status: 'error',
                error: e.message.split('\n')[0],
              })
            }
          }
        }
      }
    }

    // Save raw results
    writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2))

    // Summary assertions
    const done = results.filter((r) => r.status === 'done')
    const errors = results.filter((r) => r.status === 'error')
    const skipped = results.filter((r) => r.status === 'skipped')
    expect(results.length).toBe(144)
    console.log(`\n=== MATRIX SUMMARY ===`)
    console.log(`Total: ${results.length}`)
    console.log(`Done: ${done.length}`)
    console.log(`Errors: ${errors.length}`)
    console.log(`Skipped (unsupported target): ${skipped.length}`)
    if (errors.length > 0) {
      console.log(`\n--- ERRORS ---`)
      for (const e of errors) {
        console.log(`  ${e.label}: ${e.error}`)
      }
    }
    // All non-skipped conversions should succeed
    expect(errors.length).toBe(0)
  })
})

test.describe('D10 visual verify (transparent PNG → JPEG/WebP)', () => {
  test('transparent PNG → JPEG: white background (not black)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', loadFixture('medium', 'png'))
    await page.locator('#format-select').selectOption('jpeg')
    await page.locator('#quality-slider').fill('90')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 10000 })

    // Read result blob via page.evaluate — extract pixel color from canvas
    const pixel = await page.evaluate(async () => {
      const stored = await new Promise((resolve) => {
        const req = indexedDB.open('image-convert')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('jobs', 'readonly')
          const store = tx.objectStore('jobs')
          const all = store.getAll()
          all.onsuccess = () => resolve(all.result)
          all.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      })
      if (!stored.length) return null
      const blob = stored[0].result
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      const img = new Image()
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          // Sample bottom half (was transparent in source PNG)
          const y = Math.floor(img.naturalHeight * 0.75)
          const p = ctx.getImageData(img.naturalWidth / 2, y, 1, 1).data
          URL.revokeObjectURL(url)
          resolve({ r: p[0], g: p[1], b: p[2], a: p[3] })
        }
        img.src = url
      })
    })

    expect(pixel).not.toBeNull()
    // D10 fix: bottom half (was transparent) should be WHITE (255,255,255), NOT BLACK (0,0,0)
    expect(pixel.r).toBe(255)
    expect(pixel.g).toBe(255)
    expect(pixel.b).toBe(255)
    // JPEG has no alpha — should be 255
    expect(pixel.a).toBe(255)
  })

  test('transparent PNG → WebP: white background (D10 path)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', loadFixture('medium', 'png'))
    await page.locator('#format-select').selectOption('webp')
    await page.locator('#quality-slider').fill('90')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 10000 })

    const pixel = await page.evaluate(async () => {
      const stored = await new Promise((resolve) => {
        const req = indexedDB.open('image-convert')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('jobs', 'readonly')
          const store = tx.objectStore('jobs')
          const all = store.getAll()
          all.onsuccess = () => resolve(all.result)
          all.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      })
      if (!stored.length) return null
      const blob = stored[0].result
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      const img = new Image()
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const y = Math.floor(img.naturalHeight * 0.75)
          const p = ctx.getImageData(img.naturalWidth / 2, y, 1, 1).data
          URL.revokeObjectURL(url)
          resolve({ r: p[0], g: p[1], b: p[2], a: p[3] })
        }
        img.src = url
      })
    })

    expect(pixel).not.toBeNull()
    expect(pixel.r).toBe(255)
    expect(pixel.g).toBe(255)
    expect(pixel.b).toBe(255)
  })

  test('transparent PNG → PNG: alpha preserved (NOT white bg)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', loadFixture('medium', 'png'))
    await page.locator('#format-select').selectOption('png')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 10000 })

    const pixel = await page.evaluate(async () => {
      const stored = await new Promise((resolve) => {
        const req = indexedDB.open('image-convert')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('jobs', 'readonly')
          const store = tx.objectStore('jobs')
          const all = store.getAll()
          all.onsuccess = () => resolve(all.result)
          all.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      })
      if (!stored.length) return null
      const blob = stored[0].result
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      const img = new Image()
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const y = Math.floor(img.naturalHeight * 0.75)
          const p = ctx.getImageData(img.naturalWidth / 2, y, 1, 1).data
          URL.revokeObjectURL(url)
          resolve({ r: p[0], g: p[1], b: p[2], a: p[3] })
        }
        img.src = url
      })
    })

    expect(pixel).not.toBeNull()
    // PNG preserves alpha: bottom half should be transparent (a=0)
    expect(pixel.a).toBe(0)
  })
})

test.describe('Resize aspect ratio verify', () => {
  test('resize width only keeps aspect (medium 500x400 → width 250 → 250x200)', async ({
    page,
  }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', loadFixture('medium', 'png'))
    await page.getByTestId('resize-toggle').check()
    await page.getByTestId('resize-width').fill('250')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 10000 })

    const dims = await page.evaluate(async () => {
      const stored = await new Promise((resolve) => {
        const req = indexedDB.open('image-convert')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('jobs', 'readonly')
          const store = tx.objectStore('jobs')
          const all = store.getAll()
          all.onsuccess = () => resolve(all.result)
          all.onerror = () => resolve([])
        }
        req.onerror = () => resolve([])
      })
      if (!stored.length) return null
      const blob = stored[0].result
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      const img = new Image()
      return new Promise((resolve) => {
        img.onload = () => {
          URL.revokeObjectURL(url)
          resolve({ w: img.naturalWidth, h: img.naturalHeight })
        }
        img.src = url
      })
    })

    expect(dims).toEqual({ w: 250, h: 200 })
  })
})
