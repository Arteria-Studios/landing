/* ---------- 404: flatline ----------
   A flat red line across the page, like a monitor with no pulse. Every few
   seconds it gives one faint, hopeful blip and settles again. */
(() => {
  const cv = document.querySelector("[data-flatline]");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0;
  const fit = () => {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(fit).observe(cv);
  fit();

  const G = (x, m, s) => Math.exp(-(((x - m) / s) ** 2));
  const SPEED = 220;        // px per second the trace scrolls
  const EVERY = 4.2;        // seconds between blips

  const draw = (now) => {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);
    const cy = H * 0.8;              // below the text, so the blip never crosses the heading
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(255, 59, 42, 0)");
    g.addColorStop(0.25, "rgba(255, 59, 42, .55)");
    g.addColorStop(1, "rgba(255, 59, 42, 1)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = "rgba(255, 59, 42, .8)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const tx = t - (W - x) / SPEED;
      const dt = ((tx % EVERY) + EVERY) % EVERY;           // time since the last blip
      const y = cy - G(dt, 0.25, 0.03) * H * 0.18 + G(dt, 0.31, 0.04) * H * 0.05;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
