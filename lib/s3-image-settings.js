import { isGifUrl, isManagedMediaUrl } from 'lib/media-url'

/**
 * Managed media (Vercel Blob) via /_next/image in production (WebP/AVIF + width cap).
 * Set NEXT_PUBLIC_S3_IMAGE_UNOPTIMIZED=true only if /_next/image still 400s.
 * Set NEXT_PUBLIC_S3_IMAGE_OPTIMIZER=true in .env.local to test optimizer in dev.
 */
export const shouldUseS3ImageOptimizer = (url = '') => {
  if (isGifUrl(url)) return false
  if (!isManagedMediaUrl(url)) return false
  if (process.env.NEXT_PUBLIC_S3_IMAGE_UNOPTIMIZED === 'true') return false
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_S3_IMAGE_OPTIMIZER === 'true'
  }
  return true
}

export const shouldUnoptimizeImage = (url = '') =>
  isManagedMediaUrl(url) && !shouldUseS3ImageOptimizer(url)
