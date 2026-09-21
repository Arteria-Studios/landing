/* ---------- Around the world: wireframe map with heartbeat impulses (WebGL2) ----------
   The same language as the hero artery: continents are a barely visible wire
   mesh (rings, ribs and diagonals, like the vessel wall; built by
   scripts/build-world-mesh.py into world.bin), lines render into an offscreen
   buffer, get a blur pass for glow and are composited with a slight chromatic
   split and film grain.

   The map lies in 3D, tilted away from the viewer, and leans a little towards
   the cursor. A signal travels around the client cities along lifted arcs,
   leaving each city on the page's shared heartbeat (pulse.js); when it arrives,
   a ripple runs out through the mesh from that city. Two signals travel at
   once, half a loop apart. The cursor lights the wire mesh under it.
   Off screen nothing is drawn; with reduced motion a single still frame is. */
(() => {
  const root = document.querySelector("[data-world]");
  if (!root) return;
  const canvas = root.querySelector("canvas");
  const labelsEl = root.querySelector(".world-labels");
  const listItems = [...document.querySelectorAll("[data-city]")];
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) { root.classList.add("is-fallback"); return; }

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LITE = innerWidth < 810 || (navigator.hardwareConcurrency || 8) <= 4;
  const X_MAX = 2.75, Y_MAX = 1.45;          // projection bounds (scripts/build-world-mesh.py)
  const TILT = 34 * Math.PI / 180;           // map leans away from the viewer
  const FOV = 30 * Math.PI / 180;

  /* ---------- Cities (order = the signal's route around the world) ---------- */
  // side: where the label sits, so neighbours (Dubai/Doha, Almaty/Tashkent) don't collide.
  const CITIES = [
    { name: "New York", cc: "US", lat: 40.71, lon: -74.01, side: "l" },
    { name: "Berlin", cc: "DE", lat: 52.52, lon: 13.40, side: "l" },
    { name: "Tallinn", cc: "EE", lat: 59.44, lon: 24.75, side: "t" },
    { name: "Moscow", cc: "RU", lat: 55.76, lon: 37.62, side: "r" },
    { name: "Almaty", cc: "KZ", lat: 43.24, lon: 76.89, side: "r" },
    { name: "Tashkent", cc: "UZ", lat: 41.30, lon: 69.24, side: "l" },
    { name: "Dubai", cc: "AE", lat: 25.20, lon: 55.27, side: "r" },
    { name: "Doha", cc: "QA", lat: 25.29, lon: 51.53, side: "l" },
    { name: "Johannesburg", cc: "ZA", lat: -26.20, lon: 28.05, side: "r" },
    { name: "Buenos Aires", cc: "AR", lat: -34.60, lon: -58.38, side: "l" },
  ];
  const N = CITIES.length;

  // Natural Earth projection (same as the mesh builder), then onto the 3D plane.
  const project = (lon, lat) => {
    const l = lon * Math.PI / 180, p = lat * Math.PI / 180, p2 = p * p, p4 = p2 * p2;
    return [
      l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
      p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
    ];
  };
  // Map (x, y) -> world: x across, north goes away (-z); a gentle bowl gives depth.
  const toWorld = (x, y) => [x, -0.05 * x * x - 0.06 * y * y, -y];
  CITIES.forEach((c) => {
    const [x, y] = project(c.lon, c.lat);
    c.map = [x, y];
    c.pos = toWorld(x, y);
  });

  /* ---------- Shaders ---------- */
  const COMMON = `
    uniform mat4 uMVP;
    vec3 toWorld(vec2 m) { return vec3(m.x, -0.05 * m.x * m.x - 0.06 * m.y * m.y, -m.y); }`;

  // Mesh and coastline. Brightness: faint base, warmer near client cities,
  // ripples running out from cities, the cursor's light, and the reveal sweep.
  const meshVS = `#version 300 es
    in vec2 aP;                 // int16-normalised map position
    uniform vec2 uScale;
    uniform vec2 uCity[${N}];
    uniform float uAge[${N}];   // seconds since a ripple started at the city (large = none)
    uniform vec2 uCursor;       // cursor on the map (map units), far away when outside
    uniform float uReveal;      // 0..1 sweep west to east
    out float vI;
    out float vSweep;
    ${COMMON}
    void main() {
      vec2 m = aP * uScale;
      float near = 0.0, ring = 0.0;
      for (int i = 0; i < ${N}; i++) {
        float d = distance(m, uCity[i]);
        near += exp(-d * d * 90.0);
        float r = uAge[i] * 0.9;                                    // ripple radius
        float fade = exp(-uAge[i] * 1.35);
        ring += exp(-pow((d - r) * 9.0, 2.0)) * fade * smoothstep(0.0, 0.05, uAge[i]);
      }
      float c = distance(m, uCursor);
      float torch = exp(-c * c * 5.0);
      float sx = (m.x / ${X_MAX.toFixed(2)}) * 0.5 + 0.5;          // 0 west .. 1 east
      float edge = uReveal * 1.25 - 0.12;
      vSweep = exp(-pow((sx - edge) * 22.0, 2.0));
      vI = (1.0 + near * 0.9 + ring * 6.0 + torch * 3.0) * smoothstep(edge, edge - 0.08, sx);
      gl_Position = uMVP * vec4(toWorld(m), 1.0);
    }`;
  const meshFS = `#version 300 es
    precision highp float;
    in float vI;
    in float vSweep;
    uniform vec3 uColor;
    out vec4 o;
    void main() { o = vec4(uColor * vI + vec3(1.0, 0.45, 0.35) * vSweep * 0.5, 1.0); }`;

  // Arcs between cities: a faint path; the travelling signal is a hot head with a tail.
  const arcVS = `#version 300 es
    in vec4 aA;                 // x: t along arc 0..1, y: arc index, zw: unused
    uniform vec3 uFrom[${N}];
    uniform vec3 uTo[${N}];
    uniform float uHead[${N}];  // head position per arc (-1 = idle)
    uniform float uHead2[${N}];
    out float vI;
    ${COMMON}
    float glow(float t, float h) {
      if (h < 0.0) return 0.0;
      float ahead = t - h;
      return ahead > 0.0 ? exp(-ahead * ahead * 900.0) : exp(ahead * 7.0) * 0.8 + exp(-ahead * ahead * 900.0) * 0.4;
    }
    void main() {
      int k = int(aA.y + 0.5);
      vec3 a = uFrom[k], b = uTo[k];
      float t = aA.x;
      float len = distance(a.xz, b.xz);
      vec3 p = mix(a, b, t);
      p.y += sin(t * 3.14159265) * (0.08 + len * 0.16);           // lifted arc
      vI = 0.10 + glow(t, uHead[k]) + glow(t, uHead2[k]);
      gl_Position = uMVP * vec4(p, 1.0);
    }`;
  const arcFS = `#version 300 es
    precision highp float;
    in float vI;
    out vec4 o;
    void main() {
      vec3 col = mix(vec3(1.0, 0.24, 0.14), vec3(1.0, 0.86, 0.78), clamp(vI - 0.9, 0.0, 1.0));
      o = vec4(col * vI, 1.0);
    }`;

  // Points: cities (steady, beating) and signal heads.
  const pointVS = `#version 300 es
    in vec4 aQ;                 // xyz world, w: size factor (negative = head)
    uniform float uPx;
    out float vKind;
    out float vS;
    ${COMMON}
    void main() {
      vec4 c = uMVP * vec4(aQ.xyz, 1.0);
      vKind = aQ.w < 0.0 ? 1.0 : 0.0;
      vS = abs(aQ.w);
      gl_PointSize = clamp(vS * uPx / c.w, 2.0, 90.0);
      gl_Position = c;
    }`;
  const pointFS = `#version 300 es
    precision highp float;
    in float vKind;
    in float vS;
    out vec4 o;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float core = smoothstep(0.34, 0.0, d);
      float halo = exp(-d * d * 4.0) * 0.55;
      vec3 hot = vec3(1.0, 0.88, 0.8), red = vec3(1.0, 0.23, 0.14);
      vec3 col = hot * core * (vKind > 0.5 ? 1.6 : 1.1) + red * halo;
      o = vec4(col, 1.0);
    }`;

  const quadVS = `#version 300 es
    layout(location = 0) in vec2 p;
    out vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const blurFS = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2 uDir;
    out vec4 o;
    void main() {
      vec3 c = texture(uTex, vUv).rgb * 0.227;
      c += (texture(uTex, vUv + uDir * 1.38).rgb + texture(uTex, vUv - uDir * 1.38).rgb) * 0.316;
      c += (texture(uTex, vUv + uDir * 3.23).rgb + texture(uTex, vUv - uDir * 3.23).rgb) * 0.070;
      o = vec4(c, 1.0);
    }`;
  // Composite: dim crimson folds (the hero's fabric, much darker), lines with a
  // chromatic split, bloom, vignette into the page's black, film grain.
  const compFS = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uLines;
    uniform sampler2D uBloom;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uBeat;
    out vec4 o;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
      float n = noise(p * 1.8 + vec2(uTime * 0.03, -uTime * 0.02)) * 0.6 + noise(p * 4.1 - uTime * 0.02) * 0.4;
      float folds = 0.5 + 0.5 * sin((p.x * 1.2 - p.y) * 3.0 + n * 3.2 + uTime * 0.1);
      vec3 bg = mix(vec3(0.0), vec3(0.11, 0.0, 0.01), smoothstep(0.2, 1.0, folds * 0.6 + n * 0.5)) * (0.85 + 0.25 * uBeat);
      vec2 ca = (vUv - 0.5) * 0.004;
      vec3 lines = vec3(texture(uLines, vUv + ca).r, texture(uLines, vUv).g, texture(uLines, vUv - ca).b);
      vec3 bloom = texture(uBloom, vUv).rgb;
      vec3 col = bg + lines + bloom * vec3(1.6, 0.55, 0.4);
      // Fade to the page's black at the edges, so the stage has no border.
      vec2 e = smoothstep(vec2(0.0), vec2(0.12, 0.2), vUv) * smoothstep(vec2(0.0), vec2(0.12, 0.2), 1.0 - vUv);
      col *= e.x * e.y;
      col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.05 * e.x * e.y;
      o = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = (vs, fs) => {
    const pr = gl.createProgram();
    gl.attachShader(pr, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const u = {};
    const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(pr, i).name.replace(/\[0\]$/, "");
      u[name] = gl.getUniformLocation(pr, name);
    }
    return { pr, u };
  };

  let meshP, arcP, pointP, blurP, compP;
  try {
    meshP = program(meshVS, meshFS);
    arcP = program(arcVS, arcFS);
    pointP = program(pointVS, pointFS);
    blurP = program(quadVS, blurFS);
    compP = program(quadVS, compFS);
  } catch (err) {
    console.error(err);
    root.classList.add("is-fallback");
    return;
  }

  /* ---------- Geometry ---------- */
  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Arcs: route order, closing the loop (Buenos Aires -> New York).
  const ARC_SEG = 72;
  const arcData = new Float32Array(N * ARC_SEG * 2 * 4);
  for (let k = 0, o = 0; k < N; k++) {
    for (let s = 0; s < ARC_SEG; s++) {
      arcData.set([s / ARC_SEG, k, 0, 0, (s + 1) / ARC_SEG, k, 0, 0], o);
      o += 8;
    }
  }
  const arcVAO = gl.createVertexArray();
  gl.bindVertexArray(arcVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, arcData, gl.STATIC_DRAW);
  const aA = gl.getAttribLocation(arcP.pr, "aA");
  gl.enableVertexAttribArray(aA);
  gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 0, 0);

  const pointBuf = gl.createBuffer();
  const pointVAO = gl.createVertexArray();
  gl.bindVertexArray(pointVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
  gl.bufferData(gl.ARRAY_BUFFER, (N + 2) * 16, gl.DYNAMIC_DRAW);
  const aQ = gl.getAttribLocation(pointP.pr, "aQ");
  gl.enableVertexAttribArray(aQ);
  gl.vertexAttribPointer(aQ, 4, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  let meshVAO = null, meshCount = 0, coastCount = 0;
  const src = (document.currentScript && document.currentScript.src) || "assets/world.js";
  fetch(new URL("world.bin", src))
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then((buf) => {
      const head = new Uint32Array(buf, 0, 2);
      meshCount = head[0];
      coastCount = head[1];
      meshVAO = gl.createVertexArray();
      gl.bindVertexArray(meshVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Int16Array(buf, 8), gl.STATIC_DRAW);
      const aP = gl.getAttribLocation(meshP.pr, "aP");
      gl.enableVertexAttribArray(aP);
      gl.vertexAttribPointer(aP, 2, gl.SHORT, true, 0, 0);
      gl.bindVertexArray(null);
      kick();
    })
    .catch(() => root.classList.add("is-fallback"));

  /* ---------- Render targets ---------- */
  let W = 1, H = 1, lineFbo, lineTex, blurA, blurB;
  const makeTarget = (w, h) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fbo, w, h };
  };
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, LITE ? 1.25 : 1.75);
    W = Math.max(2, Math.round(r.width * dpr));
    H = Math.max(2, Math.round(r.height * dpr));
    canvas.width = W; canvas.height = H;
    [lineFbo, blurA, blurB].forEach((t) => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); } });
    lineFbo = makeTarget(W, H);
    lineTex = lineFbo.tex;
    blurA = makeTarget(W >> 1, H >> 1);
    blurB = makeTarget(W >> 1, H >> 1);
    kick();
  };
  new ResizeObserver(fit).observe(canvas);

  /* ---------- Camera ---------- */
  const persp = (fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  };
  const lookAt = (e, t, up) => {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm(sub(e, t)), x = norm(cross(up, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  };
  const mul = (a, b) => {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    return o;
  };
  const apply = (m, p) => {
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
    return [x / w, y / w, w];
  };

  let mvp = null, eye = [0, 0, 0];
  const camera = (lean) => {
    const aspect = W / H;
    // Distance so the whole map width fits, with a little air on both sides.
    // Narrow stages (phones) zoom in: the Pacific ends crop into the edge fade,
    // every client city stays in frame.
    const fitW = aspect < 1.8 ? X_MAX * 0.8 : X_MAX * 1.08;
    const hfov = Math.atan(Math.tan(FOV / 2) * aspect);
    const d = fitW / Math.tan(hfov) + 0.6;
    const tilt = TILT + lean[1] * 0.05;
    const yaw = lean[0] * 0.06;
    const target = [0, -0.1, 0.12];
    eye = [
      target[0] + Math.sin(yaw) * d * Math.sin(tilt),
      target[1] + d * Math.cos(tilt),
      target[2] + Math.cos(yaw) * d * Math.sin(tilt),
    ];
    mvp = mul(persp(FOV, aspect, 0.1, 50), lookAt(eye, target, [0, 1, 0]));
  };

  /* ---------- Signals ---------- */
  // Two signals go around the loop half a loop apart; each leaves a city on a heartbeat.
  const PERIOD = window.Pulse ? window.Pulse.PERIOD : 60 / 54;
  const now = () => performance.now() / 1000;
  const age = new Float32Array(N).fill(99);      // ripple ages per city
  const rippleStart = new Array(N).fill(-99);
  const dist = (a, b) => Math.hypot(a.map[0] - b.map[0], a.map[1] - b.map[1]);
  const travel = (k) => 0.55 + dist(CITIES[k], CITIES[(k + 1) % N]) * 0.32;   // seconds per arc
  const signals = [
    { arc: 0, leave: Infinity },
    { arc: N >> 1, leave: Infinity },
  ];
  let lastPhase = 0;

  const step = (t) => {
    const phase = window.Pulse ? window.Pulse.phase(0) : ((t / PERIOD) % 1);
    const beatNow = phase < lastPhase;           // a new heartbeat started this frame
    lastPhase = phase;
    const heads = [new Float32Array(N).fill(-1), new Float32Array(N).fill(-1)];
    signals.forEach((s, i) => {
      if (s.leave === Infinity) {
        if (beatNow) s.leave = t;               // depart on the heartbeat
        return;
      }
      const p = (t - s.leave) / travel(s.arc);
      if (p >= 1) {
        const arrived = (s.arc + 1) % N;
        rippleStart[arrived] = t;
        s.arc = arrived;
        s.leave = Infinity;                      // wait for the next heartbeat
        return;
      }
      heads[i][s.arc] = p * p * (3 - 2 * p);     // ease in and out
    });
    for (let i = 0; i < N; i++) age[i] = t - rippleStart[i];
    return heads;
  };

  /* ---------- Labels ---------- */
  const labels = CITIES.map((c) => {
    const el = document.createElement("span");
    el.className = `world-label is-${c.side}`;
    el.innerHTML = `<i></i><span><b>${c.name}</b> <small>${c.cc}</small></span>`;
    labelsEl.appendChild(el);
    return el;
  });

  /* ---------- Interaction ---------- */
  const lean = [0, 0], leanT = [0, 0];
  let cursorMap = [99, 99];
  let pointer = null;
  root.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer = [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
    leanT[0] = (pointer[0] - 0.5) * 2;
    leanT[1] = (pointer[1] - 0.5) * 2;
  });
  root.addEventListener("pointerleave", () => { pointer = null; leanT[0] = leanT[1] = 0; });

  // Cursor onto the map: intersect the view ray with the plane y ≈ 0.
  const inv = (m) => {
    const a = m, o = new Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4];
    const b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12];
    const b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
    o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
    o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
    o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
    o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  };
  const pick = () => {
    if (!pointer) return [99, 99];
    const im = inv(mvp);
    const ndc = [pointer[0] * 2 - 1, 1 - pointer[1] * 2];
    const unp = (z) => {
      const x = im[0] * ndc[0] + im[4] * ndc[1] + im[8] * z + im[12];
      const y = im[1] * ndc[0] + im[5] * ndc[1] + im[9] * z + im[13];
      const zz = im[2] * ndc[0] + im[6] * ndc[1] + im[10] * z + im[14];
      const w = im[3] * ndc[0] + im[7] * ndc[1] + im[11] * z + im[15];
      return [x / w, y / w, zz / w];
    };
    const a = unp(-1), b = unp(1);
    const t = a[1] / (a[1] - b[1]);
    const p = [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
    return [p[0], -p[2]];
  };

  /* ---------- Frame ---------- */
  let visible = false, raf = 0, reveal = still ? 1 : 0, revealStart = -1, lastT = 0;
  const cityArr = new Float32Array(N * 2);
  CITIES.forEach((c, i) => cityArr.set(c.map, i * 2));
  const fromArr = new Float32Array(N * 3), toArr = new Float32Array(N * 3);
  CITIES.forEach((c, i) => { fromArr.set(c.pos, i * 3); toArr.set(CITIES[(i + 1) % N].pos, i * 3); });

  const frame = () => {
    raf = 0;
    if (!meshVAO || !lineFbo) return;
    const t = now();
    const dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
    lastT = t;
    // The sweep plays the first time the map is actually on screen.
    if (revealStart < 0 && visible) revealStart = t;
    if (!still) reveal = revealStart < 0 ? 0 : Math.min(1, (t - revealStart) / 2.2);
    lean[0] += (leanT[0] - lean[0]) * Math.min(1, dt * 3);
    lean[1] += (leanT[1] - lean[1]) * Math.min(1, dt * 3);
    camera(lean);
    const cm = pick();
    cursorMap[0] += (cm[0] - cursorMap[0]) * 0.2;
    cursorMap[1] += (cm[1] - cursorMap[1]) * 0.2;
    if (Math.abs(cm[0]) > 50) cursorMap = [99, 99];
    const heads = still ? [new Float32Array(N).fill(-1), new Float32Array(N).fill(-1)] : step(t);
    const beat = window.Pulse ? window.Pulse.at(0) : 0;

    // Lines pass.
    gl.bindFramebuffer(gl.FRAMEBUFFER, lineFbo.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(meshP.pr);
    gl.uniformMatrix4fv(meshP.u.uMVP, false, mvp);
    gl.uniform2f(meshP.u.uScale, X_MAX, Y_MAX);
    gl.uniform2fv(meshP.u.uCity, cityArr);
    gl.uniform1fv(meshP.u.uAge, age);
    gl.uniform2f(meshP.u.uCursor, cursorMap[0], cursorMap[1]);
    gl.uniform1f(meshP.u.uReveal, reveal);
    gl.bindVertexArray(meshVAO);
    gl.uniform3f(meshP.u.uColor, 0.055, 0.016, 0.012);               // wire mesh: barely there
    gl.drawArrays(gl.LINES, 0, meshCount);
    gl.uniform3f(meshP.u.uColor, 0.13, 0.04, 0.03);                  // coastlines
    gl.drawArrays(gl.LINES, meshCount, coastCount);

    if (reveal > 0.6) {
      gl.useProgram(arcP.pr);
      gl.uniformMatrix4fv(arcP.u.uMVP, false, mvp);
      gl.uniform3fv(arcP.u.uFrom, fromArr);
      gl.uniform3fv(arcP.u.uTo, toArr);
      gl.uniform1fv(arcP.u.uHead, heads[0]);
      gl.uniform1fv(arcP.u.uHead2, heads[1]);
      gl.bindVertexArray(arcVAO);
      gl.drawArrays(gl.LINES, 0, N * ARC_SEG * 2);
    }

    // Points: cities swell with their ripple and the page heartbeat; signal heads.
    const pts = [];
    CITIES.forEach((c, i) => {
      const swell = Math.exp(-age[i] * 2.5);
      pts.push(...c.pos, (0.05 + 0.05 * swell + 0.012 * beat) * (reveal > 0.6 ? 1 : 0));
    });
    heads.forEach((h) => {
      const k = h.findIndex((v) => v >= 0);
      if (k < 0) { pts.push(0, -99, 0, -0.001); return; }
      const a = CITIES[k].pos, b = CITIES[(k + 1) % N].pos, s = h[k];
      const len = Math.hypot(a[0] - b[0], a[2] - b[2]);
      pts.push(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s + Math.sin(s * Math.PI) * (0.08 + len * 0.16), a[2] + (b[2] - a[2]) * s, -0.085);
    });
    gl.useProgram(pointP.pr);
    gl.uniformMatrix4fv(pointP.u.uMVP, false, mvp);
    gl.uniform1f(pointP.u.uPx, H / (2 * Math.tan(FOV / 2)));
    gl.bindVertexArray(pointVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(pts));
    gl.drawArrays(gl.POINTS, 0, N + 2);
    gl.disable(gl.BLEND);

    // Bloom: half resolution, two blur passes.
    gl.useProgram(blurP.pr);
    gl.bindVertexArray(quadVAO);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(blurP.u.uTex, 0);
    const pass = (from, to, dx, dy) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, to.fbo);
      gl.viewport(0, 0, to.w, to.h);
      gl.bindTexture(gl.TEXTURE_2D, from);
      gl.uniform2f(blurP.u.uDir, dx / to.w, dy / to.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    pass(lineTex, blurA, 2, 0);
    pass(blurA.tex, blurB, 0, 2);
    pass(blurB.tex, blurA, 4, 0);
    pass(blurA.tex, blurB, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(compP.pr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lineTex);
    gl.uniform1i(compP.u.uLines, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurB.tex);
    gl.uniform1i(compP.u.uBloom, 1);
    gl.uniform2f(compP.u.uRes, W, H);
    gl.uniform1f(compP.u.uTime, t % 1000);
    gl.uniform1f(compP.u.uBeat, beat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Labels follow their cities; the one a signal just reached lights up.
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    CITIES.forEach((c, i) => {
      const [x, y] = apply(mvp, c.pos);
      const el = labels[i];
      el.style.transform = `translate(${((x * 0.5 + 0.5) * cw).toFixed(1)}px, ${((0.5 - y * 0.5) * ch).toFixed(1)}px)`;
      const on = age[i] < 1.6;
      el.classList.toggle("is-on", on);
      el.classList.toggle("is-shown", reveal > 0.6);
      if (listItems[i]) listItems[i].classList.toggle("is-on", on);
    });

    if (visible && !still) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible) { lastT = 0; kick(); }
  }, { rootMargin: "80px 0px" }).observe(root);
})();
