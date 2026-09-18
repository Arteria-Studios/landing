const IMG = "assets/media/";

const PROJECTS = [
  { title: "San Vicente Clubs", home: "San Vicente Clubs", tag: "Presentation", img: "san-vicente-clubs.jpg", video: "san-vicente-clubs.mp4" },
  { title: "Quanto", home: "Quanto", tag: "Branding", img: "quanto.jpg", video: "quanto.mp4" },
  { title: "Agronauts", home: "Agronauts", tag: "Branding, Product Design", img: "agronauts.jpg", video: "agronauts.mp4" },
  { title: "Celesta", home: "Celesta®", tag: "Branding", img: "celesta.jpg", video: "celesta.mp4" },
  { title: "Redmouse", home: "Redmouse", tag: "Website", img: "redmouse.jpg", video: "redmouse.mp4" },
  { title: "ArteriaStudios", home: "ArteriaStudios®", tag: "Campaign", img: "arteriastudios.jpg", video: "arteriastudios.mp4" },
  { title: "Digest AI", home: "Digest AI", tag: "Branding, Product Design", img: "digest-ai.jpg", video: "digest-ai.mp4" },
  { title: "ARDA FightClub", home: "ARDA FightClub", tag: "Presentations", img: "placeholder.webp" },
  { title: "Carriving", home: "Carriving", tag: "Branding, Product Design, Marketing Materials", img: "carriving.webp" },
  { title: "Medhub", home: "Medhub", tag: "Coverstory", img: "medhub.webp" },
  { title: "AT Engineering", home: "AT Engineering", tag: "Website", img: "placeholder.webp" },
  { title: "Gulflink", home: "Gulflink", tag: "Website", img: "gulflink.webp" },
  { title: "HeatSentinel", home: "HeatSentinel", tag: "Presentation, Product Design", img: "placeholder.webp" },
  { title: "Educate AI", home: "Educate AI", tag: "Branding, Product Design, Presentations", img: "placeholder.webp" },
  { title: "Mediabay TV", home: "Mediabay", tag: "Branding, Product Design", img: "placeholder.webp" },
  { title: "HeritageCrafts", home: "HeritageCrafts", tag: "Product AI Generation Pipeline", img: "placeholder.webp" },
  { title: "PharmX", home: "PharmX", tag: "Branding, Presentations", img: "placeholder.webp" },
  { title: "PolyGinger", home: "PolyGinger", tag: "Branding", img: "placeholder.webp" },
  { title: "Evolta", home: "Evolta Corp", tag: "Branding", img: "placeholder.webp" },
  { title: "Basecamp", home: "Basecamp", tag: "Branding, Presentations", img: "placeholder.webp" },
  { title: "Medical Journal", home: "Medical Journal", tag: "Editorial Design", img: "placeholder.webp" },
  { title: "Logos 2025", home: "Logofolio 2025", tag: "Logos", img: "placeholder.webp" },
];

/* While the page is moving, hover effects stand down: a still cursor over moving
   cards would otherwise flicker hover states and fire the distortion on every card
   that slides underneath it. */
{
  let t = 0;
  addEventListener("scroll", () => {
    document.documentElement.classList.add("is-scrolling");
    clearTimeout(t);
    t = setTimeout(() => document.documentElement.classList.remove("is-scrolling"), 160);
  }, { passive: true });
}
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Shared heartbeat 0..1: from pulse.js when the page has it, otherwise the same
   lub-dub shape at 54 BPM, so every page beats in one rhythm. */
const heartbeat = (() => {
  const PERIOD = 60 / 54;
  const t0 = performance.now();
  const env = (p) => Math.min(1, Math.exp(-(((p - 0.08) * 22) ** 2)) + 0.6 * Math.exp(-(((p - 0.24) * 22) ** 2)));
  return () => {
    if (window.Pulse) return window.Pulse.at(0);
    const x = (performance.now() - t0) / 1000 / PERIOD;
    return env(x - Math.floor(x));
  };
})();

