#!/usr/bin/env node
/**
 * Applies pending Prisma migrations during the build (see `vercel-build`).
 *
 * Migrations take a Postgres advisory lock, which does not work through a
 * connection pooler (Neon's pooled URL / PgBouncer): the build then fails with
 * P1002 "timed out". So this runs them over the direct connection when one is
 * available (DIRECT_URL, or what the Neon/Vercel integrations set), and retries
 * a couple of times because a Neon compute may be waking up from sleep.
 *
 * The advisory lock itself is switched off (PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK):
 * a lock taken through the pooler by an earlier, failed build can stay held on
 * a pooled server connection and time out every later build. Deploys run one
 * build at a time, and applied migrations are recorded in _prisma_migrations,
 * so re-running is a no-op.
 */
const { execSync } = require('child_process')

const directUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL

if (!directUrl) {
  console.error('migrate: no database URL (DATABASE_URL or DIRECT_URL) is set')
  process.exit(1)
}

const source =
  ['DIRECT_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL'].find(
    (key) => process.env[key] === directUrl,
  )
console.log(`migrate: using ${source}`)

const ATTEMPTS = 3
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: directUrl, PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1' },
    })
    process.exit(0)
  } catch (error) {
    if (attempt === ATTEMPTS) {
      console.error(`migrate: failed after ${ATTEMPTS} attempts`)
      process.exit(1)
    }
    const wait = attempt * 5
    console.warn(`migrate: attempt ${attempt} failed, retrying in ${wait}s`)
    execSync(`node -e "setTimeout(() => {}, ${wait * 1000})"`)
  }
}
