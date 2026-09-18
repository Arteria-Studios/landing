/**
 * "Got your request" email, sent to the address typed in the Start a project
 * form. Written as a personal note from Serge, not a newsletter: no images,
 * no buttons, no cards, one text link. Gmail files heavily designed mail
 * (banners, CTA buttons, many links) under Promotions; a short personal letter
 * has the best chance to land in Primary.
 *
 * The site's look, kept minimal: black background, Inter Tight (falls back to
 * Helvetica/Arial), grey secondary text, one red accent.
 *
 * Pure function, no dependencies: used by /api/contact (lib/mailer.js), the
 * admin preview and scripts/email-preview.mjs.
 */

const RED = '#ff3b2a'
const INK = '#ffffff'
const TEXT = '#d6d6d6'
const MUTED = '#8a8a8a'
const SANS = "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const MONO = "'DM Mono', 'SFMono-Regular', Menlo, Consolas, monospace"

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** First name as the person typed it ("jane doe" -> "Jane"). */
export const firstName = (name) => {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/** "Branding and AI", "Branding, Design and AI". */
const listOf = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/**
 * @param {object} data
 * @param {string} data.name
 * @param {string[]} [data.services]
 * @param {string} [data.budget]
 * @param {string} [data.timeline]
 * @param {string} [data.company]
 * @param {string} [data.message]
 * @param {string} [data.siteUrl]     e.g. https://www.thearteria.com
 */
export function buildRequestReceivedEmail(data) {
  // Absolute https URL even if the setting is just "www.thearteria.com":
  // email clients can't resolve relative links.
  const site = String(data.siteUrl || 'https://www.thearteria.com')
    .trim()
    .replace(/^(?!https?:\/\/)/i, 'https://')
    .replace(/\/+$/, '')
  const siteLabel = site.replace(/^https?:\/\/(www\.)?/i, '')
  const name = firstName(data.name)
  const services = (data.services || []).filter(Boolean)
  const note = String(data.message || '').trim()
  const noteShort = note.length > 280 ? `${note.slice(0, 277).trimEnd()}…` : note

  // The brief in one sentence; empty fields are left out.
  const parts = [
    services.length && listOf(services),
    data.budget && `budget ${data.budget}`,
    data.timeline && `timeline ${data.timeline}`,
  ].filter(Boolean)
  const briefText = parts.length ? `: ${parts.join(', ')}` : ''

  const subject = `${name}, got your request`
  const preheader = 'I’ll get back to you within 24 hours.'

  const p = (html, extra = '') =>
    `<p style="margin:0 0 18px;font:400 16px/1.65 ${SANS};color:${TEXT};${extra}">${html}</p>`

  const body = [
    p(`Hi ${esc(name)},`, `color:${INK};`),
    p(`Thanks for reaching out. Your request just came in and I’ve read it${esc(briefText)}.`),
    p('I’ll get back to you within 24 hours, usually sooner, with a few times for a short intro call.'),
    noteShort
      ? p(`You mentioned: <span style="color:${INK};">“${esc(noteShort).replace(/\n/g, '<br>')}”</span>`)
      : '',
    p(
      `In the meantime, here’s some of our recent work: <a href="${site}/works" style="color:${INK};text-decoration:underline;text-decoration-color:${RED};text-underline-offset:3px;">${esc(siteLabel)}/works</a>`,
    ),
    p('Anything to add? Just reply to this email, it comes straight to me.'),
  ].join('')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(subject)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  u + #body a, #MessageViewBody a { color: inherit; }
  @media (max-width: 600px) { .px { padding-left: 22px !important; padding-right: 22px !important; } }
</style>
</head>
<body id="body" style="margin:0;padding:0;background:#000000;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
<tr><td align="center" style="padding:40px 0;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
<tr><td class="px" style="padding:0 32px;">
${body}
<p style="margin:30px 0 0;font:500 16px/1.4 ${SANS};color:${INK};">Serge</p>
<p style="margin:6px 0 0;font:400 12px/1.6 ${MONO};letter-spacing:.04em;color:${MUTED};"><span style="color:${RED};">●</span>&nbsp; ArteriaStudios · ${esc(siteLabel)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    `Hi ${name},`,
    '',
    `Thanks for reaching out. Your request just came in and I've read it${briefText}.`,
    '',
    "I'll get back to you within 24 hours, usually sooner, with a few times for a short intro call.",
    ...(noteShort ? ['', `You mentioned: "${noteShort}"`] : []),
    '',
    `In the meantime, here's some of our recent work: ${site}/works`,
    '',
    'Anything to add? Just reply to this email, it comes straight to me.',
    '',
    'Serge',
    `ArteriaStudios · ${siteLabel}`,
  ].join('\n')

  return { subject, html, text, preheader }
}
