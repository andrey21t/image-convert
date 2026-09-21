# spec.md — source of truth для AI-агентов

> Читай ПЕРЕД любой фичей. README для людей, spec для AI.
>
> **STATUS (2026-09-21):** Этот документ — initial design spec. Часть запланированного не внедрена: `browser-image-compression` и `chrome.storage.local` отказаны (см. TECH_STACK.md «Что НЕ вошло»). Актуальный список фич — в README.md, актуальный стек — в TECH_STACK.md. Пункты spec про эти технологии — historical, не "к реализации".

## One-liner

Chrome extension для массовой конверсии изображений (PNG ↔ JPEG ↔ WebP ↔ AVIF, resize, compress) — 100% client-side, privacy-first.

## Stack

- Manifest V3 (Chrome 109+, см. constraints)
- Vanilla JS (ES2022+, no framework)
- Vite + @crxjs/vite-plugin (build)
- browser-image-compression (compress)
- canvas API (convert, resize) — native
- IndexedDB (file storage >10MB, unbounded)
- chrome.offscreen API (DOM rendering в MV3 service worker context)

Подробнее: [TECH_STACK.md](./TECH_STACK.md)

## MVP features

### Core (Phase 1, 2-3 недели)

- [x] Popup с drag & drop зоной
- [x] Multi-file select (до 20 файлов за раз)
- [x] Конверсия: PNG ↔ JPEG ↔ WebP ↔ AVIF
- [x] Resize: width × height или scale %
- [x] Compress: quality 1-100 (slider)
- [x] Bulk download как ZIP
- [x] Progress bar для batch processing
- [x] Превью thumbnail каждого файла

### Phase 2 prerequisites (после MVP, pre-CWS-publish)

- [x] `PERMISSION_JUSTIFICATION.md` (D2) — zero permissions rationale
- [x] `PRIVACY_POLICY.md` (D3) — публикуется на GitHub Pages
- [x] Malware disclaimer в README (D4) — "Why privacy-first" + safety guarantees

### Non-goals (MVP — НЕ делаем)

- ❌ OCR / text extraction
- [ ] Редактирование (crop, rotate) — Phase 5
- ❌ Cloud sync / account
- ❌ Server-side processing
- ❌ Mobile Firefox / Safari (Chrome only MVP)
- ❌ Multi-format watermark — Phase 5
- ❌ Batch renaming — Phase 5

## Data model

```typescript
interface ConversionJob {
  id: string;
  file: File;              // original
  targetFormat: 'png' | 'jpeg' | 'webp' | 'avif';
  resize?: { width?: number; height?: number; scale?: number };
  quality: number;         // 1-100
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Blob;           // converted
  error?: string;
  originalSize: number;
  resultSize: number;
}

interface BatchState {
  jobs: ConversionJob[];
  defaultFormat: 'webp';   // smart default (best compression)
  defaultQuality: 80;
  resizeEnabled: boolean;
  resizeConfig: { width?: number; height?: number; scale?: number };
}
```

## State machine

```
empty → files-dropped → jobs-pending → jobs-processing → jobs-done → zip-downloadable
                       ↑
                       └─ error → retry-individual
```

## User stories

1. **Алексей, фрилансер:** "Хочу сжать 10 PNG для веб-сайта до <100KB каждый без потери качества"
2. **Мария, контент-мейкер:** "Конвертировать 15 HEIC из iPhone в JPG для соц-сетей"
3. **Dev:** "Перевести 5 PNG в WebP для миграции на новый формат"

## Edge cases (verified deep-analysis-critic pass 3)

1. **MV3 service worker 30 sec idle** → persistence в `chrome.storage.local` для настроек, IndexedDB для файлов. Service worker wake по `chrome.action.onClicked`.
2. **chrome.storage.local 10 MB cap** → IndexedDB для файлов. Настройки (<10KB) в chrome.storage.local.
3. **CWS search ranking — 0 installs invisible** → external traffic через Dev.to/Medium articles ДО публикации.
4. **CWS update review delay** → hot-fix через beta channel (trusted testers).
5. **GDPR для EU-юзеров** → NO network requests in core flow. Analytics (если появится) — опциональный и off по умолчанию.
6. **Single-purpose rule CWS** → одна операция ("трансформация изображений"), конверсия+resize+compress — варианты одной операции, ОК.
7. **Offscreen API (Chrome 109+)** для DOM rendering в MV3 service worker context → canvas operations требуют DOM. Если render в popup — OK. Если в background — нужен `chrome.offscreen`.
8. **Russian self-employment tax** (4-6%, "Мой налог") — обязателен при первом платном юзере через ЮKassa/Boosty. One-way door.
9. **Bundle size ~1-2 MB** (browser-image-compression 0.86MB unpacked) — низкий CWS review risk.
10. **Privacy Policy URL** — GitHub Pages, бесплатный, работает из РФ без VPN.

## Validation criteria

- [x] All 4 formats (PNG/JPEG/WebP/AVIF) — matrix runner 144 cases, 108 done + 36 AVIF skipped (headless), 0 errors
- [x] Batch 20 файлов обрабатывается <30 секунд на среднем ноутбуке
- [x] Файл 10 MB → IndexedDB → result <3 сек
- [x] No network requests в DevTools (CSP `connect-src 'none'`)
- [x] Bundle unpacked <5 MB (44 KB unpacked)
- [x] Manifest V3 compliant
- [ ] Privacy Policy доступна по URL (D3 файл готов, deploy на GitHub Pages — user action)
- [x] Tests: 71 unit + 23 e2e (18 popup + 5 matrix)
- [x] **JPEG/WebP lossy conversion сохраняет белый фон для transparent PNG** (D10 fix, 36 unit tests + visual verify в matrix runner)
- [x] **Phase 2 prerequisites**: `PERMISSION_JUSTIFICATION.md` (D2), `PRIVACY_POLICY.md` (D3, источник для GitHub Pages URL), malware disclaimer в README (D4)

## Open questions (решить в Phase 0)

- [ ] RU vs EN рынок для description copy
- [ ] Free vs freemium — стартуем free, Boosty для донатов, paid tier после 100 installs
- [ ] AVIF support — Chrome 85+ (80% юзеров). Включить или PNG/JPEG/WebP only для MVP?

## Constraints (hard)

- Budget ≤ $150 (CWS $5 + домен $10-15 + hosting $0 [GitHub Pages] + misc $20 = ~$35)
- Time ≤ 2h/day × 12 недель = ~168 часов
- No VPN dependency (dev-side research hits blocklist, но это workaround'ится)
- No foreign card dependency для запуска (free MVP)

## References

- `~/.config/opencode/references/pet-project-blueprint/pet-project-blueprint.md` — эталон
- `~/.config/opencode/references/donor-research/topics/vibe-coding-mvp-toolkit.md` — стек
- `~/.config/opencode/skills/vibe-coding-mentor/SKILL.md:417` — правило "не обещай доход"
- `https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3` — MV3 constraints (verified 2026-09-17)
