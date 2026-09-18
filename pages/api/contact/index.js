import { sendRequestReceived } from 'lib/mailer'
import { prisma } from 'lib/prisma'

const clip = (value, max) =>
  String(value || '')
    .trim()
    .slice(0, max)

const toList = (value) =>
  (Array.isArray(value) ? value : String(value || '').split(','))
    .map((item) => clip(item, 80))
    .filter(Boolean)
    .slice(0, 20)

const sendTelegram = async ({
  name,
  email,
  company,
  phone,
  services,
  budget,
  timeline,
  message,
}) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, error: 'Missing Telegram configuration' }
  }

  const text = [
    'New contact form request',
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || '-'}`,
    `Phone: ${phone || '-'}`,
    `Services: ${services.join(', ') || '-'}`,
    `Budget: ${budget || '-'}`,
    `Timeline: ${timeline || '-'}`,
    `Message: ${message}`,
  ].join('\n')

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    return { ok: false, error: errorText }
  }

  return { ok: true }
}

/**
 * Accepts both the original contact form ({ name, email, company, phone, message })
 * and the landing brief ({ name, email, company, services, budget, timeline, note }).
 * The brief's note is optional, so the message falls back to a short summary.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    // Honeypot field of the landing form: bots fill it, people never see it.
    if (body.website) {
      return res.status(201).json({ ok: true })
    }

    const name = clip(body.name, 200)
    const email = clip(body.email, 320)
    const company = clip(body.company, 200) || null
    const phone = clip(body.phone, 60) || null
    const services = toList(body.services)
    const budget = clip(body.budget, 60) || null
    const timeline = clip(body.timeline, 60) || null
    const note = clip(body.message ?? body.note, 5000)
    const message =
      note || (services.length ? `Project request: ${services.join(', ')}` : '')

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: 'name, email and message (or services) are required' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email is invalid' })
    }

    const saved = await prisma.contactRequest.create({
      data: {
        name,
        email,
        company,
        phone,
        message,
        services,
        budget,
        timeline,
        source:
          body.source === 'landing_brief'
            ? 'landing_brief'
            : 'landing_contact_form',
      },
    })

    // Confirmation to the visitor and the studio's Telegram, in parallel.
    const [telegramResult, emailResult] = await Promise.all([
      sendTelegram({
        name,
        email,
        company,
        phone,
        services,
        budget,
        timeline,
        message,
      }).catch((error) => ({ ok: false, error: error.message })),
      sendRequestReceived(saved),
    ])
    return res.status(201).json({
      item: saved,
      telegramSent: telegramResult.ok,
      telegramError: telegramResult.error || null,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    })
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || 'Failed to submit contact form' })
  }
}