/* ---------- Glass lens cursor ----------
   A lens of frosted glass trails the mouse:
   it blurs, brightens and saturates what is underneath, carries a turning
   red-orange gradient rim with a faint chromatic fringe, and behaves like a
   drop of liquid: fast moves stretch it along the direction of travel, then it
   springs back round. It swells on every heartbeat and opens up over links and
   buttons. Over text fields the native caret returns. Mouse only, never with
   reduced motion. */
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reducedMotion) {
  const lens = document.createElement("div");
  lens.className = "cur-ring";
  lens.setAttribute("aria-hidden", "true");
  document.body.append(lens);
  document.documentElement.classList.add("has-cursor");

  let mx = -100, my = -100, lx = -100, ly = -100, vx = 0, vy = 0;
  let grow = 0, target = 0, press = 0, pressS = 0, shown = false;
  let stretch = 0, angle = 0;
  const INTERACTIVE = "a, button, [role=button], .chip, .seg, label, summary";
  const TEXT = "input:not([type=range]):not([type=radio]):not([type=checkbox]), textarea, select";

  addEventListener("pointermove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (!shown) { lx = mx; ly = my; shown = true; document.documentElement.classList.add("cur-on"); }
    const el = e.target instanceof Element ? e.target : null;
    const onText = !!el?.closest(TEXT);
    document.documentElement.classList.toggle("cur-text", onText);
    target = !onText && el?.closest(INTERACTIVE) ? 1 : 0;
  }, { passive: true });
  document.addEventListener("pointerleave", () => { shown = false; document.documentElement.classList.remove("cur-on"); });
  addEventListener("pointerdown", () => { press = 1; });
  addEventListener("pointerup", () => { press = 0; });

  const loop = () => {
    // The lens trails the pointer; its velocity drives the squash-and-stretch.
    const nx = lx + (mx - lx) * 0.22, ny = ly + (my - ly) * 0.22;
    vx += (nx - lx - vx) * 0.35;
    vy += (ny - ly - vy) * 0.35;
    lx = nx; ly = ny;
    const speed = Math.hypot(vx, vy);
    stretch += (Math.min(0.5, speed * 0.018) - stretch) * 0.25;
    if (speed > 0.4) angle = Math.atan2(vy, vx);
    grow += (target - grow) * 0.16;
    pressS += (press - pressS) * 0.3;

    const b = heartbeat();
    const size = (40 + 40 * grow) * (1 + b * 0.12) * (1 - pressS * 0.18);
    lens.style.width = lens.style.height = `${size.toFixed(1)}px`;
    lens.style.transform =
      `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) translate(-50%, -50%) rotate(${angle.toFixed(3)}rad)` +
      ` scale(${(1 + stretch).toFixed(3)}, ${(1 - stretch * 0.45).toFixed(3)})`;
    lens.style.setProperty("--tint", (0.05 + grow * 0.12 + b * 0.08).toFixed(3));
    lens.style.setProperty("--glow", (0.25 + b * 0.75 + grow * 0.3).toFixed(3));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

/* ---------- Mobile menu ---------- */
{
  const btn = document.querySelector(".nav-menu");
  const menu = document.getElementById("menu");
  if (btn && menu) {
    const setOpen = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) {
        menu.hidden = false;
        requestAnimationFrame(() => menu.classList.add("is-open"));
        menu.querySelector("a")?.focus({ preventScroll: true });
      } else {
        menu.classList.remove("is-open");
        setTimeout(() => { if (btn.getAttribute("aria-expanded") === "false") menu.hidden = true; }, 600);
      }
    };
    btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    addEventListener("keydown", (e) => {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { setOpen(false); btn.focus(); }
    });
  }
}

/* Project media: a muted looping video (started only on screen) or a still image. */
const media = (p, alt, eager = false) => p.video
  ? `<video muted loop playsinline preload="none" poster="${IMG + p.img}" data-src="${IMG + p.video}" aria-label="${esc(alt)}"></video>`
  : `<img src="${IMG + p.img}" alt="${esc(alt)}" loading="${eager ? "eager" : "lazy"}">`;

