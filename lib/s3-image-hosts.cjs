/** @typedef {{ protocol: string, hostname: string, port: string, pathname: string }} RemotePattern */

/** Exact hostnames for next/image `domains` (no wildcards). */
const getMediaImageHostsFromEnv = () => {
  // Your Blob store's public host, e.g. xxxx.public.blob.vercel-storage.com
  // (the wildcard patterns below already cover it; set it to be explicit).
  const hosts = []

  const fromEnv = process.env.BLOB_HOSTNAME
  if (fromEnv) {
    hosts.push(fromEnv.replace(/^https?:\/\//, '').replace(/\/$/, ''))
  }

  return [...new Set(hosts)]
}

/** Patterns for next.config.js `images.remotePatterns` (baked in at `next build`). */
const getMediaRemotePatterns = () => {
  /** @type {RemotePattern[]} */
  const patterns = getMediaImageHostsFromEnv().map((hostname) => ({
    protocol: 'https',
    hostname,
    port: '',
    pathname: '/**',
  }))

  patterns.push(
    {
      protocol: 'https',
      hostname: '*.public.blob.vercel-storage.com',
      port: '',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: '*.blob.vercel-storage.com',
      port: '',
      pathname: '/**',
    },
  )

  return patterns
}

// Back-compat aliases used by older imports / verify script
const getS3ImageHostsFromEnv = getMediaImageHostsFromEnv
const getS3RemotePatterns = getMediaRemotePatterns
const S3_IMAGE_HOSTS = []

module.exports = {
  S3_IMAGE_HOSTS,
  getMediaImageHostsFromEnv,
  getMediaRemotePatterns,
  getS3ImageHostsFromEnv,
  getS3RemotePatterns,
}
