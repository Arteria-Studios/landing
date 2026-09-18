/**
 * "We've received your request" email, sent to the address typed in the
 * Start a project form. Same language as the site: black, Inter Tight, DM Mono
 * labels, one red accent, the 54 BPM heartbeat and the red thread.
 *
 * Built for real inboxes: table layout, inline styles, 600px, bulletproof
 * button. Motion is layered so every client gets a finished email:
 * - all clients: the animated hero, the site's preloader as a loop (GIF,
 *   scripts/make-email-hero.py; Outlook desktop shows frame 0, a calm line);
 * - Apple Mail / iOS Mail / some others: CSS keyframes (the live dot beats,
 *   a pulse travels down the red thread through the three steps) and hover
 *   states on the steps and the button;
 * - clients without <style> support: the same layout from inline styles.
 *
 * Pure function, no dependencies: used by /api/contact, the admin preview
 * and scripts/email-preview.mjs.
 */

const RED = '#ff3b2a'
const INK = '#ffffff'
const MUTED = '#9a9a9a'
const DIM = '#5c5c5c'
const LINE = '#1f1f1f'
const CARD = '#0b0b0b'
const SANS = "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif"
const MONO = "'DM Mono', 'SFMono-Regular', Menlo, Consolas, monospace"

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** First name as the person typed it ("jane doe" -> "Jane"). */
export const firstName = (name) => {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

const STEPS = [
  ['01', 'We read your brief', 'Today. The team looks at your goals, scope and timing, and who from the studio fits best.'],
  ['02', 'A short intro call', 'Within 24 hours we write back with a few times for a 30-minute call. No sales script.'],
  ['03', 'A clear proposal', 'Scope, timeline and cost on one page, usually a few days after the call.'],
]

/**
 * @param {object} data
 * @param {string} data.name
 * @param {string[]} [data.services]
 * @param {string} [data.budget]
 * @param {string} [data.timeline]
 * @param {string} [data.company]
 * @param {string} [data.message]
 * @param {string} [data.requestId]   database id; a short form is shown as the request number
 * @param {string} [data.siteUrl]     e.g. https://www.thearteria.com
 * @param {string} [data.heroUrl]     override for the hero image (previews)
 * @param {Date}   [data.date]
 */
export function buildRequestReceivedEmail(data) {
  const site = String(data.siteUrl || 'https://www.thearteria.com').replace(/\/$/, '')
  const name = firstName(data.name)
  const services = (data.services || []).filter(Boolean)
  const number = String(data.requestId || '').slice(-4).toUpperCase() || '0001'
  const date = (data.date || new Date()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const hero = data.heroUrl || `${site}/assets/email/pulse.gif`
  const note = String(data.message || '').trim()
  const noteShort = note.length > 280 ? `${note.slice(0, 277).trimEnd()}…` : note

  const subject = `Got it, ${name}. Your request is in`
  const preheader = `Thanks, ${name}. A real person from the studio will write back within 24 hours.`

  const row = (label, value) =>
    value
      ? `<tr>
          <td style="padding:14px 0 0;font:400 11px/1.4 ${MONO};letter-spacing:.08em;text-transform:uppercase;color:${DIM};width:120px;vertical-align:top;">${label}</td>
          <td style="padding:14px 0 0;font:400 15px/1.45 ${SANS};color:${INK};vertical-align:top;">${esc(value)}</td>
        </tr>`
      : ''

  const chips = services.length
    ? `<tr><td colspan="2" style="padding:6px 0 4px;">${services
        .map(
          (s) =>
            `<span class="chip" style="display:inline-block;margin:8px 6px 0 0;padding:7px 13px;border:1px solid #2c2c2c;border-radius:999px;font:400 13px/1 ${SANS};color:${INK};white-space:nowrap;">${esc(s)}</span>`,
        )
        .join('')}</td></tr>`
    : ''

  const steps = STEPS.map(
    ([n, title, text], i) => `
      <tr class="step">
        <td class="thread" style="width:28px;vertical-align:top;padding:0;${i < STEPS.length - 1 ? `background:linear-gradient(${RED},${RED}) no-repeat 5px 22px / 1px 100%;` : ''}">
          <div class="node node-${i + 1}" style="width:11px;height:11px;margin-top:6px;border-radius:50%;background:${i === 0 ? RED : '#000'};border:1px solid ${RED};box-sizing:border-box;"></div>
        </td>
        <td class="step-body" style="padding:0 0 26px;vertical-align:top;">
          <div style="font:400 11px/1.4 ${MONO};letter-spacing:.08em;color:${i === 0 ? RED : DIM};">${n}${i === 0 ? ' · NOW' : ''}</div>
          <div class="step-title" style="margin-top:4px;font:500 19px/1.3 ${SANS};letter-spacing:-.3px;color:${INK};">${title}</div>
          <div style="margin-top:4px;font:400 15px/1.55 ${SANS};color:${MUTED};">${text}</div>
        </td>
      </tr>`,
  ).join('')

  const html = `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: ${INK}; }
  u + #body a, #MessageViewBody a { color: inherit; text-decoration: none; }

  /* Heartbeat: 54 BPM = 1.11 s. The live dot beats; a pulse walks down the thread. */
  @keyframes beat {
    0%, 60%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 59, 42, 0); }
    8% { transform: scale(1.45); box-shadow: 0 0 0 6px rgba(255, 59, 42, .18); }
    18% { transform: scale(1); }
    26% { transform: scale(1.22); box-shadow: 0 0 0 3px rgba(255, 59, 42, .12); }
  }
  @keyframes travel {
    0%, 100% { background-color: #000; box-shadow: none; }
    6%, 18% { background-color: ${RED}; box-shadow: 0 0 10px 2px rgba(255, 59, 42, .55); }
    30% { background-color: #000; box-shadow: none; }
  }
  .live { animation: beat 1.11s ease-in-out infinite; }
  .node-1 { animation: beat 1.11s ease-in-out infinite; }
  .node-2 { animation: travel 3.33s ease-in-out 1.11s infinite; }
  .node-3 { animation: travel 3.33s ease-in-out 2.22s infinite; }

  /* Hover (desktop clients that support it). */
  .step-body { transition: transform .35s cubic-bezier(.2, .8, .2, 1); }
  .step:hover .step-body { transform: translateX(6px); }
  .step:hover .step-title { color: ${RED} !important; }
  .cta a { transition: background-color .25s, color .25s; }
  .cta a:hover { background-color: #ffffff !important; color: #000000 !important; }
  .cta a:hover .arr { padding-left: 6px; }
  .chip { transition: border-color .25s; }
  .chip:hover { border-color: ${RED} !important; }
  .foot a:hover { color: ${RED} !important; }

  @media (prefers-reduced-motion: reduce) {
    .live, .node-1, .node-2, .node-3 { animation: none !important; }
  }
  @media (max-width: 620px) {
    .wrap { width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .h1 { font-size: 40px !important; line-height: 1.02 !important; letter-spacing: -1.6px !important; }
    .mark { font-size: 54px !important; letter-spacing: -2.6px !important; }
    .hide-sm { display: none !important; }
    .card { padding: 20px !important; }
  }
  /* Outlook.com / Office dark mode: keep our colors. */
  [data-ogsc] .h1, [data-ogsb] .h1 { color: #ffffff !important; }
</style>
</head>
<body id="body" style="margin:0;padding:0;background:#000000;color:${INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
<tr><td align="center" style="padding:24px 0 0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

  <!-- Header -->
  <tr><td class="px" style="padding:8px 32px 22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font:500 16px/1 ${SANS};letter-spacing:-.4px;"><a href="${site}" style="color:${INK};text-decoration:none;">ArteriaStudios</a></td>
      <td align="right" style="font:400 11px/1 ${MONO};letter-spacing:.08em;color:${DIM};text-transform:uppercase;">Request № ${esc(number)}<span class="hide-sm"> &nbsp;·&nbsp; ${esc(date)}</span></td>
    </tr></table>
  </td></tr>

  <!-- Hero: the pulse -->
  <tr><td class="px" style="padding:0 32px;">
    <a href="${site}" style="text-decoration:none;"><img src="${esc(hero)}" width="536" alt="ArteriaStudios: strands of red light gently pulsing" style="display:block;width:100%;max-width:536px;height:auto;border-radius:20px;border:1px solid ${LINE};background:#000;"></a>
  </td></tr>

  <!-- Headline -->
  <tr><td class="px" style="padding:40px 32px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:10px;"><div class="live" style="width:8px;height:8px;border-radius:50%;background:${RED};"></div></td>
      <td style="vertical-align:middle;font:400 11px/1 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${RED};">Request received</td>
    </tr></table>
    <h1 class="h1" style="margin:18px 0 0;font:500 52px/1 ${SANS};letter-spacing:-2.2px;color:${INK};">Thank you, ${esc(name)}.</h1>
    <div class="h1" style="margin:6px 0 0;font:500 52px/1 ${SANS};letter-spacing:-2.2px;color:#4a4a4a;">We’ve got it from here.</div>
    <p style="margin:26px 0 0;font:400 17px/1.6 ${SANS};color:${MUTED};max-width:480px;">Your brief just landed at the studio. A real person from our team is reading it now and will write back <span style="color:${INK};">within 24 hours</span>, usually sooner.</p>
  </td></tr>

  <!-- Brief summary -->
  <tr><td class="px" style="padding:36px 32px 0;">
    <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD};border:1px solid ${LINE};border-radius:20px;padding:26px 28px;">
      <tr><td colspan="2" style="font:400 11px/1.4 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${DIM};">Your brief</td></tr>
      ${chips}
      ${row('Budget', data.budget)}
      ${row('Timeline', data.timeline)}
      ${row('Company', data.company)}
      ${noteShort ? `<tr><td colspan="2" style="padding:18px 0 0;"><div style="padding-left:14px;border-left:1px solid ${RED};font:400 15px/1.55 ${SANS};color:${MUTED};font-style:italic;">${esc(noteShort).replace(/\n/g, '<br>')}</div></td></tr>` : ''}
    </table>
  </td></tr>

  <!-- What happens next: the red thread -->
  <tr><td class="px" style="padding:44px 32px 0;">
    <div style="font:400 11px/1.4 ${MONO};letter-spacing:.1em;text-transform:uppercase;color:${DIM};margin-bottom:20px;">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>
  </td></tr>

  <!-- CTA -->
  <tr><td class="px" style="padding:14px 32px 0;">
    <table role="presentation" class="cta" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:999px;background:${RED};">
        <!--[if mso]><v:roundrect href="${site}/works" style="height:48px;v-text-anchor:middle;width:230px;" arcsize="50%" stroke="f" fillcolor="${RED}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;">See selected work →</center></v:roundrect><![endif]-->
        <!--[if !mso]><!--><a href="${site}/works" style="display:inline-block;padding:15px 26px;border-radius:999px;background:${RED};font:500 15px/1 ${SANS};color:#ffffff;text-decoration:none;letter-spacing:-.2px;">See selected work<span class="arr" style="padding-left:10px;">→</span></a><!--<![endif]-->
      </td>
    </tr></table>
    <p style="margin:22px 0 0;font:400 15px/1.6 ${SANS};color:${MUTED};">Something to add? Just reply to this email. It comes straight to us.</p>
    <p style="margin:26px 0 0;font:400 15px/1.6 ${SANS};color:${INK};">Talk soon,<br><span style="color:${MUTED};">The ArteriaStudios team</span></p>
  </td></tr>

  <!-- Footer -->
  <tr><td class="px foot" style="padding:56px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${LINE};"><tr>
      <td style="padding:20px 0 0;font:400 11px/1.8 ${MONO};letter-spacing:.06em;text-transform:uppercase;color:${DIM};">
        <a href="${site}/works" style="color:${MUTED};text-decoration:none;">Works</a> &nbsp;·&nbsp;
        <a href="${site}/about" style="color:${MUTED};text-decoration:none;">About</a> &nbsp;·&nbsp;
        <a href="${site}" style="color:${MUTED};text-decoration:none;">thearteria.com</a>
      </td>
      <td align="right" style="padding:20px 0 0;font:400 11px/1.8 ${MONO};letter-spacing:.06em;color:${DIM};">54 BPM</td>
    </tr></table>
    <p style="margin:14px 0 0;font:400 12px/1.6 ${SANS};color:${DIM};">You’re getting this because a project request was sent with this address at thearteria.com. If it wasn’t you, you can ignore this email.</p>
  </td></tr>
  <tr><td class="px" style="padding:22px 32px 0;overflow:hidden;">
    <div class="mark" style="font:500 92px/.8 ${SANS};letter-spacing:-4.6px;color:#141414;white-space:nowrap;overflow:hidden;">ArteriaStudios</div>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`

  const text = [
    `Thank you, ${name}. We've got it from here.`,
    '',
    'Your brief just landed at the studio. A real person from our team is reading it now',
    'and will write back within 24 hours, usually sooner.',
    '',
    'YOUR BRIEF',
    services.length && `Services: ${services.join(', ')}`,
    data.budget && `Budget: ${data.budget}`,
    data.timeline && `Timeline: ${data.timeline}`,
    data.company && `Company: ${data.company}`,
    noteShort && `Note: ${noteShort}`,
    '',
    'WHAT HAPPENS NEXT',
    ...STEPS.map(([n, title, t]) => `${n}  ${title}. ${t}`),
    '',
    `See selected work: ${site}/works`,
    'Something to add? Just reply to this email.',
    '',
    'Talk soon,',
    'The ArteriaStudios team',
    '',
    `Request № ${number} · ${date}`,
  ]
    .filter((line) => line !== false && line !== undefined && line !== null && line !== 0)
    .join('\n')

  return { subject, html, text, preheader }
}
