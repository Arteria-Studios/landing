import { put, issueSignedToken } from '@vercel/blob'
import crypto from 'crypto'
import { MAX_UPLOAD_BYTES } from 'lib/upload-limits'

export const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
]

export const createUploadKey = ({ filename }) => {
  const ext = filename.includes('.') ? filename.split('.').pop() : 'bin'
  return `projects/${Date.now()}-${crypto.randomUUID()}.${ext}`
}

/**
 * OIDC (BLOB_STORE_ID + VERCEL_OIDC_TOKEN on Vercel) is enough for uploads.
 * BLOB_READ_WRITE_TOKEN is only needed outside Vercel / legacy flows.
 */
export const assertBlobConfigured = () => {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'Blob is not configured. Link a Blob store (BLOB_STORE_ID) or set BLOB_READ_WRITE_TOKEN.',
    )
  }
}

export const mediaKindFromContentType = (contentType = '') =>
  String(contentType).startsWith('video/') ? 'video' : 'image'

/** Server-side upload (small files / local fallback). Prefer client uploads on Vercel. */
export const uploadObject = async ({ key, contentType, body }) => {
  assertBlobConfigured()
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error('Unsupported media type')
  }

  const blob = await put(key, body, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    cacheControlMaxAge: 31536000,
  })

  return {
    key: blob.pathname,
    fileUrl: blob.url,
  }
}

/** Presigned client-upload token (works with OIDC — no BLOB_READ_WRITE_TOKEN). */
export const createPutSignedToken = async (pathname) => {
  assertBlobConfigured()
  return issueSignedToken({
    pathname,
    operations: ['put'],
    allowedContentTypes: ALLOWED_CONTENT_TYPES,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
    validUntil: Date.now() + 60 * 60 * 1000,
  })
}

export const clientUploadUrlOptions = () => ({
  allowedContentTypes: ALLOWED_CONTENT_TYPES,
  maximumSizeInBytes: MAX_UPLOAD_BYTES,
  addRandomSuffix: false,
  allowOverwrite: false,
  cacheControlMaxAge: 31536000,
  validUntil: Date.now() + 10 * 60 * 1000,
})
