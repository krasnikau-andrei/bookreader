# Contributing to BookReader

Thank you for your interest in contributing to BookReader!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/bookreader.git`
3. Install dependencies: `bun install`
4. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

## Development Workflow

### Running the App

```sh
bun run dev
```

### Testing

Run all tests before submitting:

```sh
bunx vitest run   # unit tests
bun run test:e2e  # e2e tests (Playwright BDD)
```

Do not use `bun test` — Bun's test runner lacks DOMParser/XMLSerializer globals needed by parser tests.

### Code Quality

Format and lint your code:

```sh
bun run format
bun run lint
```

## Versioning

Releases follow [Semantic Versioning](https://semver.org/): MAJOR for breaking changes, MINOR for new features, PATCH for fixes.

No manual version bump is needed for deployments: the service worker cache name derives from SvelteKit's build version, so caches invalidate automatically on every deploy.

## Submitting Changes

1. Ensure all tests pass: `bunx vitest run && bun run test:e2e`
2. Update documentation if needed
3. Commit with clear messages: `git commit -m "feat: bookmarks feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

Pre-commit hooks run lint + unit tests + the full e2e suite, so each commit takes a few minutes. Never bypass hooks — if e2e is too slow, report it as a bug.

## Commit Message Format

[Conventional Commits](https://www.conventionalcommits.org/): `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`.

Example: `fix: preload reader chunk for offline resume`

## Questions?

Open an issue for questions or discussion.