/* Case study address for a project: project.html?p=<slug>. */
const slugOf = (p) => p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const caseUrl = (p) => `project.html?p=${slugOf(p)}`;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------- Home: grid ---------- */
const grid = document.querySelector("[data-grid]");
if (grid) {
  const HOME_PROJECTS = 8;   // the rest live on the Works page
  const pc = document.querySelector("[data-projects-count]");
  const pad = (n) => String(n).padStart(2, "0");
  if (pc) pc.textContent = `(${pad(Math.min(HOME_PROJECTS, PROJECTS.length))} / ${pad(PROJECTS.length)})`;
  grid.innerHTML = PROJECTS.slice(0, HOME_PROJECTS).map(
    (p) => `<a class="card" href="${caseUrl(p)}" data-beat>
      <div class="card-media"><div class="card-pan">${media(p, p.home)}</div></div>
      <div class="card-meta">
        <span class="card-tags">${esc(p.tag)}</span>
        <h3><i aria-hidden="true">→</i>${esc(p.home)}</h3>
      </div>
    </a>`
  ).join("");

  /* Scroll effects on project cards:
     - reveal: each card wipes open from the bottom while its image settles from a zoom;
     - parallax: the image drifts slower than the card as it crosses the screen;
     - velocity: fast scrolling leans and stretches the cards, then they spring back. */
  const medias = [...grid.querySelectorAll(".card-media")];
  const revealIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); revealIO.unobserve(en.target); }
  }), { rootMargin: "0px 0px -12% 0px" });
  medias.forEach((m) => revealIO.observe(m));

  const lively = matchMedia("(prefers-reduced-motion: no-preference) and (min-width: 810px)").matches;
  if (lively) {
    let lastY = scrollY, vel = 0, raf = 0;
    const tick = () => {
      const dy = scrollY - lastY;
      lastY = scrollY;
      vel += (dy - vel) * 0.18;
      if (Math.abs(vel) < 0.01) vel = 0;
      grid.style.setProperty("--skew", `${Math.max(-3, Math.min(3, vel * 0.08)).toFixed(3)}deg`);
      grid.style.setProperty("--stretch", (1 + Math.min(0.04, Math.abs(vel) * 0.0012)).toFixed(4));
      const vh = innerHeight;
      for (const m of medias) {
        const r = m.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const p = (r.top + r.height / 2 - vh / 2) / vh;   // -0.5..0.5 while crossing the screen
        m.style.setProperty("--pan", `${(p * -12).toFixed(2)}%`);
      }
      raf = vel ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener("scroll", kick, { passive: true });
    addEventListener("resize", kick);
    tick();
  }
}

/* ---------- Hero: stats counter ----------
   Each number is an odometer: every digit is a strip of 0–9 (twice) that rolls
   up to its value, the lower digits spinning longer, in the same easing as the
   nav text roll. It starts once the intro has opened and the stats are visible. */
const stats = document.querySelector("[data-stats]");
if (stats) {
  const odos = [...stats.querySelectorAll(".odo")];
  odos.forEach((odo, s) => {
    const digits = odo.dataset.to.split("");
    odo.innerHTML = digits.map(() =>
      `<span class="odo-col"><span class="odo-strip">${"01234567890123456789".split("").map((d) => `<i>${d}</i>`).join("")}</span></span>`
    ).join("");
    odo.querySelectorAll(".odo-strip").forEach((strip, i) => {
      // Later digits roll a little longer, and each stat starts a beat after the previous.
      strip.style.transitionDuration = `${1.5 + (digits.length - 1 - i) * 0.35}s`;
      strip.style.transitionDelay = `${0.15 + s * 0.18}s`;
    });
  });

  const run = () => odos.forEach((odo) => {
    odo.dataset.to.split("").forEach((d, i) => {
      const strip = odo.querySelectorAll(".odo-strip")[i];
      strip.style.transform = `translateY(${(-(10 + +d) / 20) * 100}%)`;
    });
  });

  if (reducedMotion) {
    stats.classList.add("is-still");
    run();
  } else {
    let seen = false, fired = false;
    const tryRun = () => {
      if (fired || !seen || document.documentElement.classList.contains("intro")) return;
      fired = true;
      requestAnimationFrame(run);
    };
    new IntersectionObserver(([en]) => { seen = en.isIntersecting; tryRun(); }).observe(stats);
    // Wait for the ECG intro to open before counting.
    new MutationObserver(tryRun).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  }
}

