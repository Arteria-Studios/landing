/* ---------- Footer wordmark: liquid, heat and heartbeat (WebGL) ----------
   The giant "ArteriaStudios" is drawn into a texture and shown through a
   fragment shader:
   - liquid smear: the pointer pushes cells of a small displacement grid along
     its velocity; the grid relaxes back, so letters flow and then settle;
   - heat: around the pointer the letters warm from white to a red-orange
     gradient, with a slight chromatic split where they are being pushed;
   - heartbeat: on every beat a soft band of light sweeps left to right across
     the word and the letters ripple a touch, in the page's shared rhythm.
   Without WebGL, or with reduced motion, the plain CSS wordmark stays. */
(() => {
  const host = document.querySelector(".foot-mark");
  if (!host || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "foot-mark-gl";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return;

  const GRID_X = 64, GRID_Y = 16;   // displacement grid, roughly the word's aspect
  const RADIUS = 0.12;              // brush size (in word widths)
  const RELAX = 0.93;               // how fast the smear settles

  const vs = `
    attribute vec2 p;
    varying vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision mediump float;
    uniform sampler2D uText, uGrid;
    uniform vec2 uMouse;          // pointer in uv (y down), <0 when away
    uniform float uHeat;          // 0..1, pointer presence
    uniform float uBeat;          // heartbeat 0..1
    uniform float uSweep;         // 0..1 position of the beat's light band
    uniform float uAspect;        // width / height of the canvas
    varying vec2 vUv;
    void main() {
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      vec2 off = (texture2D(uGrid, uv).rg - 0.5) * 2.0 * 0.035;
      // A small ripple rides the heartbeat's light band.
      float band = exp(-pow((uv.x - uSweep) * 7.0, 2.0)) * uBeat;
      off.y += sin(uv.x * 40.0 - uSweep * 30.0) * 0.004 * band;
      float split = length(off) * 0.22 + 0.0008;
      float r = texture2D(uText, uv - off * 1.0 - vec2(split, 0.0)).a;
      float g = texture2D(uText, uv - off * 0.9).a;
      float b = texture2D(uText, uv - off * 0.8 + vec2(split, 0.0)).a;
      float a = max(g, r * 0.85);
      // Heat around the pointer: white → orange → red.
      vec2 d = (uv - uMouse) * vec2(uAspect, 1.0);
      float heat = exp(-dot(d, d) * 5.5) * uHeat;
      vec3 hot = mix(vec3(1.0, 0.54, 0.24), vec3(1.0, 0.23, 0.16), smoothstep(0.2, 0.9, heat));
      vec3 base = vec3(0.92);
      vec3 col = mix(base, hot, smoothstep(0.05, 0.7, heat));
      // Warm fringe where the letters are pushed: the red channel trails a little,
      // blue is dropped slightly, so the split reads as heat, not a rainbow.
      col = vec3(col.r * max(g, r), col.g * g, col.b * min(g, b));
      // The beat's light band.
      col += vec3(1.0, 0.45, 0.35) * band * 0.55;
      gl_FragColor = vec4(col * a, a);
    }`;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = (unit, filter) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const textTex = tex(0, gl.LINEAR);
  const gridTex = tex(1, gl.LINEAR);
  const U = (n) => gl.getUniformLocation(prog, n);
  gl.uniform1i(U("uText"), 0);
  gl.uniform1i(U("uGrid"), 1);
  const uMouse = U("uMouse"), uHeat = U("uHeat"), uBeat = U("uBeat"), uSweep = U("uSweep"), uAspect = U("uAspect");
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---------- Text texture, drawn to match the CSS wordmark ---------- */
  const paper = document.createElement("canvas");
  const pctx = paper.getContext("2d");
  let W = 1, H = 1;
  const layout = () => {
    const r = host.getBoundingClientRect();
    const cs = getComputedStyle(host);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = paper.width = Math.max(1, Math.round(W * dpr));
    canvas.height = paper.height = Math.max(1, Math.round(H * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(uAspect, W / H);

    const fontPx = parseFloat(cs.fontSize) * dpr;
    pctx.clearRect(0, 0, paper.width, paper.height);
    pctx.fillStyle = "#fff";
    pctx.textBaseline = "alphabetic";
    pctx.font = `${cs.fontWeight} ${fontPx}px ${cs.fontFamily}`;
    if ("letterSpacing" in pctx) pctx.letterSpacing = `${parseFloat(cs.letterSpacing) * dpr || -0.06 * fontPx}px`;
    // line-height 1: the alphabetic baseline sits at about 0.8 of the line.
    pctx.fillText(host.dataset.text, 0, fontPx * 0.8);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paper);
  };

  /* ---------- Displacement grid ---------- */
  const field = new Float32Array(GRID_X * GRID_Y * 2);
  const bytes = new Uint8Array(GRID_X * GRID_Y * 4);
  const pointer = { x: -1, y: -1, vx: 0, vy: 0, in: false, heat: 0 };

  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const inside = x > -0.05 && x < 1.05 && y > -0.3 && y < 1.3;
    if (inside && pointer.in) { pointer.vx += x - pointer.x; pointer.vy += y - pointer.y; }
    pointer.x = x; pointer.y = y; pointer.in = inside;
  };
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerdown", onMove, { passive: true });

  let visible = false, raf = 0;
  const frame = () => {
    // Push cells near the pointer along its motion, then let everything relax.
    if (pointer.in && (pointer.vx || pointer.vy)) {
      const aspect = W / H;
      for (let j = 0; j < GRID_Y; j++) {
        for (let i = 0; i < GRID_X; i++) {
          const dx = ((i + 0.5) / GRID_X - pointer.x) * aspect;
          const dy = (j + 0.5) / GRID_Y - pointer.y;
          const d = Math.sqrt(dx * dx + dy * dy) / aspect;
          if (d < RADIUS) {
            const k = (1 - d / RADIUS) * 5;
            const n = (j * GRID_X + i) * 2;
            field[n] += pointer.vx * k;
            field[n + 1] += pointer.vy * k * 0.6;
          }
        }
      }
      pointer.vx = pointer.vy = 0;
    }
    for (let n = 0, b = 0; n < field.length; n += 2, b += 4) {
      field[n] = Math.max(-1, Math.min(1, field[n] * RELAX));
      field[n + 1] = Math.max(-1, Math.min(1, field[n + 1] * RELAX));
      bytes[b] = (field[n] * 0.5 + 0.5) * 255;
      bytes[b + 1] = (field[n + 1] * 0.5 + 0.5) * 255;
    }
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, gridTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GRID_X, GRID_Y, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);

    pointer.heat += ((pointer.in ? 1 : 0) - pointer.heat) * 0.08;
    const beat = typeof heartbeat === "function" ? heartbeat() : 0;
    // The light band travels across the word during the first part of each beat.
    const phase = window.Pulse ? window.Pulse.phase(0) : ((performance.now() / 1000) / (60 / 54)) % 1;
    gl.uniform2f(uMouse, pointer.x, pointer.y);
    gl.uniform1f(uHeat, pointer.heat);
    gl.uniform1f(uBeat, Math.min(1, beat * 1.2));
    gl.uniform1f(uSweep, -0.2 + phase * 2.4);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    host.dataset.text = host.textContent.trim();
    host.classList.add("is-gl");
    host.appendChild(canvas);
    layout();
    new ResizeObserver(layout).observe(host);
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(host);
  };
  // Draw the texture only once the web font is ready, so the shapes match.
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
