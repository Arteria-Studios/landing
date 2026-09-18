#!/usr/bin/env node
/**
 * Writes an interactive preview of the "request received" email:
 *   node scripts/email-preview.mjs [out.html]
 * The page renders the real template (lib/email/request-received.mjs) in an
 * iframe, with controls for the name and brief, desktop/phone width and a
 * "Gmail" mode that drops <style> (no animations, no hover), like clients
 * that ignore it. The hero GIF is embedded, so the file works offline.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const out = process.argv[2] || path.join(root, 'email-preview.html')
const template = fs
  .readFileSync(path.join(root, 'lib/email/request-received.mjs'), 'utf8')
  .replace(/^export /gm, '')
const gif = fs.readFileSync(path.join(root, 'public/assets/email/pulse.gif')).toString('base64')

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email preview · Request received</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Inter+Tight:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { --bg: #0a0a0a; --panel: #111; --line: #222; --ink: #fff; --muted: #8a8a8a; --red: #ff3b2a; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 400 14px/1.4 'Inter Tight', system-ui, sans-serif; }
  .app { display: grid; grid-template-columns: 300px 1fr; min-height: 100vh; }
  aside { border-right: 1px solid var(--line); padding: 22px; display: grid; gap: 16px; align-content: start; position: sticky; top: 0; height: 100vh; overflow: auto; }
  h1 { margin: 0; font-size: 18px; font-weight: 500; letter-spacing: -.3px; }
  .sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
  label { display: grid; gap: 6px; font: 400 10px/1 'DM Mono', monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  input, textarea, select { width: 100%; background: #0c0c0c; border: 1px solid var(--line); color: var(--ink); border-radius: 10px; padding: 10px 11px; font: 400 14px/1.3 'Inter Tight', sans-serif; }
  textarea { min-height: 70px; resize: vertical; }
  .seg { display: flex; gap: 6px; flex-wrap: wrap; }
  .seg button { background: none; border: 1px solid var(--line); color: var(--ink); border-radius: 999px; padding: 7px 12px; font: 400 13px/1 'Inter Tight', sans-serif; cursor: pointer; }
  .seg button[aria-pressed="true"] { border-color: var(--red); background: rgba(255, 59, 42, .12); }
  .meta { border-top: 1px solid var(--line); padding-top: 14px; font: 400 12px/1.6 'Inter Tight', sans-serif; color: var(--muted); }
  .meta b { color: var(--ink); font-weight: 500; }
  main { display: grid; place-items: start center; padding: 32px 24px 60px; background: radial-gradient(1200px 600px at 70% 0%, #1a0304, transparent 60%), var(--bg); }
  .inbox { width: 100%; max-width: 680px; }
  .headers { background: var(--panel); border: 1px solid var(--line); border-radius: 16px 16px 0 0; padding: 14px 18px; display: grid; gap: 4px; font-size: 13px; }
  .headers .k { color: var(--muted); display: inline-block; width: 60px; }
  .headers .subject { font-size: 16px; font-weight: 500; margin-top: 4px; }
  .headers .pre { color: var(--muted); font-size: 12px; }
  .frame { border: 1px solid var(--line); border-top: 0; border-radius: 0 0 16px 16px; overflow: hidden; background: #000; transition: max-width .4s cubic-bezier(.2,.8,.2,1); margin: 0 auto; }
  iframe { display: block; width: 100%; border: 0; height: 900px; background: #000; }
  @media (max-width: 860px) { .app { grid-template-columns: 1fr; } aside { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--line); } }
</style>
</head>
<body>
<div class="app">
  <aside>
    <div><h1>Request received</h1><div class="sub">Auto-reply to the Start a project form</div></div>
    <label>Name<input id="name" value="Jane Smith"></label>
    <label>Company<input id="company" value="Acme Inc."></label>
    <label>Services<div class="seg" id="services"></div></label>
    <label>Budget<select id="budget"><option>Under $10k</option><option>$10–25k</option><option selected>$25–50k</option><option>$50–100k</option><option>$100k+</option></select></label>
    <label>Timeline<select id="timeline"><option>ASAP</option><option selected>1–3 months</option><option>3–6 months</option><option>Flexible</option></select></label>
    <label>About the project<textarea id="message">We’re launching an AI assistant for clinics and need a brand plus a web app. Timeline is tight.</textarea></label>
    <label>Screen<div class="seg" data-group="width"><button data-v="600" aria-pressed="true">Desktop</button><button data-v="375" aria-pressed="false">Phone</button></div></label>
    <label>Client<div class="seg" data-group="client"><button data-v="apple" aria-pressed="true">Apple Mail</button><button data-v="gmail" aria-pressed="false">Gmail / no CSS</button></div></label>
    <div class="meta">Apple Mail and iOS Mail play the CSS motion: the live dot beats at 54 BPM and a pulse walks down the red thread. Hover the steps and the button on desktop. Every client plays the animated hero (the site's preloader).<br><br>From: <b>ArteriaStudios</b><br>Reply-to: the studio inbox</div>
  </aside>
  <main>
    <div class="inbox">
      <div class="headers">
        <div><span class="k">From</span>ArteriaStudios</div>
        <div><span class="k">To</span><span id="to"></span></div>
        <div class="subject" id="subject"></div>
        <div class="pre" id="pre"></div>
      </div>
      <div class="frame" id="frame"><iframe id="view" title="Email preview"></iframe></div>
    </div>
  </main>
</div>
<script>
${template}
const HERO = "data:image/gif;base64,${gif}";
const ALL = ["Branding", "Design", "Product", "Development", "AI", "Motion & 3D", "Strategy", "Promotion"];
const picked = new Set(["Branding", "Development", "AI"]);
const $ = (id) => document.getElementById(id);
const svc = $("services");
ALL.forEach((s) => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = s; b.setAttribute("aria-pressed", picked.has(s));
  b.onclick = () => { picked.has(s) ? picked.delete(s) : picked.add(s); b.setAttribute("aria-pressed", picked.has(s)); render(); };
  svc.append(b);
});
const state = { width: "600", client: "apple" };
document.querySelectorAll("[data-group]").forEach((g) => g.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  g.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  state[g.dataset.group] = b.dataset.v; render();
}));
["name", "company", "budget", "timeline", "message"].forEach((id) => $(id).addEventListener("input", render));

function render() {
  const email = buildRequestReceivedEmail({
    name: $("name").value, company: $("company").value, budget: $("budget").value,
    timeline: $("timeline").value, message: $("message").value, services: ALL.filter((s) => picked.has(s)),
    requestId: "cmu7a30ui0003vvsogk9u6v1x", siteUrl: "https://www.thearteria.com", heroUrl: HERO,
  });
  let html = email.html;
  if (state.client === "gmail") html = html.replace(/<style>[\\s\\S]*?<\\/style>/, "");
  $("subject").textContent = email.subject;
  $("pre").textContent = email.preheader;
  $("to").textContent = ($("name").value.split(" ")[0] || "jane").toLowerCase() + "@acme.com";
  $("frame").style.maxWidth = state.width === "375" ? "375px" : "680px";
  const f = $("view");
  f.srcdoc = html;
  f.onload = () => { f.style.height = f.contentDocument.documentElement.scrollHeight + "px"; };
}
render();
</script>
</body>
</html>`

fs.writeFileSync(out, page)
console.log('Preview written to', out, `(${Math.round(page.length / 1024)} KB)`)
