# BookReader

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

Or simply:

```sh
bun test
```

### Run All Tests

To run both unit and e2e tests:

```sh
bunx vitest run && bun run test:e2e
```

### E2E Test Coverage

Playwright provides built-in coverage reporting. Generate an HTML coverage report:

```sh
bun run test:e2e -- --reporter=html
```

The coverage report will be available in the `playwright-report/` directory.

## Project Structure

```
src/
├── app.html          # HTML template
├── app.d.ts          # TypeScript declarations
├── lib/              # Shared components and utilities
└── routes/           # SvelteKit routes

static/               # Static assets (favicon, manifest, etc.)
```

## License

MIT