/* ---------- Home: brands carousel ---------- */
// Wordmarks for now. To use a real logo, add `logo: "assets/brands/name.svg"`
// and the item renders the image instead of the text.
const BRANDS = [
  { name: "San Vicente Clubs" }, { name: "Quanto" }, { name: "Agronauts" }, { name: "Celesta" },
  { name: "Redmouse" }, { name: "Digest AI" }, { name: "ARDA FightClub" }, { name: "Carriving" },
  { name: "Medhub" }, { name: "AT Engineering" }, { name: "Gulflink" }, { name: "HeatSentinel" },
  { name: "Educate AI" }, { name: "Mediabay" }, { name: "HeritageCrafts" }, { name: "PharmX" },
  { name: "PolyGinger" }, { name: "Evolta" }, { name: "Basecamp" },
];
const brandRows = document.querySelectorAll("[data-brands]");
if (brandRows.length) {
  const item = (b) => `<li class="brand">${b.logo
    ? `<img src="${b.logo}" alt="${esc(b.name)}" loading="lazy">`
    : `<span>${esc(b.name)}</span>`}</li>`;
  const half = Math.ceil(BRANDS.length / 2);
  brandRows.forEach((row, r) => {
    // Each row gets half the list; the track holds it twice so the loop is seamless.
    const list = r === 0 ? BRANDS.slice(0, half) : BRANDS.slice(half);
    const html = list.map(item).join("");
    row.innerHTML = `<ul class="brands-track">${html}</ul><ul class="brands-track" aria-hidden="true">${html}</ul>`;
  });
  const count = document.querySelector("[data-brand-count]");
  if (count) count.textContent = `(${BRANDS.length})`;
}

/* ---------- Home: inertial wheel scroll ---------- */
// Same feel as the Works page: each wheel tick adds velocity, friction bleeds it
// off. Gain is scaled so one notch travels the same distance as there (0.7 × 45vh).
if (grid) {
  const GAIN = () => 3.5e-4 * innerHeight * 0.45;   // px/frame per px of wheel delta
  const CAP = 120;
  const FRICTION = 0.95;
  let vel = 0, pos = 0, driving = false, lastT = 0;

  const glide = (t) => {
    const dt = lastT ? Math.min(3, (t - lastT) / (1000 / 60)) : 1;
    lastT = t;
    const max = document.documentElement.scrollHeight - innerHeight;
    vel *= Math.pow(FRICTION, dt);
    pos += vel * dt;
    if (pos <= 0 || pos >= max) { pos = Math.min(max, Math.max(0, pos)); vel = 0; }
    if (Math.abs(vel) < 0.02) vel = 0;
    scrollTo(0, pos);
    if (vel) requestAnimationFrame(glide);
    else { driving = false; lastT = 0; }
  };

  addEventListener("wheel", (e) => {
    if (e.ctrlKey || reducedMotion) return;   // reduced motion: plain native scroll
    e.preventDefault();
    const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!driving) { pos = scrollY; driving = true; requestAnimationFrame(glide); }
    vel += Math.sign(d) * Math.min(Math.abs(d), CAP) * GAIN();
  }, { passive: false });
}

