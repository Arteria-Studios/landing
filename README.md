# ArteriaStudios landing

The studio website with its content backend: a static frontend (plain HTML, CSS,
JavaScript and WebGL) served by Next.js, which adds the API, the admin panel and a
PostgreSQL database.

## Structure

```
public/                  static frontend, served as is
  index.html, works.html, about.html, project.html, 404.html
  data.js                fallback content hook (SITE_DATA = null) for static hosts
  assets/                scripts, styles and project media
pages/
  admin/                 admin panel (/admin): projects, services, contact requests
  api/                   REST API (see below)
components/admin/        admin UI parts (media upload, sortable lists, drawer)
lib/                     Prisma client, admin auth, Blob uploads, site data mapping
prisma/
  schema.prisma          Project, ProjectMedia, StudioService, ContactRequest
  migrations/            SQL migrations
  seed.js, seed-data.json  initial content (the projects and services of the site)
docs/                    deployment guides
```

## How the frontend gets its content

Every page loads `/data.js` before `assets/main.js`. On the Next.js server that
address is served by `/api/site-data` and sets `window.SITE_DATA` to the projects
and services from the database. The scripts then render:

- **Home**: the first 8 projects in the grid, services in the bento tiles
  (grouped by category, popover text from the description);
- **Works**: all projects in admin order;
- **Case page** (`project.html?p=<slug>`): description, industry, stack,
  testimonial, project link and all media of the project;
- **Contact form**: sends requests to `/api/contact` (saved, visible in the admin,
  forwarded to Telegram).

If the database is unreachable, or the site is hosted without the server
(GitHub Pages), `SITE_DATA` is `null`: pages use the content bundled in
`public/assets/main.js`, and the form opens the visitor's mail app.

## API

| Method and path | Access | Purpose |
| --- | --- | --- |
| `GET /api/site-data` (`/data.js`) | public | Content for the frontend |
| `POST /api/contact` | public | New contact request |
| `GET /api/services` | public | Services list |
| `POST /api/admin/login`, `POST /api/admin/logout`, `GET /api/admin/session` | public | Admin session |
| `GET/POST /api/projects`, `PUT/DELETE /api/projects/:id`, `PUT /api/projects/reorder` | admin | Projects |
| `POST /api/services`, `PUT/DELETE /api/services/:id`, `PUT /api/services/reorder` | admin | Services |
| `GET /api/contact/requests` | admin | Contact requests (paged) |
| `POST /api/admin/upload-url`, `POST /api/admin/upload` | admin | Media upload to Vercel Blob |

## Local development

Requirements: Node.js 20+, PostgreSQL.

```bash
npm install
cp .env.template .env.local        # fill DATABASE_URL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
npx prisma migrate deploy          # create the tables
npm run db:seed                    # fill them with the site's projects and services
npm run dev                        # http://localhost:3000, admin at /admin
```

Media uploads in the admin need a Vercel Blob store (`BLOB_READ_WRITE_TOKEN`).
Project media bundled with the site live in `public/assets/media/`.

When you change files in `public/assets/`, raise the `?v=N` version in the HTML
files so browsers load the new version.

## Deployment

See [docs/deploy.md](docs/deploy.md): Vercel, Docker on a server, or GitHub Pages
(static only).
