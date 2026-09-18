# Deployment

The site is a Next.js app: the static frontend in `public/`, the API in `pages/api/`,
the admin at `/admin` and a PostgreSQL database (Prisma). It needs a Node server,
so pick one of the options below. GitHub Pages can only host the static frontend.

## Option 1: Vercel (simplest)

1. Import the repository in Vercel (framework: Next.js).
2. Storage → create a **Postgres** (Neon) database and a **Blob** store, link both.
   `DATABASE_URL`, `DIRECT_URL`, `BLOB_STORE_ID` are set automatically.
3. Add the variables from [Secrets](#secrets) that are not set yet.
4. Deploy. The `vercel-build` script applies migrations first (`scripts/migrate.js`)
   over the direct, non-pooled connection (`DIRECT_URL` or Neon's `DATABASE_URL_UNPOOLED`):
   migrations fail with P1002 through the pooler.
5. Fill the database once: `vercel env pull .env.local`, then `npm run db:seed`.

## Option 2: Docker on a server (EC2 or any VPS)

`Dockerfile` builds a standalone Next.js image. `.github/workflows/deploy-ec2.yml`
builds it on a self-hosted runner, applies migrations and restarts the container
on port 3000 (put nginx or a load balancer with HTTPS in front).

1. Set up the server and the runner: [github-self-hosted-runner.md](./github-self-hosted-runner.md).
2. Add the repository secrets from [Secrets](#secrets).
3. Actions → **Deploy to EC2** → **Run workflow**.
4. Fill the database once (from any machine that can reach it):
   `DATABASE_URL=... npm run db:seed`.

Admin uploads larger than 1 MB through nginx need a higher body limit:
[nginx-upload-limit.md](./nginx-upload-limit.md).

## Option 3: GitHub Pages (static only)

`.github/workflows/pages.yml` publishes `public/` on every push to `main`
(Settings → Pages → Source: **GitHub Actions**). There is no API there: pages use
the content bundled in `public/assets/main.js`, and the contact form opens the
visitor's mail app. Useful as a preview, not as the production site.

## Secrets

| Name | Required | What it is |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (`postgresql://...`) |
| `DIRECT_URL` | Vercel/Neon | Direct (non-pooled) connection for migrations |
| `WEBSITE_URL` | yes | Public URL of the site, e.g. `https://arteriastudios.com` |
| `ADMIN_PASSWORD` | yes | Password for `/admin` |
| `ADMIN_SESSION_SECRET` | yes | Long random string that signs the admin session cookie |
| `BLOB_READ_WRITE_TOKEN` | for uploads | Vercel Blob token (not needed on Vercel with a linked store) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | optional | Forward contact requests to Telegram |

Generate the session secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
