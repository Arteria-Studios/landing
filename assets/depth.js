/* ---------- Works: dark 3D depth field with scroll parallax (WebGL) ----------
   A deep, dark bloodstream behind the project list: hundreds of soft particles
   (cells in plasma) and a few thin crimson capillaries threading through the
   depth. Scrolling flies the camera forward and down through the volume, so the
   parallax is real perspective: near cells rush past, far ones barely move. The
   mouse tilts the view a touch, and the capillaries glow faintly on the shared
   heartbeat. Kept very dark so the big project names stay the hero.
   With reduced motion the scene is drawn still, without parallax. */
(() => {
  const canvas = document.querySelector("[data-depth]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) return;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lite = innerWidth < 810 || (navigator.hardwareConcurrency || 8) <= 4;
  const CELLS = lite ? 700 : 1600;
  const STRANDS = 7;
  const STRAND_POINTS = 260;
  const DEPTH = 70;           // length of the volume along z
  const TRAVEL = 44;          // how far the camera flies over the whole page
  const DROP = 9;             // how far it sinks while flying

  const vsPoints = `
    attribute vec4 aP;          // xyz position, w: size/colour seed
    uniform mat4 uProj;
    uniform vec3 uCam;
    uniform vec2 uTilt;
    uniform float uDpr;
    varying float vFog;
    varying float vSeed;
    void main() {
      vec3 p = aP.xyz - uCam;
      p.xy += uTilt * p.z * 0.02;
      float z = -p.z;
      vFog = smoothstep(0.5, 3.0, z) * exp(-z * 0.055);
      vSeed = aP.w;
      gl_Position = uProj * vec4(p.xy, p.z, 1.0);
      gl_PointSize = (1.4 + aP.w * 3.2) * uDpr * 16.0 / max(z, 0.6);
    }`;
  const fsPoints = `
    precision mediump float;
    varying float vFog;
    varying float vSeed;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      float soft = smoothstep(1.0, 0.0, d);
      // Most cells are pale; one in five is red, like a blood cell.
      vec3 col = vSeed > 0.8 ? vec3(1.0, 0.22, 0.14) : vec3(0.85, 0.8, 0.8);
      float a = soft * soft * vFog * (vSeed > 0.8 ? 0.75 : 0.35);
      gl_FragColor = vec4(col * a, a);
    }`;
  const vsLines = `
    attribute vec3 aP;
    uniform mat4 uProj;
    uniform vec3 uCam;
    uniform vec2 uTilt;
    varying float vFog;
    void main() {
      vec3 p = aP - uCam;
      p.xy += uTilt * p.z * 0.02;
      float z = -p.z;
      vFog = smoothstep(0.5, 4.0, z) * exp(-z * 0.045);
      gl_Position = uProj * vec4(p, 1.0);
    }`;
  const fsLines = `
    precision mediump float;
    uniform float uBeat;
    varying float vFog;
    void main() {
      float a = vFog * (0.28 + 0.22 * uBeat);
      gl_FragColor = vec4(vec3(0.85, 0.08, 0.06) * a, a);
    }`;

  const compile = (vs, fs) => {
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(pr);
    return gl.getProgramParameter(pr, gl.LINK_STATUS) ? pr : null;
  };
  const pointsP = compile(vsPoints, fsPoints);
  const linesP = compile(vsLines, fsLines);
  if (!pointsP || !linesP) return;

  // Seeded random so the scene is the same on every visit.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // Cells fill a long, wide volume ahead of the camera.
  const cells = new Float32Array(CELLS * 4);
  for (let i = 0; i < CELLS; i++) {
    const z = -rnd() * DEPTH;
    cells[i * 4] = (rnd() - 0.5) * 22;
    cells[i * 4 + 1] = (rnd() - 0.5) * 14 - rnd() * DROP;
    cells[i * 4 + 2] = z;
    cells[i * 4 + 3] = rnd();
  }
  // Capillaries: long, gently winding strands running through the depth.
  const strands = [];
  for (let s = 0; s < STRANDS; s++) {
    const pts = new Float32Array(STRAND_POINTS * 3);
    const ox = (rnd() - 0.5) * 16, oy = (rnd() - 0.5) * 8 - rnd() * DROP;
    const f1 = 0.05 + rnd() * 0.06, f2 = 0.04 + rnd() * 0.05, ph = rnd() * 6.28;
    for (let i = 0; i < STRAND_POINTS; i++) {
      const z = -(i / (STRAND_POINTS - 1)) * DEPTH;
      pts[i * 3] = ox + Math.sin(z * f1 + ph) * 3.2;
      pts[i * 3 + 1] = oy + Math.cos(z * f2 + ph * 1.3) * 2.2;
      pts[i * 3 + 2] = z;
    }
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    strands.push(b);
  }
  const cellBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cells, gl.STATIC_DRAW);

  const U = (pr, n) => gl.getUniformLocation(pr, n);
  const uP = { proj: U(pointsP, "uProj"), cam: U(pointsP, "uCam"), tilt: U(pointsP, "uTilt"), dpr: U(pointsP, "uDpr") };
  const uL = { proj: U(linesP, "uProj"), cam: U(linesP, "uCam"), tilt: U(linesP, "uTilt"), beat: U(linesP, "uBeat") };
  const aPoints = gl.getAttribLocation(pointsP, "aP");
  const aLines = gl.getAttribLocation(linesP, "aP");

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

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(linesP);
    gl.uniformMatrix4fv(uL.proj, false, proj);
    gl.uniform3fv(uL.cam, camPos);
    gl.uniform2f(uL.tilt, tilt.x, tilt.y);
    gl.uniform1f(uL.beat, beat);
    gl.enableVertexAttribArray(aLines);
    for (const b of strands) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.vertexAttribPointer(aLines, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINE_STRIP, 0, STRAND_POINTS);
    }

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
