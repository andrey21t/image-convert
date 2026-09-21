# TECH_STACK.md — стек и обоснование

> Критерии выбора: (1) понятный (ИИ знает по обучающим данным), (2) популярный (много примеров = меньше галлюцинаций), (3) быстрый билд (скорость итерации = жизнь проекта). Источник критериев — `pet-project-blueprint.md § 2.2`.

## Стек

| Слой | Технология | Размер (unpacked) | Почему |
|---|---|---|---|
| Platform | Chrome Extension Manifest V3 | — | Стандарт 2024+, обязателен для CWS. Chrome 109+ (offscreen API) |
| Language | Vanilla JS (ES2022+) | 0 KB | Нулевой overhead, минимальный bundle. React/Vue добавили бы 40-140 KB ради popup с одной формой |
| Build | Vite 5 + @crxjs/vite-plugin | ~30 MB dev dep | HMR + auto-reload extension, зрелый плагин для MV3 |
| Convert | canvas API (native) | 0 KB | PNG/JPEG/WebP/AVIF через `canvas.toBlob(type, quality)`. Нативный браузерный API, 0 зависимостей. Canvas redraw автоматически стрипает EXIF (privacy feature) |
| ZIP | fflate | ~50 KB | Быстрее JSZip в 2-3x, меньше размер, ESM-native |
| Storage | IndexedDB (native) | 0 KB | Хранение done-jobs между переоткрытиями popup. Нативный API, не требует permission |
| State | in-memory (popup.js state object) | 0 KB | Настройки (format/quality/resize) — в памяти, сбрасываются при закрытии popup. Не персистятся (сознательное решение: простота UX > восстановление настроек) |
| Tests | Vitest (unit) + Playwright (e2e) | dev deps | Vitest = Vite-native, быстрый. Playwright = лучший для Chrome extension e2e |

## Что НЕ вошло в стек (и почему)

| Технология | Почему нет |
|---|---|
| React/Vue/Svelte | Popup = 1 форма с drag&drop. Framework добавит 40-140 KB и усложнит review. Vanilla JS + `<template>` HTML достаточен |
| TypeScript | MVP без сложных типов. JSDoc для public API. TS добавил бы build step ради 200 строк кода. Добавим если проект доживёт до Phase 3 |
| Tailwind CSS | Popup = ~10 компонентов. CSS variables + 1 style.css file проще. Tailwind добавил бы PostCSS step |
| browser-image-compression | Рассматривался для target-size compression. Отказ: canvas.toBlob quality достаточен для MVP, библиотека добавила бы 0.86 MB |
| pdfjs-dist / tesseract.js | 34 MB / 17 MB — нарушает bundle constraint (<5 MB unpacked) и single-purpose rule CWS |
| chrome.storage.local | Рассматривался для настроек. Отказ: popup сброс = нормальное UX поведение. Добавляет permission (хотя и без-warning), усложняет state-sync. IndexedDB покрывает персистентность done-jobs |
| JSZip | fflate быстрее и меньше |
| Analytics (GA4) | Противоречит УТП "0 network requests". Если нужен metrics — Plausible/Rybbit (privacy-first), опционально в Phase 4 |

## Constraints (hard limits)

- Bundle unpacked < 5 MB (CWS review time растёт с размером)
- No network requests в core flow (CSP: `default-src 'self'; connect-src 'none'`)
- No `tabs`, `cookies`, `webRequest`, `<all_urls>` permissions (CWS review risk)
- Chrome 109+ (chrome.offscreen API)

## Verify sizes (2026-09-17)

```bash
npm view fflate dist.unpackedSize   # ~50,000 bytes ✅
# Total: <100 KB unpacked, well under 5 MB limit
```

## Cross-refs

- [spec.md](./spec.md) — source of truth для фичей
- [AGENTS.md](./AGENTS.md) — стиль кода
- `pet-project-blueprint.md § 2.2` — критерии выбора стека
