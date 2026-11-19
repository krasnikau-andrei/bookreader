# Plugins

A plugin is one `.js` file. The reader runs it in a sandbox where it can only
do what its manifest asks for and the user allowed. That is what lets anyone
publish a plugin without someone reviewing each one.

## Writing a plugin

```js
/* reader-plugin
{
	"id": "hello",
	"name": "Hello",
	"version": "1.0.0",
	"description": "Says where you are.",
	"permissions": ["position"]
}
*/

reader.on('position', ({ bookId, chapter, fraction, percent }) => {
	reader.ui.set([{ type: 'text', text: `Chapter ${chapter + 1}, ${Math.round(percent * 100)}%` }]);
});
```

The header comment must come first. `id` is a lowercase slug; installing a file
with the same `id` replaces the old version and keeps the servers the user
already allowed.

Types for the `reader` object are in `plugin-api.d.ts` next to this file.
`builtin/reading-together.js` is a full example.

### Permissions

| Permission | Gives                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------- |
| `position` | `position` events: book id, chapter, how far into the chapter's text, how far into the book |
| `markers`  | `reader.markers.set()` — other readers' places on the progress bar and over the text        |
| `network`  | `reader.net.fetch()` — but each host still needs the user's OK                              |

The user sees these before installing.

### API

- `reader.on(event, handler)`: `position`, `hosts` (allowed hosts, on start and on change), `ui` (a field changed or a button was pressed).
- `reader.storage.get(key)` / `set(key, value)`: the plugin's own store, up to 64 KB a value. Removed with the plugin.
- `reader.net.fetch(url, { method, headers, body })` → `{ status, body }`. `https://` only (plain `http://` only for `localhost`). No cookies, no redirects. The first call to a new host fails with `code: 'host-not-allowed'` and shows the user a request in the plugin's card. When they allow it, a `hosts` event follows — retry then.
- `reader.markers.set([{ id, label, hue, chapter, fraction }])`: replaces this plugin's markers. `hue` is 0..359; the reader picks the saturation and lightness.
- `reader.ui.set(widgets)`: what the plugin's card shows. Widgets are data, not HTML: `text` (with `tone` normal/muted/error), `field` (one line or `multiline`, reported on blur), `code` (copyable), `button`.

Failed calls reject with an `Error` that has a `code`: `permission-denied`,
`host-not-allowed`, `invalid-argument`, `rate-limited`, `network-error`,
`response-too-large`, `unknown-method`.

## How the sandbox works

```
reader page ── MessagePort ──▶ <iframe sandbox="allow-scripts"> ──▶ Worker running the plugin
 (host API)                      opaque origin, CSP default-src 'none'
```

1. **Sandboxed iframe, no `allow-same-origin`**: an opaque origin. No access to the
   reader's IndexedDB (books, progress), cookies or page.
2. **CSP `default-src 'none'`** inside it: no `fetch`, XHR, WebSocket, EventSource,
   images, scripts or forms.
3. **The plugin's code runs in a Worker** that the iframe starts. A worker has no
   DOM, so it can't make nested frames and has no `RTCPeerConnection`. WebRTC is
   the one channel that gets past CSP: a sandboxed _window_ can still send STUN
   packets anywhere, a worker can't. It also runs on its own thread, so an endless
   loop can't freeze the reader.
4. **The reader page has CSP `frame-src 'none'`**: a frame can't navigate itself to
   another site and carry data out in the URL. `srcdoc` frames still work.
5. **Everything a plugin sends is validated** (`validate.ts`) before
   use, and its UI is drawn by the reader from the widget list.

`features/plugins.feature` installs a plugin that tries each of these ways out
and fails if any works or any request leaves the page.

### Not covered yet

- A plugin can use a lot of memory or CPU in its worker. It can't freeze the page,
  but it can drain the battery; turning it off stops the worker.
- A plugin with `network` can send what it knows (with `position`: the book id and
  your place in it) to any host the user allowed. That is the point of the
  permission prompt.
- The same checks should be run on a real iPhone — CI runs WebKit on Linux.
- Install from a URL, auto-update and a plugin store are not built.
