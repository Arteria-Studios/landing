/* ---------- About hero: procedural liquid silk (WebGL) ----------
   Folds of red silk flowing diagonally, built from domain-warped fractal noise:
   deep maroon valleys, bright red ridges and thin white highlights where the
   light catches a crest. The pointer gently presses into the fabric, and the
   whole surface breathes on the page's shared heartbeat. Rendered at reduced
   resolution (smooth fabric needs no fine detail); film grain is a CSS overlay.
   With reduced motion a single still frame is drawn. */
(() => {
  const canvas = document.querySelector("[data-silk]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) { canvas.classList.add("is-fallback"); return; }

  const vs = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;      // 0..1, y up
    uniform float uPress;     // pointer presence 0..1
    uniform float uBeat;      // heartbeat 0..1

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      vec2 p = vec2(uv.x * aspect, uv.y);

      // The pointer presses a soft dent into the fabric.
      vec2 m = vec2(uMouse.x * aspect, uMouse.y);
      vec2 dm = p - m;
      p += dm * exp(-dot(dm, dm) * 6.0) * 0.18 * uPress;

      // Fabric runs diagonally, lower-left to upper-right. Stretching the space
      // along the fold direction makes long, smooth folds instead of smoke.
      vec2 q = mat2(0.86, 0.5, -0.5, 0.86) * p;
      q *= vec2(0.38, 1.05);
      float t = uTime * (0.05 + uBeat * 0.015);

      // Gentle domain warping: enough to bend the folds, not enough to swirl.
      vec2 w1 = vec2(fbm(q * 0.9 + vec2(0.0, t)), fbm(q * 0.9 + vec2(5.2, 1.3) - t));
      vec2 w2 = vec2(fbm(q + 1.1 * w1 + vec2(1.7, 9.2) + t * 0.7),
                     fbm(q + 1.1 * w1 + vec2(8.3, 2.8) - t * 0.5));
      float f = fbm(q + 1.2 * w2);

      // Silk folds: broad bands bent by the warp. The slope of the band tells
      // where the fabric faces the light, which gives soft sheen, not hard lines.
      float phase = q.y * 3.3 + f * 4.2 + w2.x * 1.6 - t * 2.2;
      float bands = sin(phase);
      float facing = 0.5 + 0.5 * cos(phase - 0.9);
      float sheen = pow(facing, 4.0) * smoothstep(0.28, 0.7, f);
      float glint = pow(facing, 9.0) * smoothstep(0.36, 0.72, f);

      vec3 deep  = vec3(0.06, 0.0, 0.01);
      vec3 wine  = vec3(0.28, 0.0, 0.03);
      vec3 red   = vec3(0.74, 0.03, 0.05);
      vec3 flame = vec3(0.98, 0.14, 0.09);
      vec3 col = mix(deep, wine, smoothstep(0.18, 0.55, f));
      col = mix(col, red, smoothstep(-0.3, 0.95, bands) * 0.9);
      col *= 0.55 + 0.45 * smoothstep(-1.0, 0.2, bands);   // shadowed valleys between folds
      col = mix(col, flame, sheen * 0.85);
      // Pale light catching the silk, stronger towards the right like the reference.
      col += vec3(1.0, 0.86, 0.84) * glint * smoothstep(0.1, 1.0, uv.x) * (0.85 + 0.3 * uBeat);

      // The heartbeat warms the whole surface a touch.
      col *= 0.92 + 0.12 * uBeat;
      // Keep the left side darker so the copy stays readable.
      col *= mix(0.68, 1.0, smoothstep(0.0, 0.7, uv.x));
      gl_FragColor = vec4(col, 1.0);
    }`;

  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add("is-fallback"); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uTime = U("uTime"), uMouse = U("uMouse"), uPress = U("uPress"), uBeat = U("uBeat");

  const SCALE = 0.5;   // render at half resolution; CSS scales it up smoothly
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * SCALE));
    canvas.height = Math.max(1, Math.round(r.height * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  new ResizeObserver(fit).observe(canvas);
  fit();

  const mouse = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, press: 0, in: false };
  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = 1 - (e.clientY - r.top) / r.height;
    mouse.in = mouse.tx >= 0 && mouse.tx <= 1 && mouse.ty >= 0 && mouse.ty <= 1;
  }, { passive: true });

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true, raf = 0, last = 0, time = 12;
  const frame = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    mouse.press += ((mouse.in ? 1 : 0) - mouse.press) * 0.05;
    gl.uniform1f(uTime, time);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uPress, mouse.press);
    gl.uniform1f(uBeat, typeof heartbeat === "function" && !still ? heartbeat() : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = visible && !still ? requestAnimationFrame(frame) : 0;
  };
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(canvas);
  raf = requestAnimationFrame(frame);
})();
