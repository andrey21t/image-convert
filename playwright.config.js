import { defineConfig } from '@playwright/test'

/**
 * E2E config for image-convert Chrome extension popup.
 *
 * Strategy: serve built dist/ via `vite preview` and load popup/index.html
 * directly via HTTP. Popup.js does not use any chrome.* API — only canvas,
 * Image, IndexedDB, crypto — all available in a regular page context.
 * This avoids extension-ID instability and slow --load-extension flows.
 *
 * Run: `npm run test:e2e` (after `npm run build`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 400, height: 600 },
    actionTimeout: 3000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/popup/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
})
