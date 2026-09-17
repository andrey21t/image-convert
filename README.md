# image-convert — bulk image converter Chrome extension

> Privacy-first bulk image converter. Convert, compress, resize multiple images locally in browser. No network requests, no tracking, no uploads.

## Что это

Chrome extension (Manifest V3) для массовой конверсии изображений: PNG ↔ JPEG ↔ WebP ↔ AVIF, resize, compress quality. Всё client-side через canvas API — ни один байт не покидает браузер.

## Для кого

Юзеры, которым нужно быстро конвертировать/сжать несколько изображений без загрузки в облако (фрилансеры, контент-мейкеры, разработчики).

## Why privacy-first

Concurrents (iloveimg, convertio, etc.) загружают изображения на серверы. Наше УТП — ноль network requests. GDPR-clean для EU юзеров, доверие для privacy-conscious сегмента.

## Quick Start (для разработки)

```bash
git clone <repo-url> image-convert
cd image-convert
npm install
npm run dev
```

В Chrome: `chrome://extensions` → Developer mode → Load unpacked → выбрать `dist/`.

## Features (MVP)

- Drag & drop multiple images
- Convert: PNG ↔ JPEG ↔ WebP ↔ AVIF
- Resize: width/height/scale
- Compress: quality 1-100
- Bulk download как ZIP
- 100% client-side

## Stack

- **Manifest V3** (Chrome extension)
- **Vanilla JS** (small bundle, меньше CWS review time)
- **browser-image-compression** (~0.86 MB unpacked)
- **Vite** (build tool)
- **canvas API** (native browser, zero deps)

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
- Phase 1: MVP код ⏳
- Phase 2: CWS publish ⏳
- Phase 3: Promotion ⏳
- Phase 4: Monetization ⏳

## Honest disclaimer

Personal/hobby project, not professionally audited. Use at your own risk.

## License

MIT
