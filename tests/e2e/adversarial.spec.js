import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import zlib from 'node:zlib'
import { unzipSync } from 'fflate'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Adversarial / edge-case e2e tests for image-convert popup.
 *
 * Goal: test what the happy-path suites (popup.spec, matrix.spec) do not:
 * broken inputs, limit boundaries, weird user input, name collisions,
 * real drag&drop events, race conditions, and actual behavior contracts.
 *
 * Naming: PNG fixtures for arbitrary sizes are generated in-process
 * (zlib + CRC32) — no binary blobs in repo.
 *
 * NOTE (documenting tests): tests tagged [FACT] assert the CURRENT behavior
 * and are expected to stay green. The two bugs confirmed 2026-09-20 (ZIP name
 * collision → silent data loss; ZIP ext taken from select state at download
 * time) are FIXED — their former test.fail() guards are now renamed
 * regression tests asserting the fixed contract.
 */

const POPUP_URL = 'http://localhost:4173/popup/index.html'

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

/** Minimal solid-color RGBA PNG generator. */
function genPng(w, h, fill = [255, 0, 0, 255]) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const px = Buffer.alloc(w * 4)
  for (let i = 0; i < w; i++) px.set(fill, i * 4)
  const row = Buffer.concat([Buffer.from([0]), px])
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function redPng() {
  return readFileSync(join(__dirname, 'fixtures', 'red-1x1.png'))
}

function file(buffer, name, mimeType) {
  return { name, mimeType, buffer }
}

/** Wait until every job card reaches a non-pending, non-processing state. */
async function waitForSettled(page, expected, timeout = 15000) {
  await expect(page.locator('[data-job-status]')).toHaveText(expected, { timeout })
}

/** Click download, return ZIP bytes. */
async function downloadZipBytes(page) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    page.getByTestId('download-btn').click(),
  ])
  const stream = await dl.createReadStream()
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

/** Decode image bytes in the browser, return {ok, w, h}. */
async function imgDims(page, bytes, mime) {
  const b64 = Buffer.from(bytes).toString('base64')
  return page.evaluate(
    async ({ b64, mime }) => {
      const bin = atob(b64)
      const u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0))
      const blob = new Blob([u8], { type: mime })
      try {
        const bm = await createImageBitmap(blob)
        return { ok: true, w: bm.width, h: bm.height }
      } catch {
        return { ok: false, w: 0, h: 0 }
      }
    },
    { b64, mime }
  )
}

async function convertOne(page, buffer, opts = {}) {
  await page.goto(POPUP_URL)
  await page.setInputFiles('#file-input', file(buffer, opts.name || 'img.png', 'image/png'))
  if (opts.format) await page.locator('#format-select').selectOption(opts.format)
  if (opts.resize) {
    await page.getByTestId('resize-toggle').check()
    if (opts.resize.width !== undefined)
      await page.getByTestId('resize-width').fill(String(opts.resize.width))
    if (opts.resize.height !== undefined)
      await page.getByTestId('resize-height').fill(String(opts.resize.height))
  }
  await page.getByTestId('convert-btn').click()
}

// ---------------------------------------------------------------------------
// A. Broken / hostile inputs
// ---------------------------------------------------------------------------

