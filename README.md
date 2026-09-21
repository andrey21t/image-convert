# image-convert — bulk image converter Chrome extension

> Privacy-first bulk image converter. Convert, compress, resize multiple images locally in browser. No network requests, no tracking, no uploads.

## Что это

Chrome extension (Manifest V3) для массовой конверсии изображений: PNG ↔ JPEG ↔ WebP ↔ AVIF, resize, compress quality. Всё client-side через canvas API — ни один байт не покидает браузер.

## Для кого

Юзеры, которым нужно быстро конвертировать/сжать несколько изображений без загрузки в облако (фрилансеры, контент-мейкеры, разработчики).

## Why privacy-first

Concurrents (iloveimg, convertio, etc.) загружают изображения на серверы. Наше УТП — ноль network requests. GDPR-clean для EU юзеров, доверие для privacy-conscious сегмента.

### Malware / safety disclaimer

This extension is **not malware**. Verifiable guarantees:

- **Zero permissions** declared in `manifest.json` (`permissions: []`, `host_permissions: []`).
- **No network access** — the Content Security Policy explicitly sets `connect-src 'none'`, which Chrome enforces at the runtime layer. No fetch, XHR, WebSocket, or remote script can leave the extension.
- **No remote code** — all JavaScript is bundled locally; no `eval`, no dynamic imports from URLs, no remote `<script>`.
- **No data collection** — see [PRIVACY_POLICY.md](./PRIVACY_POLICY.md). No analytics, no telemetry, no crash reporting, no cookies, no trackers.
- **Source code is public** — <https://github.com/andrey21t/image-convert>. Audit it yourself before installing.
- **Permission justification** — see [PERMISSION_JUSTIFICATION.md](./PERMISSION_JUSTIFICATION.md) for the rationale of each (zero) permission.

If you see a network request from this extension in DevTools, it is a bug — please open an issue.

## Quick Start (для разработки)

```bash
git clone https://github.com/andrey21t/image-convert.git
cd image-convert
npm install
npm run dev      # Vite dev server, HMR
npm run build    # Production build в dist/
npm test         # Vitest unit tests (17+)
npm run lint     # ESLint
```

Загрузить в Chrome:
1. `npm run build` → `dist/`
2. Открой `chrome://extensions`
3. Developer mode → Load unpacked → выбери `dist/`

## Features (MVP Phase 1)

- [x] Project scaffold (Vite + @crxjs/vite-plugin)
- [x] Manifest V3 (zero permissions)
- [x] Popup UI (Chrome-style, DESIGN_SYSTEM.md tokens)
- [x] Drag&drop + file picker (up to 20 files)
- [x] Folder drop (recursive directory walk via webkitGetAsEntry)
- [x] Format selector (PNG/JPEG/WebP/AVIF with browser support detection)
- [x] Quality slider (1-100, default 80)
- [x] Resize toggle (W × H, auto-aspect-ratio when one field filled)
- [x] Resize guard (Convert disabled when checkbox on but no W/H)
- [x] Jobs list with thumbnails
- [x] Hover-zoom on thumbnail (full-quality preview overlay)
- [x] Per-card remove (× button)
- [x] Canvas-based conversion (PNG/JPEG/WebP, AVIF если браузер поддерживает)
- [x] EXIF metadata auto-removed (Canvas API redraws pixels, drops EXIF)
- [x] Privacy badge in UI ("EXIF auto-removed · 100% local")
- [x] Clear / Convert / Download buttons (state-aware)
- [x] ZIP download (fflate, duplicate-name handling)
- [x] IndexedDB persistence (done jobs, atomic single-record delete)
- [x] White background for transparent PNG → JPEG/WebP/AVIF (D10 fix)
- [x] Format-select lock during/after conversion (prevents mixed-format ZIP)
- [x] Resize + quality controls lock during processing
- [x] Re-convert with new quality/resize (same format)
- [x] 71 unit tests (Vitest + jsdom)
- [x] 60 e2e tests (Playwright, includes EXIF strip, resize guard, hover-zoom)
- [x] 100% client-side, no network requests
- [x] PERMISSION_JUSTIFICATION.md (Phase 2)
- [x] PRIVACY_POLICY.md (Phase 2)
- [x] Malware disclaimer в README (Phase 2)

## Stack

- **Manifest V3** (Chrome extension, zero permissions)
- **Vanilla JS** (small bundle, меньше CWS review time)
- **Vite** (build tool, @crxjs/vite-plugin)
- **canvas API** (native browser, zero deps for conversion)
- **fflate** (ZIP packaging, ~10KB)
- **IndexedDB** (persistence for done jobs)

Подробнее: [TECH_STACK.md](./TECH_STACK.md)

## Deploy

1. `npm run build` → `dist/`
2. Zip содержимое `dist/` (manifest.json в root)
3. Upload в [Chrome Web Store](https://chrome.google.com/webstore/devconsole)
4. Submit на review (typically 4 weeks)

## Vibe-coding usage

Open this repo in Cursor / Claude Code / Windsurf and ask: "implement <feature> from spec.md".

Read [spec.md](./spec.md) ПЕРЕД любой фичей — это source of truth.

## Phase status (см. PLANS.md)

- Phase 0: Pre-flight ✅ (2026-09-17)
- Phase 1: MVP код ✅ (Week 1 + Week 2 complete, 2026-09-17)
- Phase 2: CWS publish ⏳ (D2/D3/D4 done, CWS account pending)
- Phase 3: Promotion ⏳
- Phase 4: Monetization ⏳

## Honest disclaimer

Personal/hobby project, not professionally audited. Use at your own risk.

## License

MIT
