# BookReader

![CI](https://github.com/krasnikau-andrei/bookreader/actions/workflows/ci.yml/badge.svg)

A mobile Progressive Web App (PWA) for reading EPUB files, built with Svelte and SvelteKit.

## Features

- Read EPUB files directly in your browser
- Mobile-optimized PWA experience
- Offline support
- Built with modern Svelte 5

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime

### Installation

```sh
bun install
```

### Running Locally

Start the development server:

```sh
bun run dev
```

To open the app in your default browser:

```sh
bun run dev -- --open
```

### Building

Create a production build:

```sh
bun run build
```

Preview the production build:

```sh
bun run preview
```

## Testing

### Unit Tests (Vitest)

Run unit tests with Vitest:

```sh
bunx vitest run
```

Or with verbose output:

```sh
bunx vitest run --reporter=verbose
```

### E2E Tests (Playwright - BDD)

E2E tests are written as behavior-driven **Gherkin stories** in `features/` and compiled to Playwright tests via `playwright-bdd`.

```sh
bun run test:e2e
```

Test workflow:

1. Write scenarios in `features/*.feature` (Given/When/Then)
2. Define step implementations in `steps/*.ts`
3. Run `bddgen` to compile features into Playwright test files (auto-runs with `test:e2e`)
4. Generated tests run via standard Playwright runner in `.features-gen/`

### Run All Tests

To run both unit and e2e tests:

```sh
bunx vitest run && bun run test:e2e
```

### E2E Test Report

Playwright can generate an HTML test report with pass/fail results, traces, and screenshots:

```sh
bun run test:e2e -- --reporter=html
```

The report will be available in the `playwright-report/` directory.

## Project Structure

```
src/
├── app.html             # HTML template
├── app.d.ts             # TypeScript declarations
├── service-worker.ts    # Offline caching
├── lib/
│   ├── components/      # Svelte components
│   ├── parsers/         # EPUB parsing (epub, link-transformer, normalize-path)
│   ├── reader/          # Reader engine (pagination, swipe, progress, etc.)
│   ├── storage.ts       # Dexie/IndexedDB persistence
│   ├── theme.svelte.ts  # Theme tokens
│   ├── library-cache.svelte.ts
│   └── hash.ts          # Book content hashing
├── routes/              # SvelteKit routes
└── stories/             # Storybook stories

features/                # BDD e2e scenarios (Gherkin)
steps/                   # e2e step definitions
static/                  # Static assets (favicon, manifest, etc.)
```

## Debug tooling

Optional debug book-upload feature: "Upload for Debug" buttons in the UI and `POST /api/upload-broken-book`, which saves epubs to `./broken_books/` for parser debugging. Disabled unless `PUBLIC_DEBUG_UPLOAD=1` is set (see `.env.example`; works in `bun run dev`). Do not enable in production.

```sh
bun run check:books      # fast parser check on saved books (Node.js)
bun run check:books:e2e  # full check via real UI (Chromium, Firefox, WebKit)
```

See `broken_books/readme.md` for details.

## License

MIT
