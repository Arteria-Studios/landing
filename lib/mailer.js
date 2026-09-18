import nodemailer from 'nodemailer'
import { prisma } from 'lib/prisma'
import { buildRequestReceivedEmail } from 'lib/email/request-received.mjs'

/**
 * SMTP (Brevo by default). Configure in the environment:
 *   SMTP_HOST (smtp-relay.brevo.com), SMTP_PORT (587), SMTP_USER,
 *   SMTP_PASS or BREVO_EMAIL_SMTP_KEY, MAIL_FROM, MAIL_REPLY_TO.
 * MAIL_FROM must be a sender (or domain) verified in Brevo.
 */
const config = () => {
  const pass = process.env.SMTP_PASS || process.env.BREVO_EMAIL_SMTP_KEY
  // The studio's Brevo SMTP login (not a secret); SMTP_USER overrides it.
  const user =
    process.env.SMTP_USER ||
    (process.env.BREVO_EMAIL_SMTP_KEY ? 'b9fda7001@smtp-brevo.com' : '')
  if (!pass || !user) return null
  const port = Number(process.env.SMTP_PORT || 587)
  return {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  }
}

let transport = null
const getTransport = () => {
  const cfg = config()
  if (!cfg) return null
  transport = transport || nodemailer.createTransport(cfg)
  return transport
}

const FROM = () =>
  process.env.MAIL_FROM || 'ArteriaStudios <hello@thearteria.com>'

/** At most this many confirmation emails to one address per hour (form abuse guard). */
const MAX_PER_HOUR = 3

/**
 * Sends the "request received" email for a saved contact request.
 * Never throws: returns { sent, error } so the form still succeeds when mail fails.
 */
export async function sendRequestReceived(request) {
  try {
    const smtp = getTransport()
    if (!smtp) return { sent: false, error: 'SMTP is not configured' }

    const recent = await prisma.contactRequest.count({
      where: {
        email: request.email,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    })
    if (recent > MAX_PER_HOUR) return { sent: false, error: 'Rate limited' }

    const email = buildRequestReceivedEmail({
      name: request.name,
      services: request.services,
      budget: request.budget,
      timeline: request.timeline,
      company: request.company,
      message:
        request.source === 'landing_brief' &&
        request.message.startsWith('Project request:')
          ? ''
          : request.message,
      requestId: request.id,
      siteUrl: process.env.WEBSITE_URL || 'https://www.thearteria.com',
      date: request.createdAt,
    })

    await smtp.sendMail({
      from: FROM(),
      to: { name: request.name, address: request.email },
      replyTo: process.env.MAIL_REPLY_TO || FROM(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: { 'X-Entity-Ref-ID': request.id },
    })
    return { sent: true, error: null }
  } catch (error) {
    console.error('mailer: request received email failed', error)
    return { sent: false, error: error.message || 'Send failed' }
  }
}
