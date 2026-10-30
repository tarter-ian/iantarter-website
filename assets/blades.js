// Lays real grass blade sprites over the edges of every .lay element so the pieces look like they sit in the lawn.
(async () => {
  // where the site's root is, so the pages in subfolders (case studies, games) find the same files
  const ROOT = new URL("..", document.currentScript.src).href;
  // real moss sprigs (photographed cut-outs, regraded to the ground's colours), the same kind of moss the ground is made of
  const sprites = (await (await fetch(ROOT + "assets/blades/index.json?v=4")).json()).filter(s => s.kind === "sprig").map(s => ({ ...s, src: ROOT + s.src }));
  const blades = sprites, clumps = sprites, moss = sprites, slim = sprites.filter(s => s.w > 100 * s.h / 360); // the name gets the leafy ones
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  // an element's unrotated top-left corner, relative to the scene
  const offset = el => { const root = el.closest(".x-i").getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - el.offsetWidth / 2 - root.left, y: r.top + r.height / 2 - el.offsetHeight / 2 - root.top }; };
  function put(el, ox, oy, sp, x, y, len, ang, reuse) {
    const sw = sp.w * len / sp.h, b = reuse || document.createElement("i"); b._base = b._pp = null; b.className = "blade"; b.setAttribute("aria-hidden", "true");
    const left = x - sw / 2, top = y - len;
    Object.assign(b.style, { width: sw + "px", height: len + "px", left: left + "px", top: top + "px", transform: `rotate(${ang}deg)` });
    b.style.setProperty("--m", `url("${new URL(sp.src, location.href).href}")`); b.style.setProperty("--sp", `url("${new URL(sp.src, location.href).href}")`);
    b.style.setProperty("--ox", (ox + left) + "px"); b.style.setProperty("--oy", (oy + top) + "px");
    if (!reuse) el.appendChild(b); return b;
  }
  // The name's letters lie in the grass: blades grow up around each letter's outline and lean in over its edges.
  // Edge points come from the letter's own pixels; each blade roots just outside and points along the inward normal.
  // the letters' pixels are read through one reusable canvas kept on the CPU (reading the letters' own canvases made the
  // browser warn, and pull each one back from the GPU)
  let pxc = null;
  // the strips are never read back, so their canvases can live on the graphics card, where brushing repaints them without
  // copying every changed frame up from memory (?cpu keeps them in memory, as before, to compare)
  const STRIP = /[?&]cpu\b/.test(location.search) ? { willReadFrequently: true } : undefined;
  const readPx = (cv, W, H) => { if (!pxc) pxc = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (pxc.canvas.width < W) pxc.canvas.width = W; if (pxc.canvas.height < H) pxc.canvas.height = H;
    pxc.clearRect(0, 0, W, H); pxc.drawImage(cv, 0, 0); return pxc.getImageData(0, 0, W, H).data; };
  function dressName(lay) {
    const cvs = lay.querySelectorAll(".fill-cv > canvas:not(.alt):not(.spin-cv):not(.rock-shadow)"); if (!cvs.length) return false;
    // a second dressing (the layout often settles again once the fonts arrive) moves the sprigs already there instead of
    // swapping them for new ones, which Safari showed as the sprigs blinking out and back
    const old = [...lay.querySelectorAll(":scope > .blade")];
    const root = lay.closest(".x-i").getBoundingClientRect(), lr = lay.getBoundingClientRect(), ox = lr.left - root.left, oy = lr.top - root.top;
    cvs.forEach(cv => {
      const r = cv.getBoundingClientRect(), W = cv.width, H = cv.height, k = r.width / W;
      const a = readPx(cv, W, H), A = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : a[(y * W + x) * 4 + 3];
      const pts = [];
      for (let y = 1; y < H - 1; y += 2) for (let x = 1; x < W - 1; x += 2) {
        if (A(x, y) < 128) continue; const gx = A(x + 1, y) - A(x - 1, y), gy = A(x, y + 1) - A(x, y - 1);
        if (Math.abs(gx) + Math.abs(gy) < 120) continue; pts.push([x, y, gx, gy]); }
      const step = Math.max(1, Math.round(pts.length / (pts.length * k / 9))); // sprigs are leafier than blades, so fewer of them
      for (let i = Math.floor(rnd() * step); i < pts.length; i += step) {
        const [x, y, gx, gy] = pts[i], gl = Math.hypot(gx, gy), nx = gx / gl, ny = gy / gl; // points inward (toward more ink)
        const len = 14 + rnd() * 18, intrude = 2 + rnd() * 6, out = len - intrude;
        const px = r.left - lr.left + x * k - nx * out, py = r.top - lr.top + y * k - ny * out;
        const ang = Math.atan2(nx, -ny) * 180 / Math.PI + (rnd() - .5) * 50;
        // root at (px, py): put() places the blade's foot at x, y + 0 when top = y - len, so pass the root as the foot
        put(lay, ox, oy, pick(slim), px, py, len, ang, old.shift());
      }
    });
    old.forEach(b => b.remove());
    return true;
  }
  // ---------- Painting grass on canvas ----------
  // Every blade is a real moss sprig in the ground's colours, lit by the same canopy light as the spot it lies in. The blades around a piece are painted once into a few canvas
  // strips (one per edge) instead of being hundreds of masked elements, which is what made scrolling and brushing lag.
  const DPR = Math.min(2, devicePixelRatio || 1);
  // (asked for with CORS, so canvases and WebGL may read them even when a host serves the files from another address)
  const load = src => new Promise(r => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  // the strand maps only matter where a cursor can stir the moss, so touch screens skip downloading them
  const stir = matchMedia("(hover: hover)").matches;
  const [MOSS, SHADE, SUN, FRONDS, BARE] = await Promise.all([ROOT + "assets/tex/moss-quiet-2k.webp", ROOT + "assets/tex/canopy-shade-L.webp", ROOT + "assets/tex/canopy-sun-2.webp", stir && ROOT + "assets/tex/moss-fronds.webp", stir && ROOT + "assets/tex/moss-bare.webp?v=2"].map(u => u ? load(u) : null));
  const imgs = new Map(); const sprite = sp => imgs.get(sp.src) || (imgs.set(sp.src, load(sp.src)), imgs.get(sp.src));
  await Promise.all(sprites.map(sprite)); for (const sp of sprites) sp.img = await sprite(sp);
  let PW = 1, PH = 1;
  const scene = () => document.querySelector(".x-i");
  // where this page lies on the forest floor (set in each page's head, so the light and moss run on from the last page)
  const FX = () => (window.__floor || {}).x || 0, FY = () => (window.__floor || {}).y || 0;
  const pat = (ctx, img, px, py, size, ox = 0, oy = 0) => { const p = ctx.createPattern(img, "repeat"); p.setTransform(new DOMMatrix().translate(ox - px, oy - py).scale(size / img.width)); return p; };
  // fill a w x h box whose top-left sits at (px, py) in the scene with exactly what the ground looks like there (see dir-i.css)
  // with a base image, that image takes the moss's place and gets the same light, cut to its own shape
  function paintGround(ctx, px, py, w, h, base, bare) {
    ctx.save(); ctx.globalCompositeOperation = "source-over";
    if (base) ctx.drawImage(base, 0, 0, w, h); else if (MOSS) { ctx.fillStyle = pat(ctx, MOSS, px + FX(), py + FY(), 900); ctx.fillRect(0, 0, w, h); }
    ctx.fillStyle = "rgba(22,28,12,.2)"; ctx.fillRect(0, 0, w, h);
    if (!bare) { // a blade's own shading, darker at its root; the open ground has none
      const tint = ctx.createLinearGradient(0, h, 0, 0); tint.addColorStop(0, "rgba(0,0,0,.12)"); tint.addColorStop(.7, "rgba(255,250,210,.04)"); tint.addColorStop(1, "rgba(255,250,210,.08)");
      ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); }
    ctx.globalCompositeOperation = "multiply";
    { const a = 150 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(PW * dx) + Math.abs(PH * dy), cx = PW / 2 - px, cy = PH / 2 - py;
      const g = ctx.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2);
      g.addColorStop(0, "rgb(255,253,249)"); g.addColorStop(.55, "rgb(246,246,239)"); g.addColorStop(1, "rgb(232,234,223)"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    { ctx.save(); const rx = 1.4 * PW, ry = PH; ctx.translate(.25 * PW - px, .15 * PH - py); ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.55, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(40,48,30,.27)");
      ctx.fillStyle = g; ctx.fillRect(-(.25 * PW - px) * ry / rx, -(.15 * PH - py), w * ry / rx, h); ctx.restore(); }
    if (SHADE) { ctx.fillStyle = pat(ctx, SHADE, px + FX(), py + FY(), 1600, -180, -120); ctx.fillRect(0, 0, w, h); }
    if (SUN) { ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = pat(ctx, SUN, px + FX(), py + FY(), 1600, -180, -120); ctx.fillRect(0, 0, w, h); }
    if (base) { ctx.globalCompositeOperation = "destination-in"; ctx.drawImage(base, 0, 0, w, h); }
    ctx.restore();
  }
  // one sprig, painted upright in the light of the spot it lies in
  function bladeImage(g) {
    if (g.cv) return g.cv;
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    cv.width = Math.max(1, Math.ceil(g.w * DPR)); cv.height = Math.max(1, Math.ceil(g.len * DPR)); ctx.scale(DPR, DPR);
    paintGround(ctx, g.px, g.py, g.w, g.len, g.sp.img);
    return (g.cv = cv);
  }

  function liftImage(g) {
    if (g.hi) return g.hi;
    const base = bladeImage(g), cv = document.createElement("canvas"), ctx = cv.getContext("2d"); cv.width = base.width; cv.height = base.height;
    ctx.drawImage(base, 0, 0); ctx.globalCompositeOperation = "source-atop";
    const gr = ctx.createLinearGradient(0, cv.height, 0, 0); gr.addColorStop(0, "rgba(255,250,220,0)"); gr.addColorStop(1, "rgba(255,250,220,.22)");
    ctx.fillStyle = gr; ctx.fillRect(0, 0, cv.width, cv.height); return (g.hi = cv);
  }
  const shadows = new Map();
  function shadowImage(sp) { // the sprite's silhouette in soft dark
    if (shadows.has(sp.src)) return shadows.get(sp.src);
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d"); cv.width = sp.img.width; cv.height = sp.img.height;
    ctx.drawImage(sp.img, 0, 0); ctx.globalCompositeOperation = "source-in"; ctx.fillStyle = "rgba(10,12,0,.28)"; ctx.fillRect(0, 0, cv.width, cv.height);
    shadows.set(sp.src, cv); return cv;
  }
  // blades rotate about their foot (x, y); ang in degrees
  function drawBlade(ctx, g, x, y, ang, alpha = 1, sc = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang * Math.PI / 180); if (sc !== 1) ctx.scale(sc, sc); ctx.drawImage(bladeImage(g), -g.w / 2, -g.len, g.w, g.len); ctx.restore();
  }
  // each blade's shadow is its silhouette, softened once at its own size, so it can be redrawn wherever the blade bends
  const SP = 3;
  function softShadow(g) {
    if (g.shd) return g.shd;
    const c = document.createElement("canvas"), x = c.getContext("2d"); c.width = Math.ceil((g.w + 2 * SP) * DPR); c.height = Math.ceil((g.len + 2 * SP) * DPR);
    x.scale(DPR, DPR); if ("filter" in x) x.filter = "blur(.9px)"; x.drawImage(shadowImage(g.sp), SP, SP, g.w, g.len); return (g.shd = c);
  }
  function drawShadow(ctx, g, x, y, ang, alpha = 1, sc = 1) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + .6, y + 1.6); ctx.rotate(ang * Math.PI / 180); if (sc !== 1) ctx.scale(sc, sc);
    ctx.drawImage(softShadow(g), -g.w / 2 - SP, -g.len - SP, g.w + 2 * SP, g.len + 2 * SP); ctx.restore();
  }
  const strips = new Set();
  // a strip: one canvas holding every blade along one edge of a piece, plus their shadows where they fall on the piece
  // a blade's reach around its foot, whatever way it bends
  const reach = g => g.rr || (g.rr = Math.hypot(g.w / 2, g.len) + 2);
  // with `dirty` (the blades that moved), only the box around them is repainted, which keeps brushing cheap
  function paintStrip(st, dirty) {
    // a strip with a twin keeps its sprigs' shadows there, on a layer under every sprig of its edge (see dress)
    const { cv, ctx, x0, y0 } = st, sx = st.twin ? st.twin.ctx : ctx, cxs = st.twin ? [ctx, sx] : [ctx];
    let box = null;
    for (const c of cxs) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); }
    if (dirty) { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const g of dirty) { const R = reach(g) + SP + 2; l = Math.min(l, g.x - R); t = Math.min(t, g.y - R); r = Math.max(r, g.x + R); b = Math.max(b, g.y + R); }
      box = [l, t, r, b]; const X = Math.floor((l - x0) * DPR), Y = Math.floor((t - y0) * DPR), W = Math.ceil((r - x0) * DPR) - X, H = Math.ceil((b - y0) * DPR) - Y;
      for (const c of cxs) { c.beginPath(); c.rect(X, Y, W, H); c.clip(); c.clearRect(X, Y, W, H); } }
    else for (const c of cxs) c.clearRect(0, 0, cv.width, cv.height);
    for (const c of cxs) c.setTransform(DPR, 0, 0, DPR, -x0 * DPR, -y0 * DPR);
    const gr = st.gr, now = vt, near = g => { if (!box) return true; const R = reach(g) + SP + 2; return !(g.x + R < box[0] || g.x - R > box[2] || g.y + R < box[1] || g.y - R > box[3]); };
    // where each blade is now: its turn, and while growing in, its size and fade
    const pose = g => { if (!gr) return [g.moving ? g.ang + g.bend : g.ang, 1, 1];
      const u = Math.min(1, Math.max(0, (now - gr.t0 - g.gd) / GROW)); return u <= 0 ? null : [g.ang, Math.min(1, u * 4), .12 + .88 * (1 - Math.pow(1 - u, 3))]; };
    // the blades' shadows fall only on the piece (on the ground they'd show as dark smudges), and move with their blades
    if (!st.shape) { const el = st.el; st.shape = [el.offsetWidth, el.offsetHeight, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0]; }
    const [w, h, rad] = st.shape; sx.save(); sx.beginPath(); sx.roundRect ? sx.roundRect(0, 0, w, h, rad) : sx.rect(0, 0, w, h); sx.clip();
    for (const g of st.blades) { if (!near(g)) continue; const P = pose(g); if (P) drawShadow(sx, g, g.x, g.y, P[0], P[1], P[2]); }
    sx.restore();
    // a bending blade is drawn right here in its own strip, so it stays under whatever lies on top of its piece
    for (const g of st.blades) { if (!near(g)) continue; const P = pose(g); if (P) drawBlade(ctx, g, g.x, g.y, P[0], P[1], P[2]); }
    // the piece's own shadow doesn't fall on them: they lean up over its edge, above it
    for (const c of cxs) c.restore();
  }
  // On first load the grass grows in: each strip rises from the ground outside its edge onto the card, the name's sprigs
  // from their roots, all at once. Only once per edge: a relayout or a brushed strip
  // just shows.
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches, EASE = "cubic-bezier(.2, .7, .3, 1)";
  // a strip grows as a live canvas: every sprig rises from its own root, scaling up whole (not squashed), each a little
  // after the last; the sprigs' shadows on the card come in with them. Then it turns back into an image as usual.
  const GROW = 950, growing = new Set();
  // work nobody sees right away (the cursor's map of the blades, the baked light, the stirrable moss) waits until the grass
  // has grown in, so it doesn't hold up the grass's first frames (Ian: "they take quite a bit of time to load")
  let settled = false; const waiting = new Set();
  const later = f => { if (settled) setTimeout(f, 50); else waiting.add(f); };
  const settle = () => { if (settled) return; settled = true; for (const f of waiting) setTimeout(f, 50); waiting.clear(); };
  setTimeout(settle, 6000);
  // when the grass is redone mid-growth (the page often settles its layout once more just after loading), the new grass
  // carries on from the same start, so the growing isn't cut short and nothing flicks on
  // Growth runs on its own clock, which only moves while frames are actually drawn (at most a frame's worth per frame):
  // while loading, the page can be too busy to draw for seconds, and on the wall clock the grass had finished growing
  // before anyone saw it, so it just flicked on.
  let vt = 0, lastFrame = null, grassGo = false;
  const tick = () => { const n = performance.now(); if (lastFrame != null) vt += Math.min(34, n - lastFrame); lastFrame = n; return vt; };
  // Only grass in view grows (the rest is ready before it's scrolled to), and each strip's sprigs are painted a few at a
  // time ahead of their turn, so a growing frame only places finished pictures.
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > -80 && r.top < innerHeight + 80; };
  const prep = [];
  // a page built ahead of a click (Chrome's prerender) draws no frames until it is shown, so its painting runs on timers
  const soon = f => document.prerendering ? setTimeout(f, 0) : requestAnimationFrame(f);
  function prepare(st, then) { st.ready = false; if (then) prep.push([st, 0, then]); else prep.unshift([st, 0]); /* growing grass first */ if (!prepare.raf) prepare.raf = soon(prepFrame); }
  function prepFrame() {
    // until the grass starts growing nothing is moving, so the first paint-ahead takes bigger bites (at 5ms a frame the
    // sprigs took seconds to start; Ian: "they take quite a bit of time to load")
    prepare.raf = 0; const end = performance.now() + (grassGo ? 5 : 40);
    while (prep.length && performance.now() < end) { const job = prep[0], [st] = job;
      if (!strips.has(st)) { prep.shift(); continue; }
      const g = st.blades[job[1]++]; if (g) { bladeImage(g); softShadow(g); }
      if (job[1] >= st.blades.length) { prep.shift(); st.ready = true; job[2] && job[2](st); } }
    if (prep.length) prepare.raf = soon(prepFrame);
  }
  const EDGE = { top: 0, left: 80, right: 120, bottom: 160 };
  // grass below the first screen waits, blank, until its piece scrolls into view, then grows there
  const seen = "IntersectionObserver" in window && new IntersectionObserver(es => { for (const e of es) { if (!e.isIntersecting) continue;
    const el = e.target, at = el._growAt; seen.unobserve(el);
    // (an edge can be several strips: they all start together)
    for (const st of strips) if (st.el === el && st.wait) { if (at[st.edge] === "wait") at[st.edge] = vt + 60; st.wait = false; grow(st); }
    // grass out of view is painted ahead of time; any not painted yet when its piece comes into view grows in there instead
    for (const st of strips) if (st.el === el && st.pending) { const j = prep.findIndex(q => q[0] === st); if (j >= 0) prep.splice(j, 1);
      // grass that has shown before is finished right away; grass never seen yet grows in here
      if (el._shown && el._shown[st.edge]) { for (const g of st.blades) { bladeImage(g); softShadow(g); } st.ready = true; putUp(st); continue; }
      st.pending = false; if (--el._pend <= 0) dropOld(el); at[st.edge] = vt + 60; grow(st); } } });
  function grow(st) {
    const k = st.edge, at = st.el._growAt || (st.el._growAt = {}), now = vt;
    // everything on screen grows at once (Ian: simultaneous), not top of the page first or one edge after another
    // and grass out of view is simply there when it's scrolled to (Ian: it can be instant if not visible)
    if (at[k] == null) at[k] = inView(st.el) || still() ? now + 120 : -1e9;
    if (at[k] === "wait") { st.wait = true; prepare(st); seen.observe(st.el); return true; }
    const t0 = at[k], dur = GROW + 500; if (now > t0 + dur) return false;
    if (still()) { for (const s of pair(st)) s.img.animate && s.img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: t0 - now, fill: "backwards" }); return false; }
    st.gr = { t0, dur };
    st.blades.forEach((g, i) => { g.gd = ((i * 2654435761) % 1000) / 1000 * 120; });
    // a redress mid-growth carries straight on
    thaw(st); growing.add(st); if (now >= t0) st.ready = st.begun = true; else if (!st.ready) prepare(st); if (!growFrame.raf) growFrame.raf = requestAnimationFrame(growFrame); return true;
  }
  function growFrame() {
    growFrame.raf = 0; const now = tick();
    // while any strip due to start isn't painted yet, every strip that hasn't begun waits with it, so they all start together
    let held = false; for (const st of growing) if (!st.ready && now >= st.gr.t0) held = true;
    for (const st of growing) {
      if (!st.begun && now >= st.gr.t0 && held) { st.gr.t0 = st.el._growAt[st.edge] = now; continue; }
      if (now < st.gr.t0) continue;
      if (!st.begun) { st.begun = true; if (!grassGo) { grassGo = true; dispatchEvent(new Event("grass-go")); } growFx(st); }
      if (now > st.gr.t0 + st.gr.dur && st.fxDone) { st.gr = null; growing.delete(st); paintStrip(st); endFx(st); st.live = false; freeze(st); shown(st); } }
    if (growing.size) growFrame.raf = requestAnimationFrame(growFrame); else { lastFrame = null; if (grassGo) settle(); }
  }
  // The growing itself is played by the browser's compositor, not drawn frame by frame: each sprig (and its shadow) is put
  // up as its own little picture and scaled up from its root by a CSS animation, which stays smooth while the page is busy
  // loading (Ian: the growing was jittery). The real strip is painted underneath, hidden, and takes over in the same frame
  // the stand-ins are removed; at full size they are the same pictures in the same places.
  function growFx(st) {
    const el = st.el, [w, h, rad] = st.shape || (st.shape = [el.offsetWidth, el.offsetHeight, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0]);
    const sh = document.createElement("div"), fx = document.createElement("div");
    sh.className = fx.className = "blade-strip grow-fx"; sh.setAttribute("aria-hidden", "true"); fx.setAttribute("aria-hidden", "true");
    Object.assign(sh.style, { left: 0, top: 0, width: w + "px", height: h + "px", overflow: "hidden", borderRadius: rad + "px" }); Object.assign(fx.style, { left: 0, top: 0, width: 0, height: 0 });
    const first = pair(st)[0]; first.img.before(sh); first.img.before(fx);
    for (const s of pair(st)) s.cv.style.visibility = "hidden";
    let left = 0; const done = () => { if (--left <= 0) st.fxDone = true; };
    const put = (box, c, x, y, cw, ch, ox, oy, g) => {
      c.className = ""; Object.assign(c.style, { position: "absolute", left: x + "px", top: y + "px", width: cw + "px", height: ch + "px", transformOrigin: `${ox}px ${oy}px`, opacity: 0 }); box.appendChild(c);
      const r = `rotate(${g.ang}deg)`, o = { delay: g.gd, fill: "both" }; left += 2;
      c.animate([{ transform: `${r} scale(.12)` }, { transform: r }], { ...o, duration: GROW, easing: "cubic-bezier(.33, 1, .68, 1)" }).finished.then(done, done);
      c.animate([{ opacity: 0 }, { opacity: 1 }], { ...o, duration: GROW / 4 }).finished.then(done, done); };
    for (const g of st.blades) { const c = softShadow(g); put(sh, c, g.x + .6 - g.w / 2 - SP, g.y + 1.6 - g.len - SP, g.w + 2 * SP, g.len + 2 * SP, g.w / 2 + SP, g.len + SP, g); }
    for (const g of st.blades) put(fx, bladeImage(g), g.x - g.w / 2, g.y - g.len, g.w, g.len, g.w / 2, g.len, g);
    st.fx = [sh, fx]; if (!left) st.fxDone = true;
  }
  function endFx(st) {
    for (const s of pair(st)) s.cv.style.visibility = "";
    if (st.fx) { for (const box of st.fx) { for (const c of [...box.children]) { c.getAnimations().forEach(a => a.cancel()); c.removeAttribute("style"); c.remove(); } box.remove(); } st.fx = null; }
  }
  // the name's sprigs grow the same way, each from its own root, on their own frame-paced clock (on a busy phone,
  // timed animations had finished before the page could draw, so the sprigs just appeared); the clock waits for the ground
  // to show, and a redress mid-growth carries on from where it was
  const bez = (x1, y1, x2, y2) => t => { let lo = 0, hi = 1, u = t; for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const x = 3 * u * (1 - u) * (1 - u) * x1 + 3 * u * u * (1 - u) * x2 + u * u * u; if (x < t) lo = u; else hi = u; }
    return 3 * u * (1 - u) * (1 - u) * y1 + 3 * u * u * (1 - u) * y2 + u * u * u; };
  const nameEase = bez(.2, .7, .3, 1);
  function growName(lay) {
    if (lay._grown) return;
    // played by the compositor too, once the cards' grass starts (each sprig hidden until then)
    const quiet = still(), bl = [...lay.querySelectorAll(":scope > .blade")];
    if (lay._gstart) return; for (const b of bl) b.style.opacity = "0";
    const go = () => { if (lay._gstart) return; lay._gstart = true;
      const dur = quiet ? 500 : 1000, bs = [...lay.querySelectorAll(":scope > .blade")]; let left = bs.length;
      bs.forEach((b, i) => { const t = b.style.transform, hh = parseFloat(b.style.height) / 2, o = { delay: (i % 9) * 15, fill: "backwards" }; b.style.opacity = "1";
        if (!quiet) b.animate([{ transform: `${t} translateY(${hh}px) scale(.12) translateY(${-hh}px)` }, { transform: t }], { ...o, duration: dur, easing: "cubic-bezier(.2, .7, .3, 1)" });
        const a = b.animate([{ opacity: 0 }, { opacity: 1 }], { ...o, duration: quiet ? dur : dur * .3 }); a.finished.then(() => { if (--left <= 0) lay._grown = true; }, () => {}); }); };
    if (grassGo) go(); else { addEventListener("grass-go", go, { once: true }); setTimeout(go, 4000); }
  }
  // a strip's share of its piece's shadow: the soft box-shadows exactly as CSS casts them, kept off the piece itself with a
  // feathered edge (a sprig leaning over the edge lifts off the ground, so the shade fades onto it instead of stopping on
  // a hard line). The hard shadows are left out: they are the piece's own edge, which the sprigs lie over, not under.
  function shade(st) {
    if (st.shade && st.shade.width) return st.shade;
    const c = st.shade = document.createElement("canvas"), x = c.getContext("2d"); c.width = st.cv.width; c.height = st.cv.height;
    const el = st.el, w = el.offsetWidth, h = el.offsetHeight, rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, F = 20000;
    const rr = (X, Y, W, H, r) => { x.beginPath(); x.roundRect ? x.roundRect(X, Y, W, H, r) : x.rect(X, Y, W, H); };
    x.setTransform(DPR, 0, 0, DPR, -st.x0 * DPR, -st.y0 * DPR); x.fillStyle = "#000";
    for (const b of boxShadows(el).filter(b => b.b > 1)) {
      Object.assign(x, { shadowColor: b.c, shadowBlur: b.b * DPR, shadowOffsetX: (F + b.x) * DPR, shadowOffsetY: b.y * DPR });
      rr(-F - b.s, -b.s, w + 2 * b.s, h + 2 * b.s, rad + b.s); x.fill();
    }
    x.shadowColor = "transparent"; x.globalCompositeOperation = "destination-out"; if ("filter" in x) x.filter = "blur(2px)";
    rr(0, 0, w, h, rad); x.fill();
    return c;
  }
  function boxShadows(el) {
    const v = getComputedStyle(el).boxShadow; if (!v || v === "none") return [];
    return v.split(/,(?![^(]*\))/).filter(x => !/inset/.test(x)).map(x => {
      const c = (x.match(/rgba?\([^)]*\)|#[0-9a-f]+/i) || ["rgba(0,0,0,.3)"])[0], n = x.replace(c, "").trim().split(/\s+/).map(parseFloat);
      return { c, x: n[0] || 0, y: n[1] || 0, b: n[2] || 0, s: n[3] || 0 }; });
  }
  // With a mouse, a strip simply stays a canvas: encoding it to an image after every brush cost a hitch each time, and the
  // swap between the two could shift the sprigs' colour a touch. Phones (no brushing, tight on canvas memory) still get images.
  const KEEP = matchMedia("(hover: hover)").matches;
  const pair = st => st.twin ? [st.twin, st] : [st];
  function freeze(st) { for (const s of pair(st)) freezeOne(s, st); }
  function freezeOne(s, st) {
    if (KEEP) { if (!s.cv.parentNode) s.img.after(s.cv); s.img.style.visibility = "hidden"; s.img.removeAttribute("src"); return; }
    s.cv.toBlob(b => { if (!b || st.live) return; const old = s.url; s.url = URL.createObjectURL(b);
      // swap back only once the new image is decoded and ready to paint, so the strip never blinks
      s.img.src = s.url; s.img.decode().catch(() => {}).then(() => { if (old) URL.revokeObjectURL(old); if (st.live) return;
        s.img.style.visibility = ""; requestAnimationFrame(() => { if (!st.live) { s.cv.remove(); if (s === st) release(st); else s.cv.width = s.cv.height = 0; } }); }); });
  }
  // a frozen strip gives back its canvases' memory (phones run out of canvas memory and then draw new canvases blank);
  // they're painted again the next time a blade in it bends
  function release(st) {
    st.cv.width = st.cv.height = 0; if (st.shade) st.shade.width = 0;
    for (const g of st.blades) for (const k of ["cv", "shd"]) if (g[k]) { g[k].width = g[k].height = 0; g[k] = null; }
  }
  function thaw(st) { clearTimeout(st.ft); if (st.live) return; st.live = true;
    for (const s of pair(st)) { if (s.cv.width !== st.W) { s.cv.width = st.W; s.cv.height = st.H; } if (!s.cv.parentNode) s.img.after(s.cv); s.img.style.visibility = "hidden"; } }
  function place(el, list, ox, oy, sp, edge, t, len, intrude, jitter) {
    const w = el.offsetWidth, h = el.offsetHeight, sw = sp.w * len / sp.h;
    const ang = { top: 180, bottom: 0, left: 90, right: -90 }[edge] + jitter;
    const reach = len * Math.abs(Math.cos(jitter * Math.PI / 180)), out = reach - intrude; // how far outside the edge the root sits
    let x, y; // root point in the element's own coordinates
    if (edge === "top") { x = t * w; y = -out; } else if (edge === "bottom") { x = t * w; y = h + out; }
    else if (edge === "left") { x = -out; y = t * h; } else { x = w + out; y = t * h; }
    { const er = el.getBoundingClientRect(), rx = er.left + x, ry = er.top + y;
      if (noGrass.some(n => n.el !== el && rx > n.r.left - 4 && rx < n.r.right + 4 && ry > n.r.top - 4 && ry < n.r.bottom + 4)) return; }
    // px, py: the top-left of the upright blade in the scene, where its fill comes from
    list.push({ el, edge, sp, x, y, w: sw, len, ang, px: ox + x - sw / 2, py: oy + y - len });
  }
  let noGrass = [];
  const small = () => innerWidth < 700, K = () => small() ? .7 : 1;
  function dress(el) {
    // grass that has already shown stays up until its replacement is painted, so a relayout never leaves a piece bare
    el.querySelectorAll(":scope > .blade, :scope > .blade-clip").forEach(b => b.remove());
    const olds = (el._olds || []).concat([...el.querySelectorAll(":scope > .blade-strip")]); el._olds = null; el._pend = 0;
    if (!el._shown) olds.forEach(b => b.remove()); else el._olds = olds;
    for (const st of [...strips]) if (st.el === el) { strips.delete(st); growing.delete(st); }
    const { x: ox, y: oy } = offset(el), list = [];
    const name = el.classList.contains("lay-name"), tab = !!el.closest(".hand");
    // menu cards are tucked under the top edge, so only their bottom edge lies in the grass
    const edges = name || tab ? ["bottom"] : ["top", "bottom", "left", "right"];
    for (const edge of edges) {
      const span = edge === "top" || edge === "bottom" ? el.offsetWidth : el.offsetHeight;
      const n = Math.max(3, Math.round(span / (name ? 14 : small() ? 24 : 15) * (0.7 + rnd() * 0.6)));
      for (let i = 0; i < n; i++) {
        const t = (i + rnd()) / n, clump = rnd() < (name ? .55 : .45);
        const len = (clump ? 36 + rnd() * 28 : 32 + rnd() * 34) * K();
        const m = !name && rnd() < .3;
        place(el, list, ox, oy, pick(m ? moss : clump ? clumps : blades), edge, Math.min(.98, Math.max(.02, t)), len, tab ? 3 + rnd() * 7 : (name ? 10 : 5) + rnd() * (name ? 16 : 12), (rnd() - .5) * 80);
      }
    }
    // the sprigs along the left and right edges are cut into pieces about 90px long, so a gust from scrolling can lean each
    // piece as it passes instead of the whole edge at once. Each piece's shadows go on a twin layer, and all of an edge's
    // shadow layers lie under all of its sprig layers, so no piece's shadow ever falls on a neighbour's sprigs.
    const groups = [];
    for (const edge of edges) {
      const all = list.filter(g => g.edge === edge); if (!all.length) continue;
      if (edge !== "left" && edge !== "right") { groups.push([edge, all, false]); continue; }
      const by = new Map(); for (const g of all) { const k = Math.floor(g.y / 90); (by.get(k) || by.set(k, []).get(k)).push(g); }
      [...by.keys()].sort((a, b) => a - b).forEach(k => groups.push([edge, by.get(k), true]));
    }
    const shadowsFirst = new Map();
    for (const [edge, bl, cut] of groups) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const g of bl) { const R = Math.hypot(g.w / 2, g.len) + 4; x0 = Math.min(x0, g.x - R); y0 = Math.min(y0, g.y - R); x1 = Math.max(x1, g.x + R); y1 = Math.max(y1, g.y + R); }
      x0 = Math.floor(x0); y0 = Math.floor(y0);
      // painted on a canvas, but shown as a plain image: a page full of live canvases is slow to scroll. The canvas only
      // steps in while the cursor is bending one of its blades, then hands back to a fresh image (on phones; see freeze)
      const cv = document.createElement("canvas"), img = new Image(); img.style.visibility = "hidden"; // shown once its picture is decoded
      cv.width = Math.ceil((x1 - x0) * DPR); cv.height = Math.ceil((y1 - y0) * DPR);
      const mk = () => { const c = document.createElement("canvas"), m = new Image(); m.style.visibility = "hidden"; c.width = cv.width; c.height = cv.height;
        return [c, m]; };
      const [tcv, timg] = cut ? mk() : [null, null];
      for (const n of [cv, img, tcv, timg]) { if (!n) continue; n.className = cut ? "blade-strip side" : "blade-strip"; n.setAttribute("aria-hidden", "true"); n.alt = "";
        Object.assign(n.style, { left: x0 + "px", top: y0 + "px", width: cv.width / DPR + "px", height: cv.height / DPR + "px" }); }
      if (cut) { // the edge's shadow layers go in front of its first sprig layer, in order
        const first = shadowsFirst.get(edge); if (first) el.insertBefore(timg, first); else el.appendChild(timg); }
      el.appendChild(img); if (cut && !shadowsFirst.has(edge)) shadowsFirst.set(edge, img);
      const st = { el, edge, cv, img, ctx: cv.getContext("2d", STRIP), x0, y0, blades: bl, W: cv.width, H: cv.height }; bl.forEach(g => g.st = st);
      if (cut) st.twin = { cv: tcv, img: timg, ctx: tcv.getContext("2d", STRIP) };
      // the fresh canvas shows at once (a relayout swaps old grass for new in the same frame) and hands over to its image
      strips.add(st); if (grow(st)) continue;
      // grass out of view is painted a little at a time once the visible grass is done
      if (inView(el)) { paintStrip(st); for (const s of pair(st)) s.img.after(s.cv); freeze(st); shown(st); }
      else { st.pending = true; el._pend++; if (seen) seen.observe(el); prepare(st, putUp); }
    }
    if (!el._pend) dropOld(el);
  }
  // an edge that has shown once never grows in again: a relayout's new grass just replaces it
  const shown = st => { (st.el._shown || (st.el._shown = {}))[st.edge] = true; };
  const dropOld = el => { if (el._olds) { el._olds.forEach(b => b.remove()); el._olds = null; } };
  function putUp(st) { st.pending = false; paintStrip(st); for (const q of pair(st)) q.img.after(q.cv); freeze(st); shown(st); if (--st.el._pend <= 0) dropOld(st.el); }
  const all = () => {
    noGrass = [...document.querySelectorAll(".no-grass")].map(n => ({ el: n, r: n.getBoundingClientRect() }));
    document.querySelectorAll(".lay").forEach(el => {
      if (!el.classList.contains("lay-name")) return dress(el);
      // the name draws from its own random sequence, so whenever it gets dressed the cards' grass comes out the same
      const go = (n = 0) => { const s0 = seed; seed = 911; const ok = dressName(el); seed = s0; if (ok) growName(el); if (ok) dispatchEvent(new Event("name-dressed")); else if (n < 40) setTimeout(() => go(n + 1), 150); }; go(); });
  };
  // the name's letters were redrawn (the scatter preview): fit the sprigs already there to the new letters
  addEventListener("name-rebuilt", () => setTimeout(() => { const el = document.querySelector(".lay-name"); if (!el) return;
    const s0 = seed; seed = 911; dressName(el); seed = s0; index(); }, 80));
  // Each lit piece gets its scene offset, so the shared light (baked into backgrounds in CSS) lines up across pieces.
  function relight() {
    const sc = scene(); PW = sc.offsetWidth; PH = sc.offsetHeight; sc.style.setProperty("--pw", PW + "px"); sc.style.setProperty("--ph", PH + "px");
    document.querySelectorAll(".card, .hand a").forEach(el => { const o = offset(el); el.style.setProperty("--ox", o.x + "px"); el.style.setProperty("--oy", o.y + "px"); });
  }
  // ---------- The pieces' lighting, drawn once ----------
  // Each card and menu card is lit by a stack of see-through layers (sun flecks, canopy shade, the page-wide falloff) blended
  // over its paper (dir-i.css). The browser redid that blending for every bit of every card it drew, which on a fast
  // scroll couldn't keep up (bare green showed until the cards came in). So once the layout settles, each piece's stack is
  // blended here, with the same blend steps, into one picture that then stands in for it. Redone when the layout changes.
  const texs = new Map(), tex = src => texs.get(src) || (texs.set(src, load(src)), texs.get(src));
  const BAKE = { card: ["tex/canopy-shade-card.webp", "tex/linen-n.webp", 512, "normal", [246, 246, 243], true], hand: ["tex/canopy-shade-L.webp", "tex/linen-n.webp", 512, "normal", [243, 243, 239], false],
    handR: ["tex/canopy-shade-L.webp", "tex/paper006_tile-1024.webp", 220, "multiply", [34, 33, 29], false] };
  let bakeGen = 0;
  async function bakeLight() {
    const gen = ++bakeGen, dpr = Math.min(2, devicePixelRatio || 1);
    await bakeGround(gen);
    const els = [...document.querySelectorAll(".x-i .card, .x-i .hand a")];
    for (const el of els) {
      if (gen !== bakeGen) return;
      const kind = el.matches(".hand a") ? (el.classList.contains("r") ? "handR" : "hand") : "card", [shadeSrc, paperSrc, paperW, paperBlend, bg, sheen] = BAKE[kind];
      const W = el.offsetWidth, H = el.offsetHeight, o = { x: parseFloat(el.style.getPropertyValue("--ox")) || 0, y: parseFloat(el.style.getPropertyValue("--oy")) || 0 }, key = [W, H, o.x, o.y, PW, PH, dpr, FX(), FY()].join();
      if (!W || !H || el._bakeKey === key) continue;
      const [sun, shade, paper] = await Promise.all([tex(ROOT + "assets/tex/canopy-sun-2.webp"), tex(ROOT + "assets/" + shadeSrc), tex(ROOT + "assets/" + paperSrc)]);
      if (!sun || !shade || !paper || gen !== bakeGen) return;
      const cv = document.createElement("canvas"); cv.width = Math.ceil(W * dpr); cv.height = Math.ceil(H * dpr);
      const x = cv.getContext("2d"); x.scale(dpr, dpr);
      const tile = (img, size, px, py, mode) => { const pt = x.createPattern(img, "repeat"); pt.setTransform(new DOMMatrix().translate(px, py).scale(size / img.width));
        x.globalCompositeOperation = mode; x.fillStyle = pt; x.fillRect(0, 0, W, H); };
      const fill = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, W, H); };
      // bottom up, as CSS stacks them: the colour, the paper, (cards: a pale wash and a sheen), then the light
      fill(`rgb(${bg})`, "source-over"); tile(paper, paperW, 0, 0, paperBlend);
      if (sheen) { fill("rgba(248,248,246,.78)", "source-over");
        const g = lin(x, 125, W, H, 0, 0); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.4, "rgba(255,255,255,0)"); g.addColorStop(.65, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.12)"); fill(g, "source-over"); }
      { const g = lin(x, 150, PW, PH, -o.x, -o.y); g.addColorStop(0, "rgb(255,253,249)"); g.addColorStop(.55, "rgb(246,246,239)"); g.addColorStop(1, "rgb(232,234,223)"); fill(g, "multiply"); }
      // (CSS blends gradient colours premultiplied: fading from clear white to the shade is fading the shade's own colour in)
      { x.save(); x.translate(-o.x + PW * .25, -o.y + PH * .15); x.scale(PW * 1.4, PH); const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(.55, "rgba(40,48,30,0)"); g.addColorStop(1, "rgba(40,48,30,.27)"); x.globalCompositeOperation = "multiply"; x.fillStyle = g;
        x.fillRect((o.x - PW * .25) / (PW * 1.4), (o.y - PH * .15) / PH, W / (PW * 1.4), H / PH); x.restore(); }
      tile(shade, 1600, -180 - o.x - FX(), -120 - o.y - FY(), "multiply"); tile(sun, 1600, -180 - o.x - FX(), -120 - o.y - FY(), "soft-light");
      const blob = await new Promise(r => cv.toBlob(r)); cv.width = 0; if (!blob || gen !== bakeGen) return;
      const url = URL.createObjectURL(blob), im = new Image(); im.src = url; await im.decode().catch(() => {});
      if (gen !== bakeGen) { URL.revokeObjectURL(url); return; }
      const old = el._bakeUrl; el._bakeUrl = url; el._bakeKey = key;
      Object.assign(el.style, { backgroundImage: `url("${url}")`, backgroundSize: "100% 100%", backgroundPosition: "0 0", backgroundRepeat: "no-repeat", backgroundBlendMode: "normal", backgroundOrigin: "border-box" });
      if (old) URL.revokeObjectURL(old);
      await new Promise(r => (!document.prerendering && window.requestIdleCallback || setTimeout)(r));
    }
  }
  // The ground: the canopy shade and the page-wide falloff only darken (multiply), so they are folded into one soft map
  // for the whole page (drawn at half size; it has no fine detail), and the moss gets its 20% shade mixed in once. The
  // ground is then the moss, that map and the sun flecks: three layers to draw instead of seven.
  async function bakeGround(gen) {
    const sc = scene(), fx = FX(), fy = FY(), key = [PW, PH, fx, fy].join(); if (!PW || !PH || sc._bakeKey === key) return;
    const [shade, moss] = await Promise.all([tex(ROOT + "assets/tex/canopy-shade-L.webp"), tex(ROOT + "assets/tex/moss-quiet-2k.webp")]); if (!shade || !moss || gen !== bakeGen) return;
    const k = .5, cv = document.createElement("canvas"); cv.width = Math.ceil(PW * k); cv.height = Math.ceil(PH * k); const x = cv.getContext("2d"); x.scale(k, k);
    const fill = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, PW, PH); };
    fill("#fff", "source-over");
    { const g = lin(x, 150, PW, PH, 0, 0); g.addColorStop(0, "rgb(255,253,249)"); g.addColorStop(.55, "rgb(246,246,239)"); g.addColorStop(1, "rgb(232,234,223)"); fill(g, "multiply"); }
    { x.save(); x.translate(PW * .25, PH * .15); x.scale(PW * 1.4, PH); const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(.55, "rgba(40,48,30,0)"); g.addColorStop(1, "rgba(40,48,30,.27)"); x.globalCompositeOperation = "multiply"; x.fillStyle = g; x.fillRect(-.25 / 1.4, -.15, 1 / 1.4, 1); x.restore(); }
    { const pt = x.createPattern(shade, "repeat"); pt.setTransform(new DOMMatrix().translate(-180 - fx, -120 - fy).scale(1600 / shade.width)); fill(pt, "multiply"); }
    const m = document.createElement("canvas"); m.width = moss.width; m.height = moss.height; const mx = m.getContext("2d"); mx.drawImage(moss, 0, 0); mx.fillStyle = "rgba(22,28,12,.2)"; mx.fillRect(0, 0, m.width, m.height);
    const [b1, b2] = await Promise.all([new Promise(r => cv.toBlob(r)), sc._mossUrl ? null : new Promise(r => m.toBlob(r, "image/webp", 1))]); cv.width = m.width = 0;
    if (!b1 || gen !== bakeGen) return;
    const u1 = URL.createObjectURL(b1), u2 = sc._mossUrl || URL.createObjectURL(b2);
    await Promise.all([u1, u2].map(u => { const im = new Image(); im.src = u; return im.decode().catch(() => {}); })); if (gen !== bakeGen) return;
    const old = sc._lightUrl; sc._lightUrl = u1; sc._mossUrl = u2; sc._bakeKey = key;
    Object.assign(sc.style, { backgroundImage: `url("${ROOT}assets/tex/canopy-sun-2.webp"), url("${u1}"), url("${u2}")`, backgroundSize: `1600px, ${PW}px ${PH}px, 900px`,
      backgroundPosition: `${-180 - fx}px ${-120 - fy}px, 0 0, ${-fx}px ${-fy}px`, backgroundRepeat: "repeat, no-repeat, repeat", backgroundBlendMode: "soft-light, multiply, normal" });
    if (old) URL.revokeObjectURL(old);
  }
  // a CSS linear-gradient at angle a over a w x h box whose top-left is at (bx, by)
  function lin(x, a, w, h, bx, by) {
    const r = a * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), L = Math.abs(w * dx) + Math.abs(h * dy), cx = bx + w / 2, cy = by + h / 2;
    return x.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2);
  }
  // (baked while the grass is still coming in: the baked ground is a level or two off the CSS one, and once the page had
  // settled that swap showed as the moss flicking, Ian's "flips to the image")
  addEventListener("scene-layout", () => setTimeout(bakeLight, 300));
  let sizes = "";
  function relayout() {
    const now = [...document.querySelectorAll(".x-i, .lay")].map(e => e.offsetWidth + "x" + e.offsetHeight).join() + innerWidth;
    if (now === sizes) return; sizes = now;
    seed = 7; relight(); all(); later(index); dispatchEvent(new Event("scene-layout"));
  }
  // while the window is being resized the grass is redone every tenth of a second, so it keeps fitting its pieces
  // the page learnt where it lies only as it was shown (it was scrolled since it was laid out ahead): the grass and the
  // light are redone in place, the old grass staying up until the new is painted
  // the baked pictures of the light are dropped at once (the CSS underneath draws the same light from the new numbers,
  // so the pan shows it right away) and baked again later
  addEventListener("floor-moved", () => { bakeGen++;
    for (const el of [scene(), ...document.querySelectorAll(".x-i .card, .x-i .hand a")]) { if (!el._bakeKey && !el._lightUrl) continue; el._bakeKey = null;
      for (const k of ["backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat", "backgroundBlendMode", "backgroundOrigin"]) el.style[k] = ""; }
    sizes = ""; relayout(); });
  let rt = 0; const ro = new ResizeObserver(() => { if (!rt) rt = setTimeout(() => { rt = 0; relayout(); }, 100); });
  ro.observe(scene()); document.querySelectorAll(".lay").forEach(el => ro.observe(el));
  // laid out now rather than on the observer's first call, which a page built ahead of a click doesn't get until it's shown;
  // but if the page is sliding in, the slide gets the page to itself and the grass grows once it has landed (Ian: the pan
  // was jittery). A page built ahead of time was laid out before its slide, so it arrives with its grass.
  if (window.__floor && window.__floor.panDone) await window.__floor.panDone;
  relayout();

  // ---------- The cursor brushes through the grass ----------
  // Blades near the cursor bend the way it moves (harder when it's closer and faster), then spring back with a couple of
  // wobbles. A strip turns back into a live canvas while its blades bend. Only grass that is
  // already there moves: nothing appears out of the open ground.
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches, CELL = 100, R = 95; // (Ian: the cursor's impact felt small)
  let grid = new Map(), root = { x: 0, y: 0 };
  const sceneRect = () => { const r = scene().getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY }; };
  function index() {
    grid = new Map(); root = sceneRect();
    // where each blade's foot and tip land on the page, found with probe points inside its (possibly rotated) piece
    const probes = [];
    for (const st of strips) for (const g of st.blades) {
      const a = g.ang * Math.PI / 180;
      for (const [x, y] of [[g.x, g.y], [g.x + Math.sin(a) * 10, g.y - Math.cos(a) * 10]]) {
        const p = document.createElement("i"); p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0`; st.el.appendChild(p); probes.push(p); }
    }
    let i = 0;
    for (const st of strips) for (const g of st.blades) {
      const a = probes[i++].getBoundingClientRect(), b = probes[i++].getBoundingClientRect();
      g.fx = a.left + scrollX; g.fy = a.top + scrollY; g.pang = Math.atan2(b.left - a.left, -(b.top - a.top)) * 180 / Math.PI;
      const k = Math.floor(g.fx / CELL) + "," + Math.floor(g.fy / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(g);
    }
    probes.forEach(p => p.remove());
    if (GL) GL.index();
    // DOM blades (the name's) keep their own animation
    domBlades = [...document.querySelectorAll(".blade")].map(b => { const r = b.getBoundingClientRect(), a = parseFloat((b.style.transform.match(/-?[\d.]+/) || [0])[0]) * Math.PI / 180;
      return { b, x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY, dx: Math.sin(a), dy: -Math.cos(a) }; });
  }
  let domBlades = [];
  // ---------- The bending sprigs on the GPU ----------
  // A sprig the cursor bends is lifted out of its strip and drawn in one WebGL layer over the page until it is still again,
  // so brushing never repaints the strips frame after frame (Ian: still a bit laggy). Every piece is also drawn into the
  // layer's depth (not its colour), ranked by how the page stacks them, so a piece lying on top still hides the sprigs of
  // the pieces under it; a sprig's shadow is cut to its own piece's rounded shape, as in the strips. For now behind ?gpu.
  const GL = /[?&]gpulayer\b/.test(location.search) && matchMedia("(hover: hover)").matches ? makeGL() : null;
  function makeGL() {
    const cv = document.createElement("canvas"); cv.className = "sprig-gl"; cv.setAttribute("aria-hidden", "true");
    Object.assign(cv.style, { position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 40 });
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, depth: true }); if (!gl) return null;
    const VSs = `attribute vec2 p;attribute vec2 uv;attribute vec2 lc;attribute vec4 pc;attribute float z;uniform vec2 vs;varying vec2 v,l;varying vec4 c;
      void main(){v=uv;l=lc;c=pc;gl_Position=vec4(p.x/vs.x*2.-1.,1.-p.y/vs.y*2.,z,1.);}`;
    // (highp: at mediump, which real graphics cards honour, a spot in the big atlas can be off by a texel)
    const FSs = `precision highp float;varying vec2 v,l;varying vec4 c;uniform sampler2D A;uniform float occ;
      void main(){if(occ>.5){gl_FragColor=vec4(0.);return;}
      if(c.w>.5){vec2 q=abs(l-c.xy*.5)-(c.xy*.5-vec2(c.z));if(length(max(q,0.))+min(max(q.x,q.y),0.)>c.z)discard;}
      gl_FragColor=texture2D(A,v);}`;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VSs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FSs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn("sprig layer:", gl.getProgramInfoLog(pr)); return null; } gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); const ST = 10 * 4;
    [["p", 2, 0], ["uv", 2, 8], ["lc", 2, 16], ["pc", 4, 24]].forEach(([n, k, o]) => { const a = gl.getAttribLocation(pr, n); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, k, gl.FLOAT, false, ST + 4, o); });
    { const a = gl.getAttribLocation(pr, "z"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 1, gl.FLOAT, false, ST + 4, ST); }
    const uVs = gl.getUniformLocation(pr, "vs"), uOcc = gl.getUniformLocation(pr, "occ");
    // one atlas for every lifted sprig's picture and its shadow, filled shelf by shelf as sprigs are first bent
    const AW = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE)), tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AW, AW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    // when it's full it starts over, and the frame being built is built again (a sprig placed before the restart would
    // point at a wiped spot and blink out for a frame)
    let sx = 0, sy = 0, sh2 = 0, slots = new Map(), full = false;
    const slot = c => { let s = slots.get(c); if (s) return s; const w = c.width + 2, h = c.height + 2;
      if (sx + w > AW) { sx = 0; sy += sh2; sh2 = 0; } if (sy + h > AW) { full = true; window.__glResets = (window.__glResets || 0) + 1; sx = sy = sh2 = 0; slots = new Map(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AW, AW, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, sx + 1, sy + 1, gl.RGBA, gl.UNSIGNED_BYTE, c);
      s = [(sx + 1) / AW, (sy + 1) / AW, (sx + 1 + c.width) / AW, (sy + 1 + c.height) / AW]; slots.set(c, s); sx += w; sh2 = Math.max(sh2, h); return s; };
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    let pieces = [], shown = false; document.body.appendChild(cv);
    // each piece's map from its own coordinates to the page (three probe points), and its place in the stacking
    function index() {
      drop();
      for (const f of fbos.values()) { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); } fbos.clear();
      const els = new Set([...strips].map(st => st.el)); document.querySelectorAll(".x-i .card, .x-i .lay, .x-i .hand a").forEach(e => els.add(e));
      const order = [...document.querySelectorAll("*")], at = new Map(order.map((e, i) => [e, i]));
      const zk = e => { const k = []; for (let n = e; n && !n.classList.contains("x-i"); n = n.parentElement) { const z = parseInt(getComputedStyle(n).zIndex); k.unshift(isNaN(z) ? 0 : z); } return k; };
      const cmp = (a, b) => { const ka = a._zk, kb = b._zk; for (let i = 0; i < Math.max(ka.length, kb.length); i++) { const d = (ka[i] || 0) - (kb[i] || 0); if (d) return d; } return at.get(a) - at.get(b); };
      pieces = [...els].filter(e => e.offsetWidth);
      for (const e of pieces) { e._zk = zk(e);
        const ps = [[0, 0], [100, 0], [0, 100]].map(([x, y]) => { const q = document.createElement("i"); q.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0`; e.appendChild(q); return q; });
        const [a, b, c] = ps.map(q => q.getBoundingClientRect()); ps.forEach(q => q.remove());
        e._M = [(b.left - a.left) / 100, (b.top - a.top) / 100, (c.left - a.left) / 100, (c.top - a.top) / 100, a.left + scrollX, a.top + scrollY];
        e._sh = [e.offsetWidth, e.offsetHeight, parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0]; }
      pieces.sort(cmp); pieces.forEach((e, i) => e._rank = i);
    }
    const Z = r => 1 - (r + 1) / (pieces.length + 3);
    // A brushed piece goes onto this layer whole, every sprig along all its sides in the order its strips paint them (a
    // single sprig lifted out would jump over its neighbours, and back under them when it landed), and its strips are
    // hidden. It goes back to its strips, repainted as they are now, in the same frame the layer stops drawing it.
    const up = new Map();
    // this layer is fixed and redrawn by the page, so it would trail a scroll by a frame: while the page scrolls, the
    // lifted pieces go back to their strips (which scroll with their pieces) and bend there
    let scrolled = -1e9;
    addEventListener("scroll", () => { scrolled = performance.now(); if (up.size) { drop(); draw(); } }, { passive: true });
    function drop() { for (const sts of up.values()) for (const s of sts) { s.up = false; paintStrip(s); for (const q of pair(s)) q.cv.style.visibility = ""; } up.clear(); }
    function lift(st) {
      const el = st.el; if (up.has(el)) return true; if (!el._M || performance.now() - scrolled < 250) return false;
      const sts = [...strips].filter(s => s.el === el); if (sts.some(s => s.gr || !s.cv.parentNode)) return false;
      for (const s of sts) { s.up = true; for (const q of pair(s)) q.cv.style.visibility = "hidden"; }
      up.set(el, sts); return true;
    }
    function land() {
      for (const [el, sts] of up) { if (sts.some(s => s.blades.some(g => g.moving))) continue;
        for (const s of sts) { s.up = false; paintStrip(s); for (const q of pair(s)) q.cv.style.visibility = ""; }
        up.delete(el); }
    }
    // each lifted strip is painted into its own texture first, on the same pixel grid as its canvas, and that texture is
    // then laid where the canvas lies; so a sprig is resampled the same two times it is on the page, and lifting a piece
    // or setting it back down changes nothing you can see
    const fbos = new Map();
    const target = (k, st) => { let f = fbos.get(k); if (f && f.W === st.W && f.H === st.H) return f;
      if (f) { gl.deleteTexture(f.tex); gl.deleteFramebuffer(f.fb); }
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, st.W, st.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, tex);
      f = { tex: t, fb, W: st.W, H: st.H }; fbos.set(k, f); return f; };
    const per = 11, send = v => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STREAM_DRAW); };
    function draw() {
      land(); const list = [...up.keys()];
      const W = innerWidth, H = innerHeight, D = Math.min(2, devicePixelRatio || 1);
      if (!list.length) { if (shown) { gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); shown = false; } return; }
      if (cv.width !== Math.round(W * D) || cv.height !== Math.round(H * D)) { cv.width = Math.round(W * D); cv.height = Math.round(H * D); }
      const vert = (v, M, ox, oy, x, y, u, w, pc, z) => v.push(M[0] * x + M[2] * y + M[4] - ox, M[1] * x + M[3] * y + M[5] - oy, u, w, x, y, pc[0], pc[1], pc[2], pc[3], z);
      const quad = (v, M, ox, oy, c, uvs, pc, z) => { const [a, b, cc, d] = c, [u0, v0, u1, v1] = uvs;
        for (const [q, u, w] of [[a, u0, v0], [b, u1, v0], [d, u0, v1], [b, u1, v0], [cc, u1, v1], [d, u0, v1]]) vert(v, M, ox, oy, q[0], q[1], u, w, pc, z); };
      // 1. each strip as its canvas would show it: every sprig's shadow (cut to the piece), then every sprig, in its order
      const corners = (x, y, a, l, t, r, b) => { const c = Math.cos(a), s = Math.sin(a); return [[l, t], [r, t], [r, b], [l, b]].map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]); };
      const ang = g => (g.moving ? g.ang + g.bend : g.ang) * Math.PI / 180, I = [1, 0, 0, 1, 0, 0];
      // (a strip with a twin keeps its shadows there, a layer laid under all its edge's sprigs, so it gets its own texture)
      const sts = list.flatMap(e => up.get(e)); let layers = [], tries = 0;
      do { full = false; layers = [];
        for (const st of sts) { const sh = [...st.el._sh, 1], m = [], d = st.twin ? [] : m;
          for (const g of st.blades) quad(d, I, st.x0, st.y0, corners(g.x + .6, g.y + 1.6, ang(g), -g.w / 2 - SP, -g.len - SP, g.w / 2 + SP, SP), slot(softShadow(g)), sh, 0);
          for (const g of st.blades) quad(m, I, st.x0, st.y0, corners(g.x, g.y, ang(g), -g.w / 2, -g.len, g.w / 2, 0), slot(bladeImage(g)), [0, 0, 0, 0], 0);
          if (st.twin) layers.push({ st, k: st.twin, v: d, under: true }); layers.push({ st, k: st, v: m }); }
      } while (full && ++tries < 2);
      layers.sort((a, b) => (b.under || 0) - (a.under || 0));
      gl.disable(gl.DEPTH_TEST); gl.uniform1f(uOcc, 0); gl.clearColor(0, 0, 0, 0);
      for (const L of layers) { const f = L.f = target(L.k, L.st); gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb); gl.viewport(0, 0, f.W, f.H); gl.uniform2f(uVs, f.W / DPR, f.H / DPR);
        gl.clear(gl.COLOR_BUFFER_BIT); send(L.v); gl.drawArrays(gl.TRIANGLES, 0, L.v.length / per); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.enable(gl.DEPTH_TEST);
      // 2. the page: the pieces into the depth only (so whatever lies on a lifted piece stays on top), then the strips
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uVs, W, H); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const v = [], ox = scrollX, oy = scrollY, none = [0, 0, 0, 0];
      for (const e of pieces) { const [w, h] = e._sh; quad(v, e._M, ox, oy, [[0, 0], [w, 0], [w, h], [0, h]], none, none, Z(e._rank)); }
      // the open word grid sits over everything
      const open = document.querySelector(".s-egg-pop:not([hidden])");
      if (open && open.offsetWidth) { const b = open.getBoundingClientRect();
        quad(v, [1, 0, 0, 1, b.left + ox, b.top + oy], ox, oy, [[0, 0], [b.width, 0], [b.width, b.height], [0, b.height]], none, none, Z(pieces.length + 1)); }
      const n0 = v.length;
      // a strip leaning in the wind is skewed about the line its roots are on, as its CSS transform does
      for (const { st } of layers) { const l = st.x0, t = st.y0, r = l + st.W / DPR, b = t + st.H / DPR, k = st.skew;
        const c = [[l, t], [r, t], [r, b], [l, b]].map(([x, y]) => [x, k ? y + Math.tan(k[0] * Math.PI / 180) * (x - k[1]) : y]);
        // a canvas on an unturned piece is put on whole screen pixels, as the browser does, so it isn't resampled
        let M = st.el._M; if (!k && Math.abs(M[1]) < 1e-4 && Math.abs(M[2]) < 1e-4) { const X = (M[0] * l + M[4] - ox) * D, Y = (M[3] * t + M[5] - oy) * D;
          M = [M[0], 0, 0, M[3], M[4] + (Math.round(X) - X) / D, M[5] + (Math.round(Y) - Y) / D]; }
        quad(v, M, ox, oy, c, [0, 1, 1, 0], none, Z(st.el._rank + .5)); }
      send(v);
      gl.colorMask(false, false, false, false); gl.depthMask(true); gl.uniform1f(uOcc, 1); gl.drawArrays(gl.TRIANGLES, 0, n0 / per);
      gl.colorMask(true, true, true, true); gl.depthMask(false); gl.uniform1f(uOcc, 0);
      layers.forEach((L, i) => { gl.bindTexture(gl.TEXTURE_2D, L.f.tex); gl.drawArrays(gl.TRIANGLES, n0 / per + i * 6, 6); });
      gl.bindTexture(gl.TEXTURE_2D, tex); shown = true;
    }
    return { index, draw, lift };
  }
  const active = new Set();
  // wobble: out to amt, then eased back to rest
  const KEYS = [[0, 0], [.2, 1], [1, 0]]; // out, then eases back to rest with no swing past it (Ian: ease back is best)
  const wob = t => { for (let k = 1; k < KEYS.length; k++) if (t <= KEYS[k][0]) { const [t0, a0] = KEYS[k - 1], [t1, a1] = KEYS[k], u = (t - t0) / (t1 - t0), e = u * u * (3 - 2 * u); return a0 + (a1 - a0) * e; } return 0; };
  // a blade's bend at a moment: a new kick starts from the bend it has (that bend fades out over the new push), and until
  // a delayed kick (a gust) reaches it, the swing it already had carries on, so a blade never snaps back to rest
  const bendAt = (a, now) => { const t = (now - a.t0) / a.dur; if (t < 0) return a.prev ? bendAt(a.prev, now) : a.c0; if (t >= 1) return 0;
    const w = wob(t); return a.amt * w + a.c0 * (1 - (t < KEYS[1][0] ? w : 1)); };
  function kick(g, amt, now) {
    const c0 = g.moving ? g.bend || 0 : 0;
    g.prev = g.moving ? { t0: g.t0, dur: g.dur, amt: g.amt, c0: g.c0 || 0, prev: null } : null; g.c0 = c0;
    g.moving = true; g.t0 = now; g.dur = 900 + Math.random() * 300; g.amt = amt; g.bt = now; g.bend = g.bend || 0;
    if (!active.has(g)) { active.add(g); if (g.st && !(GL && GL.lift(g.st))) { thaw(g.st); paintStrip(g.st); } }
    if (!frame.raf) frame.raf = requestAnimationFrame(frame);
  }
  function frame() {
    frame.raf = 0; const now = performance.now(), touched = new Set(), live = new Map();
    const dirt = g => { if (g.st) (live.get(g.st) || live.set(g.st, []).get(g.st)).push(g); };
    for (const g of active) {
      const t = (now - g.t0) / g.dur;
      if (t < 0) { if (g.prev) { g.bend = bendAt(g.prev, now); dirt(g); } continue; } // a gust that hasn't reached this blade yet
      if (g.prev) { g.c0 = g.bend || 0; g.prev = null; } // it starts from where the old swing has got to
      if (t >= 1) { active.delete(g); g.moving = false; g.bend = 0; if (g.st && !g.st.up) touched.add(g.st); dirt(g); continue; }
      g.bend = bendAt(g, now); dirt(g);
    }
    // a piece whose sprigs are all on the GPU layer isn't repainted at all; its strips come back once they're all still
    live.forEach((gs, st) => { if (!st.up) paintStrip(st, gs); });
    if (GL) GL.draw();
    // a strip goes back to being an image once its blades have been still for a moment (not on every settle, so brushing back
    // and forth doesn't keep re-encoding it)
    touched.forEach(st => { clearTimeout(st.ft);
      st.ft = setTimeout(() => { if (!st.blades.some(b => b.moving)) { st.live = false; freeze(st); } }, 1500); });
    if (active.size) frame.raf = requestAnimationFrame(frame);
  }
  // ---------- Scrolling sends wind through the grass ----------
  // While the page scrolls, gusts roll through the grass in view (the open ground's moss, the sprigs along the pieces'
  // sides and the leaves on the name): bands of leaning grass that travel across the page the way you're heading (down
  // when scrolling down), stronger for a faster scroll. When the scrolling stops the wind dies down over a second and a half and the
  // last gusts roll on and fade, so the grass settles instead of snapping back.
  const wind = { e: 0, aim: 0, ph: 0, y: scrollY, t: 0, ev: 0, raf: 0 }, windSt = new Set();
  let windW = 0, wdir = 1;
  // what the wind did over the last six seconds, so a gust that sets off from the window's upwind edge keeps the strength
  // it had then all the way across: even a short scroll rolls through the whole screen (taking about five seconds)
  const WH = 96, WHZ = 16, WV = 248, wrec = [], whist = new Float32Array(WH);
  function recordWind(now, w) {
    wrec.push([now, w]); while (wrec.length > 2 && now - wrec[1][0] > WH / WHZ * 1000) wrec.shift();
    let j = wrec.length - 1, top = 0;
    for (let i = 0; i < WH; i++) { const t = now - i * 1000 / WHZ; while (j > 0 && wrec[j][0] > t) j--;
      const a = wrec[j], b = wrec[j + 1]; whist[i] = a[0] > t ? 0 : !b ? a[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      top = Math.max(top, Math.abs(whist[i])); }
    return top;
  }
  // how far a spot in the window is from the edge the gusts come in at, and so how long ago they set off
  const windDist = (x, y) => wdir > 0 ? y + x * .2893 : innerHeight - y + (innerWidth - x) * .2893;
  const envAt = (x, y) => { const f = Math.max(0, windDist(x, y)) / WV * WHZ, i = Math.min(WH - 2, Math.floor(f)), u = Math.min(1, f - i); return whist[i] + (whist[i + 1] - whist[i]) * u; };
  // how much of a gust is at a spot in the scene now: crests about 520px apart, slanted a little, rolling the way the wind
  // blows. As one passes, each spot goes through the same wobble as a sprig the cursor brushed (out, then eased
  // back to rest), over about a second, then waits for the next.
  // the wind isn't even: slowly drifting patches gust harder or softer (from GodotGrass's noise-driven wind), so a gust
  // percolates through the grass instead of rolling by as a regular band. Same noise in the moss shader (gn there).
  const h2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const gn = (x, y) => { x /= 420; y = (y - wdir * wind.ph * 40) / 420; const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1); return .35 + 1.3 * (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy); };
  const gust = (x, y) => { const q = wdir * (y * .0121 + x * .0035), u = (((wind.ph - q) / (2 * Math.PI)) % 1 + 1) % 1; return u < .48 ? wob(u / .48) * gn(x, y) : 0; };
  addEventListener("scroll", () => {
    if (reduce()) return; const now = performance.now(), dy = scrollY - wind.y, dt = Math.max(8, now - (wind.ev || now - 16)); wind.y = scrollY;
    const v = dy / dt, a = Math.sign(v) * Math.min(1, Math.sqrt(Math.abs(v) / 3)); // px per ms, eased so a slow scroll still shows
    wind.aim = wind.ev && now - wind.ev < 100 ? wind.aim * .5 + a * .5 : a; wind.ev = now;
    if (!wind.raf) { wind.t = now; wrec.length = 0; wrec.push([now - 7000, 0]); wind.raf = requestAnimationFrame(windFrame); }
  }, { passive: true });
  function windFrame() {
    const now = performance.now(), dt = Math.min(.034, (now - wind.t) / 1000); wind.t = now;
    if (now - wind.ev > 90) wind.aim = 0; // scrolling has stopped
    // the wind picks up in about a fifth of a second and dies down over a second and a half
    const rate = Math.abs(wind.aim) > Math.abs(wind.e) ? 6 : 1.2; wind.e += (wind.aim - wind.e) * Math.min(1, rate * dt);
    if (!wind.aim && Math.abs(wind.e) < .004) wind.e = 0;
    // it blows the way you're heading, against the page's motion: scrolling down, the grass leans and the gusts roll down
    // (the mock's switch can turn it round)
    let dir = 1; try { if (localStorage.getItem("it-winddir2") === "-1") dir = -1; } catch (e) {}
    if (wind.e) wdir = dir * Math.sign(wind.e);
    const top = recordWind(now, dir * wind.e), calm = !wind.aim && top < .004;
    windW = calm ? 0 : wdir * Math.max(top, .004); // nonzero while any gust is still crossing the window
    wind.ph += 3 * dt; // the gusts travel at about 250px a second
    // the sprigs along a piece's sides lie across the wind, so they lean with the gust passing them: their strip is skewed
    // about the line their roots are on (a transform only, nothing is repainted); sprigs along the top and bottom point
    // along the wind and hardly bend
    // (every position is read before anything is moved, so the page is laid out once per frame, not once per strip)
    const sr = sceneRect(), sides = [...strips].filter(st => st.edge === "left" || st.edge === "right");
    const rs = calm ? null : sides.map(st => st.el.getBoundingClientRect()), seen = calm ? null : rs.map(r => r.bottom > -80 && r.top < innerHeight + 80);
    const wd = sides.map(st => windSt.has(st) || calm ? 0 : st.el.offsetWidth);
    dispatchEvent(new CustomEvent("grass-wind", { detail: { w: windW, dir: wdir, env: envAt, gn, ph: wind.ph, sx: sr.x, sy: sr.y } }));
    for (const [i, st] of sides.entries()) {
      const on = !calm && seen[i];
      if (on) { if (!windSt.has(st)) { windSt.add(st); const ox = (st.edge === "left" ? 0 : wd[i]) - st.x0;
          for (const q of pair(st)) for (const n of [q.img, q.cv]) n.style.transformOrigin = `${ox}px 50%`; }
        const r = rs[i], ex = r.left + (st.edge === "left" ? 0 : r.width), ey = r.top + st.y0 + st.H / DPR / 2, k = (st.edge === "left" ? 1 : -1) * envAt(ex, ey) * 12 * gust(r.left + (st.edge === "left" ? 0 : r.width) + scrollX - sr.x, r.top + st.y0 + st.H / DPR / 2 + scrollY - sr.y), tf = `skewY(${k.toFixed(2)}deg)`; st.skew = [+k.toFixed(2), (st.edge === "left" ? 0 : wd[i]) || st.skew && st.skew[1] || 0]; for (const q of pair(st)) q.img.style.transform = q.cv.style.transform = tf; }
      else if (windSt.has(st)) { windSt.delete(st); st.skew = null; for (const q of pair(st)) q.img.style.transform = q.cv.style.transform = ""; } }
    if (SW && !swayFrame.raf) swayFrame.raf = requestAnimationFrame(swayFrame);
    wind.raf = calm ? 0 : requestAnimationFrame(windFrame);
  }
  let last = null, queued = null;
  let mouseAt = null;
  addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || reduce()) { mouseAt = null; return; } mouseAt = [e.clientX, e.clientY];
    queued = { x: e.clientX + scrollX, y: e.clientY + scrollY, t: performance.now() };
    if (!brush.raf) brush.raf = requestAnimationFrame(brush);
  }, { passive: true });
  // scrolling under a resting cursor moves the page past it, so it brushes the grass just as dragging over the same stretch would
  document.addEventListener("pointerleave", () => { mouseAt = null; });
  addEventListener("scroll", () => { if (!mouseAt || reduce()) return;
    queued = { x: mouseAt[0] + scrollX, y: mouseAt[1] + scrollY, t: performance.now() }; if (!brush.raf) brush.raf = requestAnimationFrame(brush); }, { passive: true });
  const bend = (dx, dy, x, y, p, vx, vy, sp) => {
    const d = Math.hypot(x - p.x, y - p.y); if (d > R) return 0;
    // like a finger drawn through real grass: blades on its path are combed flat the way it's moving, and blades off to the
    // side lean forward and out, more outward the further they are from the path (a V-shaped wake). Strongest close in,
    // fading out smoothly toward the edge of its reach
    const f = 1 - d / R, s = sp || 1, ux = vx / s, uy = vy / s, al = (x - p.x) * ux + (y - p.y) * uy,
      px = ux + (x - p.x - ux * al) / R * 1.5, py = uy + (y - p.y - uy * al) / R * 1.5, cross = dx * py - dy * px, amt = Math.min(30, (10 + sp * 12) * f * f * (3 - 2 * f)) * Math.sign(cross || 1);
    return Math.abs(amt) < 1 ? 0 : amt;
  };
  function brush() {
    brush.raf = 0; const p = queued; if (!p) return;
    const prev = last; last = p; if (!prev || p.t - prev.t > 120) return;
    const dt = Math.max(8, p.t - prev.t), vx = (p.x - prev.x) / dt, vy = (p.y - prev.y) / dt, sp = Math.hypot(vx, vy);
    if (sp < .05) return;
    sway(p, vx, vy, sp, p.t);
    const now = p.t, cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const g of grid.get((cx + i) + "," + (cy + j)) || []) {
      if (now - (g.bt || 0) < 260) continue; const a = g.pang * Math.PI / 180, amt = bend(Math.sin(a), -Math.cos(a), g.fx, g.fy, p, vx, vy, sp); if (amt) kick(g, amt, now); }
    for (const g of domBlades) {
      if (Math.abs(g.x - p.x) > R || Math.abs(g.y - p.y) > R || now - (g.b._bt || 0) < 260) continue;
      const amt = bend(g.dx, g.dy, g.x, g.y, p, vx, vy, sp); if (!amt) continue; g.b._bt = now;
      g.b.animate([{ rotate: "0deg" }, { rotate: amt + "deg", offset: .2, easing: "ease-in-out" }, { rotate: "0deg" }], { duration: 900 + Math.random() * 300, easing: "ease-out" });
    }
  }

  // ---------- The open ground's own moss sways ----------
  // Nothing is added: around the cursor's path, a copy of the ground's moss strands is laid over them, and only the strands
  // are combed a few px along the cursor's path (and outward off to its sides), then ease back like the blades. Which pixels are
  // strands comes from a map made from the original scan (moss-fronds: R = strand, G = a random number per strand), so each
  // strand gets its own share and slant of the push while soil, twigs and leaves stay put. Where a strand moves off its
  // spot, the ground under it shows (moss-bare: the strands smeared into their own average colour; soil showed as a dark shadow that pulsed), or the
  // strand would seem doubled. Only strand pixels and the spots strands left are redrawn; the soil between is never
  // touched, so the copy can't blur or shade it. The copy only shows where a strand has actually moved by a whole screen pixel: a copy sitting unmoved at rest was a shade off the ground and read as a flicker as it faded out.
  // It's one WebGL layer the size of the window, under every piece (cards and their grass cover it), and each frame only
  // the box around the stirring is drawn.
  const MAXK = 40, SR = 95; // the same reach as the sprigs on the pieces (R)
  const VS = "attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}";
  // the moss, the strand map and the canopy maps are uploaded once and tile in the shader; nothing is repainted per move
  // The stirred strands are lit with the very same steps the CSS uses for the ground (dir-i.css, .x-i background): a 20%
  // shade, the page-wide falloff (a 150deg gradient and a corner-to-corner vignette, multiplied), the canopy shade
  // (multiplied) and the sun flecks (soft-light), worked out per pixel. An approximation went visibly off in strong sun.
  // The strands move in whole screen pixels: sampling the moss between pixels blurred it, and with the whole window
  // leaning on a scroll that read as the ground going soft.
  const FS = `precision highp float;varying vec2 v;uniform sampler2D T,M,H,B,U,L,E;uniform vec4 K[${MAXK}],V;uniform vec2 S,O,P,F;uniform vec3 Wd;uniform float NK,R;
    float ss(float x){return x*x*(3.-2.*x);}
    float h2(vec2 c){return fract(sin(c.x*127.1+c.y*311.7)*43758.5453);}
    float gn(vec2 g){g=vec2(g.x,g.y-Wd.x*Wd.z*40.)/420.;vec2 i=floor(g),f=g-i,u=f*f*(3.-2.*f);float a=h2(i),b=h2(i+vec2(1.,0.)),c=h2(i+vec2(0.,1.)),e=h2(i+1.);
      return .35+1.3*(a+(b-a)*u.x+(c-a)*u.y+(a-b-c+e)*u.x*u.y);}
    float wb(float t){if(t<.2)return ss(t/.2);return 1.-ss((t-.2)/.8);}
    vec3 soft(vec3 b,vec3 s){vec3 d=mix(((16.*b-12.)*b+4.)*b,sqrt(b),step(.25,b));
      return mix(b-(1.-2.*s)*b*(1.-b),b+(2.*s-1.)*(d-b),step(.5,s));}
    vec3 lit(vec3 c,vec2 g){
      c=mix(c,vec3(22.,28.,12.)/255.,.2);
      vec2 dr=vec2(.5,.8660254);float t=clamp(dot(g-P*.5,dr)/(abs(P.x*dr.x)+abs(P.y*dr.y))+.5,0.,1.);
      c*=(t<.55?mix(vec3(255.,253.,249.),vec3(246.,246.,239.),t/.55):mix(vec3(246.,246.,239.),vec3(232.,234.,223.),(t-.55)/.45))/255.;
      float r=length((g-vec2(.25,.15)*P)/(vec2(1.4,1.)*P));c=mix(c,c*vec3(40.,48.,30.)/255.,clamp((r-.55)/.45,0.,1.)*.27);
      vec2 cu=(g+F+vec2(180.,120.))/1600.;vec4 h=texture2D(H,cu);c=mix(c,c*h.rgb,h.a);
      vec4 u=texture2D(U,cu);return mix(c,soft(c,u.rgb),u.a);}
    void main(){vec2 p=vec2(v.x,1.-v.y)*S;vec2 d=vec2(0.);
      for(int i=0;i<${MAXK};i++){if(float(i)>=NK)break;vec4 k=K[i];vec2 a=p-k.xy;float r=length(a)/${SR}.;if(r<1.){float f=1.-r,am=length(k.zw);vec2 m=k.zw/(am+.001),w=m+(a-m*dot(a,m))/${SR}.*1.5;d+=w/(length(w)+.001)*am*f*f*(3.-2.*f);}}
      vec2 gp=O+p,sc=gp-V.xy;float u=fract((Wd.z-Wd.x*(gp.y*.0121+gp.x*.0035))/6.2831853),wd=Wd.x>0.?sc.y+sc.x*.2893:V.w-sc.y+(V.z-sc.x)*.2893;
      float ew=(texture2D(E,vec2((max(wd,0.)/${WV}.*${WHZ}.+.5)/${WH}.,.5)).r*255.-128.)/127.;d.y+=Wd.y*ew*(u<.48?wb(u/.48)*gn(gp):0.);d*=1.-smoothstep(.05,.55,texture2D(L,gp/P).a);
      vec4 m0=texture2D(M,(O+F+p)/900.);float a=(m0.g-.5)*1.2,c=cos(a),s=sin(a);d=vec2(c*d.x-s*d.y,s*d.x+c*d.y)*(.45+.55*m0.g);
      vec2 sn=floor(d*R+.5)/R,q=p-sn,uq=(O+F+q)/900.,up=(O+F+p)/900.;float al=step(.001,length(sn)),mp=texture2D(M,up).r,mq=texture2D(M,uq).r;
      vec3 under=mix(texture2D(T,up).rgb,texture2D(B,up).rgb,clamp((mp-mq)/(1.001-mq),0.,1.));
      vec3 col=lit(mix(under,texture2D(T,uq).rgb,mq),O+p);al*=smoothstep(.08,.35,max(mp,mq));gl_FragColor=vec4(col*al,al);}`;
  // the canopy maps are 1600px; WebGL1 only tiles power-of-two textures, so they go up as 1024px copies (they're soft)
  const pot = img => { const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, 1024, 1024); return c; };
  let SW = null, kicks = [];
  function makeSway() {
    if (!MOSS || !FRONDS || !BARE || !SHADE || !SUN) return null;
    const cv = document.createElement("canvas"); cv.className = "sway-cv"; cv.setAttribute("aria-hidden", "true");
    Object.assign(cv.style, { position: "absolute", pointerEvents: "none", display: "none" });
    const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }); if (!gl) return null;
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn("sway shader:", gl.getShaderInfoLog(gl.getAttachedShaders(pr)[1])); return null; } gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    [MOSS, FRONDS, pot(SHADE), BARE, pot(SUN)].forEach((img, u) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); if (img.getContext) img.width = 0; });
    ["T", "M", "H", "B", "U", "L", "E"].forEach((n, u) => gl.uniform1i(gl.getUniformLocation(pr, n), u));
    gl.activeTexture(gl.TEXTURE5); const lt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, lt);
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.activeTexture(gl.TEXTURE6); const et = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, et);
    for (const [k, v] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    scene().prepend(cv);
    return { et, eb: new Uint8Array(WH), uV: gl.getUniformLocation(pr, "V"), cv, gl, uK: gl.getUniformLocation(pr, "K"), uO: gl.getUniformLocation(pr, "O"), uF: gl.getUniformLocation(pr, "F"), uS: gl.getUniformLocation(pr, "S"), uP: gl.getUniformLocation(pr, "P"), uW: gl.getUniformLocation(pr, "Wd"), uN: gl.getUniformLocation(pr, "NK"), uR: gl.getUniformLocation(pr, "R"), K: new Float32Array(MAXK * 4), at: null };
  }
  // (the pieces' shadows are not in the light map: the layer lies under the pieces, so their own CSS shadows already fall
  // on the stirred strands, and adding them here darkened strands near a card twice)
  addEventListener("scene-layout", () => { if (SW) { SW.at = null; setTimeout(pinUnderLitter, 0); } });
  // Moss lying under a fallen leaf or twig is held down by it: a soft map of where the litter lies (a quarter of the page's
  // size, its edges feathered) stops the strands moving under a piece and just around it, so none slide under or out.
  function pinUnderLitter(tries = 0) {
    if (!SW || !PW || !PH) return; const k = .25, sc = scene().getBoundingClientRect();
    const a = document.createElement("canvas"); a.width = Math.ceil(PW * k); a.height = Math.ceil(PH * k); const x = a.getContext("2d");
    let waiting = false;
    for (const img of document.querySelectorAll(".litter-ground .litter, .litter-under .litter")) {
      if (!img.complete || !img.naturalWidth) { waiting = true; continue; }
      const c = img.offsetParent && img.offsetParent.getBoundingClientRect(); if (!c) continue;
      const w = img.offsetWidth, h = img.offsetHeight, l = img.offsetLeft + c.left - sc.left, t = img.offsetTop + c.top - sc.top;
      const ang = parseFloat((img.style.transform.match(/-?[\d.]+/) || [0])[0]) * Math.PI / 180;
      x.save(); x.scale(k, k); x.translate(l + w / 2, t + h / 2); x.rotate(ang); x.drawImage(img, -w / 2, -h / 2, w, h); x.restore();
    }
    const b = document.createElement("canvas"); b.width = a.width; b.height = a.height; const y = b.getContext("2d");
    y.filter = "blur(2.5px)"; y.drawImage(a, 0, 0); y.drawImage(a, 0, 0); a.width = 0; // drawn twice: the pin reaches a little past each piece's edge
    const { gl } = SW; gl.activeTexture(gl.TEXTURE5); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, b); b.width = 0;
    if (waiting && tries < 10) setTimeout(() => pinUnderLitter(tries + 1), 600);
  }
  // fit the layer to the window where it is now: size, place, and the light map for that stretch of the ground
  function placeSway() {
    // it lies in the page and reaches a little past the window's top and bottom: the page scrolls ahead of the drawing,
    // and this way what was drawn stays on the moss it belongs to, with no edge scrolling into view
    const M = 200, rt = sceneRect(), W = innerWidth, H = Math.min(PH, innerHeight + 2 * M), x = Math.round(scrollX - rt.x), y = Math.max(0, Math.min(PH - H, Math.round(scrollY - rt.y - M))), sd = DPR, key = [x, y, W, H, sd].join();
    if (SW.at === key) return; SW.at = key;
    const { cv, gl } = SW, cw = Math.round(W * sd), ch = Math.round(H * sd); SW.d = sd;
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cv.style.width = W + "px"; cv.style.height = H + "px"; }
    cv.style.left = x + "px"; cv.style.top = y + "px";
    gl.uniform2f(SW.uP, PW, PH); gl.uniform2f(SW.uO, x, y); gl.uniform2f(SW.uF, FX(), FY()); gl.uniform2f(SW.uS, W, H); SW.x = x; SW.y = y;
  }
  function swayFrame() {
    swayFrame.raf = 0; const now = performance.now();
    kicks = kicks.filter(k => now - k.t0 < k.dur);
    if (!SW || (!kicks.length && !windW)) { if (SW) SW.cv.style.display = "none"; return; }
    placeSway();
    const { gl, K, cv } = SW; K.fill(0);
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    const ks = kicks.slice(-MAXK); ks.forEach((k, i) => { const w = k.amt * wob((now - k.t0) / k.dur), x = k.x - SW.x, y = k.y - SW.y; K.set([x, y, k.dx * w, k.dy * w], i * 4);
      l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); });
    // the scroll's pull moves every strand in view, so then the whole window is drawn
    if (windW) { l = t = -1e4; r = b = 1e4; }
    gl.uniform3f(SW.uW, wdir, 6, wind.ph);
    if (windW) { const sr = sceneRect(); gl.uniform4f(SW.uV, scrollX - sr.x, scrollY - sr.y, innerWidth, innerHeight);
      for (let i = 0; i < WH; i++) SW.eb[i] = Math.max(1, Math.min(255, Math.round(whist[i] * 127) + 128));
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, SW.et); gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, WH, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, SW.eb); } gl.uniform1f(SW.uN, ks.length); gl.uniform1f(SW.uR, SW.d || DPR);
    gl.viewport(0, 0, cv.width, cv.height); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    // only the box around the stirring is drawn (GL counts rows from the bottom)
    const D = SW.d, m = SR + 8, X = Math.max(0, Math.floor((l - m) * D)), Y = Math.max(0, Math.floor((cv.height / D - b - m) * D));
    const X1 = Math.min(cv.width, Math.ceil((r + m) * D)), Y1 = Math.min(cv.height, Math.ceil((cv.height / D - t + m) * D));
    if (X1 > X && Y1 > Y) { gl.enable(gl.SCISSOR_TEST); gl.scissor(X, Y, X1 - X, Y1 - Y); gl.uniform4fv(SW.uK, K); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    if (cv.style.display === "none") cv.style.display = "";
    swayFrame.raf = requestAnimationFrame(swayFrame);
  }
  // the layer (and its one-time texture uploads) is made while the page is idle, not on the first sweep
  // (within a second and a half at most: a busy page can go many seconds without an idle moment, and the moss stayed still)
  later(() => (window.requestIdleCallback || setTimeout)(() => { if (reduce() || matchMedia("(hover: none)").matches) return; SW = makeSway(); pinUnderLitter(); }, { timeout: 1500 }));
  let lastSway = null;
  function sway(p, vx, vy, sp, now) {
    if (!SW || (lastSway && Math.hypot(p.x - lastSway.x, p.y - lastSway.y) < 20)) return; lastSway = p;
    const L = sp || 1, amt = Math.min(7, 2.4 + sp * 3);
    kicks.push({ x: p.x - root.x, y: p.y - root.y, dx: vx / L, dy: vy / L, amt, t0: now, dur: 1000 + Math.random() * 300 });
    if (kicks.length > MAXK) kicks.shift();
    if (!swayFrame.raf) swayFrame.raf = requestAnimationFrame(swayFrame);
  }
  // the name's blades arrive a little later (they wait for its canvas), so index once more after they do
  addEventListener("name-dressed", () => setTimeout(index, 50));
})();
