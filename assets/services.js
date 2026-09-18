/* ---------- Services bento: procedural animated icons ----------
   Each tile has a <canvas data-icon="..."> drawn every frame by one of the
   functions below. Only tiles on screen animate; hovering a tile speeds its icon
   up a little. With reduced motion, each icon is drawn once as a still. */
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-icon]")];
  if (!canvases.length) return;

  /* ---------- Icon design code ----------
     Every icon follows the same rules so the set reads as one family:
     - geometry on a 48-unit grid, live area ±20 units, scaled to the canvas;
     - one stroke weight (STROKE px) in two tones: INK for the main form,
       SOFT for construction and secondary lines; round caps and joins;
     - exactly one red accent per icon, the only element that reacts to the
       heartbeat (same swell for all);
     - one motion clock: a loop of four heartbeats, the same ease-in-out curve,
       so every icon moves at the same pace and settles at the same moments. */
  const STROKE = 1.5;                       // px, for every line in every icon
  const DOT = 2.25;                         // px, radius of small dots
  const INK = "rgba(255, 255, 255, 0.92)";
  const SOFT = "rgba(255, 255, 255, 0.28)";
  const RED = "#ff3b2a";
  const TAU = Math.PI * 2;
  const LOOP = 4 * (60 / 54);               // four heartbeats ≈ 4.44 s
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const wave = (u) => 0.5 - 0.5 * Math.cos(u * TAU);          // 0 → 1 → 0 over a loop, eased

  /* Drawing helpers: all shapes go through these, so weight and caps never drift. */
  const pen = (c, color = INK, alpha = 1) => {
    c.lineWidth = STROKE; c.lineCap = "round"; c.lineJoin = "round";
    c.strokeStyle = color; c.globalAlpha = alpha;
  };
  const line = (c, pts, color, alpha) => {
    pen(c, color, alpha); c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke(); c.globalAlpha = 1;
  };
  const ring = (c, x, y, r, color, alpha, a0 = 0, a1 = TAU) => {
    pen(c, color, alpha); c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); c.globalAlpha = 1;
  };
  const dot = (c, x, y, r = DOT, color = INK, alpha = 1) => {
    c.globalAlpha = alpha; c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.globalAlpha = 1;
  };
  // The red accent: a dot that swells and glows on the heartbeat, identical everywhere.
  const accent = (c, x, y, beat, r = DOT * 1.35) => {
    c.save();
    c.shadowColor = "rgba(255, 59, 42, 0.9)";
    c.shadowBlur = 6 + 10 * beat;
    dot(c, x, y, r * (1 + 0.35 * beat), RED);
    c.restore();
  };
  // Unit box: maps the ±24 grid onto the canvas, centred.
  const box = (w, h) => {
    const s = Math.min(w, h) / 48;
    return { s, X: (u) => w / 2 + u * s, Y: (v) => h / 2 + v * s };
  };

  /* Each icon: (ctx, w, h, t, beat). u = position in the shared loop (0..1). */
  const ICONS = {
    // Strategy: a target; the red point homes in from the outer ring to the centre.
    strategy(c, w, h, t, beat) {
      const { s, X, Y } = box(w, h);
      const u = (t % LOOP) / LOOP;
      ring(c, X(0), Y(0), 20 * s, SOFT);
      ring(c, X(0), Y(0), 11 * s, INK);
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) =>
        line(c, [[X(dx * 15), Y(dy * 15)], [X(dx * 20), Y(dy * 20)]], INK));
      const k = ease(clamp01(u / 0.7));                     // approach, then hold on target
      const a = -2.4 + k * 1.6, r = 20 * (1 - k);
      accent(c, X(Math.cos(a) * r), Y(Math.sin(a) * r), beat);
    },

    // Branding: a mark; an inner arc turns once per loop, the red point leads it.
    branding(c, w, h, t, beat) {
      const { s, X, Y } = box(w, h);
      const u = (t % LOOP) / LOOP;
      ring(c, X(0), Y(0), 20 * s, INK);
      const a = -Math.PI / 2 + ease(u) * TAU;
      ring(c, X(0), Y(0), 11 * s, SOFT);
      ring(c, X(0), Y(0), 11 * s, INK, 1, a - Math.PI * 0.9, a);
      accent(c, X(Math.cos(a) * 11), Y(Math.sin(a) * 11), beat);
    },

    // Design: a pen-tool curve; the handles breathe, the red control point leads.
    design(c, w, h, t, beat) {
      const { s, X, Y } = box(w, h);
      const k = wave((t % LOOP) / LOOP);
      const p0 = [-18, 12], p3 = [18, -12];
      const p1 = [-8 + 4 * k, -16 + 10 * k], p2 = [8 - 4 * k, 16 - 10 * k];
      const P = ([x, y]) => [X(x), Y(y)];
      line(c, [P(p0), P(p1)], SOFT);
      line(c, [P(p3), P(p2)], SOFT);
      pen(c, INK); c.beginPath(); c.moveTo(...P(p0)); c.bezierCurveTo(...P(p1), ...P(p2), ...P(p3)); c.stroke();
      const sq = 2.75 * Math.max(1, s * 0.9);
      [p0, p3].forEach((p) => { const [x, y] = P(p); pen(c, INK); c.strokeRect(x - sq, y - sq, sq * 2, sq * 2); });
      dot(c, ...P(p1));
      accent(c, ...P(p2), beat);
    },

    // Product: three stacked screens in isometric; the stack opens and closes.
    product(c, w, h, t, beat) {
      const { X, Y } = box(w, h);
      const k = ease(wave((t % LOOP) / LOOP));
      const gap = 5 + 5 * k;
      const rhomb = (cy, color, alpha) => line(c, [[X(0), Y(cy - 9)], [X(18), Y(cy)], [X(0), Y(cy + 9)], [X(-18), Y(cy)], [X(0), Y(cy - 9)]], color, alpha);
      rhomb(gap, SOFT);
      rhomb(0, INK);
      rhomb(-gap, INK);
      accent(c, X(0), Y(-gap), beat);
    },

    // Development: code types itself in, line by line, behind a red caret.
    development(c, w, h, t, beat) {
      const { X, Y } = box(w, h);
      const u = (t % LOOP) / LOOP;
      const rows = [[0, 24], [6, 20], [6, 26], [0, 14]];     // indent, length (units)
      const typed = ease(clamp01(u / 0.75)) * rows.reduce((a, [, l]) => a + l, 0);
      const fade = 1 - clamp01((u - 0.9) / 0.1);           // clear before the next loop
      let left = typed, caret = null;
      rows.forEach(([ind, len], i) => {
        const y = -12 + i * 8, x0 = -18 + ind;
        const n = Math.max(0, Math.min(len, left));
        left -= len;
        line(c, [[X(x0), Y(y)], [X(x0 + len), Y(y)]], SOFT, 0.5 * fade);
        if (n > 0) line(c, [[X(x0), Y(y)], [X(x0 + n), Y(y)]], INK, fade);
        if (!caret && n < len) caret = [x0 + n, y];         // caret sits where typing is
      });
      caret = caret || [-18 + rows[3][1], 12];
      accent(c, X(caret[0] + 3), Y(caret[1]), beat);
    },

    // Motion & 3D: a wireframe cube turns a quarter per loop; one red vertex.
    motion(c, w, h, t, beat) {
      const { X, Y } = box(w, h);
      const u = (t % LOOP) / LOOP;
      const ay = Math.floor(t / LOOP) * (Math.PI / 2) + ease(u) * (Math.PI / 2) + 0.5;
      const ax = 0.55;
      const S = 11;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        let x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
        [x, z] = [x * Math.cos(ay) - z * Math.sin(ay), x * Math.sin(ay) + z * Math.cos(ay)];
        [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
        const p = 3.6 / (3.6 + z);
        pts.push([X(x * S * p), Y(y * S * p), z]);
      }
      const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      edges.forEach(([a, b]) => {
        const back = (pts[a][2] + pts[b][2]) / 2 > 0.2;
        line(c, [pts[a], pts[b]], back ? SOFT : INK);
      });
      const front = pts.reduce((m, p) => (p[2] < m[2] ? p : m));
      accent(c, front[0], front[1], beat);
    },

    // Promotion: a signal source sending three rings outward.
    promotion(c, w, h, t, beat) {
      const { s, X, Y } = box(w, h);
      const u = (t % LOOP) / LOOP;
      for (let i = 0; i < 3; i++) {
        const f = (u + i / 3) % 1;
        const r = (8 + ease(f) * 28) * s;
        ring(c, X(-14), Y(0), r, INK, 0.9 * (1 - f), -0.9, 0.9);
      }
      line(c, [[X(-14), Y(-14)], [X(-14), Y(14)]], SOFT);
      accent(c, X(-14), Y(0), beat);
    },

    // AI: a small neural net; signals travel layer by layer, the output beats red.
    ai(c, w, h, t, beat) {
      const pad = Math.min(w, h) * 0.12;
      const u = (t % LOOP) / LOOP;
      const layers = [3, 5, 5, 3, 1];
      const gapY = Math.min((h - pad * 2) / 5, 46);
      const nodes = layers.map((n, li) => Array.from({ length: n }, (_, i) => [
        pad + (w - pad * 2) * (li / (layers.length - 1)),
        h / 2 + (i - (n - 1) / 2) * gapY,
      ]));
      for (let li = 0; li < nodes.length - 1; li++) {
        nodes[li].forEach((a, i) => nodes[li + 1].forEach((b, j) => {
          line(c, [a, b], SOFT, 0.45);
          // One signal per link, released in waves: each layer fires a step later.
          if ((i * 7 + j * 3 + li) % 3) return;
          let f = u - li * 0.16 - ((i + j) % 3) * 0.04;
          f = (f - Math.floor(f)) / 0.45;                  // travel in the first part of the loop
          if (f >= 1) return;
          const e = ease(f);
          dot(c, a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, DOT, INK, 0.9);
        }));
      }
      nodes.forEach((layer, li) => layer.forEach(([x, y]) => {
        if (li === nodes.length - 1) return;
        c.fillStyle = "#0b0b0b";
        c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
        ring(c, x, y, 4.5, INK);
      }));
      const [ox, oy] = nodes[nodes.length - 1][0];
      ring(c, ox, oy, 11, SOFT);
      accent(c, ox, oy, beat, 5);
    },
  };

  /* Canvas sizing at device resolution. */
  const items = canvases.map((cv) => ({ cv, ctx: cv.getContext("2d"), draw: ICONS[cv.dataset.icon], tile: cv.closest(".bento-tile"), w: 0, h: 0, on: false, speed: 1, t: 0 }));
  const fit = (it) => {
    const r = it.cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    it.w = r.width; it.h = r.height;
    it.cv.width = Math.max(1, Math.round(r.width * dpr));
    it.cv.height = Math.max(1, Math.round(r.height * dpr));
    it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const paint = (it) => {
    if (!it.draw || !it.w) return;
    it.ctx.clearRect(0, 0, it.w, it.h);
    it.draw(it.ctx, it.w, it.h, it.t, it.tile ? it.tile._beat || 0 : 0);
  };

  const ro = new ResizeObserver((entries) => entries.forEach((en) => {
    const it = items.find((i) => i.cv === en.target);
    fit(it); paint(it);
  }));
  items.forEach((it) => { ro.observe(it.cv); fit(it); paint(it); });

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tiles fade in on scroll, one after another.
  const tiles = document.querySelectorAll(".bento-tile");
  const tileIO = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const i = [...tiles].indexOf(en.target);
    en.target.style.transitionDelay = `${(i % 4) * 0.08}s`;
    en.target.classList.add("in");
    tileIO.unobserve(en.target);
  }), { rootMargin: "0px 0px -8% 0px" });
  tiles.forEach((t) => tileIO.observe(t));
  if (still) { tiles.forEach((t) => t.classList.add("in")); return; }

  // Hover speeds the tile's icon up; only visible icons animate.
  items.forEach((it) => {
    const tile = it.cv.closest(".bento-tile");
    tile.addEventListener("mouseenter", () => { it.target = 1.6; });
    tile.addEventListener("mouseleave", () => { it.target = 1; });
  });
  const vis = new IntersectionObserver((entries) => entries.forEach((en) => {
    items.find((i) => i.cv === en.target).on = en.isIntersecting;
  }));
  items.forEach((it) => vis.observe(it.cv));

  let last = 0;
  const loop = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    for (const it of items) {
      if (!it.on) continue;
      it.speed += ((it.target || 1) - it.speed) * Math.min(1, dt * 4);
      // One clock for every icon; the heartbeat only swells each icon's red accent.
      it.t += dt * it.speed;
      paint(it);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

/* ---------- Services bento: explanatory popovers ----------
   Hovering (or focusing) any list item shows a short, plain explanation of it.
   One popover is reused: moving between items glides it to the next one instead
   of closing and reopening, so reading down a list feels continuous. */
(() => {
  const TIPS = {
    // AI
    "AI-based products": "Products built around AI from day one, from the idea and UX to a working launch.",
    "AI agents & automation": "Agents that finish multi-step tasks on their own: handle requests, update systems, run routine workflows.",
    "RAG pipelines": "AI that answers from your own knowledge base (documents, website, CRM) and cites sources instead of guessing.",
    "LLM integration": "Adding language models to products you already have: smart search, summaries, drafting, support.",
    "MCP & tool integrations": "Connecting AI to your services and data through the Model Context Protocol, so it can act, not just talk.",
    "Voice & chat assistants": "Assistants that talk to customers by voice or chat around the clock, in your brand's tone.",
    "AI-native UX": "Interfaces designed around AI: clear prompts, streaming answers, and controls that keep users confident.",
    "Evals & fine-tuning": "Measuring answer quality on real cases and tuning models until they're reliable for your task.",
    // Development
    "Websites": "Fast, responsive marketing sites and landing pages, built to convert and easy to update.",
    "Web apps": "Products that run in the browser, like dashboards, portals and SaaS, with a solid front and back end.",
    "iOS apps": "Native iPhone and iPad apps in Swift, ready for the App Store.",
    "Android apps": "Native Android apps in Kotlin, tuned for the wide range of Android devices.",
    "Cross-platform apps": "One codebase for iOS and Android (React Native or Flutter): faster to ship and kinder to the budget.",
    "Framer & Webflow": "Sites your team can edit without developers, with custom interactions where they matter.",
    "WebGL & interactive": "3D, shaders and interactive scenes in the browser, like the one at the top of this page.",
    "CMS integration": "A content system set up so your team can publish and update pages on their own.",
    // Design
    "UI/UX design": "Interfaces that are easy to use and pleasant to look at, from user flows to final screens.",
    "Web design": "Site design where structure, typography and motion tell your story.",
    "Presentations": "Pitch decks and sales presentations that make complex ideas easy to follow.",
    "Editorial design": "Layouts for magazines, reports and books, where type and rhythm do the work.",
    "Packaging": "Packaging that stands out on the shelf and carries the brand into people's hands.",
    "Illustration": "Custom illustrations that give the brand a visual voice of its own.",
    // Branding
    "Brand identity": "The full visual system (logo, colors, type, imagery) that makes a brand recognizable anywhere.",
    "Logo & symbol": "A distinctive mark that works everywhere, from an app icon to a billboard.",
    "Naming": "Names that are memorable and meaningful, and available as a domain and trademark.",
    "Tone of voice": "How the brand speaks: words and style that stay consistent across every channel.",
    "Brand guidelines": "A clear rulebook so any team or contractor applies the brand correctly.",
    // Product
    "Product discovery": "Working out what to build and why before any code: problems, users, hypotheses.",
    "UX research": "Interviews and tests with real users, so decisions rest on evidence, not opinions.",
    "Prototyping": "Clickable prototypes to test ideas quickly and cheaply before development starts.",
    "Design systems": "Reusable components and rules that keep a product consistent as it grows.",
    "Mobile apps": "Design for iOS and Android apps that feel native on each platform.",
    // Strategy
    "Research": "Studying your market, audience and trends so every decision is grounded.",
    "Brand audit": "An honest look at how your brand looks, sounds and performs today.",
    "Positioning": "Defining what makes you different, and why customers should choose you.",
    "Competitive analysis": "Mapping competitors' strengths and gaps to find where you can win.",
    "Roadmap": "A step-by-step plan with priorities, timing and measurable goals.",
    // Motion & 3D
    "Motion design": "Animation for interfaces, ads and brand videos that brings ideas to life.",
    "3D visualization": "Photorealistic or stylized 3D renders of products, spaces and concepts.",
    "Generative visuals": "Images and video made with AI and code, art-directed to fit the brand.",
    "Showreels": "Short, punchy videos that show off your work or product in about a minute.",
    // Promotion
    "Social media": "Strategy, content and design for your social channels.",
    "Advertising campaigns": "Campaign ideas and creatives for digital and offline advertising.",
    "Marketing materials": "Brochures, banners, merch: everything marketing needs, on brand.",
    "Content production": "Photo, video and copy produced for your channels on a regular schedule.",
    "SEO & analytics": "Getting found in search and measuring what works, so budget goes where it pays off.",
  };

  const items = [...document.querySelectorAll(".bento-tile li")].filter((li) => TIPS[li.textContent.trim()]);
  if (!items.length) return;

  const tip = document.createElement("div");
  tip.className = "svc-tip";
  tip.id = "svc-tip";
  tip.setAttribute("role", "tooltip");
  tip.innerHTML = `<strong></strong><p></p><i aria-hidden="true"></i>`;
  document.body.appendChild(tip);
  const tTitle = tip.querySelector("strong"), tText = tip.querySelector("p"), tArrow = tip.querySelector("i");

  let current = null, showTimer = 0, hideTimer = 0;

  const place = (li) => {
    const r = li.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight, m = 12;
    // Prefer above the item; flip below when there's no room.
    const above = r.top - th - m > 8;
    const y = above ? r.top - th - m : r.bottom + m;
    const x = Math.min(innerWidth - tw - 12, Math.max(12, r.left - 4));
    tip.style.setProperty("--x", `${Math.round(x)}px`);
    tip.style.setProperty("--y", `${Math.round(y)}px`);
    tip.dataset.side = above ? "top" : "bottom";
    // Arrow points at the start of the item's text.
    tArrow.style.left = `${Math.max(14, Math.min(tw - 22, r.left - x + 16))}px`;
  };

  const show = (li) => {
    clearTimeout(hideTimer);
    const open = tip.classList.contains("on");
    const go = () => {
      if (current && current !== li) current.removeAttribute("aria-describedby");
      current = li;
      li.setAttribute("aria-describedby", "svc-tip");
      tTitle.textContent = li.textContent.trim();
      tText.textContent = TIPS[li.textContent.trim()];
      // Glide from the previous item when already open; appear in place otherwise.
      tip.classList.remove("follow");
      tip.classList.toggle("glide", open);
      place(li);
      tip.classList.add("on");
    };
    clearTimeout(showTimer);
    // A short delay on first open keeps popovers from flashing as the mouse passes by.
    if (open) go(); else showTimer = setTimeout(go, 140);
  };

  const hide = (now) => {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    const done = () => {
      tip.classList.remove("on", "glide");
      if (current) current.removeAttribute("aria-describedby");
      current = null;
    };
    if (now) done(); else hideTimer = setTimeout(done, 120);
  };

  items.forEach((li) => {
    li.tabIndex = 0;
    li.addEventListener("mouseenter", () => show(li));
    li.addEventListener("mouseleave", () => hide());
    li.addEventListener("focus", () => show(li));
    li.addEventListener("blur", () => hide());
    // Touch: tap toggles the explanation.
    li.addEventListener("click", () => (current === li && tip.classList.contains("on") ? hide(true) : show(li)));
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") hide(true); });
  // On scroll the popover follows its item (layout shifts from lazy images also
  // fire scroll events), and closes only once the item leaves the screen.
  addEventListener("scroll", () => {
    if (!current) return;
    const r = current.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) hide(true);
    else { tip.classList.remove("glide"); tip.classList.add("follow"); place(current); }
  }, { passive: true });
  addEventListener("resize", () => { if (current) place(current); });
})();
