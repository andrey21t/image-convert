# AGENTS.md — стиль кода для AI-ассистентов (Cursor / Claude Code / opencode)

> Этот файл — единый source of truth для стиля кода. Cursor, Claude Code, opencode читают его автоматически. Источник паттерна — langchain `AGENTS.md` universal (INSIGHT-LC-001), Cursor docs (INSIGHT-CD-003).

## Проект

`image-convert` — Chrome extension (Manifest V3) для bulk конверсии изображений. Client-side only, privacy-first. Стек: Vanilla JS + Vite + @crxjs/vite-plugin + canvas API + fflate (ZIP) + IndexedDB. **Не** использует browser-image-compression (рассмотрен и отказан — см. TECH_STACK.md) и **не** использует chrome.storage.local (настройки in-memory, см. TECH_STACK.md).

## Защищённые файлы (НЕ ТРОГАТЬ)

- `spec.md` — source of truth для фичей. Если меняешь — спрашивай владельца.
- `PLANS.md` — living документ фаз. Обновляет владелец (или ИИ с явного согласия).
- `TECH_STACK.md` — стек зафиксирован Phase 0. Менять только при migration (deep-analysis-critic pass обязателен).
- `DESIGN_SYSTEM.md` — UI-токены. Менять только при re-design (Phase 5+).
- `ROADMAP.md` — последовательность фаз. Менять только при plan pivot.
- `NEXT_SESSION_PROMPT.md` — handoff. Обновляется в конце сессии.

## Стиль кода

### Vanilla JS, ES2022+
- ESM (`import`/`export`), не CommonJS.
- Top-level `await` OK в background service worker.
- `const` по умолчанию, `let` только для reassign.
- JSDoc для public API (`/** @param {File} file @returns {Promise<Blob>} */`).
- Никаких TypeScript-в-Stubs — чистый JS.

### Имена
- Файлы: `kebab-case.js` (`batch-processor.js`, `format-converter.js`).
- Функции: `camelCase` (`convertImage`, `batchProcess`).
- Константы: `UPPER_SNAKE` (`DEFAULT_QUALITY`, `SUPPORTED_FORMATS`).
- Приватные: префикс `_` (`_compressSingle`, `_toCanvas`).

### Комментарии
- **НЕ ДОБАВЛЯТЬ комментарии** если не просит владелец.
- Если логика не очевидна — выноси в функцию с понятным именем, не комментируй.
- Допустимо: `// TODO Phase 5` / `// FIXME — bug #N`, не более.

### Размер файлов
- Один файл = одна ответственность (≤ 300 строк).
- Если > 300 строк — раздели по домену (`batch-processor.js` + `format-converter.js`).

### CSS
- CSS variables из DESIGN_SYSTEM.md, не хардкод цветов.
- Классы: `block__element--modifier` (BEM-lite).
- Inline styles — только для динамических значений (progress bar width).

### HTML
- `<template>` для повторяющихся элементов (job card).
- `data-*` атрибуты для selectors (`data-job-id`, `data-format`).
- Семантика: `<button>` для действий, `<input type="file">` для drag&drop fallback.

### Tests
- Vitest для unit (pure functions: format conversion, resize math, quality calc).
- Playwright для e2e (drag&drop → convert → download).
- Имя теста = поведение: `converts PNG to WebP with quality 80`.
- `test.each` для matrix (PNG/JPEG/WebP/AVIF × 4 targets = 16 cases).

## Discipline (из pet-project-blueprint § 6)

### Phase-based коммиты
- Одна фаза = один commit (или несколько мелких). В commit message: Phase N + что сделано.
- Day-based для параллельных: `feat(dayN)`, `fix(pdf):`, `feat(ui): Phase X`.

### Critic-итерации (deep-analysis-critic subagent)
- High-stakes изменения (миграция, замена impl, refactor > 5 файлов) → critic pass.
- **MAX 2 LBTM итераций.** После 2 LBTM — user consent, не 4-я.

### Code-reviewer после qa-verify-and-fix
- Детерминированные проверки (typecheck/lint/test) зелёные → semantic ревью.
- Independent subagent с чистым контекстом ищет logic/edge/security баги.

### Visual verify для UI-изменений
- chrome-devtools `take_screenshot` с `filePath` (НЕ inline base64 — экономит ~200k токенов на скриншот, AGENTS.md § anti-overengineering).
- Vision tool для общего впечатления. Детали — из `evaluate_script` + DOM snapshot.

### Параллельные сессии
- В начале КАЖДОЙ сессии: `git fetch && git log --oneline origin/master -5`.
- Если параллельная сессия запушила — перечитать PLANS, не работать со stale HEAD.

## One-way doors (НЕ ДЕЛАТЬ без согласия владельца)

- НЕ добавлять React/Tailwind/Svelte/Vue (bundle constraint).
- НЕ ослаблять CSP (`default-src 'self'; connect-src 'none'`).
- НЕ добавлять `tabs`, `cookies`, `webRequest`, `<all_urls>` permissions.
- НЕ добавлять network requests в core flow (нарушит УТП privacy-first).
- НЕ менять bundle > 5 MB unpacked.

## Что просить у владельца (🧑), не выдумывать

- Выбор RU vs EN для description copy.
- Выбор paid tier feature list.
- Выбор between Boosty/Gumroad/Lemon Squeezy (после верификации payouts РФ).
- Любая фича вне spec.md MVP — спрашивай, не выдумывай.

## Что ИИ предлагает черновик (🤖), владелец правит

- Текст для README / description / store listing.
- UI layout popup.
- Названия кнопок/действий.
- Цвета/шрифты в DESIGN_SYSTEM (предлагай, не фиксируй без согласия).
