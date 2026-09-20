# Chrome Web Store Listing — Bulk Image Converter

> Source of truth для публикации. Все решения L1-L12 (image-converters-cws-listing.md) зафиксированы 2026-09-19.
> Поля обновляются в manifest при production (L12).

## Name (manifest, ≤45 chars)

```
Bulk Image Converter — PNG/JPG/WebP/AVIF
```

42 chars. Bulk + форматы — оба дифференциатора в имени (L2).

## Summary (search results, ≤132 chars)

```
Convert PNG, JPG, WebP and AVIF in bulk right in the browser. 100% local, zero permissions, one ZIP output.
```

107 chars. Лимит 132. Включает форматы + bulk + local + ZIP — 4 козыря в одной строке.

## Description (≤16,000 chars)

```
Bulk Image Converter turns image conversion into a one-click batch job — no uploads, no accounts, no cloud.

Drop up to 20 images into the popup, pick a format, hit Convert. Every file is processed locally in your browser and packaged into a single ZIP download.

## How it works

1. Click the toolbar icon to open the popup
2. Drag images in or click the drop zone (PNG, JPG, WebP, AVIF supported)
3. Pick the output format and adjust quality if needed
4. Hit Convert — files process one by one, each card updates live
5. Click Download ZIP to save the whole batch

## Key features

**Bulk conversion up to 20 files**
One queue, one click, one ZIP. No file-by-file round trips.

**Four output formats**
- WebP — best compression for web delivery
- JPEG — universal for photos
- PNG — lossless for graphics with transparency
- AVIF — auto-detected per browser, falls back gracefully where unsupported

**Quality slider 1–100**
Live value readout. Find the sweet spot between size and sharpness.

**Resize while converting**
Optional width × height in pixels. Off by default — original size is preserved unless you ask.

**Per-file error isolation**
A broken file doesn't kill the batch. The rest keep converting.

**Duplicate name handling**
Two files named `photo.png`? The second becomes `photo-1.png` automatically.

## Zero permissions

Bulk Image Converter requests **no permissions at install**. Not your tabs, not your history, not your clipboard, not your downloads. Nothing.

This is not a limitation — it's the architecture. All conversion happens inside the popup using browser-native Canvas and encoding APIs. There's nothing to ask for because nothing leaves the popup.

## Privacy

**100% local.** Your images never leave the browser. No servers, no telemetry, no analytics, no tracking pixels.

**Blocked from network by design.** The Content Security Policy is `connect-src 'none'` — the extension physically cannot make outbound network requests even if a bug tried to.

**No data collection.** No telemetry, no analytics, no tracking pixels. Files live in memory during conversion; the popup keeps last results in browser-local IndexedDB so you can reopen the popup and grab the ZIP without reconverting. Nothing is transmitted or shared.

**Open source.** The full source code is available for inspection. No obfuscation, no hidden logic.

## AVIF note

AVIF encoding is auto-detected per browser. If your browser doesn't support AVIF encoding, the option is disabled in the format dropdown rather than silently producing broken files. WebP is the recommended default.

## FAQ

**Is there a file size limit?**
The popup processes files up to 50 MB each. Browser memory is the practical ceiling.

**Can I convert to GIF?**
No. Animated GIFs are out of scope — this is a static image converter. PNG, JPG, WebP, AVIF only.

**Does it work offline?**
Yes. After install, it runs entirely offline. No network access needed or allowed.

**Where are my files stored?**
Last batch results stay in browser-local IndexedDB so you can reopen the popup and grab the ZIP without reconverting. Clearing the queue or clearing browser data wipes it. The extension has no storage permission — IndexedDB access is part of the browser, not a permission grant.

## Category

Productivity → Workflow

## Single Purpose (≤1,000 chars)

```
A narrow bulk image conversion tool. Users drag up to 20 images into a popup, select an output format (PNG, JPEG, WebP, or AVIF), and download the converted files as a single ZIP archive. The extension operates entirely within the popup using browser-native Canvas and encoding APIs. No file hosting, no image editing, no cloud storage, no background processing.
```

## Remote Code Usage

```
No
```

The entire codebase ships in the extension package. CSP `connect-src 'none'` blocks all remote script loading by design.

## Permission Justification

```
This extension requests no permissions.
```

The manifest declares no permissions. All functionality — file reading, image decoding, Canvas rendering, format encoding, ZIP packaging — uses browser APIs available without permission grants.

## Privacy practices

**Data collection:** None
**Data usage:** None
**Data disclosure:** None
**Data security:** No data is collected, transmitted, or shared. The extension has no storage permission and a Content Security Policy of `connect-src 'none'` that blocks all outbound network access by design. Last conversion results are kept in browser-local IndexedDB for the user's convenience (reopen popup → grab ZIP) and never leave the device.

## Assets checklist

- [x] icon-128.png (128×128, 8-bit RGB, no alpha)
- [x] slide-1.png through slide-5.png (1280×800, 8-bit RGB)
- [x] promo-small.png (440×280, 8-bit RGB)
- [x] promo-marquee.png (1400×560, 8-bit RGB)

## Production checklist (before publish)

- [ ] Update manifest `name` to L2 (currently 48 chars, target 44)
- [ ] Rebuild extension ZIP with new manifest
- [ ] Upload to Chrome Web Store Developer Dashboard
- [ ] Attach all 5 screenshots + 2 promos
- [ ] Paste description, single purpose, permission justification
- [ ] Set category: Productivity → Workflow
- [ ] Set remote code: No
- [ ] Submit for review
