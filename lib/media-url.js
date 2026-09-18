/** MP4/WebM/MOV only — GIFs are images (`image/gif`), not videos. */
export const isVideoUrl = (url = '') =>
  /\.(mp4|webm|mov)(\?|$)/i.test(url) ||
  url.includes('videos.ctfassets.net')

export const isGifUrl = (url = '') => /\.gif(\?|$)/i.test(url)

/** Public media hosted on Vercel Blob (or legacy S3 URLs still in the DB). */
export const isManagedMediaUrl = (url = '') =>
  /\.blob\.vercel-storage\.com\//i.test(url) ||
  /\.amazonaws\.com\//i.test(url) ||
  /\.s3[.-]/i.test(url)

/** @deprecated Prefer isManagedMediaUrl */
export const isS3MediaUrl = isManagedMediaUrl
