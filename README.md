# KOMA

Telegram Mini App for reading manga from a chosen source. MySQL stores only the user: library links, source mappings, progress, history, and update subscriptions. Titles, chapters, and pages are parsed on demand.

## Layout

- `apps/web` — React + Vite Mini App
- `apps/api` — NestJS API, bot polling, and the daily worker entry
- `packages/shared` — DTOs shared by the API and the Mini App
- `prisma` — user-state schema

Sources: Com-X and MangaLib. The Mini App never parses a source itself. A new adapter implements `MangaSource` and is registered in `SourceManager`.

## Local run

MySQL 8 and Node 22.

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev:api
npm run dev:web
```

Open http://localhost:5173. Outside Telegram, development mode signs in a local user when `ALLOW_DEV_AUTH=true`.

`POST /api/v1/auth/dev` is refused in production.

Set `TELEGRAM_BOT_TOKEN` and an HTTPS `TELEGRAM_WEBAPP_URL` for `/start` and the menu button. The bot process is the API. The daily chapter check runs in the worker (`npm run start:worker -w @koma/api`), or in one process when `RUN_SCHEDULER=true`.

## Docker

```bash
export JWT_SECRET=$(openssl rand -hex 32)
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_WEBAPP_URL=https://your-host
docker compose up --build
```

The Mini App is on port 8080. The API is on port 3000.

## GitHub Actions

`.github/workflows/ci.yml` runs tests and image builds on every pull request and on `main`. A push to `main` also deploys to the server at `koma.tereshkovych.com.ua` over SSH. The host nginx keeps ports 80 and 443 and proxies to the Mini App on `127.0.0.1:8080`. A site file for that is `docker/nginx/koma.host.conf`. HTTPS is the existing nginx certificate setup (`certbot --nginx -d koma.tereshkovych.com.ua`).

On the server, once: install Docker Engine and Compose v2.24 or newer, and open ports 80 and 443. `VPS_USER` is `root`. The matching public key belongs in `/root/.ssh/authorized_keys`.

The app and its `.env` live in `/usr/src/koma_miniApp/KOMA` on the server.

Repository secrets are only `VPS_HOST`, `VPS_USER`, and `VPS_SSH_PRIVATE_KEY`. App settings stay in `/usr/src/koma_miniApp/KOMA/.env`. Deploys do not overwrite that file. `MYSQL_PASSWORD` must be letters and digits, and it stays after the first successful start.

## Sources

Requests use normal HTTP with a timeout. If Com-X returns its access check, the API responds with `SOURCE_UNAVAILABLE`. KOMA does not solve that check, bypass CAPTCHAs, or proxy arbitrary URLs. Image proxying is limited to the configured source hostnames.

Before a public launch, review each source’s terms, robots, and copyright rules. A working parser is not permission to redistribute the works.

## Tests

```bash
npm test
```

Parser tests read fixed HTML and JSON fixtures in `tests/fixtures`.