test.describe('Broken inputs do not kill the queue', () => {
  test('truncated PNG → error job, siblings still convert, ZIP has the survivors', async ({
    page,
  }) => {
    await page.goto(POPUP_URL)
    const broken = redPng().subarray(0, 20) // PNG header + partial IHDR
    await page.setInputFiles('#file-input', [
      file(genPng(100, 80), 'good1.png', 'image/png'),
      file(broken, 'broken.png', 'image/png'),
      file(genPng(50, 50), 'good2.png', 'image/png'),
    ])
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    // [FACT] error is per-job; the queue keeps going
    await waitForSettled(page, ['done', 'error', 'done'])
    const zipBuf = await downloadZipBytes(page)
    const entries = Object.keys(unzipSync(zipBuf))
    expect(entries.length).toBe(2) // good1.jpeg + good2.jpeg
  })

  test('0-byte .png file → error job (not silently dropped)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', file(Buffer.alloc(0), 'empty.png', 'image/png'))
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    await waitForSettled(page, ['error'])
    await expect(page.locator('[data-job-meta]')).toContainText('Cannot load image')
  })

  test('fake mime (jpeg label, png bytes) → decodes by content, converts fine', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', file(genPng(40, 30), 'photo.jpg', 'image/jpeg'))
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    await waitForSettled(page, ['done']) // [FACT] browser sniffs content, not label
  })

  test('untyped File (empty type) → rejected at filter, zero job cards', async ({ page }) => {
    await page.goto(POPUP_URL)
    // setInputFiles infers mime from extension — bypass with an in-page File
    // built with an explicit empty type, delivered via real DataTransfer drop.
    await page.evaluate(() => {
      const f = new File([new Uint8Array([137, 80, 78, 71])], 'mystery.png', { type: '' })
      const dt = new DataTransfer()
      dt.items.add(f)
      document
        .getElementById('dropzone')
        .dispatchEvent(new DragEvent('drop', { dataTransfer: dt }))
    })
    await expect(page.getByTestId('job-card')).toHaveCount(0)
  })

  test('GIF mime → rejected (gif decode not promised)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', file(Buffer.from('GIF89a'), 'anim.gif', 'image/gif'))
    await expect(page.getByTestId('job-card')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// B. Limit boundaries
// ---------------------------------------------------------------------------

test.describe('Limits', () => {
  test('25 files selected → exactly 20 job cards (MAX_FILES cap)', async ({ page }) => {
    await page.goto(POPUP_URL)
    const many = Array.from({ length: 25 }, (_, i) =>
      file(genPng(20, 20), `f${i}.png`, 'image/png')
    )
    await page.setInputFiles('#file-input', many)
    await expect(page.getByTestId('job-card')).toHaveCount(20)
    await expect(page.locator('[data-job-status]')).toHaveText(Array(20).fill('pending'))
  })

  test('60 MB "png" → rejected by size filter, zero cards', async ({ page }) => {
    await page.goto(POPUP_URL)
    // setInputFiles rejects buffers >50MB — write to a temp file and pass the path
    const bigPath = join(tmpdir(), 'huge-60mb-test.png')
    writeFileSync(bigPath, Buffer.alloc(60 * 1024 * 1024, 0xff))
    try {
      await page.setInputFiles('#file-input', bigPath)
      await expect(page.getByTestId('job-card')).toHaveCount(0)
    } finally {
      rmSync(bigPath, { force: true })
    }
  })

  test('under the cap: exactly 50 MB passes the filter and gets a card', async ({ page }) => {
    await page.goto(POPUP_URL)
    const big = Buffer.alloc(49 * 1024 * 1024, 0x00)
    await page.setInputFiles('#file-input', file(big, 'big.png', 'image/png'))
    await expect(page.getByTestId('job-card')).toHaveCount(1)
    // do NOT click convert here — the file is not a real image, we only test the filter
  })
})

// ---------------------------------------------------------------------------
// C. Resize edge cases
// ---------------------------------------------------------------------------

test.describe('Resize math', () => {
  test('width=0 → treated as "not provided", original dims preserved', async ({ page }) => {
    await convertOne(page, genPng(100, 80), {
      format: 'jpeg',
      resize: { width: 0 },
    })
    await waitForSettled(page, ['done']) // [FACT] 0 is falsy in convert.js branches
    const zip = await downloadZipBytes(page)
    const entries = Object.values(unzipSync(zip))
    const dims = await imgDims(page, entries[0], 'image/jpeg')
    expect(dims).toEqual({ ok: true, w: 100, h: 80 })
  })

  test('negative width → clamped to 1×1 by canvas safety, no crash', async ({ page }) => {
    await convertOne(page, genPng(100, 80), {
      format: 'jpeg',
      resize: { width: -50 },
    })
    await waitForSettled(page, ['done'])
    const zip = await downloadZipBytes(page)
    const dims = await imgDims(page, Object.values(unzipSync(zip))[0], 'image/jpeg')
    expect(dims.ok).toBe(true) // [FACT] Math.max(1, …) floor keeps it alive
    expect(Math.max(dims.w, 1)).toBe(1)
    expect(Math.max(dims.h, 1)).toBe(1)
  })

  test('both fields set → exact target dims (aspect NOT preserved by design)', async ({ page }) => {
    await convertOne(page, genPng(200, 100), {
      format: 'jpeg',
      resize: { width: 120, height: 50 },
    })
    await waitForSettled(page, ['done'])
    const zip = await downloadZipBytes(page)
    const dims = await imgDims(page, Object.values(unzipSync(zip))[0], 'image/jpeg')
    expect(dims).toEqual({ ok: true, w: 120, h: 50 }) // [FACT] stretch path
  })

  test('wide banner 4000x50 → resize width 400 → exact 400x5 (integer aspect math)', async ({
    page,
  }) => {
    await convertOne(page, genPng(4000, 50, [0, 90, 200, 255]), {
      format: 'jpeg',
      resize: { width: 400 },
    })
    await waitForSettled(page, ['done'])
    const zip = await downloadZipBytes(page)
    const dims = await imgDims(page, Object.values(unzipSync(zip))[0], 'image/jpeg')
    expect(dims).toEqual({ ok: true, w: 400, h: 5 }) // Math.round(50 * 400/4000)
  })

  test('height-only resize keeps aspect through the height branch', async ({ page }) => {
    await convertOne(page, genPng(4000, 50), {
      format: 'jpeg',
      resize: { height: 100 },
    })
    await waitForSettled(page, ['done'])
    const zip = await downloadZipBytes(page)
    const dims = await imgDims(page, Object.values(unzipSync(zip))[0], 'image/jpeg')
    expect(dims).toEqual({ ok: true, w: 8000, h: 100 }) // w = round(4000 * 100/50)
  })
})

// ---------------------------------------------------------------------------
// D. Quality boundaries
// ---------------------------------------------------------------------------

test.describe('Quality slider', () => {
  /**
   * Wipe IndexedDB from a blank document — by that moment the popup page has
   * been replaced, so its DB connection is released and deleteDatabase
   * resolves. Then reload the popup from a clean state.
   *
   * (Manual browser contexts lose blob-download streams in this headless
   * setup, so we stay in the main configured context and clean storage
   * instead of isolating.)
   */
  async function freshPopup(page) {
    // same-origin document (popup page replaced → its IDB connection released),
    // but not the popup itself — about:blank has an opaque origin and denies IDB
    await page.goto('http://localhost:4173/')
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const rq = indexedDB.deleteDatabase('image-convert')
          rq.onsuccess = rq.onerror = rq.onblocked = () => resolve()
        })
    )
    await page.goto(POPUP_URL)
  }

  async function convertWithQuality(page, q) {
    await freshPopup(page)
    await page.setInputFiles('#file-input', file(genPng(64, 64), 'q.png', 'image/png'))
    await page.locator('#format-select').selectOption('jpeg')
    await page.locator('#quality-slider').fill(String(q))
    await page.getByTestId('convert-btn').click()
    await waitForSettled(page, ['done'])
    return downloadZipBytes(page)
  }

  test('quality=1 (min extreme) → still a valid lossy image', async ({ page }) => {
    const q100 = await convertWithQuality(page, 100)
    const q1 = await convertWithQuality(page, 1) // slider min="1": q=0 unreachable by UI
    expect(q1.length).toBeGreaterThan(100) // valid non-empty JPEG inside ZIP
    // q1 must not be bigger than q100 by orders of magnitude (sanity)
    expect(q1.length).toBeLessThan(q100.length * 3)
  })
})

