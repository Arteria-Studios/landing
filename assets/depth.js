/* ---------- Works: dark 3D depth field with scroll parallax (WebGL) ----------
   A deep, dark bloodstream behind the project list, shot like a macro lens:
   - cells drift in a long volume; the ones close to the camera fall out of
     focus into large, soft bokeh discs, the far ones stay small and crisp;
   - far in the depth a dim crimson light glows, like light at the end of a
     vessel; it moves least of all, the farthest layer of the parallax.
   Scrolling flies the camera forward and down through the volume, so the
   parallax is real perspective: near cells rush past, far ones barely move.
   The mouse tilts the view a touch; the distant light breathes on the shared
   heartbeat. Kept very dark so the big project names stay the hero.
   With reduced motion the scene is drawn still, without parallax. */
(() => {
  const canvas = document.querySelector("[data-depth]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite = innerWidth < 810 || (navigator.hardwareConcurrency || 8) <= 4;
  const CELLS = lite ? 600 : 1300;
  const DEPTH = 70;           // length of the volume along z
  const TRAVEL = 44;          // how far the camera flies over the whole page
  const DROP = 9;             // how far it sinks while flying
  const FOCUS = 9;            // distance in focus; nearer cells blur into bokeh

  /* Distant light: a full-screen pass drawn first. */
  const vsQuad = `
    attribute vec2 p;
    varying vec2 vUv;
    void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const fsGlow = `
    precision mediump float;
    uniform vec2 uGlow;       // light position in uv
    uniform float uAspect;
    uniform float uBeat;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - uGlow) * vec2(uAspect, 1.0);
      float r2 = dot(d, d);
      vec3 col = vec3(0.5, 0.02, 0.03) * exp(-r2 * 4.0) * (0.2 + 0.05 * uBeat)
               + vec3(0.2, 0.0, 0.02) * exp(-r2 * 1.1) * 0.12;
      // Darken the corners so the light reads as coming from deep inside.
      col *= smoothstep(1.25, 0.2, length((vUv - 0.5) * vec2(uAspect * 0.8, 1.0)));
      gl_FragColor = vec4(col, 1.0);
    }`;

  const vsPoints = `
    attribute vec4 aP;          // xyz position, w: size/colour seed
    uniform mat4 uProj;
    uniform vec3 uCam;
    uniform vec2 uTilt;
    uniform float uDpr;
    varying float vFog;
    varying float vSeed;
    varying float vBlur;
    void main() {
      vec3 p = aP.xyz - uCam;
      p.xy += uTilt * p.z * 0.02;
      float z = -p.z;
      // Out of focus in front of the focal distance: bigger, softer, fainter.
      vBlur = smoothstep(${FOCUS.toFixed(1)}, 1.2, z);
      vFog = smoothstep(0.35, 1.4, z) * exp(-z * 0.05);
      vSeed = aP.w;
      gl_Position = uProj * vec4(p, 1.0);
      float size = (1.3 + aP.w * 2.6) * 16.0 / max(z, 0.6);
      gl_PointSize = min(size * (1.0 + vBlur * 3.5), 180.0) * uDpr;
    }`;
  const fsPoints = `
    precision mediump float;
    varying float vFog;
    varying float vSeed;
    varying float vBlur;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      // In focus: a small soft dot. Out of focus: a wide disc with a faint
      // brighter rim, like lens bokeh.
      float sharp = pow(smoothstep(1.0, 0.0, d), 2.0);
      float disc = smoothstep(1.0, 0.82, d) * (0.55 + 0.45 * smoothstep(0.55, 0.95, d));
      float shape = mix(sharp, disc, vBlur);
      bool red = vSeed > 0.8;
      vec3 col = red ? vec3(1.0, 0.22, 0.14) : vec3(0.86, 0.8, 0.8);
      float a = shape * vFog * (red ? 0.7 : 0.32) * mix(1.0, 0.22, vBlur);
      gl_FragColor = vec4(col * a, a);
    }`;

  const compile = (vs, fs) => {
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
  };
  const glowP = compile(vsQuad, fsGlow);
  const pointsP = compile(vsPoints, fsPoints);
  if (!glowP || !pointsP) return;

  // Seeded random so the scene is the same on every visit.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const cells = new Float32Array(CELLS * 4);
  for (let i = 0; i < CELLS; i++) {
    cells[i * 4] = (rnd() - 0.5) * 22;
    cells[i * 4 + 1] = (rnd() - 0.5) * 14 - rnd() * DROP;
    cells[i * 4 + 2] = -rnd() * DEPTH;
    cells[i * 4 + 3] = rnd();
  }
  const cellBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cells, gl.STATIC_DRAW);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const U = (pr, n) => gl.getUniformLocation(pr, n);
  const uG = { glow: U(glowP, "uGlow"), aspect: U(glowP, "uAspect"), beat: U(glowP, "uBeat") };
  const uP = { proj: U(pointsP, "uProj"), cam: U(pointsP, "uCam"), tilt: U(pointsP, "uTilt"), dpr: U(pointsP, "uDpr") };
  const aQuad = gl.getAttribLocation(glowP, "p");
  const aPoints = gl.getAttribLocation(pointsP, "aP");

  let W = 1, H = 1, dpr = 1, proj;
  const perspective = (aspect) => {
    const f = 1 / Math.tan((58 * Math.PI / 180) / 2), n = 0.1, far = 120;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + n) / (n - far), -1, 0, 0, (2 * far * n) / (n - far), 0]);
  };
  const fit = () => {
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    proj = perspective(W / H);
  };
  addEventListener("resize", fit);
  fit();

  // Camera follows page scroll (smoothed), plus a small mouse tilt.
  const cam = { p: 0, target: 0 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const progress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? scrollY / max : 0;
  };
  addEventListener("scroll", () => { cam.target = progress(); }, { passive: true });
  addEventListener("pointermove", (e) => {
    tilt.tx = (e.clientX / innerWidth - 0.5) * 2;
    tilt.ty = (e.clientY / innerHeight - 0.5) * -2;
  }, { passive: true });
  cam.p = cam.target = progress();

  const draw = () => {
    cam.p += (cam.target - cam.p) * 0.08;
    tilt.x += (tilt.tx - tilt.x) * 0.04;
    tilt.y += (tilt.ty - tilt.y) * 0.04;
    const k = still ? 0 : cam.p;
    const camPos = [0, -k * DROP, -k * TRAVEL + 2];
    const beat = typeof heartbeat === "function" && !still ? heartbeat() : 0;

    // 1) Distant light: the farthest layer, it drifts only slightly with scroll.
    gl.disable(gl.BLEND);
    gl.useProgram(glowP);
    gl.uniform2f(uG.glow, 0.64 - tilt.x * 0.02, 0.56 - k * 0.12 - tilt.y * 0.02);
    gl.uniform1f(uG.aspect, W / H);
    gl.uniform1f(uG.beat, beat);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(aQuad);
    gl.vertexAttribPointer(aQuad, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // The quad has 3 vertices; don't leave its attribute on for the 1300-point draw.
    if (aQuad !== aPoints) gl.disableVertexAttribArray(aQuad);

    // 2) Cells, additive over the light.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(pointsP);
    gl.uniformMatrix4fv(uP.proj, false, proj);
    gl.uniform3fv(uP.cam, camPos);
    gl.uniform2f(uP.tilt, tilt.x, tilt.y);
    gl.uniform1f(uP.dpr, dpr);
    gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
    gl.enableVertexAttribArray(aPoints);
    gl.vertexAttribPointer(aPoints, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, CELLS);

    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
