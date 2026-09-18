/* ---------- Hero: 3D wireframe artery (WebGL2) ----------
   A real tube mesh: RINGS rings × SEG vertices, drawn as ring / rib / diagonal
   lines. The camera flies along a winding centre line; ahead of the camera the
   vessel heads towards the cursor. Its wall breathes with a heartbeat, and side
   branches split off it like a real artery. Lines render into an MSAA buffer, get a blur
   pass for glow, and are composited over a grainy red "fabric" background in
   the Arteria palette. */
(() => {
  const canvas = document.querySelector("[data-wormhole]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) { canvas.classList.add("is-fallback"); return; }

  const RINGS = 200;      // rings along the main vessel
  const SEG = 48;         // vertices around each ring
  const SPACING = 0.32;   // distance between rings
  const SPEED = 0.55;     // flight speed through the vessel (units per second)
  const CELLS = 900;      // particles drifting in the bloodstream
  const RADIUS = 1.0;     // base vessel radius
  const FOV = 72 * Math.PI / 180;
  const FAR = RINGS * SPACING;

  // Side branches ("alternative tunnels") splitting off the main vessel.
  const BR_SLOTS = 11;      // branch meshes alive at once
  const BR_EVERY = 6.0;     // one branch candidate per this much path length
  const BR_RINGS = 44;
  const BR_SEG = 24;
  const BR_SPACING = 0.4;
  const BR_LEN = BR_RINGS * BR_SPACING;

  /* Winding centre line as a sum of sines: [amplitude, frequency, phase].
     GLSL and JS versions (and the derivative) are generated from one table. */
  const WX = [[3.0, 0.11, 0.0], [4.2, 0.047, 1.3], [1.1, 0.23, 2.1]];
  const WY = [[2.4, 0.083, 1.5708], [3.4, 0.039, 0.4], [0.9, 0.19, 0.7]];
  const F = (n) => n.toFixed(4);
  const glslSum = (terms, d) => terms.map(([a, f, ph]) =>
    d ? `${F(a * f)} * cos(s * ${F(f)} + ${F(ph)})` : `${F(a)} * sin(s * ${F(f)} + ${F(ph)})`).join(" + ");
  const jsSum = (terms, d, s) => terms.reduce((acc, [a, f, ph]) =>
    acc + (d ? a * f * Math.cos(s * f + ph) : a * Math.sin(s * f + ph)), 0);
  const wind = (s) => [jsSum(WX, 0, s), jsSum(WY, 0, s)];
  const windD = (s) => [jsSum(WX, 1, s), jsSum(WY, 1, s)];
  const windFade = (z) => 1 / (1 + z * 0.04);

  const COMMON = `
    uniform float uTravel;
    uniform vec2 uHead;         // direction the far end heads to (follows cursor)
    uniform float uRoll;
    uniform float uTime;
    uniform float uBeatPhase;   // 0..1 phase of the shared heartbeat (pulse.js)
    vec2 wind(float s) { return vec2(${glslSum(WX, 0)}, ${glslSum(WY, 0)}); }
    vec2 windD(float s) { return vec2(${glslSum(WX, 1)}, ${glslSum(WY, 1)}); }
    float windFade(float z) { return 1.0 / (1.0 + z * 0.04); }

    // Centre of the main vessel at path position s, relative to the camera.
    // The camera sits on the axis looking along it (offset and slope removed);
    // winding eases off far out so the end settles where the cursor points.
    vec2 center(float s) {
      float z = s - uTravel;
      vec2 c = (wind(s) - wind(uTravel) - windD(uTravel) * z) * windFade(z);
      return c + uHead * z * smoothstep(0.0, 9.0, z);
    }

    float hash1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

    // Branch k: where it leaves the main vessel, which way, and whether it exists.
    void branch(float k, out float sb, out vec2 dir, out float on) {
      sb = (k + 0.2 + 0.6 * hash1(k + 3.1)) * ${F(BR_EVERY)};
      float a = hash1(k + 7.7) * 6.2831853;
      dir = vec2(cos(a), sin(a));
      on = step(0.3, hash1(k + 1.3));
    }
    // Branch thickness varies: from thin capillaries to near-main vessels.
    float branchRad(float k) { return 0.32 + 0.34 * hash1(k + 5.9); }

    // Heartbeat: a quick double pulse, like blood pushed through the vessel.
    float beat() {
      float t = uBeatPhase;
      return exp(-pow((t - 0.08) * 22.0, 2.0)) + 0.6 * exp(-pow((t - 0.24) * 22.0, 2.0));
    }

    vec2 rot(vec2 p) { float cr = cos(uRoll), sr = sin(uRoll); return mat2(cr, sr, -sr, cr) * p; }`;

  const lineVS = `#version 300 es
    in vec2 aP;                 // x: ring index, y: vertex index around the ring
    uniform mat4 uProj;
    uniform float uNodeSize;    // point size when drawn as vertex nodes
    out float vZ;
    out float vS;
    ${COMMON}
    void main() {
      float base = floor(uTravel / ${F(SPACING)}) * ${F(SPACING)};
      float s = base + aP.x * ${F(SPACING)};
      float z = s - uTravel;
      vec2 c = center(s);
      // Organic wall: the vessel narrows and widens, and swells on each heartbeat.
      float r = ${F(RADIUS)} * (1.0 + 0.16 * sin(s * 0.45 + 1.0) + 0.08 * sin(s * 1.13)) * (1.0 + 0.045 * beat());
      // Swell the wall where a branch splits off, and lean towards the opening.
      float kk = floor(s / ${F(BR_EVERY)});
      for (int n = -1; n <= 0; n++) {
        float sb, on; vec2 dir;
        branch(kk + float(n), sb, dir, on);
        float w = on * exp(-pow((s - sb - 0.8) / 1.6, 2.0)) * branchRad(kk + float(n)) * 1.6;
        r += 0.35 * w;
        c += dir * 0.35 * w;
      }
      float th = aP.y / ${F(SEG)} * 6.2831853 + s * 0.035;
      // Wrinkled tissue: small ridges running around and along the wall.
      r += 0.05 * sin(3.0 * th + s * 0.7) + 0.035 * sin(5.0 * th - s * 1.3 + uTime * 0.3) + 0.02 * sin(9.0 * th + s * 2.1);
      vec2 p = rot(c + vec2(cos(th), sin(th)) * r);
      gl_PointSize = uNodeSize * clamp(3.0 / max(z, 0.3), 1.0, 5.0);
      vZ = z;
      vS = s;
      gl_Position = uProj * vec4(p, -z, 1.0);
    }`;

  const lineFS = `#version 300 es
    precision highp float;
    in float vZ;
    in float vS;
    uniform float uTime;
    uniform vec3 uColor;
    out vec4 o;
    void main() {
      float fade = smoothstep(0.15, 2.2, vZ) * exp(-vZ * 0.05);
      float pulse = pow(0.5 + 0.5 * sin(vS * 0.32 - uTime * 1.1), 12.0);
      o = vec4(uColor * fade * (0.6 + 2.2 * pulse), 1.0);
    }`;

  // A branch starts inside the main wall at the split, then peels away sideways,
  // narrowing and wandering on its own, and fades out before it ends.
  const branchVS = `#version 300 es
    in vec3 aB;                 // x: ring along the branch, y: vertex around, z: slot
    uniform mat4 uProj;
    out float vZ;
    out float vS;
    out float vOn;
    ${COMMON}
    void main() {
      float k = floor(uTravel / ${F(BR_EVERY)}) + aB.z - 1.0;
      float sb, on; vec2 dir;
      branch(k, sb, dir, on);
      float t = aB.x * ${F(BR_SPACING)};
      float s = sb + t;
      float z = s - uTravel;
      float rad = branchRad(k);
      vec2 side = vec2(-dir.y, dir.x);
      float spread = (1.0 - rad) * 0.9 + t * 0.2 + t * t * 0.018;
      vec2 c = center(s) + dir * spread + side * sin(t * 0.35 + k) * 0.35 * smoothstep(0.0, 6.0, t);
      float th = aB.y / ${F(BR_SEG)} * 6.2831853;
      float r = mix(rad, rad * 0.55, t / ${F(BR_LEN)}) * ${F(RADIUS)} * (1.0 + 0.05 * beat());
      r += 0.03 * sin(4.0 * th + t * 0.9);
      vec2 p = rot(c + vec2(cos(th), sin(th)) * r);
      vZ = z;
      vS = s;
      vOn = on * smoothstep(0.0, 1.5, t) * (1.0 - smoothstep(${F(BR_LEN * 0.55)}, ${F(BR_LEN)}, t));
      gl_Position = uProj * vec4(p, -z, 1.0);
    }`;

  const branchFS = `#version 300 es
    precision highp float;
    in float vZ;
    in float vS;
    in float vOn;
    uniform float uTime;
    uniform vec3 uColor;
    out vec4 o;
    void main() {
      float fade = smoothstep(0.15, 2.2, vZ) * exp(-vZ * 0.05) * vOn;
      if (fade < 0.002) discard;
      float pulse = pow(0.5 + 0.5 * sin(vS * 0.32 - uTime * 1.1), 12.0);
      o = vec4(uColor * fade * (0.6 + 2.2 * pulse), 1.0);
    }`;

  // Vertex nodes: the main mesh drawn again as round glowing points.
  const nodeFS = `#version 300 es
    precision highp float;
    in float vZ;
    in float vS;
    uniform float uTime;
    out vec4 o;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float fade = smoothstep(0.3, 2.5, vZ) * exp(-vZ * 0.06);
      float pulse = pow(0.5 + 0.5 * sin(vS * 0.32 - uTime * 1.1), 12.0);
      o = vec4(vec3(1.0, 0.72, 0.62) * smoothstep(0.5, 0.05, d) * fade * (0.35 + 1.4 * pulse), 1.0);
    }`;

  // Bloodstream: cells drift along the vessel slower than the camera, tumbling
  // around the axis. Each is a soft biconcave disc (bright rim, dimmer centre).
  const cellVS = `#version 300 es
    in vec4 aQ;                 // x: position seed, y: angle, z: radial fraction, w: size seed
    uniform mat4 uProj;
    uniform float uSpan;
    uniform float uPx;          // pixels per unit at depth 1
    out float vZ;
    out float vSeed;
    ${COMMON}
    void main() {
      float flow = uTime * 0.22;
      float z = mod(aQ.x * uSpan + flow - uTravel, uSpan);
      float s = uTravel + z;
      float a = aQ.y + uTime * (0.15 + 0.2 * aQ.w) + sin(s * 0.8 + aQ.w * 6.0) * 0.3;
      float r = aQ.z * 0.82 * ${F(RADIUS)};
      vec2 p = rot(center(s) + vec2(cos(a), sin(a)) * r);
      vZ = z;
      vSeed = aQ.w;
      float size = (0.035 + 0.045 * aQ.w) * uPx / max(z, 0.2);
      gl_PointSize = clamp(size, 1.0, 48.0);
      gl_Position = uProj * vec4(p, -z, 1.0);
    }`;

  const cellFS = `#version 300 es
    precision highp float;
    in float vZ;
    in float vSeed;
    out vec4 o;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float disc = smoothstep(1.0, 0.72, d) * (0.45 + 0.55 * smoothstep(0.15, 0.7, d));
      float fade = smoothstep(0.4, 3.0, vZ) * exp(-vZ * 0.055);
      vec3 col = mix(vec3(1.0, 0.22, 0.12), vec3(1.0, 0.55, 0.42), vSeed);
      o = vec4(col * disc * fade * 0.9, 1.0);
    }`;

  const quadVS = `#version 300 es
    layout(location = 0) in vec2 p;
    out vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

  const blurFS = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uTex;
    uniform vec2 uDir;          // texel step * direction
    out vec4 o;
    void main() {
      vec3 c = texture(uTex, vUv).rgb * 0.227;
      c += (texture(uTex, vUv + uDir * 1.38).rgb + texture(uTex, vUv - uDir * 1.38).rgb) * 0.316;
      c += (texture(uTex, vUv + uDir * 3.23).rgb + texture(uTex, vUv - uDir * 3.23).rgb) * 0.070;
      o = vec4(c, 1.0);
    }`;

  const compFS = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform sampler2D uLines;
    uniform sampler2D uBloom;
    uniform vec2 uRes;
    uniform vec2 uThroat;       // throat position in uv
    uniform float uTime;
    uniform float uEnergy;
    uniform float uBeat;        // heartbeat strength 0..1, same clock as the page
    out vec4 o;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
      return v;
    }

    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

      // Soft diagonal folds of red fabric, like the Arteria brand backdrop.
      float n = fbm(p * 1.6 + vec2(uTime * 0.03, -uTime * 0.02));
      float folds = 0.5 + 0.5 * sin((p.x * 1.2 - p.y * 1.0) * 3.2 + n * 3.5 + uTime * 0.12);
      vec3 deep = vec3(0.12, 0.0, 0.0);
      vec3 mid  = vec3(0.50, 0.03, 0.01);
      vec3 hi   = vec3(0.82, 0.11, 0.05);
      vec3 bg = mix(deep, mid, smoothstep(0.05, 0.95, folds * 0.65 + n * 0.55));
      bg = mix(bg, hi, pow(folds, 5.0) * 0.55);

      // Depth: the wormhole interior sinks towards the throat.
      float dt = length((vUv - uThroat) * vec2(aspect, 1.0));
      bg *= mix(0.18, 1.0, smoothstep(0.02, 0.75, dt));

      // Lines with a slight chromatic split driven by mouse energy.
      vec2 ca = (vUv - uThroat) * (0.002 + uEnergy * 0.012);
      vec3 lines = vec3(texture(uLines, vUv + ca).r, texture(uLines, vUv).g, texture(uLines, vUv - ca).b);
      vec3 bloom = texture(uBloom, vUv).rgb;

      vec3 col = bg + lines + bloom * vec3(1.6, 0.55, 0.4);
      // The throat light swells on every heartbeat.
      col += vec3(1.0, 0.28, 0.14) * exp(-dt * 7.0) * (0.55 + 0.35 * uBeat);
      col += vec3(1.0, 0.82, 0.74) * exp(-dt * 38.0) * (0.9 + 0.5 * uBeat);

      col *= smoothstep(1.35, 0.35, length(p * vec2(0.8, 1.0)));
      col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.085;   // film grain
      o = vec4(clamp(col, 0.0, 1.0), 1.0);
    }`;

  /* ---------- GL helpers ---------- */
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
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(pr, i).name; u[name] = gl.getUniformLocation(pr, name); }
    return { pr, u };
  };

  let lineP, nodeP, cellP, branchP, blurP, compP;
  try {
    lineP = program(lineVS, lineFS);
    nodeP = program(lineVS, nodeFS);
    cellP = program(cellVS, cellFS);
    branchP = program(branchVS, branchFS);
    blurP = program(quadVS, blurFS);
    compP = program(quadVS, compFS);
  } catch (err) {
    console.error(err);
    canvas.classList.add("is-fallback");
    return;
  }

  /* ---------- Geometry ---------- */
  const verts = new Float32Array(RINGS * SEG * 2);
  for (let i = 0, k = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) { verts[k++] = i; verts[k++] = j; }
  const id = (i, j) => i * SEG + (j % SEG);
  const rings = [], ribs = [], diags = [];
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      rings.push(id(i, j), id(i, j + 1));
      if (i < RINGS - 1) {
        ribs.push(id(i, j), id(i + 1, j));
        diags.push(id(i, j), id(i + 1, j + 1));
      }
    }
  }

  const lineVAO = gl.createVertexArray();
  gl.bindVertexArray(lineVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const aP = gl.getAttribLocation(lineP.pr, "aP");
  gl.enableVertexAttribArray(aP);
  gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
  const makeIndex = (arr) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arr), gl.STATIC_DRAW);
    return { b, n: arr.length };
  };
  const sets = [
    { ...makeIndex(rings), color: [1.0, 0.62, 0.52] },
    { ...makeIndex(ribs),  color: [1.0, 0.36, 0.26] },
    { ...makeIndex(diags), color: [0.5, 0.09, 0.05] },
  ];
  gl.bindVertexArray(null);

  // Branch meshes: BR_SLOTS copies of a smaller tube, placed in the shader.
  const bVerts = new Float32Array(BR_SLOTS * BR_RINGS * BR_SEG * 3);
  for (let b = 0, k = 0; b < BR_SLOTS; b++)
    for (let i = 0; i < BR_RINGS; i++)
      for (let j = 0; j < BR_SEG; j++) { bVerts[k++] = i; bVerts[k++] = j; bVerts[k++] = b; }
  const bid = (b, i, j) => (b * BR_RINGS + i) * BR_SEG + (j % BR_SEG);
  const bRings = [], bRibs = [];
  for (let b = 0; b < BR_SLOTS; b++) {
    for (let i = 0; i < BR_RINGS; i++) {
      for (let j = 0; j < BR_SEG; j++) {
        bRings.push(bid(b, i, j), bid(b, i, j + 1));
        if (i < BR_RINGS - 1) bRibs.push(bid(b, i, j), bid(b, i + 1, j));
      }
    }
  }
  const branchVAO = gl.createVertexArray();
  gl.bindVertexArray(branchVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, bVerts, gl.STATIC_DRAW);
  const aB = gl.getAttribLocation(branchP.pr, "aB");
  gl.enableVertexAttribArray(aB);
  gl.vertexAttribPointer(aB, 3, gl.FLOAT, false, 0, 0);
  const branchSets = [
    { ...makeIndex(bRings), color: [0.92, 0.46, 0.38] },
    { ...makeIndex(bRibs),  color: [0.85, 0.26, 0.18] },
  ];
  gl.bindVertexArray(null);

  // Bloodstream particles: random seeds, positioned in the shader.
  const cells = new Float32Array(CELLS * 4);
  for (let i = 0; i < CELLS; i++) {
    cells[i * 4] = Math.random();
    cells[i * 4 + 1] = Math.random() * Math.PI * 2;
    cells[i * 4 + 2] = Math.sqrt(Math.random());
    cells[i * 4 + 3] = Math.random();
  }
  const cellVAO = gl.createVertexArray();
  gl.bindVertexArray(cellVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, cells, gl.STATIC_DRAW);
  const aQ = gl.getAttribLocation(cellP.pr, "aQ");
  gl.enableVertexAttribArray(aQ);
  gl.vertexAttribPointer(aQ, 4, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // Nodes reuse the main mesh vertices through their own VAO.
  const nodeVAO = gl.createVertexArray();
  gl.bindVertexArray(nodeVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const aPn = gl.getAttribLocation(nodeP.pr, "aP");
  gl.enableVertexAttribArray(aPn);
  gl.vertexAttribPointer(aPn, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  const quadVAO = gl.createVertexArray();
  gl.bindVertexArray(quadVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  /* ---------- Render targets ---------- */
  const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES));
  let W = 1, H = 1, msFbo, msRb, lineTex, blurA, blurB;

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
  const free = (t) => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); } };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    W = canvas.width = Math.max(1, Math.round(r.width * dpr));
    H = canvas.height = Math.max(1, Math.round(r.height * dpr));

    if (msRb) { gl.deleteRenderbuffer(msRb); gl.deleteFramebuffer(msFbo); }
    msRb = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, msRb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, W, H);
    msFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msRb);

    free(lineTex); free(blurA); free(blurB);
    lineTex = makeTarget(W, H);
    const bw = Math.max(1, W >> 1), bh = Math.max(1, H >> 1);
    blurA = makeTarget(bw, bh);
    blurB = makeTarget(bw, bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  addEventListener("resize", resize);
  resize();

  const perspective = (aspect) => {
    const f = 1 / Math.tan(FOV / 2), n = 0.05, fr = FAR + 5;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + n) / (n - fr), -1, 0, 0, (2 * fr * n) / (n - fr), 0]);
  };

  /* ---------- Input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, energy: 0, lx: null, ly: null };
  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    mouse.ty = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    if (mouse.lx !== null) mouse.energy = Math.min(1, mouse.energy + Math.hypot(e.clientX - mouse.lx, e.clientY - mouse.ly) * 0.002);
    mouse.lx = e.clientX;
    mouse.ly = e.clientY;
  }, { passive: true });

  /* ---------- Frame ---------- */
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let visible = true, raf = 0, last = 0, time = 0, travel = 40;

  const blur = (src, dst, dx, dy) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(blurP.u.uTex, 0);
    gl.uniform2f(blurP.u.uDir, dx / src.w, dy / src.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const frame = (t) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
    last = t;
    const ease = 1 - Math.pow(0.12, dt);          // smooth follow of the cursor
    mouse.x += (mouse.tx - mouse.x) * ease;
    mouse.y += (mouse.ty - mouse.y) * ease;
    mouse.energy *= Math.pow(0.3, dt);
    time += dt;
    travel += dt * SPEED;   // constant: the mouse steers, it never changes the pace

    const aspect = W / H;
    const f = 1 / Math.tan(FOV / 2);
    // Far end of the tube lands near the cursor on screen.
    const head = [mouse.x * 0.85 * aspect / f, mouse.y * 0.85 / f];
    const roll = Math.sin(time * 0.17) * 0.25 - mouse.x * 0.2;

    // Throat in uv: project the centre of the farthest ring.
    const z = FAR - SPACING;
    const w0 = wind(travel), wd = windD(travel), wf = wind(travel + z);
    let cx = (wf[0] - w0[0] - wd[0] * z) * windFade(z) + head[0] * z;
    let cy = (wf[1] - w0[1] - wd[1] * z) * windFade(z) + head[1] * z;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    [cx, cy] = [cr * cx - sr * cy, sr * cx + cr * cy];
    const throat = [(cx / z) * (f / aspect) * 0.5 + 0.5, (cy / z) * f * 0.5 + 0.5];

    // 1) Lines into the MSAA buffer, additive.
    gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(lineP.pr);
    gl.uniformMatrix4fv(lineP.u.uProj, false, perspective(aspect));
    gl.uniform1f(lineP.u.uTravel, travel);
    gl.uniform2f(lineP.u.uHead, head[0], head[1]);
    gl.uniform1f(lineP.u.uRoll, roll);
    gl.uniform1f(lineP.u.uTime, time);
    // One heartbeat for the page: take the phase from pulse.js (fallback: own clock).
    const beatPhase = window.Pulse ? window.Pulse.phase(0) : (time * 0.9) % 1;
    gl.uniform1f(lineP.u.uBeatPhase, beatPhase);
    gl.bindVertexArray(lineVAO);
    for (const s of sets) {
      gl.uniform3fv(lineP.u.uColor, s.color);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.b);
      gl.drawElements(gl.LINES, s.n, gl.UNSIGNED_SHORT, 0);
    }

    // Glowing nodes at the mesh vertices.
    const proj = perspective(aspect);
    const setShared = (P) => {
      gl.useProgram(P.pr);
      gl.uniformMatrix4fv(P.u.uProj, false, proj);
      gl.uniform1f(P.u.uTravel, travel);
      gl.uniform2f(P.u.uHead, head[0], head[1]);
      gl.uniform1f(P.u.uRoll, roll);
      gl.uniform1f(P.u.uTime, time);
      gl.uniform1f(P.u.uBeatPhase, beatPhase);
    };
    setShared(nodeP);
    gl.uniform1f(nodeP.u.uNodeSize, Math.min(devicePixelRatio || 1, 1.75) * 1.6);
    gl.bindVertexArray(nodeVAO);
    gl.drawArrays(gl.POINTS, 0, RINGS * SEG);

    // Cells drifting in the bloodstream.
    setShared(cellP);
    gl.uniform1f(cellP.u.uSpan, FAR);
    gl.uniform1f(cellP.u.uPx, H * f * 0.5);
    gl.bindVertexArray(cellVAO);
    gl.drawArrays(gl.POINTS, 0, CELLS);

    // Side branches with the same camera and path.
    gl.useProgram(branchP.pr);
    gl.uniformMatrix4fv(branchP.u.uProj, false, perspective(aspect));
    gl.uniform1f(branchP.u.uTravel, travel);
    gl.uniform2f(branchP.u.uHead, head[0], head[1]);
    gl.uniform1f(branchP.u.uRoll, roll);
    gl.uniform1f(branchP.u.uTime, time);
    gl.uniform1f(branchP.u.uBeatPhase, beatPhase);
    gl.bindVertexArray(branchVAO);
    for (const s of branchSets) {
      gl.uniform3fv(branchP.u.uColor, s.color);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, s.b);
      gl.drawElements(gl.LINES, s.n, gl.UNSIGNED_SHORT, 0);
    }
    gl.disable(gl.BLEND);

    // 2) Resolve MSAA into a texture.
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, lineTex.fbo);
    gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.LINEAR);

    // 3) Glow: separable blur at half resolution, two rounds for a wider halo.
    gl.useProgram(blurP.pr);
    gl.bindVertexArray(quadVAO);
    blur(lineTex, blurA, 1.5, 0);
    blur(blurA, blurB, 0, 1.5);
    blur(blurB, blurA, 3, 0);
    blur(blurA, blurB, 0, 3);

    // 4) Composite over the red background.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(compP.pr);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lineTex.tex);
    gl.uniform1i(compP.u.uLines, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, blurB.tex);
    gl.uniform1i(compP.u.uBloom, 1);
    gl.uniform2f(compP.u.uRes, W, H);
    gl.uniform2f(compP.u.uThroat, throat[0], throat[1]);
    gl.uniform1f(compP.u.uTime, time);
    gl.uniform1f(compP.u.uEnergy, mouse.energy);
    gl.uniform1f(compP.u.uBeat, window.Pulse ? window.Pulse.at(0) : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = visible && !still ? requestAnimationFrame(frame) : 0;
  };

  // Only animate while the hero is on screen.
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(canvas);

  raf = requestAnimationFrame(frame);
})();