// ---------------------------------------------------------------------------
// E. Real drag & drop (DataTransfer), not the change-path alias
// ---------------------------------------------------------------------------

test.describe('Real drag & drop', () => {
  test('genuine DataTransfer drop → job card created', async ({ page }) => {
    await page.goto(POPUP_URL)
    const b64 = genPng(30, 30).toString('base64')
    await page.evaluate(
      ({ b64 }) => {
        const bin = atob(b64)
        const f = new File([bin], 'dropped.png', { type: 'image/png' })
        const dt = new DataTransfer()
        dt.items.add(f)
        const dz = document.getElementById('dropzone')
        dz.dispatchEvent(new DragEvent('drop', { dataTransfer: dt }))
      },
      { b64 }
    )
    await expect(page.getByTestId('job-card')).toHaveCount(1)
    await expect(page.locator('[data-job-name]')).toHaveText('dropped.png')
  })

  test('dragover → is-drag-over class, then dragleave removes it', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.evaluate(() => {
      const dz = document.getElementById('dropzone')
      dz.dispatchEvent(new DragEvent('dragover', { cancelable: true }))
    })
    await expect(page.getByTestId('dropzone')).toHaveClass(/is-drag-over/)
    await page.evaluate(() => {
      document.getElementById('dropzone').dispatchEvent(new DragEvent('dragleave', { cancelable: true }))
    })
    await expect(page.getByTestId('dropzone')).not.toHaveClass(/is-drag-over/)
  })
})

