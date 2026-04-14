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
bun test
```

### Code Quality

Format and lint your code:

```sh
bun run format
bun run lint
```

## Version Numbering

### When to Update the Version

Update the version number when:

- Adding new features (minor version bump)
- Fixing bugs (patch version bump)
- Making breaking changes (major version bump)
- Deploying a new build that changes static assets

**Important for PWA:** Since this is a PWA with offline support, updating the version ensures users receive the latest service worker and cached assets.

### How to Update the Version

Edit `package.json` and change the version field:

```json
{
	"version": "0.1.0"
}
```

Then rebuild and deploy:

```sh
bun run build
```

### Version Format

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

Examples:

- `0.0.1` → `0.0.2` - Fixed a typo
- `0.0.2` → `0.1.0` - Added bookmark feature
- `0.1.0` → `1.0.0` - Major rewrite

### Why Version Updates Matter

The service worker uses the version number to:

1. Create unique cache names (e.g., `cache-0.0.1`)
2. Invalidate old caches when deploying updates
3. Ensure users download fresh assets after deployment

Without version bumps, users may see stale cached content.

## Submitting Changes

1. Ensure all tests pass: `bun test`
2. Update documentation if needed
3. Commit with clear messages: `git commit -m "Add: bookmarks feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

## Commit Message Format

- `Add:` New features
- `Fix:` Bug fixes
- `Update:` Changes to existing features
- `Refactor:` Code restructuring
- `Docs:` Documentation updates

## Questions?

Open an issue for questions or discussion.
