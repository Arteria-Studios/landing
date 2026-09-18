/* Static fallback for hosts without the API (e.g. GitHub Pages).
   On the Next.js server /data.js is served by /api/site-data with the
   projects and services from the database. With null the pages use the
   content bundled in assets/main.js. */
window.SITE_DATA = null;
