import { handleUploadPresigned } from '@vercel/blob/client'
import { isAdminAuthenticated } from 'lib/admin-auth'
import {
  assertBlobConfigured,
  clientUploadUrlOptions,
  createPutSignedToken,
} from 'lib/vercel-blob'

/**
 * Presigned client uploads for Vercel Blob (OIDC-compatible).
 * Uses BLOB_STORE_ID + VERCEL_OIDC_TOKEN (and BLOB_WEBHOOK_PUBLIC_KEY for callbacks).
 * Does not require BLOB_READ_WRITE_TOKEN.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    assertBlobConfigured()

    const jsonResponse = await handleUploadPresigned({
      body: req.body,
      request: req,
      getSignedToken: async (pathname) => {
        if (!isAdminAuthenticated(req)) {
          throw new Error('Unauthorized')
        }

        return {
          token: await createPutSignedToken(pathname),
          urlOptions: clientUploadUrlOptions(),
        }
      },
      onUploadCompleted: async () => {
        // Browser already receives the blob URL from uploadPresigned().
      },
    })

    return res.status(200).json(jsonResponse)
  } catch (error) {
    const message = error?.message || 'Upload failed'
    const status = message === 'Unauthorized' ? 401 : 400
    return res.status(status).json({ error: message })
  }
}
