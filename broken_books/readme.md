# Broken Books Checker

App supports mobile (iOS Safari = WebKit). Test in WebKit only.

## Commands

| Command                                    | What it does                               |
| ------------------------------------------ | ------------------------------------------ |
| `bun run check:books`                      | Fast check — direct parser test in Node.js |
| `bun run check:books:e2e --project=webkit` | Full check — uploads via real UI in WebKit |

## Workflow

1. `bun run check:books:e2e --project=webkit`
2. Read the error from output or `test-results/*/error-context.md`
3. Fix the parser at `src/lib/parsers/epub.ts`
4. `bun run test:unit`
5. `bun run check:books:e2e --project=webkit` again
