## Tool calling

- Always use relative paths. You are already in the working folder.
- Don't create big commits. Create small commits instead.
- Never use `--no-verify`, `-c core.hooksPath=/dev/null`, `HUSKY=0`, or any other method that disables pre-commit hooks. If pre-commit fails or times out, fix the root cause — do not bypass.

## Pre-commit hooks

- Pre-commit checks must pass. If they fail or timeout, fix the root cause. Do not bypass hooks under any circumstances.
- If e2e tests in pre-commit timeout, the test suite is too slow — optimize it, don't skip the check.

## Development

- Use bun instead of npm.
- We support only mobile devices.
- All components should be in storybook.
- Keep components small
- Dont use raw hex for colors. All colors should be from theme object

## Testing

- Don't write trivial tests.
- Test should provide some debug info in case of failure.
- During development run only tests that related to task. Then run all the test one time before finishing the work.
- **Any changes or deletions to tests must be explicitly approved by the user first.** Show a snippet of what you propose to change and wait for explicit approval before making changes.

### Unit Tests (Vitest)

- Run: `bun run test:unit` or `bunx vitest run`
- Note: Use `bunx vitest run` instead of `bun test` because Bun's test runner doesn't provide DOMParser/XMLSerializer globals even with jsdom environment
- Vitest properly sets up jsdom environment with DOM globals available

### E2E Tests (Playwright - BDD)

- Run: `bun run test:e2e` (runs `bddgen && playwright test`)
- Tests are Gherkin feature files in `features/*.feature`
- Step definitions in `steps/*.ts`
- Compiled to Playwright tests in `.features-gen/` (auto-generated, don't edit)
- Run `npx bddgen` manually to regenerate compiled tests

## Known Bugs / Lessons

- **`docs/lessons/chaptersizes-overwrite-by-debounced-save.md`** — ReaderContent.svelte's debounced saves strip `chapterSizes` from IndexedDB records. Fix: `saveProgress` merges existing data.

## iOS (Phone) Status Bar

- **`src/app.html`**: `<meta name="viewport" content="viewport-fit=cover">` is required for content to extend under the status bar
- **`src/routes/+layout.svelte`**: `:global(html) { background-color: #000000; }` ensures the status bar area is always black (shows through transparent `black-translucent` status bar)
- **`<meta name="theme-color">`**: Must be `#000000` (not the page background color) or the status bar icons render wrong colors
- All 3 parts are needed. Missing any one will make the status bar look wrong.

---
