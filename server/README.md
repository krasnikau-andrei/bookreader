# Reading Together server

Backend for the "Читаем вместе" plugin. Stores each reader's name and their
position in each book. Runs anywhere Bun runs; data lives in one SQLite file.

## Run

```sh
bun run server                      # http://localhost:8787, data in ./reading-together.sqlite
PORT=9000 DB_PATH=/data/rt.sqlite bun run server/src/main.ts
```

Docker:

```sh
docker build -t reading-together server
docker run -p 8787:8787 -v rt-data:/data reading-together
```

Put it behind HTTPS (Caddy, nginx, Fly.io…): the plugin only talks to
`https://` servers, except `http://localhost` for local testing.

## Keys

No accounts. The plugin makes a random 64-hex-char **secret** on the phone.
Its **public key** is the first 32 hex chars of `SHA-256(secret)`.

- Writing needs the secret: `Authorization: Bearer <secret>`.
- Reading needs only the public key — that is what you give a friend.

## API

| Method | Path                             | Body                                                          |
| ------ | -------------------------------- | ------------------------------------------------------------- |
| PUT    | `/v1/readers/:pub/profile`       | `{ "name": "Аня" }`                                           |
| GET    | `/v1/readers/:pub/profile`       | → `{ "name" }`                                                |
| PUT    | `/v1/readers/:pub/books/:bookId` | `{ "chapter", "fraction", "percent" }`                        |
| GET    | `/v1/readers/:pub/books/:bookId` | → `{ "name", "chapter", "fraction", "percent", "updatedAt" }` |

`bookId` is the SHA-256 of the book file (the reader's own book id). A friend
can only ask about books they have, so they never see your whole library.

`fraction` is how far into the chapter's text (0..1), `percent` how far into
the book.

## Not done yet

- No rate limiting — put it behind a proxy that has some.
- Anyone with your public key sees your position in books they own. To stop
  sharing, the plugin can make a new secret (new key).
