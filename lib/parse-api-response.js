export async function parseApiResponse(response) {
  const text = await response.text()

  try {
    return { data: JSON.parse(text), raw: text }
  } catch {
    if (response.status === 413) {
      return {
        data: {
          error:
            'File too large. Increase nginx client_max_body_size (see docs/nginx-upload-limit.md).',
        },
        raw: text,
      }
    }

    const message = text.trim().startsWith('<')
      ? `Server returned HTML (${response.status}). Often a proxy body-size limit or gateway error.`
      : text.slice(0, 200) || `Request failed (${response.status})`

    return { data: { error: message }, raw: text }
  }
}
