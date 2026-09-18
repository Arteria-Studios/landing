/* ---------- Case study page ----------
   project.html?p=<slug> renders one project from PROJECTS (assets/main.js):
   title, services, large media and a link to the next project. With content
   from the database (admin at /admin) it also shows the description, industry,
   stack, testimonial, a link to the live project and the rest of the media. */
(() => {
  const root = document.querySelector("[data-case]");
  if (!root || typeof PROJECTS === "undefined") return;

  const slug = new URLSearchParams(location.search).get("p");
  const i = PROJECTS.findIndex((p) => slugOf(p) === slug);

  if (i < 0) {
    root.innerHTML = `
      <div class="case-head">
        <a class="case-back" href="works.html">← All works</a>
        <h1 class="case-title">Project not found</h1>
        <p class="case-lead">This project may have moved. Browse everything we’ve made instead.</p>
        <a class="pill" href="works.html"><span class="roll"><span>See all works</span><span>See all works</span></span><i aria-hidden="true">→</i></a>
      </div>`;
    return;
  }

  const p = PROJECTS[i];
  const next = PROJECTS[(i + 1) % PROJECTS.length];
  const pad = (n) => String(n).padStart(2, "0");
  document.title = `${p.title} — ArteriaStudios`;

  const meta = [
    p.tag && ["Services", esc(p.tag)],
    p.industry && ["Industry", esc(p.industry)],
    p.stack && p.stack.length && ["Stack", esc(p.stack.join(", "))],
    ["Project", `${pad(i + 1)} / ${pad(PROJECTS.length)}`],
  ].filter(Boolean);

  // Body text: paragraphs separated by blank lines, as typed in the admin.
  const paragraphs = (p.body || "").split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  const lead = paragraphs.length
    ? paragraphs.map((t) => `<p class="case-lead">${esc(t)}</p>`).join("")
    : `<p class="case-lead">The full story behind ${esc(p.home)}, from the brief to the result, is being written up. Want the details now? We’re happy to walk you through it.</p>`;

  // Media after the hero (the first image or video is already shown on top).
  const shown = new Set([p.img, p.video].filter(Boolean));
  const gallery = (p.media || []).filter((m) => !shown.has(m.url));
  const galleryHtml = gallery.length
    ? `<div class="case-gallery">${gallery.map((m) => `<figure class="case-shot${m.span === 1 ? " is-half" : ""}">${
        m.kind === "video"
          ? `<video muted loop playsinline preload="none" data-src="${esc(mediaSrc(m.url))}" aria-label="${esc(m.title || p.title)}"></video>`
          : `<img src="${esc(mediaSrc(m.url))}" alt="${esc(m.title || p.title)}" loading="lazy">`
      }</figure>`).join("")}</div>`
    : "";

  const link = p.link && /^https?:\/\//.test(p.link)
    ? `<a class="pill" href="${esc(p.link)}" target="_blank" rel="noopener"><span class="roll"><span>Visit project</span><span>Visit project</span></span><i aria-hidden="true">↗</i></a>`
    : "";

  root.innerHTML = `
    <div class="case-head">
      <a class="case-back" href="works.html">← All works</a>
      <h1 class="case-title">${esc(p.home)}</h1>
      <dl class="case-meta">
        ${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
      </dl>
    </div>
    <div class="case-media">${media(p, p.home, true)}</div>
    <div class="case-body">
      ${lead}
      ${p.testimonial ? `<blockquote class="case-quote">${esc(p.testimonial)}</blockquote>` : ""}
      <div class="case-actions">
        ${link}
        <a class="hx-cta" href="index.html#contact"><span class="roll"><span>Ask about this project</span><span>Ask about this project</span></span><i aria-hidden="true">→</i></a>
      </div>
    </div>
    ${galleryHtml}
    <a class="case-next" href="${caseUrl(next)}">
      <span>Next project</span>
      <strong>${esc(next.home)}</strong>
      <i aria-hidden="true">→</i>
    </a>`;

  // Case media is rendered after main.js set up lazy video, so start it here:
  // the hero right away, gallery videos when they come on screen.
  const start = (v) => {
    if (!v.src) v.src = v.dataset.src;
    if (!reducedMotion) v.play().catch(() => {});
  };
  const vids = [...root.querySelectorAll("video[data-src]")];
  if (vids[0]) start(vids[0]);
  const vio = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) start(en.target);
    else if (!en.target.paused) en.target.pause();
  }), { rootMargin: "200px 0px" });
  vids.slice(1).forEach((v) => vio.observe(v));
})();
