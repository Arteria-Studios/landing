/* ---------- Case study page ----------
   project.html?p=<slug> renders one project from PROJECTS (assets/main.js):
   title, services, large media and a link to the next project. Detailed story
   sections are added per project once the copy and images are ready. */
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

  root.innerHTML = `
    <div class="case-head">
      <a class="case-back" href="works.html">← All works</a>
      <h1 class="case-title">${esc(p.home)}</h1>
      <dl class="case-meta">
        <div><dt>Services</dt><dd>${esc(p.tag)}</dd></div>
        <div><dt>Project</dt><dd>${pad(i + 1)} / ${pad(PROJECTS.length)}</dd></div>
      </dl>
    </div>
    <div class="case-media">${media(p, p.home, true)}</div>
    <div class="case-body">
      <p class="case-lead">The full story behind ${esc(p.home)}, from the brief to the result, is being written up. Want the details now? We’re happy to walk you through it.</p>
      <a class="hx-cta" href="index.html#contact"><span class="roll"><span>Ask about this project</span><span>Ask about this project</span></span><i aria-hidden="true">→</i></a>
    </div>
    <a class="case-next" href="${caseUrl(next)}">
      <span>Next project</span>
      <strong>${esc(next.home)}</strong>
      <i aria-hidden="true">→</i>
    </a>`;

  // Case media is rendered after main.js set up lazy video, so start it here.
  const v = root.querySelector("video[data-src]");
  if (v) {
    v.src = v.dataset.src;
    if (!reducedMotion) v.play().catch(() => {});
  }
})();
