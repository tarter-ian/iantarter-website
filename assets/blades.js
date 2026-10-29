// Lays real grass blade sprites over the edges of every .lay element so the pieces look like they sit in the lawn.
(async () => {
  // real moss sprigs (photographed cut-outs, regraded to the ground's colours), the same kind of moss the ground is made of
  const sprites = (await (await fetch("assets/blades/index.json?v=4")).json()).filter(s => s.kind === "sprig");
  const blades = sprites, clumps = sprites, moss = sprites, slim = sprites.filter(s => s.w > 100 * s.h / 360); // the name gets the leafy ones
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  // an element's unrotated top-left corner, relative to the scene
  const offset = el => { const root = el.closest(".x-i").getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - el.offsetWidth / 2 - root.left, y: r.top + r.height / 2 - el.offsetHeight / 2 - root.top }; };
  function put(el, ox, oy, sp, x, y, len, ang) {
    const sw = sp.w * len / sp.h, b = document.createElement("i"); b.className = "blade"; b.setAttribute("aria-hidden", "true");
    const left = x - sw / 2, top = y - len;
    Object.assign(b.style, { width: sw + "px", height: len + "px", left: left + "px", top: top + "px", transform: `rotate(${ang}deg)` });
    b.style.setProperty("--m", `url("${new URL(sp.src, location.href).href}")`); b.style.setProperty("--sp", `url("${new URL(sp.src, location.href).href}")`);
    b.style.setProperty("--ox", (ox + left) + "px"); b.style.setProperty("--oy", (oy + top) + "px");
    el.appendChild(b); return b;
  }
  // The name's letters lie in the grass: blades grow up around each letter's outline and lean in over its edges.
  // Edge points come from the letter's own pixels; each blade roots just outside and points along the inward normal.
  function dressName(lay) {
    const cvs = lay.querySelectorAll(".fill-cv > canvas:not(.alt):not(.spin-cv):not(.rock-shadow)"); if (!cvs.length) return false;
    lay.querySelectorAll(":scope > .blade").forEach(b => b.remove());
    const root = lay.closest(".x-i").getBoundingClientRect(), lr = lay.getBoundingClientRect(), ox = lr.left - root.left, oy = lr.top - root.top;
    cvs.forEach(cv => {
      const r = cv.getBoundingClientRect(), W = cv.width, H = cv.height, k = r.width / W;
      const a = cv.getContext("2d").getImageData(0, 0, W, H).data, A = (x, y) => x < 0 || y < 0 || x >= W || y >= H ? 0 : a[(y * W + x) * 4 + 3];
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
        put(lay, ox, oy, pick(slim), px, py, len, ang);
      }
    });
    return true;
  }
  // ---------- Painting grass on canvas ----------
  // Every blade is a real moss sprig in the ground's colours, lit by the same canopy light as the spot it lies in. The blades around a piece are painted once into a few canvas
  // strips (one per edge) instead of being hundreds of masked elements, which is what made scrolling and brushing lag.
  const DPR = Math.min(2, devicePixelRatio || 1);
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const [MOSS, SHADE, SUN, FRONDS, BARE] = await Promise.all(["assets/tex/moss-quiet-2k.webp", "assets/tex/canopy-shade-L.webp", "assets/tex/canopy-sun-2.webp", "assets/tex/moss-fronds.webp", "assets/tex/moss-bare.webp?v=2"].map(load));
  const imgs = new Map(); const sprite = sp => imgs.get(sp.src) || (imgs.set(sp.src, load(sp.src)), imgs.get(sp.src));
  await Promise.all(sprites.map(sprite)); for (const sp of sprites) sp.img = await sprite(sp);
  let PW = 1, PH = 1;
  const scene = () => document.querySelector(".x-i");
  const pat = (ctx, img, px, py, size, ox = 0, oy = 0) => { const p = ctx.createPattern(img, "repeat"); p.setTransform(new DOMMatrix().translate(ox - px, oy - py).scale(size / img.width)); return p; };
  // fill a w x h box whose top-left sits at (px, py) in the scene with exactly what the ground looks like there (see dir-i.css)
  // with a base image, that image takes the moss's place and gets the same light, cut to its own shape
  function paintGround(ctx, px, py, w, h, base, bare) {
    ctx.save(); ctx.globalCompositeOperation = "source-over";
    if (base) ctx.drawImage(base, 0, 0, w, h); else if (MOSS) { ctx.fillStyle = pat(ctx, MOSS, px, py, 900); ctx.fillRect(0, 0, w, h); }
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
    if (SHADE) { ctx.fillStyle = pat(ctx, SHADE, px, py, 1600, -180, -120); ctx.fillRect(0, 0, w, h); }
    if (SUN) { ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = pat(ctx, SUN, px, py, 1600, -180, -120); ctx.fillRect(0, 0, w, h); }
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
    const { cv, ctx, x0, y0 } = st; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    let box = null;
    if (dirty) { let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
      for (const g of dirty) { const R = reach(g) + SP + 2; l = Math.min(l, g.x - R); t = Math.min(t, g.y - R); r = Math.max(r, g.x + R); b = Math.max(b, g.y + R); }
      box = [l, t, r, b]; const X = Math.floor((l - x0) * DPR), Y = Math.floor((t - y0) * DPR), W = Math.ceil((r - x0) * DPR) - X, H = Math.ceil((b - y0) * DPR) - Y;
      ctx.beginPath(); ctx.rect(X, Y, W, H); ctx.clip(); ctx.clearRect(X, Y, W, H); }
    else ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.setTransform(DPR, 0, 0, DPR, -x0 * DPR, -y0 * DPR);
    const gr = st.gr, now = vt, near = g => { if (!box) return true; const R = reach(g) + SP + 2; return !(g.x + R < box[0] || g.x - R > box[2] || g.y + R < box[1] || g.y - R > box[3]); };
    // where each blade is now: its turn, and while growing in, its size and fade
    const pose = g => { if (!gr) return [g.moving ? g.ang + g.bend : g.ang, 1, 1];
      const u = Math.min(1, Math.max(0, (now - gr.t0 - g.gd) / GROW)); return u <= 0 ? null : [g.ang, Math.min(1, u * 4), .12 + .88 * (1 - Math.pow(1 - u, 3))]; };
    // the blades' shadows fall only on the piece (on the ground they'd show as dark smudges), and move with their blades
    if (!st.shape) { const el = st.el; st.shape = [el.offsetWidth, el.offsetHeight, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0]; }
    const [w, h, rad] = st.shape; ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(0, 0, w, h, rad) : ctx.rect(0, 0, w, h); ctx.clip();
    for (const g of st.blades) { if (!near(g)) continue; const P = pose(g); if (P) drawShadow(ctx, g, g.x, g.y, P[0], P[1], P[2]); }
    ctx.restore();
    // a bending blade is drawn right here in its own strip, so it stays under whatever lies on top of its piece
    for (const g of st.blades) { if (!near(g)) continue; const P = pose(g); if (P) drawBlade(ctx, g, g.x, g.y, P[0], P[1], P[2]); }
    // the piece's own shadow doesn't fall on them: they lean up over its edge, above it
    ctx.restore();
  }
  // On first load the grass grows in: each strip rises from the ground outside its edge onto the card, the name's sprigs
  // from their roots, top of the page first. Only once per edge: a relayout or a brushed strip
  // just shows.
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches, EASE = "cubic-bezier(.2, .7, .3, 1)";
  const lag = el => Math.min(700, Math.max(0, el.getBoundingClientRect().top) * .45);
  // a strip grows as a live canvas: every sprig rises from its own root, scaling up whole (not squashed), each a little
  // after the last; the sprigs' shadows on the card come in with them. Then it turns back into an image as usual.
  const GROW = 950, growing = new Set();
  // when the grass is redone mid-growth (the page often settles its layout once more just after loading), the new grass
  // carries on from the same start, so the growing isn't cut short and nothing flicks on
  // Growth runs on its own clock, which only moves while frames are actually drawn (at most a frame's worth per frame):
  // while loading, the page can be too busy to draw for seconds, and on the wall clock the grass had finished growing
  // before anyone saw it, so it just flicked on.
  let vt = 0, lastFrame = null;
  const tick = () => { const n = performance.now(); if (lastFrame != null) vt += Math.min(34, n - lastFrame); lastFrame = n; return vt; };
  // Only grass in view grows (the rest is ready before it's scrolled to), and each strip's sprigs are painted a few at a
  // time ahead of their turn, so a growing frame only places finished pictures.
  const inView = el => { const r = el.getBoundingClientRect(); return r.bottom > -80 && r.top < innerHeight + 80; };
  const prep = [];
  function prepare(st, then) { st.ready = false; prep.push([st, 0, then]); if (!prepare.raf) prepare.raf = requestAnimationFrame(prepFrame); }
  function prepFrame() {
    prepare.raf = 0; const end = performance.now() + 5;
    while (prep.length && performance.now() < end) { const job = prep[0], [st] = job;
      if (!strips.has(st)) { prep.shift(); continue; }
      const g = st.blades[job[1]++]; if (g) { bladeImage(g); softShadow(g); }
      if (job[1] >= st.blades.length) { prep.shift(); st.ready = true; job[2] && job[2](st); } }
    if (prep.length) prepare.raf = requestAnimationFrame(prepFrame);
  }
  const EDGE = { top: 0, left: 80, right: 120, bottom: 160 };
  // grass below the first screen waits, blank, until its piece scrolls into view, then grows there
  const seen = "IntersectionObserver" in window && new IntersectionObserver(es => { for (const e of es) { if (!e.isIntersecting) continue;
    const el = e.target, at = el._growAt; seen.unobserve(el);
    for (const st of strips) if (st.el === el && at[st.edge] === "wait") { at[st.edge] = vt + 60 + EDGE[st.edge]; grow(st); } } });
  function grow(st) {
    const k = st.edge, at = st.el._growAt || (st.el._growAt = {}), now = vt;
    if (at[k] == null) at[k] = inView(st.el) || still() || !seen ? now + lag(st.el) + EDGE[k] : "wait";
    if (at[k] === "wait") { prepare(st); seen.observe(st.el); return true; }
    const t0 = at[k], dur = GROW + 500; if (now > t0 + dur) return false;
    if (still()) { st.img.animate && st.img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: t0 - now, fill: "backwards" }); return false; }
    st.gr = { t0, dur };
    st.blades.forEach((g, i) => { g.gd = ((i * 2654435761) % 1000) / 1000 * 500; });
    // a redress mid-growth carries straight on
    thaw(st); growing.add(st); if (now >= t0) st.ready = true; else if (!st.ready) prepare(st); if (!growFrame.raf) growFrame.raf = requestAnimationFrame(growFrame); return true;
  }
  function growFrame() {
    growFrame.raf = 0; const now = tick();
    for (const st of growing) {
      // not painted yet: its start waits for it (it hasn't begun to show, so nothing jumps)
      if (!st.ready) { if (now > st.gr.t0) st.gr.t0 = st.el._growAt[st.edge] = now; continue; }
      if (now < st.gr.t0) continue;
      if (now > st.gr.t0 + st.gr.dur) { st.gr = null; growing.delete(st); paintStrip(st); st.live = false; freeze(st); continue; }
      paintStrip(st); }
    if (growing.size) growFrame.raf = requestAnimationFrame(growFrame); else lastFrame = null;
  }
  // the name's sprigs grow with CSS animations (which also wait for the page to draw); if the name is redressed while they
  // grow, the new ones pick up where the old ones were
  function growName(lay) {
    const prev = lay._growAnim; if (prev && prev.playState === "finished") return;
    const d0 = prev ? -(prev.currentTime || 0) : lag(lay) + 200; let first = null;
    lay.querySelectorAll(":scope > .blade").forEach((b, i) => { if (!b.animate) return; const t = b.style.transform, h = parseFloat(b.style.height) / 2;
      const kf = still() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: `${t} translateY(${h}px) scale(.12) translateY(${-h}px)` }, { opacity: 1, offset: .35 }, { opacity: 1, transform: t }];
      const a = b.animate(kf, { duration: still() ? 500 : 1000, delay: (prev ? prev.effect.getTiming().delay : 0) + d0 + (i % 9) * 40, easing: EASE, fill: "backwards" }); if (!first) first = a; });
    if (first) lay._growAnim = first;
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
  function freeze(st) {
    if (KEEP) { if (!st.cv.parentNode) st.img.after(st.cv); st.img.style.visibility = "hidden"; st.img.removeAttribute("src"); return; }
    st.cv.toBlob(b => { if (!b || st.live) return; const old = st.url; st.url = URL.createObjectURL(b);
      // swap back only once the new image is decoded and ready to paint, so the strip never blinks
      st.img.src = st.url; st.img.decode().catch(() => {}).then(() => { if (old) URL.revokeObjectURL(old); if (st.live) return;
        st.img.style.visibility = ""; requestAnimationFrame(() => { if (!st.live) { st.cv.remove(); release(st); } }); }); });
  }
  // a frozen strip gives back its canvases' memory (phones run out of canvas memory and then draw new canvases blank);
  // they're painted again the next time a blade in it bends
  function release(st) {
    st.cv.width = st.cv.height = 0; if (st.shade) st.shade.width = 0;
    for (const g of st.blades) for (const k of ["cv", "shd"]) if (g[k]) { g[k].width = g[k].height = 0; g[k] = null; }
  }
  function thaw(st) { clearTimeout(st.ft); if (st.live) return; st.live = true; if (st.cv.width !== st.W) { st.cv.width = st.W; st.cv.height = st.H; }
    if (!st.cv.parentNode) st.img.after(st.cv); st.img.style.visibility = "hidden"; }
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
    el.querySelectorAll(":scope > .blade, :scope > .blade-clip, :scope > .blade-strip").forEach(b => b.remove());
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
    for (const edge of edges) {
      const bl = list.filter(g => g.edge === edge); if (!bl.length) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const g of bl) { const R = Math.hypot(g.w / 2, g.len) + 4; x0 = Math.min(x0, g.x - R); y0 = Math.min(y0, g.y - R); x1 = Math.max(x1, g.x + R); y1 = Math.max(y1, g.y + R); }
      x0 = Math.floor(x0); y0 = Math.floor(y0);
      // painted on a canvas, but shown as a plain image: a page full of live canvases is slow to scroll. The canvas only
      // steps in while the cursor is bending one of its blades, then hands back to a fresh image (on phones; see freeze)
      const cv = document.createElement("canvas"), img = new Image(); img.style.visibility = "hidden"; // shown once its picture is decoded
      cv.width = Math.ceil((x1 - x0) * DPR); cv.height = Math.ceil((y1 - y0) * DPR);
      for (const n of [cv, img]) { n.className = "blade-strip"; n.setAttribute("aria-hidden", "true"); n.alt = "";
        Object.assign(n.style, { left: x0 + "px", top: y0 + "px", width: cv.width / DPR + "px", height: cv.height / DPR + "px" }); }
      el.appendChild(img);
      const st = { el, edge, cv, img, ctx: cv.getContext("2d"), x0, y0, blades: bl, W: cv.width, H: cv.height }; bl.forEach(g => g.st = st);
      // the fresh canvas shows at once (a relayout swaps old grass for new in the same frame) and hands over to its image
      strips.add(st); if (grow(st)) continue;
      // grass out of view is painted a little at a time once the visible grass is done
      if (inView(el)) { paintStrip(st); img.after(cv); freeze(st); }
      else prepare(st, s => { paintStrip(s); s.img.after(s.cv); freeze(s); });
    }
  }
  const all = () => {
    noGrass = [...document.querySelectorAll(".no-grass")].map(n => ({ el: n, r: n.getBoundingClientRect() }));
    document.querySelectorAll(".lay").forEach(el => {
      if (!el.classList.contains("lay-name")) return dress(el);
      // the name draws from its own random sequence, so whenever it gets dressed the cards' grass comes out the same
      const go = (n = 0) => { const s0 = seed; seed = 911; const ok = dressName(el); seed = s0; if (ok) growName(el); if (ok) dispatchEvent(new Event("name-dressed")); else if (n < 40) setTimeout(() => go(n + 1), 150); }; go(); });
  };
  // Each lit piece gets its scene offset, so the shared light (baked into backgrounds in CSS) lines up across pieces.
  function relight() {
    const sc = scene(); PW = sc.offsetWidth; PH = sc.offsetHeight; sc.style.setProperty("--pw", PW + "px"); sc.style.setProperty("--ph", PH + "px");
    document.querySelectorAll(".card, .hand a").forEach(el => { const o = offset(el); el.style.setProperty("--ox", o.x + "px"); el.style.setProperty("--oy", o.y + "px"); });
  }
  let sizes = "";
  function relayout() {
    const now = [...document.querySelectorAll(".x-i, .lay")].map(e => e.offsetWidth + "x" + e.offsetHeight).join() + innerWidth;
    if (now === sizes) return; sizes = now;
    seed = 7; relight(); all(); setTimeout(index, 50); dispatchEvent(new Event("scene-layout"));
  }
  // while the window is being resized the grass is redone every tenth of a second, so it keeps fitting its pieces
  let rt = 0; const ro = new ResizeObserver(() => { if (!rt) rt = setTimeout(() => { rt = 0; relayout(); }, 100); });
  ro.observe(scene()); document.querySelectorAll(".lay").forEach(el => ro.observe(el));

  // ---------- The cursor brushes through the grass ----------
  // Blades near the cursor bend the way it moves (harder when it's closer and faster), then spring back with a couple of
  // wobbles. A strip turns back into a live canvas while its blades bend. Only grass that is
  // already there moves: nothing appears out of the open ground.
  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches, CELL = 80, R = 70;
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
    // DOM blades (the name's) keep their own animation
    domBlades = [...document.querySelectorAll(".blade")].map(b => { const r = b.getBoundingClientRect(), a = parseFloat((b.style.transform.match(/-?[\d.]+/) || [0])[0]) * Math.PI / 180;
      return { b, x: r.left + r.width / 2 + scrollX, y: r.top + r.height / 2 + scrollY, dx: Math.sin(a), dy: -Math.cos(a) }; });
  }
  let domBlades = [];
  const active = new Set();
  // wobble: out to amt, back past rest, a smaller swing, then still
  const KEYS = [[0, 0], [.18, 1], [.48, -.38], [.74, .14], [1, 0]];
  const wob = t => { for (let k = 1; k < KEYS.length; k++) if (t <= KEYS[k][0]) { const [t0, a0] = KEYS[k - 1], [t1, a1] = KEYS[k], u = (t - t0) / (t1 - t0), e = u * u * (3 - 2 * u); return a0 + (a1 - a0) * e; } return 0; };
  function kick(g, amt, now) {
    g.moving = true; g.t0 = now; g.dur = 900 + Math.random() * 300; g.amt = amt; g.bt = now; g.bend = g.bend || 0;
    if (!active.has(g)) { active.add(g); if (g.st) { thaw(g.st); paintStrip(g.st); } }
    if (!frame.raf) frame.raf = requestAnimationFrame(frame);
  }
  function frame() {
    frame.raf = 0; const now = performance.now(), touched = new Set(), live = new Map();
    const dirt = g => { if (g.st) (live.get(g.st) || live.set(g.st, []).get(g.st)).push(g); };
    for (const g of active) {
      const t = (now - g.t0) / g.dur;
      if (t >= 1) { active.delete(g); g.moving = false; g.bend = 0; if (g.st) touched.add(g.st); dirt(g); continue; }
      g.bend = g.amt * wob(t); dirt(g);
    }
    live.forEach((gs, st) => paintStrip(st, gs));
    // a strip goes back to being an image once its blades have been still for a moment (not on every settle, so brushing back
    // and forth doesn't keep re-encoding it)
    touched.forEach(st => { clearTimeout(st.ft);
      st.ft = setTimeout(() => { if (!st.blades.some(b => b.moving)) { st.live = false; freeze(st); } }, 1500); });
    if (active.size) frame.raf = requestAnimationFrame(frame);
  }
  let last = null, queued = null;
  addEventListener("pointermove", e => {
    if (e.pointerType === "touch" || reduce()) return;
    queued = { x: e.clientX + scrollX, y: e.clientY + scrollY, t: performance.now() };
    if (!brush.raf) brush.raf = requestAnimationFrame(brush);
  }, { passive: true });
  const bend = (dx, dy, x, y, p, vx, vy, sp) => {
    const d = Math.hypot(x - p.x, y - p.y); if (d > R) return 0;
    // bend toward the motion: the sign of the turn comes from which side of the blade the cursor is moving to
    const cross = dx * vy - dy * vx, amt = Math.min(22, (6 + sp * 9) * (1 - d / R)) * Math.sign(cross || 1);
    return Math.abs(amt) < 2 ? 0 : amt;
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
      g.b.animate([{ rotate: "0deg" }, { rotate: amt + "deg", offset: .18 }, { rotate: (-amt * .38) + "deg", offset: .48 }, { rotate: (amt * .14) + "deg", offset: .74 }, { rotate: "0deg" }], { duration: 900 + Math.random() * 300, easing: "ease-out" });
    }
  }

  // ---------- The open ground's own moss sways ----------
  // Nothing is added: around the cursor's path, a copy of the ground's moss strands is laid over them, and only the strands
  // are pushed a few px the way the cursor went, then spring back with the same wobble as the blades. Which pixels are
  // strands comes from a map made from the original scan (moss-fronds: R = strand, G = a random number per strand), so each
  // strand gets its own share and slant of the push while soil, twigs and leaves stay put. Where a strand moves off its
  // spot, the ground under it shows (moss-bare: the strands smeared into their own average colour; soil showed as a dark shadow that pulsed), or the
  // strand would seem doubled. Only strand pixels and the spots strands left are redrawn; the soil between is never
  // touched, so the copy can't blur or shade it. The copy fades in with the push (over the first px), so at rest it is invisible and nothing pops.
  // It's one WebGL layer the size of the window, under every piece (cards and their grass cover it), and each frame only
  // the box around the stirring is drawn.
  const MAXK = 40, SR = 55;
  const VS = "attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0.,1.);}";
  // the moss, the strand map and the canopy maps are uploaded once and tile in the shader; nothing is repainted per move
  // The stirred strands are lit with the very same steps the CSS uses for the ground (dir-i.css, .x-i background): a 20%
  // shade, the page-wide falloff (a 150deg gradient and a corner-to-corner vignette, multiplied), the canopy shade
  // (multiplied) and the sun flecks (soft-light), worked out per pixel. An approximation went visibly off in strong sun.
  const FS = `precision highp float;varying vec2 v;uniform sampler2D T,M,H,B,U;uniform vec4 K[${MAXK}];uniform vec2 S,O,P;
    vec3 soft(vec3 b,vec3 s){vec3 d=mix(((16.*b-12.)*b+4.)*b,sqrt(b),step(.25,b));
      return mix(b-(1.-2.*s)*b*(1.-b),b+(2.*s-1.)*(d-b),step(.5,s));}
    vec3 lit(vec3 c,vec2 g){
      c=mix(c,vec3(22.,28.,12.)/255.,.2);
      vec2 dr=vec2(.5,.8660254);float t=clamp(dot(g-P*.5,dr)/(abs(P.x*dr.x)+abs(P.y*dr.y))+.5,0.,1.);
      c*=(t<.55?mix(vec3(255.,253.,249.),vec3(246.,246.,239.),t/.55):mix(vec3(246.,246.,239.),vec3(232.,234.,223.),(t-.55)/.45))/255.;
      float r=length((g-vec2(.25,.15)*P)/(vec2(1.4,1.)*P));c=mix(c,c*vec3(40.,48.,30.)/255.,clamp((r-.55)/.45,0.,1.)*.27);
      vec2 cu=(g+vec2(180.,120.))/1600.;vec4 h=texture2D(H,cu);c=mix(c,c*h.rgb,h.a);
      vec4 u=texture2D(U,cu);return mix(c,soft(c,u.rgb),u.a);}
    void main(){vec2 p=vec2(v.x,1.-v.y)*S;vec2 d=vec2(0.);
      for(int i=0;i<${MAXK};i++){vec4 k=K[i];float r=length(p-k.xy)/${SR}.;if(r<1.){float f=1.-r;d+=k.zw*f*f*(3.-2.*f);}}
      vec4 m0=texture2D(M,(O+p)/900.);float a=(m0.g-.5)*1.2,c=cos(a),s=sin(a);d=vec2(c*d.x-s*d.y,s*d.x+c*d.y)*(.45+.55*m0.g);
      vec2 q=p-d,uq=(O+q)/900.,up=(O+p)/900.;float al=clamp(length(d)*12.,0.,1.),mp=texture2D(M,up).r,mq=texture2D(M,uq).r;
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
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null; gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    [MOSS, FRONDS, pot(SHADE), BARE, pot(SUN)].forEach((img, u) => { gl.activeTexture(gl.TEXTURE0 + u); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D); if (img.getContext) img.width = 0; });
    ["T", "M", "H", "B", "U"].forEach((n, u) => gl.uniform1i(gl.getUniformLocation(pr, n), u));
    scene().prepend(cv);
    return { cv, gl, uK: gl.getUniformLocation(pr, "K"), uO: gl.getUniformLocation(pr, "O"), uS: gl.getUniformLocation(pr, "S"), uP: gl.getUniformLocation(pr, "P"), K: new Float32Array(MAXK * 4), at: null };
  }
  // (the pieces' shadows are not in the light map: the layer lies under the pieces, so their own CSS shadows already fall
  // on the stirred strands, and adding them here darkened strands near a card twice)
  addEventListener("scene-layout", () => { if (SW) SW.at = null; });
  // fit the layer to the window where it is now: size, place, and the light map for that stretch of the ground
  function placeSway() {
    const rt = sceneRect(), W = innerWidth, H = innerHeight, x = Math.round(scrollX - rt.x), y = Math.round(scrollY - rt.y), key = [x, y, W, H].join();
    if (SW.at === key) return; SW.at = key;
    const { cv, gl } = SW, cw = Math.round(W * DPR), ch = Math.round(H * DPR);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cv.style.width = W + "px"; cv.style.height = H + "px"; }
    cv.style.left = x + "px"; cv.style.top = y + "px";
    gl.uniform2f(SW.uP, PW, PH); gl.uniform2f(SW.uO, x, y); gl.uniform2f(SW.uS, W, H); SW.x = x; SW.y = y;
  }
  function swayFrame() {
    swayFrame.raf = 0; const now = performance.now();
    kicks = kicks.filter(k => now - k.t0 < k.dur);
    if (!SW || !kicks.length) { if (SW) SW.cv.style.display = "none"; return; }
    placeSway();
    const { gl, K, cv } = SW; K.fill(0);
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    kicks.slice(-MAXK).forEach((k, i) => { const w = k.amt * wob((now - k.t0) / k.dur), x = k.x - SW.x, y = k.y - SW.y; K.set([x, y, k.dx * w, k.dy * w], i * 4);
      l = Math.min(l, x); t = Math.min(t, y); r = Math.max(r, x); b = Math.max(b, y); });
    gl.viewport(0, 0, cv.width, cv.height); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    // only the box around the stirring is drawn (GL counts rows from the bottom)
    const m = SR + 8, X = Math.max(0, Math.floor((l - m) * DPR)), Y = Math.max(0, Math.floor((cv.height / DPR - b - m) * DPR));
    const X1 = Math.min(cv.width, Math.ceil((r + m) * DPR)), Y1 = Math.min(cv.height, Math.ceil((cv.height / DPR - t + m) * DPR));
    if (X1 > X && Y1 > Y) { gl.enable(gl.SCISSOR_TEST); gl.scissor(X, Y, X1 - X, Y1 - Y); gl.uniform4fv(SW.uK, K); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    if (cv.style.display === "none") cv.style.display = "";
    swayFrame.raf = requestAnimationFrame(swayFrame);
  }
  // the layer (and its one-time texture uploads) is made while the page is idle, not on the first sweep
  (window.requestIdleCallback || setTimeout)(() => { if (reduce() || matchMedia("(hover: none)").matches) return; SW = makeSway(); });
  let lastSway = null;
  function sway(p, vx, vy, sp, now) {
    if (!SW || (lastSway && Math.hypot(p.x - lastSway.x, p.y - lastSway.y) < 20)) return; lastSway = p;
    const L = sp || 1, amt = Math.min(4, 1.2 + sp * 2);
    kicks.push({ x: p.x - root.x, y: p.y - root.y, dx: vx / L, dy: vy / L, amt, t0: now, dur: 1000 + Math.random() * 300 });
    if (kicks.length > MAXK) kicks.shift();
    if (!swayFrame.raf) swayFrame.raf = requestAnimationFrame(swayFrame);
  }
  // the name's blades arrive a little later (they wait for its canvas), so index once more after they do
  addEventListener("name-dressed", () => setTimeout(index, 50));
})();
