import { uploadPresigned } from '@vercel/blob/client'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from 'lib/upload-limits'

/**
 * Upload media from the browser directly to Vercel Blob via a presigned URL
 * issued by `/api/admin/upload-url` (OIDC — no BLOB_READ_WRITE_TOKEN needed).
 */
export async function uploadFileToBlob(file) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File exceeds ${MAX_UPLOAD_LABEL} limit`)
  }

  if (!file.type) {
    throw new Error('File is missing a Content-Type')
  }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const pathname = `projects/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const blob = await uploadPresigned(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload-url',
    contentType: file.type,
    multipart: file.size > 8 * 1024 * 1024,
  })

  if (!blob?.url) {
    throw new Error('Upload succeeded but no file URL was returned')
  }

  return {
    kind: String(file.type).startsWith('video/') ? 'video' : 'image',
    title: file.name,
    url: blob.url,
    s3Key: blob.pathname,
    contentType: file.type,
    columnSpan: 'two_columns',
  }
}

/** @deprecated Use uploadFileToBlob */
export const uploadFileToS3 = uploadFileToBlob