/* ---------- Works: focus scroller ---------- */
// Page scroll drives a continuous "focus" index. The focused name is zoomed in on
// the left, and the image column on the right stacks with a fisheye scale.
const works = document.querySelector("[data-works]");
if (works) {
  const N = PROJECTS.length;
  const namesEl = works.querySelector(".wk-names");
  const imgsEl = works.querySelector(".wk-imgs");
  const idxEl = works.querySelector("[data-idx]");
  const tagEl = works.querySelector("[data-tag]");
  const openEl = works.querySelector("[data-open]");
  // Phones get their own layout: one large preview on top and the names below.
  const phoneMQ = matchMedia("(max-width: 809px)");
  let phone = phoneMQ.matches;

  namesEl.innerHTML = PROJECTS.map((p, i) => `<a class="wk-name" href="${caseUrl(p)}" data-i="${i}">${esc(p.title)}</a>`).join("");
  const numsEl = document.createElement("div");
  numsEl.className = "wk-nums";
  numsEl.setAttribute("aria-hidden", "true");
  numsEl.innerHTML = PROJECTS.map((_, i) => `<span class="wk-num">${String(i + 1).padStart(3, "0")}</span>`).join("");
  namesEl.before(numsEl);
  imgsEl.innerHTML = PROJECTS.map((p, i) =>
    `<a class="wk-img" href="${caseUrl(p)}" data-i="${i}">${media(p, p.title, i < 4)}</a>`
  ).join("");
  const names = [...namesEl.children];
  const imgs = [...imgsEl.children];
  const nums = [...numsEl.children];

  const IMG_GAP = 16;
  const NAME_GAP = 0.3;   // extra space between names, as a fraction of line height
  let step = 0, nameH = 0, imgH = 0;
  let target = 0, current = 0, raf = 0, shown = -1;
  let vel = 0, pos = 0, driving = false, lastT = 0;

  // Invisible snap points, one per project, so a swipe settles on a project.
  const snapsEl = document.createElement("div");
  snapsEl.className = "wk-snaps";
  snapsEl.setAttribute("aria-hidden", "true");
  snapsEl.innerHTML = "<i></i>".repeat(N);
  works.prepend(snapsEl);

  let measuredW = 0;
  const measure = () => {
    phone = phoneMQ.matches;
    measuredW = innerWidth;
    // On phones a project takes a shorter swipe; the stage height is the small
    // viewport, so the browser bar showing and hiding doesn't shift anything.
    const vh = phone ? works.querySelector(".wk-stage").offsetHeight : innerHeight;
    step = vh * (phone ? 0.3 : 0.45);              // scroll distance per project
    works.style.height = `${(N - 1) * step + vh}px`;
    [...snapsEl.children].forEach((el) => { el.style.height = `${step}px`; });
    nameH = names[0].offsetHeight;
    imgH = imgs[0].offsetHeight;
  };

  // Stack items so they touch at their scaled sizes, centred on the focus point.
  const layout = (els, baseH, gap, scaleOf, apply) => {
    const s = els.map((_, i) => scaleOf(i - current));
    const centers = [];
    let y = 0;
    s.forEach((k, i) => {
      const h = baseH * k;
      centers.push(y + h / 2);
      y += h + gap;
    });
    const f = Math.min(N - 1, Math.max(0, current));
    const lo = Math.floor(f), hi = Math.min(N - 1, lo + 1);
    const origin = centers[lo] + (centers[hi] - centers[lo]) * (f - lo);
    els.forEach((el, i) => apply(el, centers[i] - origin, s[i], i - current));
  };

  const bell = (d, w) => Math.exp(-d * d * w);
  // Opacity keeps falling with distance: the further from focus, the fainter.
  const fade = (d, k, min) => Math.max(min, Math.exp(-Math.abs(d) * k));

  const render = () => {
    if (driving) current = target;   // inertia already smooths the motion
    current += (target - current) * 0.12;
    if (Math.abs(target - current) < 0.0005) current = target;

    layout(names, nameH, nameH * NAME_GAP, (d) => 0.66 + 0.34 * bell(d, 1.4), (el, y, s, d) => {
      const o = fade(d, 0.6, 0.03).toFixed(3);
      el.style.transform = `translateY(${(y - nameH / 2).toFixed(1)}px) scale(${s.toFixed(4)})`;
      el.style.opacity = o;
      const num = nums[el.dataset.i];
      num.style.transform = `translateY(${y.toFixed(1)}px) translateY(-50%)`;
      num.style.opacity = o;
    });
    if (phone) {
      // One preview: the focused image, crossfading into its neighbour as you swipe.
      // A still crossfade only: no movement or zoom, so the preview never shakes.
      imgs.forEach((el, i) => {
        const a = Math.abs(i - current);
        const o = Math.max(0, 1 - a * 1.25);
        el.style.transform = "none";
        el.style.opacity = o.toFixed(3);
        el.style.visibility = o > 0 ? "" : "hidden";
        el.style.pointerEvents = a < 0.5 ? "" : "none";
      });
    } else {
      layout(imgs, imgH, IMG_GAP, (d) => 0.42 + 0.58 * bell(d, 1.1), (el, y, s, d) => {
        el.style.transform = `translateY(${(y - imgH / 2).toFixed(1)}px) scale(${s.toFixed(4)})`;
        el.style.opacity = fade(d, 0.4, 0.08).toFixed(3);
        el.style.visibility = el.style.pointerEvents = "";
      });
    }

    const i = Math.round(current);
    if (i !== shown) {
      shown = i;
      idxEl.textContent = `${String(i + 1).padStart(3, "0")} / ${String(N).padStart(3, "0")}`;
      tagEl.textContent = PROJECTS[i].tag;
      openEl.href = caseUrl(PROJECTS[i]);
      openEl.setAttribute("aria-label", `View case: ${PROJECTS[i].title}`);
      if (phone) playFocused(i);
    }
    raf = current === target ? 0 : requestAnimationFrame(render);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(render); };

  // Phones: only the focused project's video loads and plays; the rest stay posters.
  function playFocused(i) {
    imgs.forEach((el, k) => {
      const v = el.querySelector("video");
      if (!v) return;
      if (k === i) {
        if (!v.src) { v.src = v.dataset.src; v.preload = "auto"; }
        if (!reducedMotion) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    });
  }

  const onScroll = () => {
    const r = works.getBoundingClientRect();
    target = Math.min(N - 1, Math.max(0, -r.top / step));
    kick();
  };

  addEventListener("scroll", onScroll, { passive: true });

  // Inertial wheel scroll: each wheel tick adds velocity (in projects per frame),
  // friction bleeds it off, so motion glides and eases out instead of stepping.
  const WHEEL_GAIN = 3.5e-4;   // velocity per pixel of wheel delta (~0.7 project per notch)
  const WHEEL_CAP = 120;       // max delta counted from a single wheel event
  const FRICTION = 0.95;       // velocity kept per 60fps frame

  const glide = (t) => {
    const dt = lastT ? Math.min(3, (t - lastT) / (1000 / 60)) : 1;
    lastT = t;
    vel *= Math.pow(FRICTION, dt);
    pos += vel * dt;
    if (pos <= 0 || pos >= N - 1) { pos = Math.min(N - 1, Math.max(0, pos)); vel = 0; }
    if (Math.abs(vel) < 5e-5) vel = 0;
    scrollTo(0, works.offsetTop + pos * step);
    target = pos;
    kick();
    if (vel) requestAnimationFrame(glide);
    else { driving = false; lastT = 0; }
  };

  addEventListener("wheel", (e) => {
    if (e.ctrlKey || reducedMotion) return;   // reduced motion: plain native scroll   // leave pinch/zoom alone
    e.preventDefault();
    const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    if (!driving) { pos = target; driving = true; requestAnimationFrame(glide); }
    vel += Math.sign(d) * Math.min(Math.abs(d), WHEEL_CAP) * WHEEL_GAIN;
  }, { passive: false });

  // First click brings a project into focus; clicking the focused one opens its case.
  const goTo = (e) => {
    const a = e.target.closest("[data-i]");
    if (!a) return;
    const i = Number(a.dataset.i);
    if (i === Math.round(current)) return;          // let the link open the case study
    e.preventDefault();
    scrollTo({ top: works.offsetTop + i * step, behavior: "smooth" });
  };
  namesEl.addEventListener("click", goTo);
  imgsEl.addEventListener("click", goTo);

  addEventListener("resize", () => {
    // Phones fire resize when the browser bar hides: ignore height-only changes.
    if (phoneMQ.matches && phone && innerWidth === measuredW) return;
    const wasPhone = phone;
    measure(); onScroll(); current = target;
    if (wasPhone !== phone) shown = -1;
    render();
  });
  measure();
  onScroll();
  current = target;
  render();
}

/* ---------- Image hover: WebGL grid distortion ---------- */
// One shared WebGL canvas moves into whichever image card is hovered. The mouse pushes
// cells of a small displacement grid; the grid relaxes back to zero every frame.
const cards = document.querySelectorAll(".card-media, .wk-img");
if (cards.length && matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) {
  const GRID = 28;          // grid cells per side
  const RADIUS = 0.14;      // brush radius, in plane units (0..1)
  const STRENGTH = 0.9;     // how hard the mouse pushes
  const RELAX = 0.92;       // per-frame decay back to rest
  const SHIFT = 0.045;      // max UV offset applied to the image

  const canvas = document.createElement("canvas");
  canvas.className = "distort";
  const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false });

  if (gl) {
    const vs = `
      attribute vec2 p;
      varying vec2 vUv;
      void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `
      precision mediump float;
      uniform sampler2D uImage, uGrid;
      uniform vec2 uCover;   // maps plane UV to object-fit: cover UV
      varying vec2 vUv;
      void main() {
        vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
        vec2 off = (texture2D(uGrid, uv).rg - 0.5) * 2.0 * ${SHIFT.toFixed(3)};
        vec2 c = (uv - 0.5) * uCover + 0.5;
        float r = texture2D(uImage, c - off * 1.25).r;
        vec4 g = texture2D(uImage, c - off);
        float b = texture2D(uImage, c - off * 0.75).b;
        gl_FragColor = vec4(r, g.g, b, 1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const makeTex = (unit, filter) => {
      const t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    const imageTex = makeTex(0, gl.LINEAR);
    const gridTex = makeTex(1, gl.NEAREST); // NEAREST gives the blocky grid look
    gl.uniform1i(gl.getUniformLocation(prog, "uImage"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uGrid"), 1);
    const uCover = gl.getUniformLocation(prog, "uCover");

    const field = new Float32Array(GRID * GRID * 2);
    const bytes = new Uint8Array(GRID * GRID * 4);

    let card = null, img = null, raf = 0, isLive = false;
    let mouse = { x: 0, y: 0, vx: 0, vy: 0, has: false };

    // Measure the box the canvas actually covers: the image's own parent, which on
    // home cards is the oversized parallax wrapper, not the visible card frame.
    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const pa = r.width / r.height;
      const ia = (img.naturalWidth || img.videoWidth) / (img.naturalHeight || img.videoHeight);
      gl.uniform2f(uCover, pa > ia ? 1 : pa / ia, pa > ia ? ia / pa : 1);
    };

    const uploadImage = () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    };

    const frame = () => {
      // Push grid cells near the cursor along the mouse velocity.
      if (mouse.has && (mouse.vx || mouse.vy)) {
        const aspect = canvas.width / canvas.height;
        for (let j = 0; j < GRID; j++) {
          for (let i = 0; i < GRID; i++) {
            const dx = ((i + 0.5) / GRID - mouse.x) * aspect;
            const dy = (j + 0.5) / GRID - mouse.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < RADIUS) {
              const k = (1 - d / RADIUS) * STRENGTH * GRID;
              const n = (j * GRID + i) * 2;
              field[n] += mouse.vx * k;
              field[n + 1] += mouse.vy * k;
            }
          }
        }
        mouse.vx = mouse.vy = 0;
      }

      let energy = 0;
      for (let n = 0, b = 0; n < field.length; n += 2, b += 4) {
        field[n] = Math.max(-1, Math.min(1, field[n] * RELAX));
        field[n + 1] = Math.max(-1, Math.min(1, field[n + 1] * RELAX));
        energy += Math.abs(field[n]) + Math.abs(field[n + 1]);
        bytes[b] = (field[n] * 0.5 + 0.5) * 255;
        bytes[b + 1] = (field[n + 1] * 0.5 + 0.5) * 255;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gridTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GRID, GRID, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);

      if (isLive) uploadImage(); // re-upload so video keeps playing inside the effect
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!mouse.has && energy < 0.01) { detach(); return; }
      raf = requestAnimationFrame(frame);
    };

    const detach = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      canvas.remove();
      card = img = null;
    };

    const attach = (el) => {
      if (card === el) return;
      if (card) detach();
      card = el;
      img = el.querySelector("img, video");
      isLive = img.tagName === "VIDEO";
      field.fill(0);
      img.after(canvas);
      resize();
      uploadImage();
      raf = requestAnimationFrame(frame);
    };

    const toLocal = (e) => {
      const r = canvas.parentElement.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };

    cards.forEach((el) => {
      el.addEventListener("mouseenter", (e) => {
        const im = el.querySelector("img, video");
        // Media must have a frame to draw: a loaded image, or a video with data.
        if (im.tagName === "VIDEO" ? im.readyState < 2 : (!im.complete || !im.naturalWidth)) return;
        // Wait until the scroll reveal has settled, otherwise the canvas (drawn at
        // scale 1) would jump against the still-zoomed image.
        if (getComputedStyle(im).transform !== "none") return;
        attach(el);
        const p = toLocal(e);
        mouse = { x: p.x, y: p.y, vx: 0, vy: 0, has: true };
      });
      el.addEventListener("mousemove", (e) => {
        if (card !== el) return;
        const p = toLocal(e);
        mouse.vx += p.x - mouse.x;
        mouse.vy += p.y - mouse.y;
        mouse.x = p.x;
        mouse.y = p.y;
        mouse.has = true;
      });
      el.addEventListener("mouseleave", () => { if (card === el) mouse.has = false; });
    });
    addEventListener("resize", () => { if (card) resize(); });
  }
}

/* ---------- Project videos: play only while visible ---------- */
{
  const vids = document.querySelectorAll("video[data-src]");
  const vio = new IntersectionObserver((entries) => entries.forEach((en) => {
    const v = en.target;
    // On phones the Works preview plays only its focused video (see the Works scroller).
    if (v.closest(".wk-img") && matchMedia("(max-width: 809px)").matches) return;
    if (en.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src; v.preload = "auto"; }
      if (!reducedMotion) v.play().catch(() => {});
    } else if (!v.paused) v.pause();
  }), { rootMargin: "200px 0px" });
  vids.forEach((v) => vio.observe(v));
}

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }),
  { rootMargin: "0px 0px -10% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
