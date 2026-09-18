import { isAdminAuthenticated } from 'lib/admin-auth'
import { buildRequestReceivedEmail } from 'lib/email/request-received.mjs'

/**
 * The "request received" email as the visitor gets it, for checking the design.
 * GET /api/admin/email-preview?name=Jane&services=Branding,AI&format=text
 */
export default function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const q = req.query
  const email = buildRequestReceivedEmail({
    name: q.name || 'Jane Smith',
    company: q.company ?? 'Acme Inc.',
    services: String(q.services ?? 'Branding,Development,AI')
      .split(',')
      .filter(Boolean),
    budget: q.budget ?? '$25–50k',
    timeline: q.timeline ?? '1–3 months',
    message:
      q.message ??
      'We’re launching an AI assistant for clinics and need a brand plus a web app.',
    siteUrl: process.env.WEBSITE_URL || 'https://www.thearteria.com',
  })
  if (q.format === 'text') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(200).send(`Subject: ${email.subject}\n\n${email.text}`)
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  return res.status(200).send(email.html)
}
