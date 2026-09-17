# ROADMAP.md — последовательность фаз

> План фаз. Подробности (Decision Log, Verification table, Invariants, One-way doors) — в [PLANS.md](./PLANS.md). Этот файл — high-level view для владельца и AI.

## Timeline overview

| Phase | Weeks | Goal | Exit criteria |
|---|---|---|---|
| Phase 0 | 1 day (done 2026-09-17) | Pre-flight: идея, стек, scaffold | Files created, GitHub repo pushed |
| Phase 1 | 2-3 weeks | MVP код: popup + conversion + bulk | 50+ unit tests, 10+ e2e, dev build works locally |
| Phase 2 | 6-8 weeks (с review) | CWS publish | Extension live on Chrome Web Store |
| Phase 3 | Параллельно с Phase 2 | Promotion: Dev.to / Reddit / Twitter / Show HN | 100+ installs, 5+ reviews |
| Phase 4 | 3-6 месяцев после launch | Monetization | First paying user, Boosty/Gumroad setup |

Total: ~12 недель до CWS live (10-12 baseline + 2 недели buffer).

## Phase 0 — Pre-flight ✅ (2026-09-17)

- [x] Идея: bulk image converter (privacy-first, MV3)
- [x] Стек: Vanilla JS + browser-image-compression + Vite + canvas API
- [x] 3 deep-analysis-critic passes, VERDICT: DEEP_ENOUGH
- [x] 5 gaps закрыто (MV3, 2FA, Cryptomus→Boosty, IH median, CWS ranking)
- [x] Pet-project scaffold: README, spec, PLANS, NEXT_SESSION_PROMPT
- [x] TECH_STACK, AGENTS, DESIGN_SYSTEM, ROADMAP (created this session)
- [ ] GitHub repo + first push (этот commit)
- [ ] Аккаунт CWS developer (опционально для Phase 1, обязательно для Phase 2)
- [ ] Privacy Policy на GitHub Pages (опционально для Phase 1, обязательно для Phase 2)

## Phase 1 — MVP код (2-3 недели)

### Week 1
- [ ] Vite + @crxjs/vite-plugin setup
- [ ] `manifest.json` (MV3, minimal permissions: `activeTab` only)
- [ ] Popup HTML + CSS (по DESIGN_SYSTEM.md)
- [ ] Drag&drop zone + file input fallback

### Week 2
- [ ] Canvas conversion: PNG ↔ JPEG ↔ WebP ↔ AVIF (16 пар)
- [ ] browser-image-compression для quality 1-100
- [ ] Resize: width × height или scale %
- [ ] IndexedDB persistence (>10MB files)
- [ ] Bulk ZIP download (fflate)
- [ ] Progress bar для batch
- [ ] Thumbnail preview

### Week 3
- [ ] 50+ unit tests (Vitest) — conversion matrix, resize math, quality calc
- [ ] 10+ e2e tests (Playwright) — drag&drop → convert → download
- [ ] Manual QA matrix: 4 формата × 4 target × 3 sizes × 3 quality = 144 cases
- [ ] Visual verify screenshots (chrome-devtools `take_screenshot` с filePath)
- [ ] Code-reviewer subagent pass

**Exit criteria:** `npm run build` → dist/ < 5 MB unpacked, all tests green, manual QA 144 cases passed.

## Phase 2 — CWS publish (6-8 недель с review)

### Pre-submit (1 неделя)
- [ ] Manifest polish: description ≤132 chars, name ≤75 chars
- [ ] Screenshots: 1280×800, 1-5 шт (capture from working extension)
- [ ] Icon: 16×16, 48×48, 128×128
- [ ] Privacy Policy на GitHub Pages
- [ ] ZIP (manifest в root, без подпапок)
- [ ] Аккаунт CWS developer ($5 + 2-Step Verification ON)

### Submit + review (4-8 недель)
- [ ] Upload ZIP в Chrome Web Store devconsole
- [ ] Submit на review
- [ ] Wait review (typically 4 недели, может до 8)
- [ ] Bugfix if rejected (CWS Policies violations)
- [ ] If rejected — fix, re-submit (новый review cycle)

### Long-review triggers (избегать)
- Broad host permissions (`<all_urls>`) — НЕ используем
- Sensitive permissions (`tabs`, `cookies`, `webRequest`) — НЕ используем
- Big code changes — incremental updates после launch
- Obfuscation — запрещено CWS

**Exit criteria:** Extension live на CWS, install URL работает.

## Phase 3 — Promotion (параллельно с Phase 2 review)

### Pre-launch (1-2 недели до CWS live)
- [ ] Reddit account warming (r/ChromeExtensions, r/webdev, r/SideProject)
- [ ] Twitter/X account warming (3-5 твитов про development)

### Launch day
- [ ] Dev.to article (draft готов за 1 неделю ДО)
- [ ] Reddit post (r/ChromeExtensions + r/SideProject)
- [ ] Twitter/X thread (5 твитов)
- [ ] Show HN (one-way shot, carefully prepared)
- [ ] Product Hunt (one-way shot, ПОСЛЕ CWS publish)

### Post-launch
- [ ] Respond to comments/feedback
- [ ] Iterate based on CWS reviews
- [ ] Track installs, ratings, uninstall reasons

**Exit criteria:** 100+ installs, 5+ reviews (CWS ranking улучшается с этими метриками).

## Phase 4 — Monetization (3-6 месяцев после launch)

### Triggers
- 100+ installs → start paid tier
- 50+ active weekly users → consider Pro features
- First organic review → gauge what users want

### Free → Paid
- [ ] Boosty для РФ-донатов (минимальный effort)
- [ ] Gumroad для зарубежных (MoR, takes care of VAT/tax)
- [ ] Lemon Squeezy IF verified payout для РФ (one-way door, верифицировать ПЕРЕД интеграцией)
- [ ] Russian self-employment "Мой налог" при первом платном юзере (one-way door)

### Paid tier features (после research)
- Batch > 50 files (free = 20)
- Advanced formats (HEIC, AVIF high-quality, animated WebP)
- Presets (Instagram 1080×1080, Twitter 1600×900, etc.)
- Custom watermark
- API access (если станет desktop app)

**Exit criteria:** First paying user, revenue > $0.

## Phase 5 — Post-MVP (если доживёт)

- Dark mode (`prefers-color-scheme`)
- Crop / rotate / flip
- Multi-format watermark
- Batch renaming
- Firefox port (MV3 cross-browser)
- Desktop app (Tauri, если есть demand)

## Buffer / Risks

- 2 недели buffer встроены в Phase 1-2 (10-12 недель baseline + 2 buffer)
- CWS review может занять 8 недель (худший случай)
- Lemon Squeezy РФ-payout НЕ верифицирован — fallback Gumroad

## Cross-refs

- [PLANS.md](./PLANS.md) — Decision Log, Verification table, Invariants, One-way doors
- [spec.md](./spec.md) — фичи MVP
- [NEXT_SESSION_PROMPT.md](./NEXT_SESSION_PROMPT.md) — handoff на следующую сессию
