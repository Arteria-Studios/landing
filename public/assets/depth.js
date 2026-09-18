/* ---------- Works: liquid gradient background with scroll parallax (WebGL) ----------
   Soft, dark crimson and maroon colour fields slowly flowing into each other
   (domain-warped low-frequency noise). The field scrolls at a fraction of the
   page speed, so it sits behind the list with a calm parallax. Kept dark,
   darker still on the left under the project names. Rendered at low
   resolution: a smooth gradient needs no detail. With reduced motion it is a
   still image without parallax. */
(() => {
  const canvas = document.querySelector("[data-depth]");
  // Phones have no background here (hidden in CSS): don't start WebGL at all.
  if (!canvas || matchMedia("(max-width: 809px)").matches) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
  if (!gl) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PARALLAX = 0.25;   // gradient moves at a quarter of the page's scroll speed
  const SCALE = 0.35;      // render resolution; CSS scales it up smoothly

  const vs = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
  const fs = `
    precision highp float;
    uniform vec2 uRes;        // canvas size in px
    uniform float uTime;
    uniform float uOffset;    // parallax offset, in screen heights
    uniform float uBeat;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.02 + 17.0; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      float aspect = uRes.x / uRes.y;
      // Page coordinates: the field slides up with scroll, slower than the page.
      vec2 p = vec2(uv.x * aspect, uv.y - uOffset) * 1.1;
      float t = uTime * 0.025;

      // Liquid: noise warped by noise, very low frequency, slow.
      vec2 w = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
      float f = fbm(p + 1.6 * w + vec2(t * 0.6, -t * 0.4));

      vec3 black  = vec3(0.0);
      vec3 maroon = vec3(0.16, 0.0, 0.02);
      vec3 crimson = vec3(0.42, 0.02, 0.04);
      vec3 col = mix(black, maroon, smoothstep(0.3, 0.72, f));
      col = mix(col, crimson, smoothstep(0.56, 0.9, f) * 0.75);
      col *= 0.96 + 0.06 * uBeat;
      // Darker on the left, under the project names.
      col *= mix(0.45, 1.0, smoothstep(0.1, 0.85, uv.x));
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
  const uRes = U("uRes"), uTime = U("uTime"), uOffset = U("uOffset"), uBeat = U("uBeat");

  const fit = () => {
    canvas.width = Math.max(1, Math.round(innerWidth * SCALE));
    canvas.height = Math.max(1, Math.round(innerHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  addEventListener("resize", fit);
  fit();

  let sy = scrollY, time = 20, last = 0;
  const draw = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    sy += (scrollY - sy) * 0.12;
    gl.uniform1f(uTime, still ? 20 : time);
    gl.uniform1f(uOffset, still ? 0 : (sy * PARALLAX) / innerHeight);
    gl.uniform1f(uBeat, typeof heartbeat === "function" && !still ? heartbeat() : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();
