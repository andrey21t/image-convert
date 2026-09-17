# DESIGN_SYSTEM.md — UI-токены для image-convert popup

> UI-проект обязан иметь зафиксированную систему (pet-project-blueprint § 2.2). Без неё ИИ будет изобретать новые кнопки/отступы/цвета каждый раз. Зафиксированная система = invariant.

## Канон

Chrome extension popup = нативный Chrome-стиль. Юзер видит привычные элементы, не кастомный UI. Material-like по spacing/typography, Chrome-color по палитре.

## Цвета

### Surface (Chrome popup)

| Token | Hex | Где |
|---|---|---|
| `--surface-base` | `#ffffff` | Popup background |
| `--surface-raised` | `#f8f9fa` | Cards, drag&drop zone hover |
| `--surface-sunken` | `#f1f3f4` | Inputs, settings area |
| `--surface-overlay` | `#ffffff` | Modals (за shadow) |

### Text

| Token | Hex | Где |
|---|---|---|
| `--text-primary` | `#202124` | Заголовки, основной текст |
| `--text-secondary` | `#5f6368` | Подсказки, метаданные |
| `--text-disabled` | `#9aa0a6` | Disabled controls |

### Brand / accent

| Token | Hex | Где |
|---|---|---|
| `--accent-primary` | `#1a73e8` | Primary action (Convert button), active states |
| `--accent-hover` | `#1765cc` | Hover primary |
| `--accent-disabled` | `#a1c4fa` | Disabled primary |

### Status

| Token | Hex | Где |
|---|---|---|
| `--status-success` | `#0d8a3e` | Job done, format supported |
| `--status-warning` | `#e37400` | Long batch, >5 sec ETA |
| `--status-error` | `#d93025` | Job failed, file rejected |
| `--status-info` | `#1a73e8` | Progress bar fill |

### Borders

| Token | Hex | Где |
|---|---|---|
| `--border-default` | `#dadce0` | Card borders, dividers |
| `--border-hover` | `#bdc1c6` | Hovered card |
| `--border-active` | `#1a73e8` | Focused input |

## Typography

| Token | Value | Где |
|---|---|---|
| `--font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Везде — нативный stack |
| `--font-size-base` | `14px` | Body (popup default) |
| `--font-size-sm` | `12px` | Metadata, hints, file size |
| `--font-size-lg` | `16px` | Headings, primary actions |
| `--font-size-xl` | `18px` | Title (drag&drop prompt) |
| `--font-weight-regular` | `400` | Body |
| `--font-weight-medium` | `500` | Buttons, labels |
| `--font-weight-bold` | `700` | Title, count badge |

## Spacing (4-based scale)

| Token | Value | Где |
|---|---|---|
| `--space-1` | `4px` | Inline icon-text gap |
| `--space-2` | `8px` | Form field gap |
| `--space-3` | `12px` | Card padding |
| `--space-4` | `16px` | Section gap |
| `--space-5` | `24px` | Drag&drop zone padding |
| `--space-6` | `32px` | Title-to-content gap |

## Sizing

| Token | Value | Где |
|---|---|---|
| `--popup-width` | `360px` | CWS popups: 25-800 px wide, 25-600 px tall |
| `--popup-max-height` | `600px` | CWS limit |
| `--radius-sm` | `4px` | Inputs, buttons |
| `--radius-md` | `8px` | Cards |
| `--radius-lg` | `12px` | Drag&drop zone |
| `--border-width` | `1px` | Default borders |
| `--border-width-active` | `2px` | Focused |

## Components

### Button

- Primary: `--accent-primary` bg, white text, `--radius-sm`, height 36px, padding `--space-2 --space-4`
- Secondary: transparent bg, `--text-primary` text, 1px `--border-default`
- Disabled: `--accent-disabled` bg, white text, `cursor: not-allowed`
- Hover: `--accent-hover` (primary only)

### Job card (file in batch)

- Background: `--surface-raised`
- Border: 1px `--border-default`, radius `--radius-md`
- Padding: `--space-3`
- Layout: `[thumbnail 40×40] [name + meta] [status icon]`
- Hover: border `--border-hover`

### Drag&drop zone

- Background: `--surface-sunken`
- Border: 2px dashed `--border-default`, radius `--radius-lg`
- Padding: `--space-5`
- Drag-over state: border `--accent-primary`, bg `--surface-raised`
- Text: `--text-secondary`, `--font-size-xl`, centered

### Progress bar

- Height: 4px, radius `--radius-sm`
- Track: `--surface-sunken`
- Fill: `--status-info`, transition `width 100ms linear`

### Settings row

- Layout: `[label 100px] [control flex-1]`
- Gap: `--space-2`
- Select: native `<select>` styled with `--surface-base` bg
- Slider: native `<input type="range">` styled, no custom thumb

## Icons

- Source: [Material Symbols](https://fonts.google.com/icons) (Rounded, 20px, `--text-secondary`)
- Inline SVG, no external font load (bundle constraint)
- Use: convert/resize/compress/download/error/check-circle

## Layout structure (popup)

```
┌─────────────────────────────────┐
│ Header (24px padding)          │  Title: "Image Converter"
├─────────────────────────────────┤
│ Drag&drop zone (--space-5 pad) │  Height: 120px
├─────────────────────────────────┤
│ Settings (--space-4 gap)        │  Format select / Quality / Resize
├─────────────────────────────────┤
│ Jobs list (scroll if >5)        │  Each: thumbnail + name + status
├─────────────────────────────────┤
│ Footer (sticky bottom)         │  [Convert] [Download ZIP]
└─────────────────────────────────┘
```

## Invariants (НЕ менять без re-design)

- `--popup-width: 360px` (CWS optimal, fits most laptops)
- Color tokens выше — VRT baseline (если меняешь — pixel diff упадёт)
- `--font-family` нативный stack (для cross-platform consistency)
- 4-based spacing scale (consistency with Material/Chrome)

## Dark mode (Phase 5+)

MVP = light only. Dark mode добавить в Phase 5 через `prefers-color-scheme: dark` + alt tokens. Не в MVP.

## Cross-refs

- [AGENTS.md](./AGENTS.md) — стиль кода (CSS variables from DESIGN_SYSTEM.md)
- [spec.md](./spec.md) — фичи (popup requirements)
- `pet-project-blueprint.md § 2.2` — DESIGN_SYSTEM обязателен для UI-проектов
