/* ---------- Works: layered dot grids with scroll parallax (WebGL) ----------
   Three perfectly regular grids of tiny dots at different depths, drawn
   procedurally in one fragment shader, so they are infinite and pixel-crisp.
   Nearer layers have a wider pitch, slightly larger dots, and move faster with
   the page; the farthest barely moves. One dot in a hundred on the near layer
   is red and swells faintly on the shared heartbeat. Nothing else: the depth
   comes from the parallax alone. With reduced motion the grids stand still. */
(() => {
  const canvas = document.querySelector("[data-depth]");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Per layer: pitch (px), dot radius (px), opacity, parallax factor (× scroll).
  const LAYERS = [
    [64, 1.5, 0.26, 0.34],   // near
    [40, 1.1, 0.16, 0.18],   // middle
    [26, 0.8, 0.09, 0.07],   // far
  ];
  const f = (n) => n.toFixed(3);

  const vs = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision highp float;
    uniform vec2 uRes;        // CSS px
    uniform float uDpr;
    uniform float uScroll;    // smoothed page scroll, CSS px
    uniform vec2 uTilt;       // mouse offset, CSS px
    uniform float uBeat;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    // One grid layer. Returns dot coverage; "red" marks the rare accent cells.
    float layer(vec2 px, float pitch, float r, float par, float redBoost, out float red) {
      vec2 w = px + vec2(0.0, uScroll * par) + uTilt * par;
      red = step(0.99, hash(floor(w / pitch)));
      float rr = r * (1.0 + red * redBoost);
      float d = length(mod(w, pitch) - pitch * 0.5);
      return 1.0 - smoothstep(rr - 0.5, rr + 0.6, d);
    }

    void main() {
      // Top-down CSS pixel coordinates, like the page.
      vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
      vec3 col = vec3(0.0);
      float red;
      // Near layer: the only one with red accent dots, which swell on the beat.
      float c0 = layer(px, ${f(LAYERS[0][0])}, ${f(LAYERS[0][1])}, ${f(LAYERS[0][3])}, 0.6 + 0.8 * uBeat, red);
      col += mix(vec3(${f(LAYERS[0][2])}), vec3(1.0, 0.23, 0.16) * (0.7 + 0.3 * uBeat), red) * c0;
      float c1 = layer(px, ${f(LAYERS[1][0])}, ${f(LAYERS[1][1])}, ${f(LAYERS[1][3])}, 0.0, red);
      col += vec3(${f(LAYERS[1][2])}) * c1;
      float c2 = layer(px, ${f(LAYERS[2][0])}, ${f(LAYERS[2][1])}, ${f(LAYERS[2][3])}, 0.0, red);
      col += vec3(${f(LAYERS[2][2])}) * c2;
      // Soft falloff towards the edges keeps the grid quiet around the frame.
      vec2 uv = px / uRes;
      col *= smoothstep(1.15, 0.35, length((uv - 0.5) * vec2(1.1, 1.0)));
      gl_FragColor = vec4(col, 1.0);
    }`;

  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  const uRes = U("uRes"), uDpr = U("uDpr"), uScroll = U("uScroll"), uTilt = U("uTilt"), uBeat = U("uBeat");

  const fit = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, innerWidth, innerHeight);
    gl.uniform1f(uDpr, dpr);
  };
  addEventListener("resize", fit);
  fit();

  let sy = scrollY;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener("pointermove", (e) => {
    tilt.tx = (e.clientX / innerWidth - 0.5) * -24;
    tilt.ty = (e.clientY / innerHeight - 0.5) * -24;
  }, { passive: true });

  const draw = () => {
    sy += (scrollY - sy) * 0.14;
    tilt.x += (tilt.tx - tilt.x) * 0.05;
    tilt.y += (tilt.ty - tilt.y) * 0.05;
    gl.uniform1f(uScroll, still ? 0 : sy);
    gl.uniform2f(uTilt, still ? 0 : tilt.x, still ? 0 : tilt.y);
    gl.uniform1f(uBeat, typeof heartbeat === "function" && !still ? heartbeat() : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
