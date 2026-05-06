# Broken Books Checker

## Commands

| Command                   | What it does                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `bun run check:books`     | Fast check — direct parser test in Node.js                    |
| `bun run check:books:e2e` | Full check — uploads via real UI in Chromium, Firefox, WebKit |

## Workflow

1. Run `bun run check:books:e2e`
2. Read the error from output or `test-results/*/error-context.md`
3. Fix the parser at `src/lib/parsers/epub.ts`
4. `bun run test:unit`
5. `bun run check:books:e2e` again
