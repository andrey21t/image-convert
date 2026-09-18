# Permission Justification

## Manifest permissions

This extension declares **zero permissions** in `manifest.json`:

```json
"permissions": [],
"host_permissions": []
```

No `tabs`, `storage`, `cookies`, `activeTab`, `host matchers`, or any other permission is requested.

## Why zero permissions

All processing (PNG/JPEG/WebP/AVIF conversion, resize, compress, ZIP download, IndexedDB persistence) happens 100% client-side through:

- Canvas API (`canvas.toBlob`) — image conversion
- fflate — client-side ZIP packaging
- IndexedDB — done-job persistence (default browser storage, no `storage` permission needed for extension origin)
- File System Access API (download via `<a download>`) — ZIP saving

No network request is made. The Content Security Policy explicitly forbids outbound connections:

```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'"
}
```

`connect-src 'none'` guarantees at the CSP layer that no fetch/XHR/WebSocket can leave the extension.

## User data

The extension never collects, transmits, or stores user data outside the browser. Converted files live only in memory (during conversion) and IndexedDB (for the user's own "done jobs" list, which the user can clear with the **Clear all** button). No telemetry, no analytics, no crash reporting.

## Justification summary

Because no permissions are requested and the CSP forbids outbound connections, there is nothing to justify beyond the default extension origin access. The extension is functionally a local-only image tool.
