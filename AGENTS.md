## Tool calling

- Always use relative paths. You are already in the working folder.
- Don't create big commits. Create small commits instead.

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

---
