# Privacy Policy — Image Converter Chrome Extension

**Last updated:** 2026-09-18
**Effective date:** upon publication to the Chrome Web Store

## TL;DR

This extension does **not** collect, transmit, or share any personal data. All image processing happens locally in your browser. Nothing leaves your device.

## What we collect

**Nothing.** The extension does not request any Chrome permissions and makes zero network requests.

Specifically, we do **not** collect:

- Personal information (name, email, address)
- Browsing history, tabs, or URLs
- IP addresses or geolocation
- Authentication tokens or credentials
- Usage analytics or telemetry
- Crash reports
- Device identifiers

## What the extension touches

- **Files you select** for conversion — read into memory, processed via Canvas API, then either downloaded as a ZIP or persisted in your browser's IndexedDB for the "done jobs" list.
- **IndexedDB** — used only to remember your own converted files between popup reopens. Each stored record contains the converted file (Blob), its name, sizes, status, format, and quality. This data lives only on your device. The **Clear all** button deletes it immediately.
- **Settings (format, quality, resize)** — kept in-memory only. They are not persisted anywhere: closing the popup resets them to defaults.
- **EXIF metadata** — removed automatically as part of conversion. The Canvas API redraws pixel data fresh, so camera model, GPS coordinates, capture date, and other EXIF tags from the original file are not carried over into the converted output. This is a privacy feature, not a data collection: the metadata is discarded, not stored or transmitted.
- **chrome.storage** — not used at all. The extension does not read from or write to any Chrome storage API outside the browser-native IndexedDB described above.

None of the above is transmitted anywhere.

## Permissions

The extension declares **zero** permissions in its Manifest V3 `manifest.json`:

```json
"permissions": [],
"host_permissions": []
```

The Content Security Policy forbids outbound connections at the code level:

```
default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'
```

`connect-src 'none'` is an enforceable guarantee that no fetch, XHR, or WebSocket can leave the extension.

## Third-party services

**None.** The extension does not embed analytics (no Google Analytics, no Sentry, no Mixpanel), does not load remote fonts, does not phone home, does not include any SDK that could transmit data.

The full source code is public: <https://github.com/andrey21t/image-convert>.

## Children's privacy

The extension is not directed at children under 13 (or the minimum age in your jurisdiction). It does not knowingly collect any data from anyone — child or adult.

## Your rights

Because we collect nothing, there is nothing for you to exercise access, correction, or deletion rights over. If you want to wipe converted files, click **Clear all** in the extension popup.

## Changes to this policy

If the extension ever adds optional analytics (it currently does not, and there is no plan to do so in the MVP), this policy will be updated before any such change takes effect, and analytics will remain strictly opt-in and off by default.

## Contact

Open an issue at <https://github.com/andrey21t/image-convert/issues>.

## License

This Privacy Policy is released under the same MIT license as the extension source code.
