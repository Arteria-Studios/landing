import { isAdminAuthenticated } from 'lib/admin-auth'
import {
  createUploadKey,
  mediaKindFromContentType,
  uploadObject,
} from 'lib/vercel-blob'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from 'lib/upload-limits'

export const config = {
  api: {
    bodyParser: false,
  },
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Proxy upload through the Next server into Vercel Blob.
 * Prefer `/api/admin/upload-url` + client upload — Vercel limits request bodies (~4.5MB).
 */
export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const filename = req.headers['x-filename']
    const contentType = req.headers['content-type']

    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'X-Filename and Content-Type headers are required',
      })
    }

    const contentLength = Number(req.headers['content-length'] || 0)
    if (contentLength > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        error: `File exceeds maximum size of ${MAX_UPLOAD_LABEL}`,
      })
    }

    const key = createUploadKey({ filename: String(filename) })
    const body = await readBody(req)
    const { fileUrl, key: pathname } = await uploadObject({
      key,
      contentType,
      body,
    })

    return res.status(200).json({
      key: pathname,
      fileUrl,
      url: fileUrl,
      kind: mediaKindFromContentType(contentType),
      contentType,
      size: contentLength || body.length || undefined,
    })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}
