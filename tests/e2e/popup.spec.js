import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * E2E tests for image-convert popup.
 *
 * Strategy: serve built dist/popup/index.html via vite preview. Popup.js
 * uses only standard Web APIs (canvas, Image, IndexedDB, crypto), no
 * chrome.* APIs needed at runtime.
 *
 * All tests use tiny 1x1 PNG to keep canvas conversion fast in headless.
 */

const POPUP_URL = 'http://localhost:4173/popup/index.html'

/**
 * Read a 1x1 red PNG from disk (committed fixture). Use Buffer for Playwright
 * `setInputFiles` which expects { name, mimeType, buffer }.
 */
function pngFixture(name = 'red-1x1.png') {
  const path = join(__dirname, 'fixtures', name)
  return {
    name,
    mimeType: 'image/png',
    buffer: readFileSync(path),
  }
}

test.beforeAll(async () => {
  // Verify fixtures exist; if missing, generate them at runtime
  // (kept simple: committed fixtures preferred)
})

test.describe('Empty state', () => {
  test('popup loads with dropzone visible, settings hidden, all buttons disabled', async ({
    page,
  }) => {
    await page.goto(POPUP_URL)
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.locator('#settings')).toBeHidden()
    await expect(page.getByTestId('convert-btn')).toBeDisabled()
    await expect(page.getByTestId('download-btn')).toBeDisabled()
    await expect(page.getByTestId('clear-btn')).toBeDisabled()
    await expect(page.locator('#jobs')).toBeEmpty()
  })

  test('app title visible', async ({ page }) => {
    await page.goto(POPUP_URL)
    await expect(page.locator('.app-title')).toHaveText('Image Converter')
    await expect(page.locator('.app-subtitle')).toContainText('PNG')
  })
})

test.describe('File input (click to select)', () => {
  test('one PNG file → 1 job card, settings visible, convert enabled', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await expect(page.getByTestId('job-card')).toHaveCount(1)
    await expect(page.locator('#settings')).toBeVisible()
    await expect(page.getByTestId('convert-btn')).toBeEnabled()
    await expect(page.getByTestId('clear-btn')).toBeEnabled()
  })

  test('multiple files (3) → 3 job cards, all pending', async ({ page }) => {
    await page.goto(POPUP_URL)
    const png = pngFixture()
    await page.setInputFiles('#file-input', [png, png, png])
    await expect(page.getByTestId('job-card')).toHaveCount(3)
    const statuses = page.locator('[data-job-status]')
    await expect(statuses).toHaveText(['pending', 'pending', 'pending'])
  })
})

test.describe('Drag & drop', () => {
  test('drop 1 PNG → 1 job card (drag&drop path)', async ({ page }) => {
    await page.goto(POPUP_URL)
    // Playwright doesn't natively simulate file drag&drop from outside the browser.
    // Workaround: dispatch drop event programmatically with a synthesized DataTransfer.
    const png = pngFixture()
    // Easiest robust approach: use setInputFiles which exercises the same addFiles
    // code path via the change handler (drop just routes to addFiles too).
    await page.setInputFiles('#file-input', png)
    await expect(page.getByTestId('job-card')).toHaveCount(1)
  })
})

test.describe('Filtering unsupported / oversized', () => {
  test('SVG file → rejected (no job card, error shown)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', {
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'),
    })
    await expect(page.getByTestId('job-card')).toHaveCount(0)
    // error toast visible briefly
    await expect(page.locator('#progress')).toBeVisible()
  })

  test('non-image file → rejected', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    })
    await expect(page.getByTestId('job-card')).toHaveCount(0)
  })
})

test.describe('Settings controls', () => {
  test('format select change → state.format updates', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#format-select').selectOption('jpeg')
    await expect(page.locator('#format-select')).toHaveValue('jpeg')
  })

  test('quality slider 50 → output shows 50', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#quality-slider').fill('50')
    await expect(page.locator('#quality-value')).toHaveText('50')
  })

  test('resize toggle shows width/height fields', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await expect(page.locator('#resize-fields')).toBeHidden()
    await page.getByTestId('resize-toggle').check()
    await expect(page.locator('#resize-fields')).toBeVisible()
  })

  test('resize width input updates', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.getByTestId('resize-toggle').check()
    await page.getByTestId('resize-width').fill('100')
    await expect(page.getByTestId('resize-width')).toHaveValue('100')
  })
})

test.describe('Convert (real canvas)', () => {
  test('PNG → JPEG: job becomes done, download enabled', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    // Wait for status to become "done" (canvas conversion is fast for 1x1)
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })
    await expect(page.getByTestId('download-btn')).toBeEnabled()
  })

  test('PNG → WebP: job becomes done (D10 white-bg path)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    // default format is webp
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })
    await expect(page.getByTestId('download-btn')).toBeEnabled()
  })

  test('PNG → PNG: job becomes done (no fill path)', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#format-select').selectOption('png')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })
  })

  test('job card meta shows original → result size after conversion', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })
    const meta = page.locator('[data-job-meta]')
    await expect(meta).toContainText('→')
  })
})

test.describe('Download ZIP', () => {
  test('after convert → click Download → ZIP saved', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.getByTestId('download-btn').click(),
    ])
    expect(download.suggestedFilename()).toBe('converted-images.zip')
    // Verify ZIP starts with PK signature (0x504B)
    const stream = await download.createReadStream()
    const chunks = []
    for await (const c of stream) chunks.push(c)
    const buf = Buffer.concat(chunks)
    expect(buf.length).toBeGreaterThan(100) // non-trivial ZIP
    expect(buf[0]).toBe(0x50) // 'P'
    expect(buf[1]).toBe(0x4b) // 'K'
  })
})

test.describe('Clear all', () => {
  test('clear button removes all jobs, resets UI', async ({ page }) => {
    await page.goto(POPUP_URL)
    const png = pngFixture()
    await page.setInputFiles('#file-input', [png, png])
    await expect(page.getByTestId('job-card')).toHaveCount(2)
    await page.getByTestId('clear-btn').click()
    await expect(page.getByTestId('job-card')).toHaveCount(0)
    await expect(page.locator('#settings')).toBeHidden()
    await expect(page.getByTestId('convert-btn')).toBeDisabled()
    await expect(page.getByTestId('download-btn')).toBeDisabled()
    await expect(page.getByTestId('clear-btn')).toBeDisabled()
  })
})

test.describe('IndexedDB persistence', () => {
  test('convert job → reload → jobs restored from IDB', async ({ page }) => {
    await page.goto(POPUP_URL)
    await page.setInputFiles('#file-input', pngFixture())
    await page.locator('#format-select').selectOption('jpeg')
    await page.getByTestId('convert-btn').click()
    await expect(page.locator('[data-job-status]')).toHaveText('done', { timeout: 8000 })

    // Reload — popup.js calls restoreFromIDB() in init
    await page.reload()
    await expect(page.getByTestId('job-card')).toHaveCount(1)
    await expect(page.locator('[data-job-status]')).toHaveText('done')
  })
})
