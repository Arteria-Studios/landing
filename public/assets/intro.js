/* ---------- Intro: ECG preloader ----------
   A few fine strands of light open outwards from the centre and breathe softly.
   On the page's shared heartbeat (pulse.js) they give a double beat — built from
   smooth curves, not a jagged trace — and a fast echo ripple runs out from the
   peak along the line and dies away. The canvas keeps a phosphor afterglow, so
   every movement leaves a fading trail, and the whole pattern drifts so slowly
   it is barely noticed. Then the strands settle into one line and the screen
   opens from it onto the hero. Plays once per session; click, tap or key skips. */
(() => {
  const root = document.documentElement;
  const ov = document.querySelector(".intro-overlay");
  if (!ov) return;
  if (!root.classList.contains("intro")) { ov.remove(); return; }

  const cv = ov.querySelector(".intro-ecg");
  const ctx = cv.getContext("2d");
  const flash = ov.querySelector(".intro-flash");

  let W = 0, H = 0, k = 1;
  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.min(1.3, Math.max(0.75, H / 900));   // amplitude follows screen height
  };
  fit();
  addEventListener("resize", fit);

  /* ---------- Timing: the heart starts when the hero is really ready ----------
     Ready = web fonts loaded + the WebGL artery has drawn its first frame
     (wormhole.js fires "hero-ready"). Until then the line just breathes. Once
     ready, the beat lands on the next shared heartbeat (pulse.js), at least ~1.1s
     in so the line is seen first. A slow connection never blocks: after
     MAX_WAIT the intro opens anyway. */
  const P = window.Pulse;
  const period = P ? P.PERIOD : 60 / 54;
  const MAX_WAIT = 6000;
  const t0 = performance.now();
  let T_BEAT = Infinity;               // seconds from start to the first beat's peak
  let T_SETTLE = Infinity;             // strands merge into one line
  let T_OPEN = Infinity;               // screen opens

  const bpm = ov.querySelector(".intro-bpm");
  const bpmText = bpm && bpm.lastChild;
  if (bpmText) bpmText.textContent = "— BPM";

  const heroReady = new Promise((res) => {
    if (window.__heroReady) res();
    else addEventListener("hero-ready", res, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((res) => setTimeout(res, MAX_WAIT));

  Promise.race([Promise.all([heroReady, fontsReady]), timeout]).then(() => {
    const t = (performance.now() - t0) / 1000;
    const phase = P ? P.phase(0) : (t / period) % 1;
    let beatAt = t + (1 - phase + 0.08) * period;        // next heartbeat peak
    if (beatAt - period > t + 0.05) beatAt -= period;    // it may already be coming up
    while (beatAt < 1.1) beatAt += period;
    T_BEAT = beatAt;
    T_SETTLE = T_BEAT + 1.05;
    T_OPEN = T_SETTLE + 0.35;
    if (bpmText) bpmText.textContent = "54 BPM";          // the heart starts
    bpm?.classList.add("is-live");
  });

  /* ---------- Waveform ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (v) => 1 - Math.pow(1 - clamp01(v), 3);
  // One heart contraction: quick smooth rise, slower fall.
  const beatEnv = (tau) => (tau <= 0 ? 0 : (1 - Math.exp(-tau / 0.03)) * Math.exp(-tau / 0.2));

  // Vertical offset of the line at distance u (px) from the centre, tau seconds after the beat.
  const shape = (u, tau) => {
    const lub = beatEnv(tau + 0.03);
    const dub = 0.55 * beatEnv(tau - 0.16 * period);
    const s = lub + dub;
    // The complex: a tall smooth peak, a soft dip just after it, a gentle swell before.
    let y = -Math.exp(-((u / 16) ** 2)) * 118 * k * s
          + Math.exp(-(((u - 26) / 20) ** 2)) * 34 * k * s
          - Math.exp(-(((u + 60) / 26) ** 2)) * 12 * k * s;
    // Echo: a fast ripple that runs outwards from the peak and fades.
    if (tau > 0) {
      const au = Math.abs(u);
      const front = 1100 * tau;                               // how far the echo has travelled
      const inside = clamp01((front - au + 60) / 120);        // soft leading edge
      y += Math.sin(au * 0.05 - tau * 30) * 24 * k
         * Math.exp(-au / (220 + front * 0.4)) * Math.exp(-tau / 0.5) * inside;
    }
    return y;
  };

  // Strands: the lead line plus fainter echoes, each a touch later and offset.
  const STRANDS = [
    { delay: 0.000, dy: 0.0, a: 1.00, w: 1.6 },
    { delay: 0.030, dy: 1.6, a: 0.45, w: 1.0 },
    { delay: 0.060, dy: -1.8, a: 0.30, w: 1.0 },
    { delay: 0.095, dy: 3.2, a: 0.18, w: 0.8 },
    { delay: 0.135, dy: -3.6, a: 0.10, w: 0.8 },
  ];

  let flashed = false, raf = 0, finished = false;

  const frame = (now) => {
    const t = (now - t0) / 1000;
    const tau = t - T_BEAT;

    // Phosphor afterglow: fade the previous frame instead of clearing it.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, W, H);

    const drift = (t - 1.5) * W * 0.012;                 // barely noticeable travel
    const cx = W / 2 + drift, cy = H / 2;
    const reveal = ease(t / 1.0) * (W * 0.62);          // strands open out from the centre
    const settle = ease((t - T_SETTLE) / 0.35);          // 0 → 1: merge into one calm line
    const breath = (x) => Math.sin(x * 0.009 + t * 1.3) * 2.2 * k + Math.sin(x * 0.021 - t * 0.8) * 1.2 * k;

    // Brightness follows the beat: the line glows warmer and whiter at the peak.
    const energy = beatEnv(tau + 0.03) + 0.55 * beatEnv(tau - 0.16 * period);
    ctx.globalCompositeOperation = "lighter";
    STRANDS.forEach((st, i) => {
      const g = ctx.createLinearGradient(cx - reveal, 0, cx + reveal, 0);
      const core = `rgba(255, ${Math.round(90 + 130 * energy)}, ${Math.round(70 + 120 * energy)}, ${st.a})`;
      g.addColorStop(0, "rgba(255, 59, 42, 0)");
      g.addColorStop(0.3, `rgba(255, 59, 42, ${st.a * 0.7})`);
      g.addColorStop(0.5, core);
      g.addColorStop(0.7, `rgba(255, 59, 42, ${st.a * 0.7})`);
      g.addColorStop(1, "rgba(255, 59, 42, 0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = st.w;
      ctx.shadowColor = "rgba(255, 59, 42, 0.8)";
      ctx.shadowBlur = i === 0 ? 10 + 18 * energy : 0;
      ctx.beginPath();
      const amp = 1 - settle;
      const dy = st.dy * (1 - settle);
      for (let x = Math.max(0, cx - reveal); x <= Math.min(W, cx + reveal); x += 2) {
        const u = x - cx;
        const y = cy + dy + (shape(u, tau - st.delay) + breath(x + i * 40) * (1 - 0.6 * energy)) * amp;
        if (x === Math.max(0, cx - reveal)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    if (!flashed && tau > -0.1) {
      flashed = true;
      flash.animate([{ opacity: 0 }, { opacity: 0.8, offset: 0.15 }, { opacity: 0 }], { duration: 900, easing: "ease-out" });
    }
    if (t >= T_OPEN) { done(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  /* ---------- Hold the page still while the intro plays ---------- */
  const block = (e) => {
    const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
    if (e.type === "keydown" && !keys.includes(e.key)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  ["wheel", "touchmove", "keydown"].forEach((t) => addEventListener(t, block, { capture: true, passive: false }));

  /* ---------- Open ---------- */
  function done() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    ["wheel", "touchmove", "keydown"].forEach((t) => removeEventListener(t, block, { capture: true }));
    removeEventListener("resize", fit);
    try { sessionStorage.setItem("arteria-intro", "1"); } catch (e) {}
    ov.classList.add("open");
    // Hero entrance animations were paused behind the overlay; let them play now.
    root.classList.remove("intro");
    setTimeout(() => ov.remove(), 1300);
  }

  ov.addEventListener("click", done);
  ov.addEventListener("touchstart", done, { passive: true });
  addEventListener("keydown", (e) => { if (!finished && (e.key === "Escape" || e.key === "Enter")) done(); });
})();
