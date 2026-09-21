# HANDOFF — Image Converter (21 Sep 2026)

## Что готово к публикации в CWS

**Код и тесты:**
- 71 unit tests (Vitest) — зелёные
- 60 e2e tests (Playwright) — зелёные (0 failed)
- Lint (eslint) — чистый
- Build (vite) — собирается без ошибок
- Code review (subagent code-reviewer): 0 Critical, 0 Warnings (после фиксов), VERDICT LGTM

**Документы (всё корректно, без лжи про стек):**
- `STORE_LISTING.md` — SSOT для CWS listing (name, summary, description, single purpose, permissions, privacy practices, assets checklist)
- `PRIVACY_POLICY.md` — публичная privacy policy (опубликовать на GitHub Pages или просто дать ссылку на raw файл в репо)
- `README.md` — для GitHub, фичи и стек актуализированы
- `TECH_STACK.md` — стек зафиксирован (Vanilla JS + canvas + fflate + IndexedDB, НЕ используем browser-image-compression и chrome.storage.local)
- `AGENTS.md` — шапка стека актуальна
- `spec.md` — добавлен STATUS-дисклеймер что часть запланированного не внедрена

**Ассеты для CWS:**
- `store-assets/slide-{1..5}.png` — 5 скриншотов (1280×800)
- `store-assets/promo-small.png` (440×280)
- `store-assets/promo-marquee.png` (1400×560)
- `src/assets/icons/icon-{16,48,128}.png`

**Тестовый файл для ручной проверки:**
- `~/Downloads/image-convert-test/exif-test.jpg` — JPG с EXIF (camera Apple iPhone 15 Pro, GPS Москва, дата 2024-08-15). Юзер уже проверил EXIF stripping через exifdata.com — работает (No Metadata Found).

## Текущее состояние git

- Ветка: master
- Последний коммит: `f4eaf72 feat(assets): CWS store slides, promos, and listing`
- Накоплено правок с f4eaf72 (не закоммичено):
  - `src/popup/popup.js` — hover-zoom overlay, resize guard, atomic removeJob (deleteJob вместо clear+re-put)
  - `src/popup/popup.css` — .image-preview, .privacy-badge
  - `src/popup/index.html` — privacy-badge элемент
  - `src/lib/ui.js` — updateButtons с resize guard + lock controls during processing, toggleSettings для badge
  - `tests/e2e/adversarial.spec.js` — 10 новых тестов (EXIF strip, privacy-badge, resize guard, hover-zoom)
  - `tests/e2e/fixtures/exif-test.jpg` — новый fixture (untracked, надо добавить)
  - Документы: README, PRIVACY_POLICY, TECH_STACK, AGENTS, spec — правки по self-check
  - STORE_LISTING.md — добавлен EXIF в Key features
  - ROADMAP.md — backlog Product #2

**Перед публикацией СНАЧАЛА закоммитить** (чтобы в CWS пошёл чистый снапшот):
```bash
cd ~/PycharmProjects/image-convert
git add -A
git commit -m "feat: hover-zoom, EXIF badge, resize guard, atomic removeJob, 10 new e2e tests"
git push
```

## Что осталось ПОСЛЕ оплаты $5 (регистрация в CWS Developer Dashboard)

**Pre-publish (5 минут):**
1. Бамп version в `src/manifest.json`: `"version": "0.0.0.1"` → `"version": "1.0.0"`
2. `npm run build` → пересобрать `dist/`
3. Запаковать содержимое `dist/` в ZIP (manifest.json должен быть в корне ZIP)

**CWS Developer Dashboard (15 минут):**
1. https://chrome.google.com/webstore/devconsole
2. New Item → Upload ZIP
3. Заполнить listing по STORE_LISTING.md:
   - Name: `Bulk Image Converter — PNG/JPG/WebP/AVIF`
   - Summary: из STORE_LISTING.md (≤132 chars)
   - Description: из STORE_LISTING.md (≤16,000 chars)
   - Category: Productivity → Workflow
   - Single Purpose: из STORE_LISTING.md (≤1,000 chars)
   - Permission Justification: из STORE_LISTING.md
   - Remote Code: No
4. Privacy:
   - Data collection: None
   - Data usage: None
   - Data disclosure: None
   - Data security: из STORE_LISTING.md
   - Privacy policy URL: `https://github.com/andrey21t/image-convert/blob/master/PRIVACY_POLICY.md`
5. Ассеты:
   - Upload 5 скриншотов (slide-1..5.png, 1280×800)
   - Upload promo-small.png (440×280)
   - Upload promo-marquee.png (1400×560)
6. Submit for review (обычно 1-3 дня, до недели)

## Стратегия монетизации (кратко)

- **Product #1 (этот конвертер)** — БЕСПЛАТНО. Цель: трафик + аккаунт разработчика + репутация.
- **Product #2 (screenshot-redact)** — платный ($2-3 one-time). Запускается после публикации конвертера. Cross-sell через description/FAQ: «от тех же авторов».
- Оба продукта на одном аккаунте CWS ($5 один раз).

## Фичи реализованные (для CHANGELOG v1.0.0)

1. Drag&drop + file picker (up to 20 files)
2. Folder drop (recursive directory walk)
3. Format selector (PNG/JPEG/WebP/AVIF с browser support detection)
4. Quality slider (1-100, default 80)
5. Resize toggle (W × H, auto-aspect-ratio)
6. Resize guard (Convert disabled когда checkbox on, но оба поля пустые)
7. Hover-zoom на thumbnail (полное качество, 150ms delay, anti-flicker)
8. Per-card remove (× button)
9. EXIF metadata auto-removed (Canvas API)
10. Privacy badge в UI ("🛡 EXIF auto-removed · 100% local")
11. ZIP download (fflate, duplicate-name handling)
12. IndexedDB persistence (atomic single-record delete)
13. White background for transparent PNG → lossy formats
14. Format-select lock during/after conversion (mixed-format ZIP prevention)
15. Resize + quality controls lock during processing
16. Re-convert with new quality/resize (same format)
17. 71 unit + 60 e2e тестов

## Блокеры/риски

- **Заблокировано:** публикация в CWS — ждём регистрацию юзера в Developer Dashboard ($5 оплата)
- **Не делать до регистрации:** бамп version, rebuild, ZIP packaging, upload в devconsole (по §6 из road map)

## Как продолжить в новой сессии

```
Продолжи с image-convert. Прочитай HANDOFF.md в корне репо.
```

Или просто скажи «продолжи с прошлого места» — session-recovery подхватит.

## Контактная информация

- Remote: https://github.com/andrey21t/image-convert.git
- Branch: master
- Last commit: f4eaf72
- 13 файлов modified + 1 untracked (exif-test.jpg fixture) — НЕ закоммичено