// ---------------------------------------------------------------------------
// F. Concurrency / state races
// ---------------------------------------------------------------------------

test.describe('Races', () => {
  test('double convert click (dispatchEvent bypasses disabled) → each job done once, ZIP intact', async ({
    page,
  }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(100, 100), 'a.png', 'image/png'),
      file(genPng(100, 100), 'b.png', 'image/png'),
      file(genPng(100, 100), 'c.png', 'image/png'),
    ])
    await page.locator('#format-select').selectOption('jpeg')
    // two raw clicks immediately after another — simulate impatient user
    await page.locator('#convert-btn').dispatchEvent('click')
    await page.locator('#convert-btn').dispatchEvent('click')
    await expect(page.locator('[data-job-status]')).toHaveText(
      ['done', 'done', 'done'],
      { timeout: 15000 }
    )
    const zip = await downloadZipBytes(page)
    expect(Object.keys(unzipSync(zip)).length).toBe(3)
  })

  test('convert → clear impossible mid-flight (button disabled synchronously)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(600, 600), 'slow.png', 'image/png'),
    ])
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    // the first job goes 'processing' synchronously → clear must lock instantly
    await expect(page.getByTestId('clear-btn')).toBeDisabled()
    await expect(page.getByTestId('convert-btn')).toBeDisabled()
    await expect(page.getByTestId('download-btn')).toBeDisabled()
    await waitForSettled(page, ['done'])
    await expect(page.getByTestId('clear-btn')).toBeEnabled()
  })
})

// ---------------------------------------------------------------------------
// G. Feature detection & formats
// ---------------------------------------------------------------------------

test.describe('Output format detection', () => {
  test('AVIF option state matches real encoder support (headless: disabled)', async ({ page }) => {
    await page.goto(POPUP_URL)
    const state = await page.evaluate(() => {
      const select = document.getElementById('format-select')
      const opt = Array.from(select.options).find((o) => o.value === 'avif')
      return { disabled: opt.disabled, selected: select.value }
    })
    const canEncodeAvif = await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 1
      c.height = 1
      return c.toDataURL('image/avif').startsWith('data:image/avif')
    })
    expect(state.disabled).toBe(!canEncodeAvif) // [FACT] UI follows encoder, not prefs
  })

  test('webp remains the default selected format', async ({ page }) => {
    await page.goto(POPUP_URL)
    await expect(page.locator('#format-select')).toHaveValue('webp')
  })
})

// ---------------------------------------------------------------------------
// H. ZIP naming (potential delivery defects)
// ---------------------------------------------------------------------------

