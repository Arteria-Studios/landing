import { getSiteData } from 'lib/site-data'

/**
 * Public content for the static frontend.
 * - GET /api/site-data         JSON
 * - GET /data.js (rewrite)     `window.SITE_DATA = {...}`, loaded by every page
 *   before main.js, so the scripts render database content synchronously.
 * If the database is unreachable the script sets SITE_DATA to null and the
 * pages fall back to the content bundled in main.js.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const asScript = req.query.format === 'js'
  let data = null
  try {
    data = await getSiteData()
  } catch (error) {
    console.error('site-data: database unavailable', error)
  }

  // Browsers revalidate every load (edits in the admin show up at once);
  // a CDN in front may keep it for a minute.
  res.setHeader(
    'Cache-Control',
    data ? 'public, max-age=0, must-revalidate, s-maxage=60, stale-while-revalidate=600' : 'no-store',
  )
  if (asScript) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
    // Escape "<" so content can never close the script element.
    const json = JSON.stringify(data).replace(/</g, '\\u003c')
    return res.status(200).send(`window.SITE_DATA = ${json};\n`)
  }

  if (!data) {
    return res.status(503).json({ error: 'Content is temporarily unavailable' })
  }
  return res.status(200).json(data)
}
