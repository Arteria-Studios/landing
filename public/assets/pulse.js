/* ---------- Heartbeat: one rhythm for the whole page ----------
   A single clock beats a double "lub-dub" at BPM. The artery in the hero, the
   bento tiles, the brand dots, the red thread and the CTA all read from it.
   The beat starts in the hero and travels down the page as a pulse wave: an
   element further from the hero gets the same beat a little later (distance ÷
   WAVE), so the wave is visible as it moves from block to block.

   Elements with [data-beat] receive --beat (0..1) while on screen, plus el._beat
   for scripts. [data-beat-x] also delays by horizontal position (left → right). */
(() => {
  const BPM = 54;
  const PERIOD = 60 / BPM;
  const WAVE = 2400;            // pulse wave speed down the page, px per second
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t0 = performance.now();

  const now = () => (performance.now() - t0) / 1000;
  const phase = (delay = 0) => { const x = (now() - delay) / PERIOD; return x - Math.floor(x); };
  // Same shape as beat() in the wormhole shader: a strong beat, then a softer echo.
  const env = (p) => Math.min(1, Math.exp(-(((p - 0.08) * 22) ** 2)) + 0.6 * Math.exp(-(((p - 0.24) * 22) ** 2)));
  const at = (delay = 0) => (reduced ? 0 : env(phase(delay)));

  window.Pulse = { PERIOD, WAVE, reduced, now, phase, env, at };

  const hero = document.querySelector(".hx");
  let origin = 0;                 // where the wave starts: middle of the hero

  /* ---------- Red thread between sections ---------- */
  const thread = document.querySelector("[data-thread]");
  const fill = thread && thread.querySelector(".thread-fill");
  const dot = thread && thread.querySelector(".thread-pulse");
  // One wave front per beat still travelling: a front takes longer than a beat to
  // cover the whole thread, so earlier fronts keep running while a new one starts.
  const dots = dot ? [dot] : [];
  const end = document.querySelector(".contact .section-title");   // the thread ends at Contact
  const NODES = [
    [".svc .section-title", "01"],
    [".projects .section-title", "02"],
    [".brands .section-title", "03"],
    [".world .section-title", "04"],
  ];
  let top = 0, height = 0, nodes = [];

  const docTop = (el) => el.getBoundingClientRect().top + scrollY;

  const layout = () => {
    origin = hero ? docTop(hero) + hero.offsetHeight / 2 : 0;
    if (!thread || !hero || !end) return;
    top = docTop(hero) + hero.offsetHeight;
    height = Math.max(0, docTop(end) + end.offsetHeight / 2 - top);
    thread.style.top = `${top}px`;
    thread.style.height = `${height}px`;
    // Nodes sit level with each section title; the last one closes the thread at Contact.
    nodes.forEach(({ n }) => { io.unobserve(n); targets.delete(n); n.remove(); });
    const marks = NODES.map(([sel, label]) => {
      const t = document.querySelector(sel);
      return t ? [docTop(t) + t.offsetHeight / 2 - top, label] : null;
    }).filter(Boolean);
    marks.push([height, "05"]);
    nodes = marks.map(([y, label]) => {
      const n = document.createElement("span");
      n.className = "thread-node";
      n.dataset.beat = "";
      n.style.top = `${y}px`;
      n.innerHTML = `<em>${label}</em>`;
      thread.appendChild(n);
      io.observe(n);
      return { n, y };
    });
  };

  /* ---------- Beat targets (only the ones on screen are updated) ---------- */
  const targets = new Set();
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) targets.add(e.target);
    else { targets.delete(e.target); e.target._beat = 0; e.target.style.setProperty("--beat", "0"); }
  }), { rootMargin: "120px 0px" });
  const observeAll = () => document.querySelectorAll("[data-beat]").forEach((el) => io.observe(el));

  const svc = document.querySelector(".svc");

  const frame = () => {
    const sy = scrollY, vh = innerHeight;

    for (const el of targets) {
      const r = el.getBoundingClientRect();
      let d = (r.top + r.height / 2 + sy - origin) / WAVE;
      if ("beatX" in el.dataset) d += (r.left + r.width / 2) / (WAVE * 0.5);
      const b = at(Math.max(0, d));
      el._beat = b;
      el.style.setProperty("--beat", b.toFixed(3));
    }

    // Hero → Services hand-off: the throat light spills into the top of Services,
    // strongest as the hero leaves the screen, then fades.
    if (hero && svc) {
      const hb = hero.getBoundingClientRect().bottom;
      const h = 1 - Math.min(1, Math.abs(hb) / vh);
      svc.style.setProperty("--handoff", h.toFixed(3));
    }

    if (thread && height) {
      // The thread draws itself as you scroll...
      const drawn = Math.min(height, Math.max(0, sy + vh * 0.75 - top));
      fill.style.transform = `scaleY(${(drawn / height).toFixed(4)})`;
      for (const { n, y } of nodes) n.classList.toggle("reached", drawn >= y);
      // ...and every beat sends a wave front along it, all the way to the end.
      const reach = top + height - origin;                       // distance a front must travel
      const fronts = Math.ceil(reach / (WAVE * PERIOD)) + 1;
      while (dots.length < fronts) { const d = dot.cloneNode(); thread.appendChild(d); dots.push(d); }
      const since = phase(0) * PERIOD;                           // time since the latest beat
      dots.forEach((d, k) => {
        const y = origin + WAVE * (since + k * PERIOD) - top;    // front of the beat k beats ago
        const show = k < fronts && y > 0 && y < drawn;
        d.style.opacity = show ? "1" : "0";
        if (show) d.style.transform = `translateY(${y.toFixed(1)}px)`;
      });
    }

    if (!reduced) requestAnimationFrame(frame);
  };

  const start = () => {
    layout();
    observeAll();
    if (reduced && thread) {
      // Still version: the thread is simply drawn, no travelling pulse.
      fill.style.transform = "scaleY(1)";
      nodes.forEach(({ n }) => n.classList.add("reached"));
      dots.forEach((d) => { d.style.display = "none"; });
      return;
    }
    requestAnimationFrame(frame);
  };

  let relayout = 0;
  new ResizeObserver(() => { clearTimeout(relayout); relayout = setTimeout(layout, 120); }).observe(document.body);
  // Scripts run at the end of <body>, so the DOM is ready. Don't wait for the heavy
  // GIFs to finish loading; just re-measure once they have.
  start();
  addEventListener("load", layout);
})();
