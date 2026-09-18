// Shared by the API and the admin page (client-safe: no database imports).

/** Bento tiles on the home page, keyed by the tile's icon name. */
export const SERVICE_CATEGORIES = [
  'ai',
  'development',
  'design',
  'branding',
  'product',
  'strategy',
  'motion',
  'promotion',
]

/** A known tile key, or null (the service is then not shown in the bento). */
export const readCategory = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return SERVICE_CATEGORIES.includes(key) ? key : null
}