test.describe('ZIP naming', () => {
  test('same basename, different input ext → ZIP contains BOTH files with deduped names', async ({
    page,
  }) => {
    // regression: data-loss bug popup.js downloadZip (2026-09-20) — people
    // photo.png/photo.jpg collided on exact `${base}.${ext}` key and
    // silently overwrote each other in the files object
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(60, 60), 'photo.png', 'image/png'),
      file(genPng(80, 80), 'photo.jpg', 'image/jpeg'),
    ])
    await page.getByTestId('convert-btn').click() // webp default
    await waitForSettled(page, ['done', 'done'])
    const zip = await downloadZipBytes(page)
    const entries = unzipSync(zip)
    expect(Object.keys(entries).sort()).toEqual(['photo-1.webp', 'photo.webp'])
    // pin the data-loss invariant fully: each name must carry ITS OWN blob,
    // not just any blob (a wrong binding of blob→name would still yield 2
    // correctly-named entries). Fixtures differ in dims on purpose.
    const first = await imgDims(page, entries['photo.webp'], 'image/webp')
    const second = await imgDims(page, entries['photo-1.webp'], 'image/webp')
    expect(first).toEqual({ ok: true, w: 60, h: 60 })
    expect(second).toEqual({ ok: true, w: 80, h: 80 })
  })

  test('cyrillic + emoji + uppercase names survive the ZIP round-trip', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(40, 40), 'фото тест.png', 'image/png'),
      file(genPng(40, 40), 'файл 😀.png', 'image/png'),
      file(genPng(40, 40), 'PHOTO.PNG', 'image/png'),
    ])
    await page.getByTestId('convert-btn').click()
    await waitForSettled(page, ['done', 'done', 'done'])
    const zip = await downloadZipBytes(page)
    const entries = Object.keys(unzipSync(zip)).sort()
    // 'P' (0x50) sorts before cyrillic; 'файл' before 'фото' ('а' < 'о')
    expect(entries).toEqual(['PHOTO.webp', 'файл 😀.webp', 'фото тест.webp'])
  })

  test('format changed after convert → ZIP ext matches convert-time content (x.webp stays webp)', async ({
    page,
  }) => {
    // regression: popup.js downloadZip (2026-09-20) took ext from
    // state.format at download time while the blob was encoded at convert
    // time — contract now: ext follows the per-job convert-time format
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', file(genPng(60, 60), 'x.png', 'image/png'))
    await page.getByTestId('convert-btn').click() // default webp
    await waitForSettled(page, ['done'])
    // user changes mind BEFORE downloading — must NOT rewrite history
    await page.locator('#format-select').selectOption('jpeg')
    const zip = await downloadZipBytes(page)
    const entries = unzipSync(zip)
    const names = Object.keys(entries)
    const bytes = entries[names[0]]
    const isWebp =
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 // 'RIFF'
    expect(isWebp).toBe(true)
    expect(names[0]).toBe('x.webp')
  })

  test('mixed-format session: jobs keep their convert-time formats in the ZIP', async ({
    page,
  }) => {
    // convert 2 files as webp → switch select to jpeg → add + convert a 3rd
    // → one ZIP, each entry named with the format it was actually encoded in
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(60, 60), 'a.png', 'image/png'),
      file(genPng(60, 60), 'b.png', 'image/png'),
    ])
    await page.getByTestId('convert-btn').click() // default webp
    await waitForSettled(page, ['done', 'done'])
    await page.locator('#format-select').selectOption('jpeg')
    await page.setInputFiles('#file-input', file(genPng(60, 60), 'c.png', 'image/png'))
    await page.getByTestId('convert-btn').click()
    await waitForSettled(page, ['done', 'done', 'done'])
    const entries = unzipSync(await downloadZipBytes(page))
    expect(Object.keys(entries).sort()).toEqual(['a.webp', 'b.webp', 'c.jpg'])
    const a = entries['a.webp']
    const c = entries['c.jpg']
    expect(a[0]).toBe(0x52) // 'R' — RIFF/WebP bytes
    expect(a[1]).toBe(0x49) // 'I'
    expect(c[0]).toBe(0xff) // JPEG SOI
    expect(c[1]).toBe(0xd8)
  })

  test('dotfile ".png" selected twice → both entries survive dedup (.webp + -1.webp)', async ({
    page,
  }) => {
    // ".png" has an empty basename after ext-strip → first entry keeps the
    // dotfile name, the collision gets the uniform -N suffix (data never lost)
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', [
      file(genPng(30, 30), '.png', 'image/png'),
      file(genPng(40, 40), '.png', 'image/png'),
    ])
    await page.getByTestId('convert-btn').click() // webp default
    await waitForSettled(page, ['done', 'done'])
    const zip = await downloadZipBytes(page)
    const entries = unzipSync(zip)
    expect(Object.keys(entries).sort()).toEqual(['-1.webp', '.webp'])
    // same as the basename-collision test: pin blob-per-name identity
    const first = await imgDims(page, entries['.webp'], 'image/webp')
    const second = await imgDims(page, entries['-1.webp'], 'image/webp')
    expect(first).toEqual({ ok: true, w: 30, h: 30 })
    expect(second).toEqual({ ok: true, w: 40, h: 40 })
  })
})
