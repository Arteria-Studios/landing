/* ---------- Services bento: procedural animated icons ----------
   Each tile has a <canvas data-icon="..."> drawn every frame by one of the
   functions below. Only tiles on screen animate; hovering a tile speeds its icon
   up a little. With reduced motion, each icon is drawn once as a still. */
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-icon]")];
  if (!canvases.length) return;

  const RED = "#ff3b2a";
  const red = (a) => `rgba(255, 59, 42, ${a})`;
  const white = (a) => `rgba(255, 255, 255, ${a})`;
  const TAU = Math.PI * 2;

  /* Each icon: (ctx, w, h, t) with t in seconds. */
  const ICONS = {
    // Radar: rings, a sweeping beam and targets that light up as it passes.
    strategy(c, w, h, t) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
      c.lineWidth = 1;
      for (let i = 1; i <= 3; i++) { c.strokeStyle = white(0.12); c.beginPath(); c.arc(cx, cy, R * i / 3, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy); c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
      const a = t * 1.3;
      for (let k = 0; k < 18; k++) {
        const b = a - k * 0.035;
        c.strokeStyle = red(0.5 * (1 - k / 18));
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(b) * R, cy + Math.sin(b) * R); c.stroke();
      }
      [[0.6, 0.8], [0.35, 2.6], [0.8, 4.3], [0.5, 5.5]].forEach(([d, ang]) => {
        const diff = ((a - ang) % TAU + TAU) % TAU;
        const glow = Math.exp(-diff * 1.4);
        c.fillStyle = red(0.25 + 0.75 * glow);
        c.beginPath(); c.arc(cx + Math.cos(ang) * R * d, cy + Math.sin(ang) * R * d, 2.5 + glow * 3, 0, TAU); c.fill();
      });
    },

    // Mark: arcs on three orbits turning at different speeds around a pulsing core.
    branding(c, w, h, t) {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42;
      c.lineCap = "round";
      [[1, 0.6, 1.1, 3], [0.72, -0.9, 1.8, 2.5], [0.46, 1.4, 2.6, 2]].forEach(([r, sp, len, lw], i) => {
        c.strokeStyle = i === 0 ? RED : white(0.75 - i * 0.2);
        c.lineWidth = lw;
        const s = t * sp + i;
        c.beginPath(); c.arc(cx, cy, R * r, s, s + len); c.stroke();
        c.strokeStyle = white(0.08); c.lineWidth = 1;
        c.beginPath(); c.arc(cx, cy, R * r, 0, TAU); c.stroke();
      });
      const p = 1 + 0.12 * Math.sin(t * 2.4);
      c.fillStyle = RED;
      c.beginPath(); c.arc(cx, cy, R * 0.16 * p, 0, TAU); c.fill();
      const o = t * 0.6;
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(cx + Math.cos(o) * R, cy + Math.sin(o) * R, 3, 0, TAU); c.fill();
    },

    // Pen tool: a bezier whose handles drift, with anchors and control points shown.
    design(c, w, h, t) {
      const p0 = [w * 0.1, h * 0.72], p3 = [w * 0.9, h * 0.3];
      const p1 = [w * (0.32 + 0.08 * Math.sin(t * 0.9)), h * (0.1 + 0.18 * Math.sin(t * 1.3))];
      const p2 = [w * (0.62 + 0.08 * Math.cos(t * 1.1)), h * (0.92 - 0.2 * Math.sin(t * 1.7 + 1))];
      c.strokeStyle = white(0.35); c.lineWidth = 1;
      c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.moveTo(...p3); c.lineTo(...p2); c.stroke();
      c.strokeStyle = RED; c.lineWidth = 3; c.lineCap = "round";
      c.beginPath(); c.moveTo(...p0); c.bezierCurveTo(...p1, ...p2, ...p3); c.stroke();
      c.fillStyle = "#fff";
      [p1, p2].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 3.5, 0, TAU); c.fill(); });
      c.fillStyle = "#0c0c0c"; c.strokeStyle = "#fff"; c.lineWidth = 1.5;
      [p0, p3].forEach(([x, y]) => { c.fillRect(x - 4.5, y - 4.5, 9, 9); c.strokeRect(x - 4.5, y - 4.5, 9, 9); });
    },

    // A wireframe cube turning in 3D with a red leading edge.
    motion(c, w, h, t) {
      const cx = w / 2, cy = h / 2, S = Math.min(w, h) * 0.24;
      const ay = t * 0.8, ax = 0.55 + Math.sin(t * 0.5) * 0.3;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        let x = i & 1 ? 1 : -1, y = i & 2 ? 1 : -1, z = i & 4 ? 1 : -1;
        [x, z] = [x * Math.cos(ay) - z * Math.sin(ay), x * Math.sin(ay) + z * Math.cos(ay)];
        [y, z] = [y * Math.cos(ax) - z * Math.sin(ax), y * Math.sin(ax) + z * Math.cos(ax)];
        const k = 3.2 / (3.2 + z);
        pts.push([cx + x * S * k, cy + y * S * k, z]);
      }
      const edges = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
      edges.forEach(([a, b], i) => {
        const depth = (pts[a][2] + pts[b][2]) / 2;
        c.strokeStyle = i === 0 ? RED : white(0.3 + 0.4 * (1 - (depth + 1) / 2));
        c.lineWidth = i === 0 ? 2.5 : 1.5;
        c.beginPath(); c.moveTo(pts[a][0], pts[a][1]); c.lineTo(pts[b][0], pts[b][1]); c.stroke();
      });
      pts.forEach(([x, y]) => { c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); });
    },

    // Stacked screens floating apart and back, drawn in isometric.
    product(c, w, h, t) {
      const cx = w / 2, cy = h * 0.56, S = Math.min(w, h) * 0.3;
      const spread = 0.5 + 0.5 * Math.sin(t * 1.1);
      for (let i = 2; i >= 0; i--) {
        const y = cy - i * (S * 0.28 + spread * S * 0.22);
        c.save();
        c.translate(cx, y);
        c.scale(1, 0.55);
        c.rotate(Math.PI / 4);
        c.fillStyle = i === 0 ? red(0.9) : `rgba(22, 22, 22, 0.92)`;
        c.strokeStyle = i === 0 ? RED : white(0.45);
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(-S / 2, -S / 2, S, S, 6);
        c.fill(); c.stroke();
        c.restore();
      }
    },

    // Code being typed: indented lines grow, a cursor blinks at the end.
    development(c, w, h, t) {
      const lines = [[0, 0.55], [1, 0.4], [2, 0.5], [2, 0.3], [1, 0.2], [0, 0.35]];
      const x0 = w * 0.12, lh = h * 0.12, y0 = h * 0.18, unit = w * 0.1;
      const cycle = 5.5, prog = (t % cycle) / cycle * (lines.length + 1.5);
      c.lineCap = "round"; c.lineWidth = Math.max(3, h * 0.045);
      lines.forEach(([ind, len], i) => {
        const f = Math.max(0, Math.min(1, prog - i));
        if (!f) return;
        const x = x0 + ind * unit, y = y0 + i * lh * 1.25, L = len * w * 0.75 * f;
        c.strokeStyle = i % 3 === 0 ? RED : white(0.55);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
        if (f < 1 || i === lines.length - 1) {
          if (Math.sin(t * 8) > 0 || f < 1) { c.fillStyle = "#fff"; c.fillRect(x + L + 6, y - lh * 0.35, 2, lh * 0.7); }
        }
      });
    },

    // Broadcast rings from a source, plus a small chart climbing on the right.
    promotion(c, w, h, t) {
      const sx = w * 0.22, sy = h * 0.55, R = Math.min(w * 0.5, h) * 0.45;
      for (let i = 0; i < 4; i++) {
        const f = (t * 0.45 + i / 4) % 1;
        c.strokeStyle = red(0.9 * (1 - f)); c.lineWidth = 2;
        c.beginPath(); c.arc(sx, sy, 6 + f * R, -Math.PI * 0.35, Math.PI * 0.35); c.stroke();
      }
      c.fillStyle = RED; c.beginPath(); c.arc(sx, sy, 5, 0, TAU); c.fill();
      const bars = 6, bw = w * 0.045, gx = w * 0.56, base = h * 0.82;
      for (let i = 0; i < bars; i++) {
        const v = 0.25 + i * 0.12 + 0.08 * Math.sin(t * 1.6 + i);
        c.fillStyle = i === bars - 1 ? RED : white(0.18 + i * 0.07);
        c.beginPath(); c.roundRect(gx + i * bw * 1.5, base - v * h * 0.7, bw, v * h * 0.7, 3); c.fill();
      }
    },

    // A small neural net: layers of nodes, signals travelling along the links.
    ai(c, w, h, t) {
      const layers = [3, 5, 5, 3, 1];
      const nodes = layers.map((n, li) => Array.from({ length: n }, (_, i) => [
        w * (0.1 + 0.8 * li / (layers.length - 1)),
        h * (0.5 + (i - (n - 1) / 2) * Math.min(0.18, 0.8 / n)) + Math.sin(t * 0.8 + li + i) * 3,
      ]));
      c.lineWidth = 1;
      for (let li = 0; li < nodes.length - 1; li++) {
        nodes[li].forEach((a, i) => nodes[li + 1].forEach((b, j) => {
          c.strokeStyle = white(0.07);
          c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
          // A pulse on some links, staggered so signals ripple through the net.
          const seed = (li * 7 + i * 3 + j * 5) % 11;
          if (seed > 5) return;
          const f = (t * 0.55 + seed / 6 + li * 0.18) % 1;
          const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
          c.strokeStyle = red(0.55);
          c.beginPath(); c.moveTo(x - (b[0] - a[0]) * 0.12, y - (b[1] - a[1]) * 0.12); c.lineTo(x, y); c.stroke();
          c.fillStyle = RED; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill();
        }));
      }
      nodes.forEach((layer, li) => layer.forEach(([x, y], i) => {
        const glow = 0.5 + 0.5 * Math.sin(t * 2 - li * 0.9 + i);
        const last = li === nodes.length - 1;
        c.fillStyle = last ? RED : "#0c0c0c";
        c.strokeStyle = last ? RED : white(0.35 + 0.5 * glow);
        c.lineWidth = 1.5;
        c.beginPath(); c.arc(x, y, last ? 9 + glow * 3 : 5, 0, TAU); c.fill(); c.stroke();
        if (last) { c.fillStyle = red(0.18); c.beginPath(); c.arc(x, y, 22 + glow * 8, 0, TAU); c.fill(); }
      }));
    },
  };

  /* Canvas sizing at device resolution. */
  const items = canvases.map((cv) => ({ cv, ctx: cv.getContext("2d"), draw: ICONS[cv.dataset.icon], w: 0, h: 0, on: false, speed: 1, t: Math.random() * 10 }));
  const fit = (it) => {
    const r = it.cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    it.w = r.width; it.h = r.height;
    it.cv.width = Math.max(1, Math.round(r.width * dpr));
    it.cv.height = Math.max(1, Math.round(r.height * dpr));
    it.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const paint = (it) => { if (!it.draw || !it.w) return; it.ctx.clearRect(0, 0, it.w, it.h); it.draw(it.ctx, it.w, it.h, it.t); };

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
    tile.addEventListener("mouseenter", () => { it.target = 2.2; });
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
      // Each heartbeat reaching the tile gives its icon a short push forward.
      it.tile = it.tile || it.cv.closest(".bento-tile");
      it.t += dt * it.speed * (1 + 1.6 * (it.tile._beat || 0));
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
