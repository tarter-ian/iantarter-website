/* iantarter.com behavior: the filled 3D name and its letter spins, the hidden-words easter egg,
   the timeline that draws as you scroll, copy-on-click email buttons, paper grain, and the contact form.
   Exported from Ian's Style Studio on 2026-10-11. */
(() => {
  const $ = s => document.querySelector(s);
  const site = $("#site"); if (!site) return;
  const mode = "view";
  // Ian's saved style (only the parts this script reads)
  const state = {"details":{"nameFx":"rock","border":2,"buttons":"solid","dividers":"none","labelDeco":"none","links":"underline","marks":"on","radius":12,"shadow":"hard","texture":"none"},"layout":{"brand":true,"casesCols":1,"contact":"side","exp":"timeline","form":true,"gamesCols":1,"hero":"split","hidden":{},"labelPos":"side","maxw":1120,"nav":"spread","order":["about","cases","experience","skills","games","contact"],"photo":"square","photoW":340,"scrollFocus":true},"fonts":{"body":{"case":"none","family":"Plus Jakarta Sans","italic":false,"lh":1.65,"size":17,"tracking":0,"weight":400},"brand":{"case":"none","family":"Rampart One","fill":true,"italic":false,"lh":1.2,"size":24,"tracking":0,"weight":400},"display":{"case":"none","family":"Rampart One","fill":true,"italic":false,"kern":{"0":-0.06,"1":-0.035,"3":-0.2,"4":-0.09,"5":-0.025,"7":-0.035,"8":-0.035},"lh":1.2,"size":100,"tracking":0,"weight":200},"heading":{"case":"none","family":"Bricolage Grotesque","italic":false,"itemSize":22,"lh":1.1,"size":38,"tracking":-0.02,"weight":800},"pitch":{"case":"none","family":"Plus Jakarta Sans","italic":false,"lh":1.25,"size":24,"tracking":-0.01,"weight":500},"ui":{"case":"none","family":"Plus Jakarta Sans","italic":false,"size":14,"tracking":0,"weight":500}},"colors":{"accent":"#d2452c","accent2":"#ffd34e","bg":"#ededed","brandFill":"#ec7a62","brandText":"#000000","btnText":"#ffffff","footerBg":"#ededed","footerText":"#050505","heroBg":"#ededed","heroText":"#0a0b0a","hlText":"#0d0d0d","label":"#000000","line":"#a3a3a3","link":"#b83a22","muted":"#5e5e5e","name":"#000000","nameFill":"#ffffff","navBg":"#ffffff","navText":"#000000","surface":"#ffffff","text":"#0a0b0a"}};

  // ---------- Color helpers ----------
  const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const rgbToHex = a => "#" + a.map(v => Math.round(v).toString(16).padStart(2, "0")).join("");
  const mixHex = (a, b, t) => { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A.map((v, i) => v * t + B[i] * (1 - t))); };
  const lum = hex => { const c = hexToRgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const onColor = hex => lum(hex) > 0.4 ? "#111111" : "#ffffff";
  const validHex = v => /^#[0-9a-f]{6}$/i.test(v);

  const pxf = v => v + "px";

  // ---------- Kerning: per-letter-pair spacing for your name ----------
  // pages without the hero (case studies) get a detached stand-in, so the name code can run without checks
  const nameEl = site.querySelector(".s-hero h1") || document.createElement("h1");
  function nameText() { return nameEl.textContent; }


  // Paper grain: drawn on a canvas over the page (no image URLs, which the hosted page may block)
  let grainCv = null, grainKey = "";
  function drawGrain() {
    const on = state.details.texture === "grain";
    if (!on) { if (grainCv) { grainCv.remove(); grainCv = null; grainKey = ""; } return; }
    const W = site.offsetWidth, H = site.offsetHeight, key = W + "x" + H;
    if (!grainCv) { grainCv = document.createElement("canvas"); grainCv.className = "grain-cv"; grainCv.setAttribute("aria-hidden", "true"); site.appendChild(grainCv); }
    if (grainKey !== key) { grainKey = key; grainCv.width = W; grainCv.height = H; } grainCv.style.width = W + "px"; grainCv.style.height = H + "px";
    const ctx = grainCv.getContext("2d"), T = 256, tile = ctx.createImageData(T, T), d = tile.data;
    for (let i = 0; i < d.length; i += 4) { const v = 120 + Math.random() * 135 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = Math.random() < 0.55 ? 26 : 10; }
    for (let y = 0; y < H; y += T) for (let x = 0; x < W; x += T) ctx.putImageData(tile, x, y);
    // keep cards, photo, form and buttons clean: cut the grain out where they sit
    const sb = site.getBoundingClientRect(); ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000";
    site.querySelectorAll(".s-nav, .s-card, .s-photo, .s-form, .s-btn, .s-form input, .s-form textarea, .s-shots img, .s-flow-steps li, .site[data-exp='cards'] .s-job").forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return; const rad = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
      // buttons and case cards lift up-left on hover, so their cut-out also covers where they move to
      const lift = el.matches(".s-btn, .s-cases .s-card") ? 4 : 0;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(r.left - sb.left - lift, r.top - sb.top - lift, r.width + lift, r.height + lift, rad); else ctx.rect(r.left - sb.left - lift, r.top - sb.top - lift, r.width + lift, r.height + lift); ctx.fill();
    });
    // filled letters sit above the grain layer (z-index), so they stay clean without a cut-out

    ctx.restore();
  }
  let grainT; const queueGrain = () => { clearTimeout(grainT); grainT = setTimeout(drawGrain, 80); };
  new ResizeObserver(queueGrain).observe(site); document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", queueGrain);


  // ---------- Scroll focus for experience ----------
  let focusRaf = 0;
  function updateFocus() {
    focusRaf = 0; if (typeof updateDraw === "function") updateDraw(); const exp = site.querySelector(".s-exp"); if (!exp) return;
    const jobs = [...exp.querySelectorAll(".s-job")], vh = window.innerHeight, er = exp.getBoundingClientRect();
    const inView = er.bottom > vh * 0.2 && er.top < vh * 0.8;
    if (!inView || state.layout.scrollFocus === false) { exp.classList.remove("has-active"); jobs.forEach(j => j.classList.remove("is-active")); return; }
    const line = vh * 0.45; let best = null, bd = Infinity;
    jobs.forEach(j => { const r = j.getBoundingClientRect(); const d = r.top <= line && r.bottom >= line ? 0 : Math.min(Math.abs(r.top - line), Math.abs(r.bottom - line)); if (d < bd) { bd = d; best = j; } });
    exp.classList.add("has-active"); jobs.forEach(j => j.classList.toggle("is-active", j === best));
  }
  const queueFocus = () => { if (!focusRaf) focusRaf = requestAnimationFrame(updateFocus); };
  window.addEventListener("scroll", queueFocus, { passive: true, capture: true }); window.addEventListener("resize", queueFocus);
  // ---------- Fill hollow letters (outline/3D fonts like Rampart One) ----------
  // Draws the text to a canvas, finds the empty areas enclosed by exactly one ring of ink
  // (the letter faces, not the counters inside them), and paints those behind the real text.
  const fillGen = new WeakMap();
  // per letter: turn (degrees), sideways and up/down nudge (in font sizes), at scatter 1
  const SCATTER = [[-4, 0, .03], [3, .01, -.05], [-2, -.01, .06], [5, .015, -.02], [-3, 0, .05], [2, .01, -.06], [-5, -.015, .04], [3, .01, -.03], [-2, 0, .05]];
  const pref = (k, d) => { let v = d; try { const s = localStorage.getItem(k); if (s != null) v = +s; } catch (e) {} return isFinite(v) ? v : d; };
  const scatterAmt = () => pref("it-scatter", 1), spreadAmt = () => pref("it-spread2", 1.75);
  async function fillHollow(el, color, altColor) {
    if (!el) return;
    const gen = (fillGen.get(el) || 0) + 1; fillGen.set(el, gen);
    const old = el && el._fillCv;
    if (!el || !color || el.offsetParent === null) { if (old) { old.remove(); el._fillCv = null; } if (el) el.classList.remove("has-cv", "font-wait"); return; }
    const cs0 = getComputedStyle(el); const inkCol = getComputedStyle(el).color;
    try { await document.fonts.load(`${cs0.fontStyle} ${cs0.fontWeight} 40px ${cs0.fontFamily}`, el.textContent); } catch (e) {}
    if (fillGen.get(el) !== gen) return;
    // keep the name hidden until its real font has arrived, so a stand-in font (and a fill drawn for the wrong letters) never shows;
    // give up after about 6 seconds and show whatever font there is
    const fam = (cs0.fontFamily.split(",")[0] || "").replace(/["']/g, "").trim();
    const spec = `${cs0.fontStyle} ${cs0.fontWeight} 40px ${cs0.fontFamily}`;
    const ready = [...document.fonts].some(f => f.family.replace(/["']/g, "").trim() === fam) && document.fonts.check(spec, el.textContent);
    if (!ready && (el._fontTries = (el._fontTries || 0) + 1) < 30) { el.classList.add("font-wait"); setTimeout(scheduleFills, 200); return; }
    el.classList.remove("font-wait"); el._fontTries = 0;
    const box = el.getBoundingClientRect(); if (!box.width || !box.height) return;
    // redrawn only when something it depends on changed: rebuilding swapped every letter (and the leaves around the name)
    // for new ones, which some browsers showed as a blink whenever the page's size was re-measured
    // the name's letters lie a little out of line, as if dropped in the moss one by one: each one turned a few degrees and
    // nudged up or down (in order, so it still reads at a glance and the hidden words still work)
    const SC = el === nameEl ? scatterAmt() : 0, SP = el === nameEl ? spreadAmt() : 0;
    const key = [SC, SP, box.width, box.height, (box.left * (window.devicePixelRatio || 1)) % 1, window.devicePixelRatio, color, altColor, cs0.font, el.textContent].join("|");
    if (old && old.isConnected && el._fillKey === key) return; el._fillKey = key;
    // draw at a whole multiple of the screen's pixel density and snap to its pixel grid, so the image lands crisp
    const dpr = window.devicePixelRatio || 1, S = dpr * Math.max(1, Math.ceil(Math.max(2, 100 / (parseFloat(cs0.fontSize) || 20)) / dpr));
    const ox = box.left - Math.floor(box.left * dpr) / dpr, oy = box.top - Math.floor(box.top * dpr) / dpr;
    let Wc = box.width + ox + 1; const Hc = box.height + oy + 1;
    // each letter gets its own little canvas, so a single letter can hop on hover
    const glyphs = []; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const range = document.createRange(); let n;
    const mctx = document.createElement("canvas").getContext("2d");
    let ws = false; // a space came before the next letter (each letter can be its own span)
    while ((n = walker.nextNode())) {
      const cs = getComputedStyle(n.parentElement); const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; mctx.font = font;
      const asc = mctx.measureText("Hg").fontBoundingBoxAscent, fs = parseFloat(cs.fontSize) || 20;
      for (let i = 0; i < n.data.length; i++) {
        let ch = n.data[i]; if (!ch.trim()) { ws = true; continue; }
        if (cs.textTransform === "uppercase") ch = ch.toUpperCase(); else if (cs.textTransform === "lowercase") ch = ch.toLowerCase();
        range.setStart(n, i); range.setEnd(n, i + 1); const r = range.getClientRects()[0]; if (!r) continue;
        const l = r.left - box.left + ox, t = r.top - box.top + oy;
        const m = mctx.measureText(ch); // the ink's own left and right, for even gaps between letters
        glyphs.push({ ch, font, fs, x: l, y: t + asc, l, t, w: r.width, h: r.height, ws: ws && glyphs.length > 0, il: l - m.actualBoundingBoxLeft, ir: l + m.actualBoundingBoxRight }); ws = false;
      }
    }
    const [R, G, B] = hexToRgb(color); const [IR, IG, IB] = (inkCol.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
    const wrap = document.createElement("div"); wrap._glyphs = glyphs; wrap._ink = inkCol; wrap._fill = color;
    // spread: the letters move apart so the space between one letter's ink and the next is the same all along (the gap
    // between the words stays as much wider as the font made it), and only as far as the room the name has: up to the
    // edge of its row, or of the photo card beside it
    const gaps = glyphs.map((g, i) => i ? g.il - glyphs[i - 1].ir : 0), inner = gaps.filter((d, i) => i && !glyphs[i].ws);
    const mean = inner.length ? inner.reduce((t, d) => t + d, 0) / inner.length : 0, word = glyphs.filter(g => g.ws).map(g => gaps[glyphs.indexOf(g)]);
    const wordGap = word.length ? word.reduce((t, d) => t + d, 0) / word.length : 0, even = Math.min(1, SP);
    let add = SP && glyphs.length ? SP * .05 * glyphs[0].fs : 0;
    const target = i => (glyphs[i].ws ? gaps[i] + (wordGap - gaps[i]) * even : gaps[i] + (mean - gaps[i]) * even) + add;
    if (SP && glyphs.length > 1) { const row = el.closest("section") || el.parentElement, rr = row.getBoundingClientRect(); let right = Math.min(rr.right, innerWidth - 16);
      const end = box.left - ox + Math.max(...glyphs.map(g => g.l + g.w)); // where the last letter ends now
      for (const c of row.querySelectorAll(".card")) { const cr = c.getBoundingClientRect(); if (cr.left >= end && cr.top < box.bottom && cr.bottom > box.top) right = Math.min(right, cr.left - 24); }
      let grow = 0; for (let i = 1; i < glyphs.length; i++) grow += target(i) - gaps[i];
      if (grow > right - end) add = Math.max(0, add - (grow - (right - end)) / (glyphs.length - 1)); }
    let shift = 0;
    glyphs.forEach((g, i) => { const j = SCATTER[i % SCATTER.length];
      if (i && SP) shift += target(i) - gaps[i];
      const dx = shift, dy = SC * j[2] * g.fs;
      g.l += dx; g.x += dx; g.t += dy; g.y += dy; g.rot = SC * j[0] * Math.PI / 180; g.dx = g.dy = 0;
      Wc = Math.max(Wc, g.l + g.w + g.fs * .3 + 1); });
    for (const g of glyphs) {
      const mg = g.fs * 0.3, my = mg * 0.4 + Math.abs(g.dy) + Math.abs(g.rot) * g.w * .6, snap = v => Math.floor(v * dpr) / dpr;
      const left = SC ? snap(g.l - mg + Math.min(0, g.dx)) : Math.max(0, snap(g.l - mg)), top = SC ? snap(g.t - my) : Math.max(0, snap(g.t - mg * 0.4));
      const cw = (SC ? g.l + g.w + mg + Math.max(0, g.dx) : Math.min(Wc, g.l + g.w + mg)) - left, chh = (SC ? g.t + g.h + my : Math.min(Hc, g.t + g.h + mg * 0.4)) - top;
      const piece = paintGlyph(g, left, top, cw, chh, [R, G, B]); if (el === nameEl) solidify(piece, [R, G, B]);
      Object.assign(piece.style, { left: left + "px", top: top + "px", width: piece.width / dpr + "px", height: piece.height / dpr + "px" });
      wrap.appendChild(piece); g.base = piece;
      // a second copy in another color, hidden until the letter is pointed at
      if (altColor) { const alt = paintGlyph(g, left, top, cw, chh, hexToRgb(altColor)); alt.className = "alt"; alt.style.cssText = piece.style.cssText; wrap.appendChild(alt); g.alt = alt; }
    }
    // The name's letters as solid pieces lying on the floor, lit from the upper left like everything else: the font's black
    // outline and drawn-on depth become the piece's side, light where it meets the top face and darker toward the ground;
    // the face gets a thin bright bevel on its lit edges and a slight shade on the others.
    function solidify(cv, rgb) {
      const W = cv.width, H = cv.height, ctx = cv.getContext("2d"), img = ctx.getImageData(0, 0, W, H), a = img.data, N = W * H;
      const face = new Uint8Array(N), side = new Uint8Array(N);
      for (let p = 0; p < N; p++) { if (a[p * 4 + 3] < 8) continue; const lum = (a[p * 4] + a[p * 4 + 1] + a[p * 4 + 2]) / 3, fl = (rgb[0] + rgb[1] + rgb[2]) / 3;
        if (lum > fl - 30) face[p] = 1; else side[p] = 1; }
      const dist = new Int16Array(N).fill(-1), q = [];
      for (let p = 0; p < N; p++) if (side[p]) { const x = p % W;
        if ((x > 0 && face[p - 1]) || (x < W - 1 && face[p + 1]) || (p >= W && face[p - W]) || (p < N - W && face[p + W])) { dist[p] = 0; q.push(p); } }
      for (let qi = 0; qi < q.length; qi++) { const p = q[qi], x = p % W;
        for (const n of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) if (n >= 0 && n < N && side[n] && dist[n] < 0) { dist[n] = dist[p] + 1; q.push(n); } }
      let maxD = 1; for (let p = 0; p < N; p++) if (dist[p] > maxD) maxD = dist[p];
      // seen from straight above: only the top face shows, ringed by a thin edge (bright on the lit upper-left side,
      // darker on the other); the font's drawn-on depth is dropped, and the cast shadow comes from CSS
      const rim = Math.max(1, Math.round(S / dpr * 1.2)) * 0 + 2;
      for (let p = 0; p < N; p++) {
        if (side[p]) {
          if (dist[p] < 0 || dist[p] >= rim) { a[p * 4 + 3] = 0; continue; }
          const x = p % W, lit = (x < W - 1 && face[p + 1]) || (p < N - W && face[p + W]);
          const c0 = lit ? [236, 230, 214] : [150, 144, 126]; for (let c = 0; c < 3; c++) a[p * 4 + c] = c0[c];
          a[p * 4 + 3] = dist[p] === 0 ? 255 : 150;
        } else if (face[p]) { const warm = rgb[0] + rgb[1] + rgb[2] > 720 ? [248, 248, 245] : rgb; for (let c = 0; c < 3; c++) a[p * 4 + c] = warm[c]; }
      }
      ctx.putImageData(img, 0, 0);
    }
    function paintGlyph(g, left, top, cw, chh, rgb) {
    const [R, G, B] = rgb;
    const W = Math.ceil(cw * S), H = Math.ceil(chh * S);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.scale(S, S); ctx.translate(-left, -top); ctx.fillStyle = "#000";
    if (g.rot || g.dx || g.dy) { const cx = g.l + g.w / 2, cy = g.t + g.h * .55; ctx.translate(cx + g.dx, cy + g.dy); ctx.rotate(g.rot); ctx.translate(-cx, -cy); }
    ctx.font = g.font; ctx.fillText(g.ch, g.x, g.y);
    const img = ctx.getImageData(0, 0, W, H), a = img.data, N = W * H;
    const ink = new Uint8Array(N); for (let i = 0; i < N; i++) ink[i] = a[i * 4 + 3] > 40 ? 1 : 0;
    const lab = new Int32Array(N).fill(-1); const kind = []; const stack = new Int32Array(N); let L = 0;
    for (let i = 0; i < N; i++) {
      if (lab[i] >= 0) continue; const t = ink[i]; kind.push(t); lab[i] = L; let sp = 0; stack[sp++] = i;
      while (sp) { const p = stack[--sp], x = p % W;
        if (x > 0 && lab[p - 1] < 0 && ink[p - 1] === t) { lab[p - 1] = L; stack[sp++] = p - 1; }
        if (x < W - 1 && lab[p + 1] < 0 && ink[p + 1] === t) { lab[p + 1] = L; stack[sp++] = p + 1; }
        if (p >= W && lab[p - W] < 0 && ink[p - W] === t) { lab[p - W] = L; stack[sp++] = p - W; }
        if (p < N - W && lab[p + W] < 0 && ink[p + W] === t) { lab[p + W] = L; stack[sp++] = p + W; }
      }
      L++;
    }
    const adj = Array.from({ length: L }, () => new Set());
    for (let p = 0; p < N; p++) { const x = p % W;
      if (x < W - 1 && lab[p] !== lab[p + 1]) { adj[lab[p]].add(lab[p + 1]); adj[lab[p + 1]].add(lab[p]); }
      if (p < N - W && lab[p] !== lab[p + W]) { adj[lab[p]].add(lab[p + W]); adj[lab[p + W]].add(lab[p]); } }
    const depth = new Int32Array(L).fill(-1); const q = [];
    const edge = p => { if (!ink[p] && depth[lab[p]] < 0) { depth[lab[p]] = 0; q.push(lab[p]); } };
    for (let x = 0; x < W; x++) { edge(x); edge(N - W + x); } for (let y = 0; y < H; y++) { edge(y * W); edge(y * W + W - 1); }
    if (!q.length) { depth[0] = 0; q.push(0); }
    for (let qi = 0; qi < q.length; qi++) { const c = q[qi]; adj[c].forEach(d => { if (depth[d] < 0) { depth[d] = depth[c] + 1; q.push(d); } }); }
    const out = ctx.createImageData(W, H), o = out.data;
    // faces, then grown under the outline by about 3/4 of a CSS px so no light edge shows between fill and ink
    let m = new Uint8Array(N); for (let p = 0; p < N; p++) m[p] = !ink[p] && depth[lab[p]] === 2 ? 1 : 0;
    // a tiny pocket inside the font's drawn-on depth (the "e" has one in its lower counter) is not part of the face
    { const area = new Int32Array(L); for (let p = 0; p < N; p++) if (m[p]) area[lab[p]]++; const big = Math.max(...area);
      for (let p = 0; p < N; p++) if (m[p] && area[lab[p]] < big * .02) m[p] = 0; }
    const soft = new Uint8Array(N); for (let p = 0; p < N; p++) { const al = a[p * 4 + 3]; soft[p] = al > 0 && al < 170 ? 1 : 0; }
    for (let k = 0, K = Math.max(2, Math.round(S * 0.6)); k < K; k++) {
      const n2 = m.slice();
      for (let p = 0; p < N; p++) { if (m[p] || !soft[p]) continue; const x = p % W;
        if ((x > 0 && m[p - 1]) || (x < W - 1 && m[p + 1]) || (p >= W && m[p - W]) || (p < N - W && m[p + W])) n2[p] = 1; }
      m = n2;
    }
    // the letters themselves are drawn into the same image on top of the fill, so outline and fill can never drift apart
    for (let p = 0; p < N; p++) { const ia = a[p * 4 + 3] / 255, fa = m[p] ? 1 : 0, oa = ia + fa * (1 - ia);
      if (!oa) continue; o[p * 4] = (IR * ia + R * fa * (1 - ia)) / oa; o[p * 4 + 1] = (IG * ia + G * fa * (1 - ia)) / oa; o[p * 4 + 2] = (IB * ia + B * fa * (1 - ia)) / oa; o[p * 4 + 3] = oa * 255; }
    // anti-alias: average each block of drawing pixels down to one screen pixel (premultiplied), instead of letting the browser resample
    const f = Math.round(S / dpr), W2 = Math.ceil(W / f), H2 = Math.ceil(H / f);
    const fin = document.createElement("canvas"); fin.width = W2; fin.height = H2;
    const fctx = fin.getContext("2d"), small = fctx.createImageData(W2, H2), d2 = small.data;
    for (let y2 = 0; y2 < H2; y2++) for (let x2 = 0; x2 < W2; x2++) {
      let r = 0, g = 0, bl = 0, al = 0, cnt = 0;
      for (let yy = y2 * f; yy < Math.min(H, y2 * f + f); yy++) for (let xx = x2 * f; xx < Math.min(W, x2 * f + f); xx++) {
        const q = (yy * W + xx) * 4, aa = o[q + 3]; r += o[q] * aa; g += o[q + 1] * aa; bl += o[q + 2] * aa; al += aa; cnt++; }
      const q2 = (y2 * W2 + x2) * 4; if (al) { d2[q2] = r / al; d2[q2 + 1] = g / al; d2[q2 + 2] = bl / al; d2[q2 + 3] = al / cnt; }
    }
    fctx.putImageData(small, 0, 0);
    return fin;
    }
    if (fillGen.get(el) !== gen) return;
    // placed right behind the text (no image URLs, so nothing for the page's security rules to block)
    const host = el.parentElement; if (getComputedStyle(host).position === "static") host.style.position = "relative";
    const hb = host.getBoundingClientRect();
    const cv2 = wrap; cv2.className = "fill-cv"; cv2.setAttribute("aria-hidden", "true");
    Object.assign(cv2.style, { position: "absolute", left: (box.left - ox - hb.left + host.scrollLeft - host.clientLeft) + "px", top: (box.top - oy - hb.top + host.scrollTop - host.clientTop) + "px", width: Wc + "px", height: Hc + "px", pointerEvents: "none", zIndex: "6" });
    cv2.style.setProperty("--bob", ((glyphs[0] && glyphs[0].fs) || 40) * 0.12 + "px");
    if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.zIndex = "7";
    // turning gold fades the old letters out over the new ones, once every gold letter has its polished shine
    const toGold = old && el === nameEl && color === SHINE_GOLD && old._fill !== color && !reduceMotion();
    if (toGold) { old.before(cv2); old.style.zIndex = "6"; old.classList.add("fill-out");
      const gone = () => { if (old.isConnected) old.remove(); };
      cv2._onPrepped = () => requestAnimationFrame(() => { old.style.transition = "opacity 1.2s ease-in-out"; old.style.opacity = "0"; setTimeout(gone, 1300); });
      setTimeout(gone, 8000); }
    else if (old) old.replaceWith(cv2); else host.insertBefore(cv2, el);
    el._fillCv = cv2; el.classList.add("has-cv"); if (el === nameEl && old && old !== cv2) dispatchEvent(new Event("name-rebuilt")); if (el === nameEl && typeof prepSpins === "function") prepSpins(cv2); if (el === nameEl && typeof mountTiles === "function") mountTiles(cv2); if (typeof queueGrain === "function") queueGrain();
  }
  // ---------- Small touches ----------
  // Name letters hop when the pointer reaches them
  let lastBob = -1;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // what a letter does when pointed at: Details > "Your name's letters, when pointed at"
  const nameFx = () => state.details.nameFx || (state.details.bob === false ? "none" : "spin");
  // recent pointer positions, so a spin can follow the direction and speed of the swipe
  // (tracked across the whole page, so a swipe that comes in from above or below already has a direction when it reaches a letter)
  const trail = [];
  // (kept in page positions, so scrolling under a resting cursor counts as moving it over the page)
  const track = (cx, cy) => { const now = performance.now(); trail.push({ x: cx + scrollX, y: cy + scrollY, t: now }); while (trail.length > 2 && now - trail[0].t > 120) trail.shift(); };
  site.addEventListener("pointermove", e => track(e.clientX, e.clientY), { passive: true });
  function swipe(e) {
    const a = trail[0]; if (!a) return { vx: 0, vy: 0 };
    const dt = Math.max(16, performance.now() - a.t);
    return { vx: (e.clientX + scrollX - a.x) / dt, vy: (e.clientY + scrollY - a.y) / dt }; // px per ms
  }
  // A spinning letter gets real depth: copies of its silhouette stacked behind it, and a back face,
  // so it reads as a solid block when it turns edge-on.
  // The font's own drawn-on shadow would turn with the letter and look wrong, so a spinning letter uses just its face:
  // the filled area plus its outline (pixels within a stroke's width of the fill), with real depth stacked behind it instead.
  function faceOf(c, fill, fs) {
    if (c._face) return c._face;
    const W = c.width, H = c.height, N = W * H, img = c.getContext("2d").getImageData(0, 0, W, H), d = img.data, [FR, FG, FB] = hexToRgb(fill);
    let m = new Uint8Array(N); for (let p = 0; p < N; p++) { const q = p * 4; if (d[q + 3] > 200 && Math.abs(d[q] - FR) + Math.abs(d[q + 1] - FG) + Math.abs(d[q + 2] - FB) < 90) m[p] = 1; }
    const k = W / parseFloat(c.style.width), R = Math.max(2, Math.round(fs * 0.035 * k));
    for (let it = 0; it < R; it++) { const n2 = m.slice(); for (let p = 0; p < N; p++) { if (m[p]) continue; const x = p % W;
      if ((x > 0 && m[p - 1]) || (x < W - 1 && m[p + 1]) || (p >= W && m[p - W]) || (p < N - W && m[p + W])) n2[p] = 1; } m = n2; }
    let x0 = W, x1 = 0, y0 = H, y1 = 0, ix1 = 0, iy1 = 0; // face box, and the bottom-right of all the ink (face plus drawn shadow)
    for (let p = 0; p < N; p++) { const x = p % W, y = (p / W) | 0; if (d[p * 4 + 3] > 60) { if (x > ix1) ix1 = x; if (y > iy1) iy1 = y; }
      if (!m[p]) { d[p * 4 + 3] = 0; continue; } if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const f = document.createElement("canvas"); f.width = W; f.height = H; f.getContext("2d").putImageData(img, 0, 0);
    // how far the font's shadow reaches down and right: that becomes the letter's real depth
    return (c._face = { cv: f, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ox: Math.max(0, ix1 - x1), oy: Math.max(0, iy1 - y1) });
  }
  // Spinning letters are real 3D blocks: the letter's face, with its depth behind it running down and to the right.
  // Seen straight on, that depth is exactly where the font draws its shadow, so the shadow is the block's own side
  // and simply turns with the letter. The resting letter is drawn the same way, so a spin starts and ends with no swap.
  // Faces and silhouettes are prepared ahead of time, while the page is idle, so a spin never stalls to build them.
  // Light comes from the front, toward the viewer. Any surface that faces it squarely enough (the face, the back,
  // or a stretch of side wall once it turns toward you) is drawn in the fill color; the rest is black, like the font's shadow.
  // The side walls are real: one flat strip per stretch of the letter's outline, sorted back to front each frame.
  // how deep each letter block is, as a multiple of the font's drawn shadow length. Deeper blocks need a gentler viewing angle
  // to match the font at rest, and a gentler angle keeps letters from leaning (skewing) as they turn
  const DEPTH = 3;
  const SHINE_GOLD = "#f2c12e"; // the name's color once every hidden word is found; drawn as polished metal

  const LIT = 0.45; // how squarely a surface must face the light to be fully lit-or-dark midway (about 63 degrees off it)
  // brightness eases from black to the fill color across a band around LIT, so surfaces fade instead of snapping (no flicker mid-spin)
  const shade = v => { const t = Math.max(0, Math.min(1, (v - (LIT - 0.25)) / 0.5)); return t * t * (3 - 2 * t); };
  const mixHexes = (h1, h2, t) => { const a1 = hexToRgb(h1), a2 = hexToRgb(h2); return `rgb(${a1.map((v, i) => Math.round(v + (a2[i] - v) * t)).join(",")})`; };
  function outline(A, W, H) {
    // marching squares at half coverage, chained into closed loops, then simplified
    const segs = new Map(), P = [], key = (x, y, h) => (h ? "h" : "v") + x + "," + y;
    const pt = (k, x0, y0, x1, y1, a0, a1) => { if (!segs.has(k)) { const t = (0.5 - a0) / (a1 - a0 || 1e-6); P.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); segs.set(k, { i: P.length - 1, n: [] }); } return k; };
    const link = (k1, k2) => { segs.get(k1).n.push(k2); segs.get(k2).n.push(k1); };
    const v = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : A[y * W + x];
    for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
      const a0 = v(x, y), a1 = v(x + 1, y), a2 = v(x + 1, y + 1), a3 = v(x, y + 1);
      const c = (a0 > .5 ? 8 : 0) | (a1 > .5 ? 4 : 0) | (a2 > .5 ? 2 : 0) | (a3 > .5 ? 1 : 0); if (c === 0 || c === 15) continue;
      const T = () => pt(key(x, y, 1), x, y, x + 1, y, a0, a1), R = () => pt(key(x + 1, y, 0), x + 1, y, x + 1, y + 1, a1, a2),
            Bt = () => pt(key(x, y + 1, 1), x, y + 1, x + 1, y + 1, a3, a2), L = () => pt(key(x, y, 0), x, y, x, y + 1, a0, a3);
      const mid = (a0 + a1 + a2 + a3) / 4 > .5;
      switch (c) { case 1: case 14: link(L(), Bt()); break; case 2: case 13: link(Bt(), R()); break; case 3: case 12: link(L(), R()); break;
        case 4: case 11: link(T(), R()); break; case 6: case 9: link(T(), Bt()); break; case 7: case 8: link(L(), T()); break;
        case 5: if (mid) { link(L(), T()); link(Bt(), R()); } else { link(L(), Bt()); link(T(), R()); } break;
        case 10: if (mid) { link(T(), R()); link(L(), Bt()); } else { link(L(), T()); link(Bt(), R()); } break; }
    }
    const seen = new Set(), loops = [];
    for (const [k0] of segs) { if (seen.has(k0)) continue; const loop = []; let k = k0, prev = null;
      while (k && !seen.has(k)) { seen.add(k); const s2 = segs.get(k); loop.push(P[s2.i]); const nx = s2.n.find(q => q !== prev && !seen.has(q)); prev = k; k = nx; }
      if (loop.length > 3) loops.push(subdivide(simplify(loop, 0.6), 8)); }
    return loops;
  }
  // long straight stretches are cut into short pieces, so walls sort correctly back to front (a long wall's middle
  // can't stand in for its whole length; without this, a T's stem wall could be drawn over its crossbar)
  function subdivide(pts, maxLen) {
    const out = [];
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / maxLen));
      for (let k = 0; k < n; k++) out.push([p[0] + (q[0] - p[0]) * k / n, p[1] + (q[1] - p[1]) * k / n]); }
    return out;
  }
  function simplify(pts, eps) {
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) { const [i, j] = st.pop(); let md = 0, mi = -1; const [x1, y1] = pts[i], [x2, y2] = pts[j], L = Math.hypot(x2 - x1, y2 - y1) || 1;
      for (let k = i + 1; k < j; k++) { const d = Math.abs((x2 - x1) * (y1 - pts[k][1]) - (x1 - pts[k][0]) * (y2 - y1)) / L; if (d > md) { md = d; mi = k; } }
      if (md > eps) { keep[mi] = 1; st.push([i, mi], [mi, j]); } }
    return pts.filter((_, k) => keep[k]);
  }
  function draw3d(ctx, c, ang, axis, x0, y0) {
    const F = c._face, D = Math.max(F.ox, F.oy, 4) * DEPTH, kx = F.ox / D, ky = F.oy / D, cx = F.cx + x0, cy = F.cy + y0;
    const co = Math.cos(ang), si = Math.sin(ang);
    // the block turns about its own middle (half its depth back); then a light oblique view, like the font's, where
    // points further back sit further down and right. At rest this lands exactly on the font's drawing.
    const rot = (X, Y, Z) => axis === "y" ? [X * co + Z * si, Y, -X * si + Z * co] : [X, Y * co - Z * si, Y * si + Z * co];
    const proj = (x, y, z) => { const [X, Y, Z] = rot(x + x0 - cx, y + y0 - cy, z + D / 2); return [cx + X - (Z - D / 2) * kx, cy + Y - (Z - D / 2) * ky]; };
    const depth = (x, y, z) => { const [X, Y, Z] = rot(x + x0 - cx, y + y0 - cy, z + D / 2); return X * kx + Y * ky + Z; };
    const front = axis === "y" ? co + kx * si > 0 : co - ky * si > 0;
    const a = axis === "y" ? co + si * kx : 1, b = axis === "y" ? si * ky : 0, cc = axis === "y" ? 0 : -si * kx, d = axis === "y" ? 1 : co - si * ky;
    const M = z => { const [sx, sy] = proj(cx - x0, cy - y0, z); return [a, b, cc, d, sx - (a * cx + cc * cy), sy - (b * cx + d * cy)]; };
    const light = (nx, ny) => axis === "y" ? -nx * si : ny * si;
    const cap = (z, lit) => { ctx.setTransform(...M(z)); ctx.drawImage(lit ? c._face.cv : c._sil, x0, y0); ctx.setTransform(1, 0, 0, 1, 0, 0); };
    if (!front) cap(0, false); else cap(-D, false);
    // which way a wall faces the viewer (walls turned away are skipped, which also keeps the back-to-front sort stable)
    const facing = (nx, ny) => axis === "y" ? nx * co * kx + ny * ky - nx * si : nx * kx + ny * co * ky + ny * si;
    const quads = [];
    for (const loop of c._loops) for (let i = 0; i < loop.length; i++) {
      const p = loop[i], q = loop[(i + 1) % loop.length], [nx, ny] = c._norms.get(p) || [0, 0];
      if (facing(nx, ny) <= 0) continue;
      const lv = shade(light(nx, ny)), vp = c._vnorms.get(p), vq = c._vnorms.get(q);
      quads.push({ p, q, dz: depth((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, -D / 2), lv, lp: vp ? shade(light(vp[0], vp[1])) : lv, lq: vq ? shade(light(vq[0], vq[1])) : lv });
    }
    quads.sort((u, w) => u.dz - w.dz);
    const ink = c._inkHex || "#000", fill = c._fillHex, lw = c._lineW;
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const col = t => t <= 0 ? ink : t >= 1 ? fill : mixHexes(ink, fill, t);
    // ink lines along a lit wall's front and back edges, like the font's outlines, so lit walls read as separate surfaces;
    // faded in with the light rather than switched on
    const edges = Q => { const la = Math.min(1, Math.max(0, (Q.lv - 0.1) / 0.3)); if (la <= 0) return;
      ctx.lineCap = "butt"; ctx.strokeStyle = la >= 1 ? ink : mixHexes(ink, fill, Math.min(1, Q.lv) * (1 - la)); ctx.lineWidth = lw; ctx.beginPath();
      ctx.moveTo(Q.A1[0], Q.A1[1]); ctx.lineTo(Q.B1[0], Q.B1[1]); ctx.moveTo(Q.A2[0], Q.A2[1]); ctx.lineTo(Q.B2[0], Q.B2[1]); ctx.stroke(); };
    const byStart = new Map(), byEnd = new Map();
    for (const Q of quads) {
      const A1 = Q.A1 = proj(Q.p[0], Q.p[1], 0), B1 = Q.B1 = proj(Q.q[0], Q.q[1], 0), B2 = Q.B2 = proj(Q.q[0], Q.q[1], -D), A2 = Q.A2 = proj(Q.p[0], Q.p[1], -D);
      ctx.beginPath(); ctx.moveTo(A1[0], A1[1]); ctx.lineTo(B1[0], B1[1]); ctx.lineTo(B2[0], B2[1]); ctx.lineTo(A2[0], A2[1]); ctx.closePath();
      // shaded smoothly from one end of the strip to the other, so curved walls don't show bands
      let paint = col(Q.lv);
      if (Q.lp !== Q.lq && Math.hypot(B1[0] - A1[0], B1[1] - A1[1]) > 0.5) { paint = ctx.createLinearGradient(A1[0], A1[1], B1[0], B1[1]); paint.addColorStop(0, col(Q.lp)); paint.addColorStop(1, col(Q.lq)); }
      ctx.fillStyle = ctx.strokeStyle = paint; ctx.lineWidth = 1; ctx.lineJoin = "miter"; ctx.lineCap = "butt"; ctx.fill(); ctx.stroke();
      // a strip's fill covers the ends of its neighbours' lines, so those are redrawn too, keeping each edge one unbroken line
      const before = byEnd.get(Q.p), after = byStart.get(Q.q);
      if (before) edges(before); if (after) edges(after); edges(Q);
      byStart.set(Q.p, Q); byEnd.set(Q.q, Q);
    }
    ctx.lineJoin = ctx.lineCap = "round";
    // the face toward the viewer follows the same rule as the walls: drawn lit, then shaded toward black as it turns away
    const fl = shade(Math.abs(co)); cap(front ? 0 : -D, true);
    if (fl < 1) { ctx.setTransform(...M(front ? 0 : -D)); ctx.globalAlpha = 1 - fl; ctx.drawImage(c._sil, x0, y0); ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0); }
  }
  function prep(c, g, ink, fill) {
    if (c._sil) return;
    faceOf(c, fill, g.fs || 60); c._fillHex = fill; c._inkHex = ink;
    const sil = document.createElement("canvas"); sil.width = c.width; sil.height = c.height;
    const sx = sil.getContext("2d"); sx.drawImage(c._face.cv, 0, 0); sx.globalCompositeOperation = "source-in"; sx.fillStyle = ink || "#000"; sx.fillRect(0, 0, sil.width, sil.height);
    c._sil = sil;
    const W = sil.width, H = sil.height, px = sx.getImageData(0, 0, W, H).data, A = new Float32Array(W * H);
    for (let p = 0; p < W * H; p++) A[p] = px[p * 4 + 3] / 255;
    c._loops = outline(A, W, H);
    // each outline stretch's outward direction (from the segment, pointed away from the ink)
    const at = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return xi < 0 || yi < 0 || xi >= W || yi >= H ? 0 : A[yi * W + xi]; };
    c._norms = new Map();
    for (const loop of c._loops) for (let i = 0; i < loop.length; i++) { const p = loop[i], q = loop[(i + 1) % loop.length];
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; let nx = dy / L, ny = -dx / L;
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (at(mx + nx * 1.5, my + ny * 1.5) > at(mx - nx * 1.5, my - ny * 1.5)) { nx = -nx; ny = -ny; }
      c._norms.set(p, [nx, ny]); }
    // smooth each stretch's direction with its neighbors, so light moves evenly along curves instead of flickering stretch by stretch
    for (const loop of c._loops) { const raw = loop.map(p => c._norms.get(p));
      loop.forEach((p, i) => { const n = loop.length, a1 = raw[(i - 1 + n) % n], a2 = raw[i], a3 = raw[(i + 1) % n];
        const sx2 = a1[0] + 2 * a2[0] + a3[0], sy2 = a1[1] + 2 * a2[1] + a3[1], L = Math.hypot(sx2, sy2) || 1; c._norms.set(p, [sx2 / L, sy2 / L]); }); }
    // per-corner directions (the average of the two stretches that meet there), for smooth shading along the wall
    c._vnorms = new Map();
    for (const loop of c._loops) loop.forEach((p, i) => { const n = loop.length, a1 = c._norms.get(loop[(i - 1 + n) % n]), a2 = c._norms.get(p);
      const sx2 = a1[0] + a2[0], sy2 = a1[1] + a2[1], L = Math.hypot(sx2, sy2) || 1; c._vnorms.set(p, [sx2 / L, sy2 / L]); });
    c._lineW = Math.max(1.5, (g.fs || 60) * 0.022 * (c.width / parseFloat(c.style.width)));
    if (String(fill).toLowerCase() === SHINE_GOLD) shineFace(c);
    const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); draw3d(ctx, c, 0, "y", 0, 0);
  }
  // gold reads as metal through bands of light and dark running down the face, like a polished bar
  const GOLD_BANDS = [[0, [255, 241, 176]], [.28, [247, 205, 78]], [.5, [205, 140, 26]], [.6, [236, 186, 58]], [.78, [252, 226, 128]], [1, [186, 122, 18]]];
  function goldAt(t) { for (let i = 1; i < GOLD_BANDS.length; i++) { const [t1, c1] = GOLD_BANDS[i]; if (t <= t1) { const [t0, c0] = GOLD_BANDS[i - 1], u = (t - t0) / (t1 - t0 || 1); return c0.map((v, j) => v + (c1[j] - v) * u); } } return GOLD_BANDS[GOLD_BANDS.length - 1][1]; }
  function shineFace(c) {
    const f = c._face.cv, fx = f.getContext("2d"), W = f.width, H = f.height, img = fx.getImageData(0, 0, W, H), d = img.data, [FR, FG, FB] = hexToRgb(SHINE_GOLD);
    let y0 = H, y1 = 0; for (let p = 0; p < W * H; p++) if (d[p * 4 + 3] > 200) { const y = (p / W) | 0; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const mask = document.createElement("canvas"); mask.width = W; mask.height = H; const mx = mask.getContext("2d"), mi = mx.createImageData(W, H), md = mi.data;
    for (let p = 0; p < W * H; p++) { const q = p * 4; if (!d[q + 3]) continue;
      const w = Math.max(0, Math.min(1, 1 - (Math.abs(d[q] - FR) + Math.abs(d[q + 1] - FG) + Math.abs(d[q + 2] - FB)) / 110)); if (!w) continue;
      const g = goldAt(Math.max(0, Math.min(1, ((p / W | 0) - y0) / Math.max(1, y1 - y0))));
      for (let j = 0; j < 3; j++) d[q + j] = d[q + j] + (g[j] - d[q + j]) * w;
      md[q] = md[q + 1] = md[q + 2] = 255; md[q + 3] = d[q + 3] * w; }
    fx.putImageData(img, 0, 0); mx.putImageData(mi, 0, 0); c._shineMask = mask;
  }
  // a glint of light sweeps across the gold name, letter by letter: three times, then only when you hover or focus the name
  // (motion that starts by itself stops after a few seconds, per WCAG 2.2.2; never with reduced motion)
  function glintLetter(c, x) {
    const ctx = c.getContext("2d"); ctx.clearRect(0, 0, c.width, c.height); draw3d(ctx, c, 0, "y", 0, 0); if (x == null || !c._shineMask) return;
    const W = c.width, H = c.height, t = c._glintCv || (c._glintCv = document.createElement("canvas")); t.width = W; t.height = H;
    const tx = t.getContext("2d"), bw = H * 0.32, gr = tx.createLinearGradient(x - bw, H * 0.15, x + bw, -H * 0.15);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.5, "rgba(255,255,240,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    tx.fillStyle = gr; tx.fillRect(0, 0, W, H); tx.globalCompositeOperation = "destination-in"; tx.drawImage(c._shineMask, 0, 0);
    ctx.globalCompositeOperation = "screen"; ctx.drawImage(t, 0, 0); ctx.globalCompositeOperation = "source-over";
  }
  function startGlints(wrap) {
    const sweep = (asked) => {
      if (!wrap.isConnected || wrap._fill !== SHINE_GOLD || wrap._glinting) return;
      if (!asked && (wrap._glints || 0) >= 3) return;
      if (document.hidden || reduceMotion() || mode !== "view") { if (!asked) wrap._glintT = setTimeout(sweep, 6000); return; }
      wrap._glinting = true; if (!asked) wrap._glints = (wrap._glints || 0) + 1;
      const glyphs = wrap._glyphs.filter(g => g.base && g.base._shineMask), k = glyphs[0] ? glyphs[0].base.width / parseFloat(glyphs[0].base.style.width) : 1;
      const right = Math.max(...wrap._glyphs.map(g => g.l + g.w)), t0 = performance.now(), dur = 1300;
      const frame = () => {
        const u = Math.min(1, (performance.now() - t0) / dur), X = -60 + (right + 120) * u;
        for (const g of glyphs) { const c = g.base; if (c._spinning) continue; const L = parseFloat(c.style.left), lx = (X - L) * k, near = lx > -c.height && lx < c.width + c.height;
          if (near && u < 1) { glintLetter(c, lx); c._glinted = true; } else if (c._glinted) { glintLetter(c, null); c._glinted = false; } }
        if (u < 1) requestAnimationFrame(frame); else { wrap._glinting = false; if (!asked) wrap._glintT = setTimeout(sweep, 6000); }
      };
      requestAnimationFrame(frame);
    };
    wrap._sweep = () => sweep(true);
    clearTimeout(wrap._glintT); if ((wrap._glints || 0) < 3) wrap._glintT = setTimeout(sweep, 900);
  }
  function prepSpins(wrap) {
    const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
    const gold = wrap._fill === SHINE_GOLD;
    let i = 0; const step = () => { if (!wrap.isConnected || (nameFx() !== "spin" && !gold)) return; const g = wrap._glyphs[i++];
      if (!g) { if (wrap._onPrepped) { wrap._onPrepped(); wrap._onPrepped = null; } if (gold) startGlints(wrap); return; } if (g.base) prep(g.base, g, wrap._ink, wrap._fill); idle(step); };
    idle(step);
  }
  // for checking the spin frame by frame: draws letter i of your name at a given angle (radians) onto a fresh canvas
  site._spinFrame = (i, axis, ang) => {
    const w = nameEl._fillCv; if (!w) return null; const g = w._glyphs[i]; if (!g || !g.base) return null; const c = g.base; prep(c, g, w._ink, w._fill);
    const F = c._face, pad = Math.ceil(Math.max(F.ox, F.oy, 4) * 2), cv = document.createElement("canvas"); cv.width = c.width + pad * 2; cv.height = c.height + pad * 2;
    draw3d(cv.getContext("2d"), c, ang, axis, pad, pad); return cv;
  };
  // friction on a spinning letter: a steady drag (SPIN_A, rad/ms²) plus one that grows with speed (SPIN_B, per ms), like an
  // axle's bearing and the air. coast() plans a spin from angle `from` at speed w (rad/ms, signed): it turns until friction
  // stops it, and lands facing front by stretching or shrinking the coast slightly (a touch less or more friction) so it
  // ends on a whole turn. It returns the plan plus its shape over normalised time, ease(t) and its slope.
  const SPIN_A = 1.5e-5, SPIN_B = 1 / 400, SPIN_WMIN = 0.006; // the gentlest touch still starts at about one turn a second
  // a soft top speed: up to 5 turns a second the letter's edge matches the pointer exactly; past that each extra bit of force
  // adds less and less (a hard flick ~6.5 turns a second, a wild one ~8), because much faster the letter is only a blur and
  // the eye can't see it slowing down. Harder still always turns a little faster. SPIN_WMAX only bounds repeated pushes
  const SPIN_KNEE = 5, SPIN_SOFT = 0.8, SPIN_WMAX = 9 * Math.PI * 2 / 1000;
  const softSpin = w => { const r = w * 1000 / (Math.PI * 2); return (r <= SPIN_KNEE ? r : SPIN_KNEE + SPIN_SOFT * Math.log(1 + (r - SPIN_KNEE) / SPIN_SOFT)) * Math.PI * 2 / 1000; };
  function coast(from, w, dir) {
    const TAU = Math.PI * 2, sg = Math.sign(w) || dir, m = Math.max(SPIN_WMIN, Math.abs(w)), A = SPIN_A, B = SPIN_B;
    const T = Math.log(1 + B * m / A) / B, th = t => (m + A / B) * (1 - Math.exp(-B * t)) / B - A / B * t, dth = t => (m + A / B) * Math.exp(-B * t) - A / B;
    // it lands on the next facing-front point past where it would naturally stop (unless that's only a sliver further
    // back), so a harder flick never ends sooner than a softer one
    const full = th(T), end = (from + sg * full) / TAU; let to = (sg > 0 ? Math.ceil(end - 0.15) : Math.floor(end + 0.15)) * TAU;
    if ((to - from) * sg < 0.3) to += sg * TAU;
    const k = Math.abs(to - from) / full;
    return { from, to, dur: T * k, ease: u => th(u * T) / full, slope: u => dth(u * T) * T / full };
  }

  function spin(c, v, g, ink, fill) {
    const sp = Math.hypot(v.vx, v.vy), horiz = !v.flip && (sp < 0.05 || Math.abs(v.vx) > Math.abs(v.vy) * 1.4); // anything near-vertical counts as up/down
    // flip: every sweep turns the letter over toward the viewer, like a flip-clock digit (an upward sweep turns it back the other way)
    const dir = v.flip ? (v.vy < -Math.abs(v.vx) ? 1 : -1) : horiz ? (v.vx < 0 ? -1 : 1) : (v.vy < 0 ? 1 : -1), axis = horiz ? "y" : "x";
    // the letter behaves like a wheel on an axle: the flick is a single push that sets its starting speed (in step with the
    // pointer's), and from then on only friction acts on it, so it slows the whole way and coasts gently to a stop
    // the pointer pushes the letter's edge along at its own speed, like a hand spinning a wheel by its rim: the letter starts
    // turning so that its edge moves as fast as the pointer did. Every letter uses the same rim (the name's average
    // half-width sideways, about half the letter height up or down), so the whole name reacts as one set of blocks
    const G = nameEl._fillCv && nameEl._fillCv._glyphs || [g], avgW = G.reduce((t, q) => t + q.w, 0) / G.length;
    const TAU = Math.PI * 2, rim = horiz ? Math.max(8, avgW / 2) : Math.max(8, g.h * 0.3);
    const w0 = softSpin((v.flip ? sp : horiz ? Math.abs(v.vx) : Math.abs(v.vy)) / rim);
    // like a Rubik's cube, a letter that is turning one way is locked to that axis until it stops: a sweep along the same axis
    // pushes it again from where it is, and the push simply adds to the speed it already has: the same way round it speeds
    // up; the other way the push first has to cancel the spin, so a weak flick against a fast spin only slows it (it then
    // coasts on to its next facing-front point) and a strong one reverses it with whatever force is left over
    const S = c._spin;
    if (S) { if (S.axis === axis) { const now = performance.now(), cur = S.angle(now), sv = S.speed(now);
        const w = Math.max(-SPIN_WMAX, Math.min(SPIN_WMAX, sv + dir * w0));
        Object.assign(S, coast(cur, w, dir), { t0: now, lin: false }); S.next = null; }
      // ...but a flick across it isn't lost or kept waiting: the letter snaps quickly on round to its next facing-front point
      // (at least as fast as it was going, never slower than about a sixth of a second) and then turns the new way;
      // a later flick along its own axis cancels that
      else { const now = performance.now(), cur = S.angle(now), d = Math.sign(S.to - S.from) || 1;
        const rest = Math.abs(S.to - cur) < 0.35 ? S.to : (d > 0 ? Math.ceil(cur / TAU - 1e-6) : Math.floor(cur / TAU + 1e-6)) * TAU, gap = Math.abs(rest - cur);
        S.next = v; S.retarget(cur, rest, Math.max(30, Math.min(170, gap / Math.max(Math.abs(S.speed(now)), 1e-3))), now, true); }
      return; }
    prep(c, g, ink, fill); c._spinning = true;
    const k = c.width / parseFloat(c.style.width), F = c._face, pad = Math.ceil(Math.max(F.ox, F.oy, 4) * 2);
    const cv = document.createElement("canvas"); cv.width = c.width + pad * 2; cv.height = c.height + pad * 2; cv.className = "spin-cv";
    Object.assign(cv.style, { position: "absolute", left: parseFloat(c.style.left) - pad / k + "px", top: parseFloat(c.style.top) - pad / k + "px", width: cv.width / k + "px", height: cv.height / k + "px", pointerEvents: "none" });
    const ctx = cv.getContext("2d"); draw3d(ctx, c, 0, axis, pad, pad);
    c.parentNode.insertBefore(cv, c); c.style.visibility = "hidden";
    const st = c._spin = { axis, ...coast(0, dir * w0, dir), t0: performance.now(),
      angle(now) { const t = Math.min(1, (now - this.t0) / this.dur), e = this.lin ? t : this.ease(t); return this.from + (this.to - this.from) * e; },
      // radians per millisecond right now
      speed(now) { const t = Math.min(1, (now - this.t0) / this.dur); return (this.to - this.from) / this.dur * (this.lin ? 1 : this.slope(t)); },
      retarget(from, to, dur, now, lin) { this.from = from; this.to = to; this.dur = dur; this.t0 = now; this.lin = !!lin; } };
    // motion blur: when the letter turns more than about a sixth of a radian between frames, the frame is the average of
    // several renders spread back over the arc it just swept (like a camera shutter), so fast spins smear instead of strobing
    let blurCv = null;
    const frame = () => {
      const now = performance.now(), t = Math.min(1, (now - st.t0) / st.dur), a = t < 1 ? st.angle(now) : 0;
      const arc = t < 1 ? st.speed(now) * 16.7 * 0.6 : 0, n = Math.min(6, Math.ceil(Math.abs(arc) / 0.17));
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (n < 2) draw3d(ctx, c, a, st.axis, pad, pad);
      else {
        if (!blurCv) { blurCv = document.createElement("canvas"); blurCv.width = cv.width; blurCv.height = cv.height; }
        const bx = blurCv.getContext("2d"); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 / n;
        for (let i = 0; i < n; i++) { bx.clearRect(0, 0, cv.width, cv.height); draw3d(bx, c, a - arc * i / (n - 1), st.axis, pad, pad); ctx.drawImage(blurCv, 0, 0); }
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      }
      if (t < 1) { requestAnimationFrame(frame); return; }
      if (c._glinted) { c._glinted = false; glintLetter(c, null); } cv.remove(); c.style.visibility = ""; c._spinning = false; c._spin = null;
      if (st.next) spin(c, st.next, g, ink, fill);
    };
    requestAnimationFrame(frame);
  }



  function bobAt(e) {
    const v = e.type === "pointermove" ? swipe(e) : { vx: 0, vy: 0 };
    // with reduced motion on, moving effects swap to the color flash, which doesn't move
    let fx = nameFx(); if (fx === "none" || mode !== "view") return; if (fx !== "fill" && reduceMotion()) fx = "fill";
    const w = nameEl._fillCv; if (!w || !w._glyphs) return;
    const b = w.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const i = w._glyphs.findIndex(g => x >= g.l && x <= g.l + g.w && y >= g.t && y <= g.t + g.h);
    if (i === lastBob) return; lastBob = i; if (i < 0) return;
    const g = w._glyphs[i]; v.rx = x - (g.l + g.w / 2); v.ry = y - (g.t + g.h / 2);
    playLetter(i, v, fx);
  }
  // Rustle: the letters lie in the moss like cut-out pieces. A sweep nudges a letter the way it went (further for a faster
  // sweep) with a slight turn, it springs back into its spot, and the grass at its foot sways the same way.
  function rustle(c, v) {
    let vx = v.vx, vy = v.vy, sp = Math.hypot(vx, vy);
    if (sp < .02) { vx = 0; vy = -1; sp = .25; } // a tap or a key press: a small hop in place
    const ux = vx / Math.hypot(vx, vy), uy = vy / Math.hypot(vx, vy);
    const d = Math.min(14, 3 + sp * 8), turn = Math.min(9, 1.5 + sp * 5) * (ux >= 0 ? 1 : -1) * (uy > .3 ? -1 : 1);
    const at = (k, r) => ({ transform: `translate(${(ux * d * k).toFixed(2)}px, ${(uy * d * k).toFixed(2)}px) rotate(${(turn * r).toFixed(2)}deg)` });
    const now = c._rustleA ? getComputedStyle(c).transform : "none";
    if (c._rustleA) c._rustleA.cancel();
    c._rustleA = c.animate([{ transform: now === "none" ? "translate(0,0)" : now, offset: 0 }, { ...at(1, 1), offset: .16, easing: "cubic-bezier(.2,.7,.3,1)" },
      { ...at(-.28, -.4), offset: .46 }, { ...at(.1, .15), offset: .7 }, { ...at(-.03, -.04), offset: .86 }, { transform: "translate(0,0) rotate(0deg)" }],
      { duration: 820 + Math.min(500, sp * 260), easing: "ease-out" });
    c._rustleA.onfinish = () => { c._rustleA = null; };
    swayAt(c, ux >= 0 ? 1 : -1, Math.min(1.6, .5 + sp));
  }
  // sway the blades growing around a letter
  // The leaves at a pushed letter's foot sway with it. They're moved by one frame loop that only ever changes their
  // transform, never by animations that start and end: Safari rebuilt a leaf's layer as an animation began or finished,
  // and the leaves blinked just after the letters came to rest.
  const sways = new Map();
  const easeOut = t => { let lo = 0, hi = 1; for (let i = 0; i < 20; i++) { const u = (lo + hi) / 2, x = 3 * u * u * (1 - u) * .58 + u * u * u; if (x < t) lo = u; else hi = u; }
    const u = (lo + hi) / 2; return 3 * u * u * (1 - u) + u * u * u; };
  const SW_AT = [0, .2, .5, .75, 1], SW_V = [0, 11, -5, 2, 0];
  // a new sway that arrives while a leaf still swings starts from the angle it's at (the old swing fades out over the new
  // one's first push), and until the new one reaches it the old one carries on, so a leaf never snaps back to rest
  function swayD(w, now) {
    const t = (now - w.t0) / w.dur; if (t < 0) return w.prev ? swayD(w.prev, now) : w.c0; if (t >= 1) return 0;
    const p = easeOut(t); let i = 1; while (p > SW_AT[i]) i++;
    const f = (p - SW_AT[i - 1]) / (SW_AT[i] - SW_AT[i - 1]), s = i === 1 ? f : 1;
    return (SW_V[i - 1] + (SW_V[i] - SW_V[i - 1]) * f) * w.amp + w.c0 * (1 - s);
  }
  let windWas = 0;
  function swayFrame() {
    const now = performance.now(), lay = nameEl.closest(".lay"), blow = nameWind || windWas; windWas = nameWind;
    // with the wind, every leaf leans (its sideways share of the pull, a bit different per leaf); sways ride on top
    const leaves = blow && lay && lay._grown ? lay.querySelectorAll(":scope > .blade") : [...sways.keys()];
    for (const b of leaves) { const w = sways.get(b); if (b._base == null) b._base = w ? w.base : b.style.transform;
      let d = 0;
      if (w) { if (now >= w.t0 && w.prev) { w.c0 = w.d; w.prev = null; }
        if (now - w.t0 >= w.dur) sways.delete(b); else d = w.d = swayD(w, now); }
      if (nameWind) { if (b._wk == null) { b._wk = .6 + Math.random() * .6; b._wa = Math.sin(parseFloat((b._base.match(/-?[\d.]+/) || [0])[0]) * Math.PI / 180); }
        // each leaf leans with the gust passing it (the same rolling bands as the grass, see blades.js)
        if (!b._pp) { const r = b.getBoundingClientRect(); b._pp = [r.left + r.width / 2 + scrollX - nameGust.sx, r.top + r.height / 2 + scrollY - nameGust.sy]; }
        const q = nameGust.dir * (b._pp[1] * .0121 + b._pp[0] * .0035), u = (((nameGust.ph - q) / (2 * Math.PI)) % 1 + 1) % 1;
        d += nameGust.env(b._pp[0] + nameGust.sx - scrollX, b._pp[1] + nameGust.sy - scrollY) * 8 * b._wk * b._wa * (u < .48 ? gustWob(u / .48) : 0); }
      b.style.transform = d ? `${b._base} rotate(${d.toFixed(2)}deg)` : b._base; }
    swayFrame.raf = sways.size || nameWind ? requestAnimationFrame(swayFrame) : 0;
  }
  const swayNext = (b, amp, t0, dur) => { const prev = sways.get(b);
    sways.set(b, { base: prev ? prev.base : b._base != null ? b._base : b.style.transform, amp, t0, dur, c0: prev ? prev.d || 0 : 0, prev: prev || null, d: prev ? prev.d || 0 : 0 }); };
  // scrolling pulls the name's leaves along with the rest of the grass (see blades.js)
  let nameWind = 0, nameGust = null;
  // the cursor's wobble (blades.js KEYS): out, back past rest, a smaller swing, still
  const GW = [[0, 0], [.18, 1], [.48, -.38], [.74, .14], [1, 0]];
  const gustWob = t => { for (let k = 1; k < GW.length; k++) if (t <= GW[k][0]) { const [t0, a0] = GW[k - 1], [t1, a1] = GW[k], u = (t - t0) / (t1 - t0); return a0 + (a1 - a0) * u * u * (3 - 2 * u); } return 0; };
  addEventListener("grass-wind", e => { const lay = nameEl.closest(".lay"), r = lay && lay.getBoundingClientRect(), seen = r && r.bottom > 0 && r.top < innerHeight;
    // only while the name is on screen: moving its leaves makes the browser redraw each one
    nameWind = reduceMotion() || !seen ? 0 : e.detail.w; nameGust = e.detail; if (!swayFrame.raf && (nameWind || windWas)) swayFrame.raf = requestAnimationFrame(swayFrame); });
  function swayAt(c, s, force) {
    const lay = nameEl.closest(".lay"); if (!lay || !lay._grown) return; // still growing in: its own loop is moving them
    const r = c.getBoundingClientRect(), now = performance.now();
    lay.querySelectorAll(":scope > .blade").forEach(b => {
      const br = b.getBoundingClientRect(), bx = br.left + br.width / 2;
      if (bx < r.left - 14 || bx > r.right + 14) return;
      swayNext(b, s * (.6 + Math.random() * .5) * force, now + Math.random() * 80, 1000 + Math.random() * 400);
    });
    if (!swayFrame.raf && sways.size) swayFrame.raf = requestAnimationFrame(swayFrame);
  }
  // Twirl: the letters lie flat in the moss, so a sweep turns a letter round in place, like spinning a tile on a table.
  // Same wheel physics as the old spin (the flick sets the speed so the letter's edge keeps pace with the pointer, then only
  // friction slows it, and it lands upright again); which way it turns comes from which side of its centre the pointer passed.
  function twirl(c, v, g) {
    const TAU = Math.PI * 2, sp = Math.hypot(v.vx, v.vy);
    const torque = (v.rx || 0) * v.vy - (v.ry || 0) * v.vx, dir = Math.abs(torque) > 1e-3 * sp ? Math.sign(torque) : (v.vx < 0 ? -1 : 1);
    const G = nameEl._fillCv && nameEl._fillCv._glyphs || [g], rim = Math.max(8, G.reduce((t, q) => t + q.w, 0) / G.length / 2);
    const w0 = softSpin(sp / rim), S = c._twirl;
    if (S) { // another sweep while it turns adds to the spin it already has: same way speeds it up, the other way slows or reverses it
      const now = performance.now(), cur = S.angle(now), w = Math.max(-SPIN_WMAX, Math.min(SPIN_WMAX, S.speed(now) + dir * w0));
      Object.assign(S, coast(cur, w, dir), { t0: now }); return; }
    const st = c._twirl = { ...coast(0, dir * w0, dir), t0: performance.now(),
      angle(now) { const t = Math.min(1, (now - this.t0) / this.dur); return this.from + (this.to - this.from) * this.ease(t); },
      speed(now) { const t = Math.min(1, (now - this.t0) / this.dur); return (this.to - this.from) / this.dur * this.slope(t); } };
    c.style.transformOrigin = "50% 55%"; c._spinning = true;
    const frame = () => {
      const now = performance.now(), t = (now - st.t0) / st.dur;
      if (t >= 1) { c.style.transform = ""; c._twirl = null; c._spinning = false; return; }
      c.style.transform = `rotate(${st.angle(now)}rad)`; requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    swayAt(c, v.vx < 0 ? -1 : 1, Math.min(1.6, .5 + sp));
  }
  // Rock: the letters are thick cut-out tiles lying loose on the ground. A sweep tips one like a tile nudged on uneven moss:
  // the edge it is pushed toward dips, the far edge lifts (showing the tile's side), and it rocks back and forth a few times
  // before settling flat. It's real 3D: the tile is its face plus a stack of thin slices below it, turned in perspective.
  // The tile (sides, face and baked shadow) stands in for the letter for good once it's made, even when flat, so a letter
  // is drawn the same way still as moving and nothing swaps when it starts or stops.
  function tileFor(c) {
    const k = c.width / parseFloat(c.style.width), w = parseFloat(c.style.width), h = parseFloat(c.style.height), D = Math.max(8, Math.round(parseFloat(c.style.height) * 0.08));
    const wrap = document.createElement("div"); wrap.className = "rock-tile"; wrap.setAttribute("aria-hidden", "true");
    Object.assign(wrap.style, { position: "absolute", left: c.style.left, top: c.style.top, width: w + "px", height: h + "px", transformStyle: "preserve-3d", transformOrigin: "50% 50%", pointerEvents: "none" });
    // the sides: slices of the letter's silhouette, lighter near the face and darker further down
    const slice = t => { const s2 = document.createElement("canvas"); s2.width = c.width; s2.height = c.height; const x = s2.getContext("2d");
      x.drawImage(c, 0, 0); x.globalCompositeOperation = "source-in";
      x.fillStyle = `rgb(${Math.round(222 - 60 * t)},${Math.round(221 - 58 * t)},${Math.round(210 - 58 * t)})`; x.fillRect(0, 0, s2.width, s2.height); return s2; };
    // the tile's shadow: the resting letter's three drop-shadows baked into a flat image (Safari drops CSS filters around
    // 3D-turned content), shadow only, turned along with the tile so it follows it and is exactly the resting one when flat
    const P = 64, sh = document.createElement("canvas"); sh.width = c.width + 2 * P * k; sh.height = c.height + 2 * P * k;
    // CSS stacks each drop-shadow under everything before it, letter included; this does the same while keeping a
    // shadows-only copy (S), so the letter can be left out without cutting into the shadow under its edges
    { const mk = () => { const n = document.createElement("canvas"); n.width = sh.width; n.height = sh.height; return n; };
      let I = mk(), S = mk(); I.getContext("2d").drawImage(c, P * k, P * k);
      for (const [dx, dy, b, col] of [[.5, .8, .5, "rgba(6,8,2,.7)"], [1.5, 2.5, 2, "rgba(6,8,2,.6)"], [3, 5, 7, "rgba(6,8,2,.35)"]] /* same as the CSS one in dir-i.css */) {
        const F = 1e5, one = mk(), o = one.getContext("2d"); // this step's shadow alone: the source drawn far away, its shadow pulled back
        // (CSS drop-shadow's blur is the standard deviation; canvas shadowBlur is twice it)
        Object.assign(o, { shadowColor: col, shadowOffsetX: dx * k + F, shadowOffsetY: dy * k, shadowBlur: b * k * 2 }); o.drawImage(I, -F, 0);
        const nI = mk(), nS = mk(); nI.getContext("2d").drawImage(one, 0, 0); nI.getContext("2d").drawImage(I, 0, 0);
        nS.getContext("2d").drawImage(one, 0, 0); nS.getContext("2d").drawImage(S, 0, 0);
        for (const x of [I, S, one]) x.width = 0; I = nI; S = nS; }
      sh.getContext("2d").drawImage(S, 0, 0); I.width = S.width = 0; }
    sh.className = "rock-shadow"; sh.setAttribute("aria-hidden", "true");
    Object.assign(sh.style, { position: "absolute", left: parseFloat(c.style.left) - P + "px", top: parseFloat(c.style.top) - P + "px", width: w + 2 * P + "px", height: h + 2 * P + "px", transformOrigin: `${P + w / 2}px ${P + h / 2}px`, pointerEvents: "none" });
    const hold = document.createElement("div"); hold.className = "rock-hold"; hold.setAttribute("aria-hidden", "true");
    Object.assign(hold.style, { position: "absolute", left: c.style.left, top: c.style.top, width: w + "px", height: h + "px", pointerEvents: "none" });
    Object.assign(wrap.style, { left: 0, top: 0 }); hold.appendChild(wrap); const R0 = hold;
    // the sides sit a px inside the face's outline, so when the tile is flat none of them peeks out under its soft edge
    // (made on the first rock: a phone holding a dozen 3D layers per letter all the time ran short and flickered)
    const sides = () => { const inset = `scale(${((w - 1.5) / w).toFixed(4)}, ${((h - 1.5) / h).toFixed(4)})`;
      for (let i = D; i >= 1; i--) { const s2 = slice(i / D);
        Object.assign(s2.style, { position: "absolute", left: 0, top: 0, width: w + "px", height: h + "px", transform: `translateZ(${-i}px) ${inset}`, display: "none" }); wrap.insertBefore(s2, top); } };
    const top = document.createElement("canvas"); top.width = c.width; top.height = c.height; top.getContext("2d").drawImage(c, 0, 0);
    Object.assign(top.style, { position: "absolute", left: 0, top: 0, width: w + "px", height: h + "px" }); wrap.appendChild(top);
    c.parentNode.insertBefore(sh, c); c.parentNode.insertBefore(hold, c); c.style.visibility = "hidden";
    // the ink's outline points, so the tile tips on the letter's real edge and not on the edge of its (padded) canvas
    const ink = []; { const a = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, st = Math.max(1, Math.round(k * 2));
      for (let y = 0; y < c.height; y += st) for (let x = 0; x < c.width; x += st) if (a[(y * c.width + x) * 4 + 3] > 128) ink.push([x / k - w / 2, y / k - h / 2]); }
    const R = c._rock = { wrap, top, shadow: R0, sh, sides, w, h, D, ink, ux: 1, uy: 0, lo: 0, hi: 0, th: 0, k: 0 }; lie(R); return R;
  }
  // at rest the tile keeps its 3D setup (Chrome draws a 3D layer a touch softer than a flat one, so going flat at rest
  // would make the letter change as it starts and stops), but without its sides: those are made on the first rock and
  // shown only while it is tipped (see tilt), so a still name holds two layers per letter instead of a dozen
  function lie(R) {
    R.wrap.style.transformStyle = "preserve-3d"; R.top.style.transform = "translateZ(0.5px)"; tilt(R, 0);
  }
  function lift(R) {
    if (R.sides) { R.sides(); R.sides = null; R.up = false; }
  }
  function tilt(R, k) {
    // flat, the sides' soft rims peek out under the face's edge, so they fade in and out with the tilt (over the first
    // 4 degrees): the letter never visibly gains or loses its edge, and a still name has no side layers
    // once made, they stay in place (only their opacity changes): switching them off as the letter settled made Safari
    // rebuild the letter's layers, and the leaves over it blinked
    const a = Math.abs(R.th * k), op = Math.min(1, a / 4).toFixed(3);
    if (op !== R.op) { R.op = op; for (const n of R.wrap.children) if (n !== R.top) { n.style.display = ""; n.style.opacity = op; } }
    const A = R.th * k, e = k >= 0 ? R.hi : R.lo, px = (R.ux * e).toFixed(2), py = (R.uy * e).toFixed(2);
    R.sh.style.transform = R.wrap.style.transform = `perspective(600px) translate3d(${px}px, ${py}px, ${-R.D}px) rotate3d(${(-R.uy).toFixed(3)}, ${R.ux.toFixed(3)}, 0, ${(Math.abs(A) < .02 ? .02 : A).toFixed(2)}deg) translate3d(${-px}px, ${-py}px, ${R.D}px)`;
  }
  // the tile's tilt as one 2D vector: the direction it leans toward times the angle. A push that arrives mid-rock (sweeping
  // back and forth over a letter) blends from the lean the tile has into the new one, so it never snaps to a new axis,
  // a flipped lean or a new pivot edge
  function lean(R, ax, ay) {
    const a = Math.hypot(ax, ay);
    if (a > 1e-3) { R.ux = ax / a; R.uy = ay / a; let hi = 0; for (const [x, y] of R.hull) { const d = x * R.ux + y * R.uy; if (d > hi) hi = d; } R.hi = hi; }
    R.th = 1; R.ax = ax; R.ay = ay; tilt(R, a);
  }
  // the ink's convex outline: the tile can only pivot on it, and it's a few dozen points instead of thousands
  function hullOf(P) {
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  // the name's letters get their tiles while the page is idle, one per idle moment
  function mountTiles(wrap) {
    const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
    let i = 0; const step = () => { if (!wrap.isConnected || nameFx() !== "rock") return; const g = wrap._glyphs[i++]; if (!g) return;
      if (g.base && !g.base._rock) tileFor(g.base); idle(step); };
    idle(step);
  }
  function rock(c, v, g) {
    let vx = v.vx, vy = v.vy, sp = Math.hypot(vx, vy);
    if (sp < .02) { vx = 0; vy = 1; sp = .25; }
    const L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L, th = Math.min(42, 20 + sp * 18);
    const R = c._rock || tileFor(c);
    // A tile lying on the ground can't turn about its middle (half of it would sink in): it pivots on an edge. Pushed one way,
    // it tips up on the edge it's pushed toward, the far edge lifting; falling back, it overshoots onto its other edge, and
    // so on, each rock smaller, until it lies flat again.
    // the swings die away smoothly: the last ones are small but not tiny, so it doesn't buzz on its way to rest
    const KS = [[0, 0], [.14, 1], [.38, -.5], [.62, .22], [.84, -.07], [1, 0]];
    const wob = t => { for (let i = 1; i < KS.length; i++) if (t <= KS[i][0]) { const [t0, a0] = KS[i - 1], [t1, a1] = KS[i], u = (t - t0) / (t1 - t0); return a0 + (a1 - a0) * (i === 1 ? 1 - (1 - u) * (1 - u) : u * u * (3 - 2 * u)); } return 0; };
    if (!R.hull) R.hull = hullOf(R.ink);
    Object.assign(R, { nx: ux * th, ny: uy * th, cx: R.ax || 0, cy: R.ay || 0, t0: performance.now(), dur: 1200 + Math.min(500, sp * 250) });
    c._spinning = true;
    if (!R.raf) { lift(R);
      const step = () => {
        const t = (performance.now() - R.t0) / R.dur;
        if (t >= 1) { R.raf = 0; R.k = R.ax = R.ay = 0; R.th = 1; tilt(R, 0); c._spinning = false; return; }
        // while the new push rises, the lean the tile already had fades out; the pivot is always the edge it leans toward
        // (a lean that passes through flat swaps edges at zero angle, where the swap can't be seen)
        const w = wob(t), f = t < KS[1][0] ? w : 1, ax = R.cx * (1 - f) + R.nx * w, ay = R.cy * (1 - f) + R.ny * w;
        R.k = Math.hypot(ax, ay); lean(R, ax, ay);
        R.raf = requestAnimationFrame(step);
      };
      R.raf = requestAnimationFrame(step);
    }
    swayAt(c, ux >= 0 ? 1 : -1, Math.min(1.6, .5 + sp));
  }
  function playLetter(i, v, fx) {
    eggLetter(i);
    const w = nameEl._fillCv, g = w._glyphs[i], c = fx === "fill" ? g.alt : g.base, cls = "fx-" + fx; if (!c) return;
    if (fx === "spin") { spin(c, v, g, w._ink, w._fill); return; }
    if (fx === "rustle") { rustle(c, v); return; }
    if (fx === "twirl") { twirl(c, v, g); return; }
    if (fx === "rock") { rock(c, v, g); return; }
    if (fx === "flip") { spin(c, { ...v, flip: true }, g, w._ink, w._fill); return; }
    // restart the effect if it is already playing, so sweeping back and forth keeps it lively
    c.classList.remove(cls); void c.offsetWidth; c.classList.add(cls);
    c.addEventListener("animationend", () => c.classList.remove(cls), { once: true });
  }
  // Hidden words: spin the name's letters in order to spell one, and its emoji joins a collection by "Email me"
  const EGGS = [[["eat", "ate", "eatin"], "🍽️"], [["ear"], "👂"], [["air"], "💨"], [["ant"], "🐜"], [["art"], "🎨"], [["net"], "🥅"], [["earn", "earnt"], "💰"],
    [["internet"], "🌐"], [["rain"], "🌧️"], [["arena"], "🏟️"], [["initiate"], "🚀"], [["tent"], "⛺"], [["anteater"], "👅"], [["retreat"], "🏕️"], [["tan"], "🏖️"],
    [["tin"], "🥫"], [["rear"], "🔙"], [["tear"], "😢"], [["tart"], "🥧"], [["treat"], "🍬"], [["terra"], "🌍"], [["tartar"], "🐟"], [["tater"], "🥔"],
    [["nitrate"], "🧪"], [["trainer"], "👟"], [["terrain"], "⛰️"], [["narrate"], "🎙️"], [["irate"], "😠"], [["titan"], "🪐"], [["tiara"], "👑"],
    [["ran"], "🏃"], [["tire"], "🛞"], [["rare"], "💎"], [["tartan"], "🧣"], [["retina"], "👁️"], [["intern"], "💼"], [["ten"], "🔟"], [["tea"], "🍵"], [["ai"], "🤖"], [["train"], "🚂"], [["int"], "🧠"], [["rat"], "🐀"],
    [["ian"], "👋"], [["tarter"], "🪪"], [["atari"], "🕹️"], [["tetra"], "🐠"], [["tenet"], "⚖️"], [["terrier"], "🐕"], [["tartine"], "🥖"], [["aria"], "🎶"],
    [["tie"], "👔"], [["attire"], "🎩"], [["tar"], "🛢️"], [["rent"], "🏠"], [["attain"], "🏆"], [["reiterate"], "🔁"], [["trait"], "🧬"], [["era"], "⏳"],
    [["inert"], "🪨"], [["entertainer"], "🎤"], [["neat"], "✨"], [["intent"], "🎯"], [["retainer"], "🦷"], [["retire"], "🧓"]];
  // generous on purpose: any word that ends on the letter just spun counts, even inside a longer swipe (sweeping "Tarter" finds tar, tart and art)
  let eggSeq = "", eggSeqR = "", eggLastI = -1, eggFound = [], eggShown = null; // eggShown: the emoji the badge shows this visit (null: 🎉 or the latest find)
  try { eggFound = JSON.parse(localStorage.getItem("it-eggs") || "[]").filter(n => EGGS[n]); } catch (e) {}
  const eggOf = word => EGGS.findIndex(([ws]) => ws.includes(word));
  // common real words that aren't among the hidden ones (plus the words cut from the list) get a quick shoutout instead
  const EGG_BONUS = new Set("are err eta ire nit ante anti area near nine rant rate rein rite teat tern tier tine tint eaten eater enter ettin inane inter rarer taint trier trite aerate airier arrant artier earner entire errant errata natter nearer neaten neater rattan ratter renter retain tatter tenant titter entrant entreat inertia iterate nitrite rainier ratatat rattier retrain tartare terrine titrate treater attainer irritant irritate entertain itinerant".split(" "));
  const eggBonusSaid = new Set();
  function eggShout(w) {
    eggBonusSaid.add(w);
    const host = nameEl.parentElement; if (!host || !host.isConnected) return;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    let tag = host.querySelector(":scope > .s-wordtag");
    if (!tag) { tag = document.createElement("span"); tag.className = "s-copied s-wordtag"; tag.setAttribute("aria-hidden", "true"); host.appendChild(tag); }
    tag.textContent = `${eggName(w)} is a real word! Just not a hidden one.`;
    const r = document.createRange(); r.selectNodeContents(nameEl); const nr = r.getBoundingClientRect(), hr = host.getBoundingClientRect();
    tag.style.left = (nr.left - hr.left + nr.width / 2) + "px"; tag.style.top = (nr.top - hr.top + nr.height * .2 - tag.offsetHeight - 8) + "px";
    tag.classList.remove("show"); void tag.offsetWidth; tag.classList.add("show");
    live.textContent = ""; setTimeout(() => { live.textContent = `${eggName(w)} is a real word, just not one of the hidden ones.`; }, 30);
    clearTimeout(tag._t); tag._t = setTimeout(() => tag.classList.remove("show"), 2200);
  }
  const EGG_ORDER = EGGS.map((_, k) => k).sort((x, y) => { const a = EGGS[x][0][0], b = EGGS[y][0][0]; return a.length - b.length || a.localeCompare(b); });
  // hints: tapping an unfound slot shows its emoji, faded, and the word's length; each tap after that reveals one more letter
  let eggHints = {}; try { eggHints = JSON.parse(localStorage.getItem("it-egg-hints") || "{}") || {}; } catch (e) {}
  // display name for a word: capitalized, except acronyms stay all caps
  const eggName = w => w === "ai" ? "AI" : w[0].toUpperCase() + w.slice(1);
  const eggHintText = k => { const w = EGGS[k][0][0], L = eggHints[k] || 0; if (!L) return "";
    const shown = Math.min(w.length, L - 1), pat = [...w].map((ch, j) => j < shown ? ch.toUpperCase() : "_").join(" ");
    return `Hint: ${pat} (${w.length} letters).` + (shown < w.length ? " Tap again for another letter." : " Now spell it with my name."); };
  function eggLetter(i) {
    if (state.details.eggs === false) return;
    // two readings of what was spelled: one keeps every landing (the same letter twice in a row counts twice, so "err" can be
    // spelled on one r), the other skips landing on the same letter again. Only one thing shows per landing, in this order:
    // a new hidden word with repeats, one without, then a real-word shoutout with repeats, then without.
    // there's no time limit between letters: the last letters spun (as many as the longest word) are always what counts
    const ch = (nameEl.textContent.replace(/\s+/g, "")[i] || "").toLowerCase(), MAX = Math.max(...EGGS.flatMap(e => e[0]).map(w => w.length));
    eggSeqR = (eggSeqR + ch).slice(-MAX);
    const moved = i !== eggLastI; eggLastI = i; if (moved) eggSeq = (eggSeq + ch).slice(-MAX);
    const seqs = moved ? [eggSeqR, eggSeq] : [eggSeqR];
    // the longest hidden word each reading ends on, new ones first
    const ends = q => { const f = [], g = []; for (let k = 2; k <= q.length; k++) { const w = q.slice(-k), n = eggOf(w); if (n >= 0) (eggFound.includes(n) ? g : f).push({ n, w }); } return [f, g]; };
    let fresh = [], again = [];
    for (const q of seqs) { const [f, g] = ends(q); if (f.length) { fresh = [f[f.length - 1]]; again = []; break; } if (g.length && !again.length) again = [g[g.length - 1]]; }
    if (!fresh.length && !again.length) {
      // the longest real word ending here, once per visit
      for (const q of seqs) for (let k = q.length; k >= 3; k--) { const w = q.slice(-k); if (EGG_BONUS.has(w) && !eggBonusSaid.has(w)) { eggShout(w); return; } }
      return;
    }
    { const tag = nameEl.parentElement && nameEl.parentElement.querySelector(":scope > .s-wordtag"); if (tag) { clearTimeout(tag._t); tag.classList.remove("show"); } } // one thing at a time
    const words = [...fresh, ...again].map(f => f.w).join(" and ");
    // spelling a word you already have pulses its emoji in the grid (not the badge); once all are found, the badge also shows it until the page is reloaded
    if (!fresh.length) { if (eggDone()) eggShown = again[again.length - 1].n; showEgg(null, again.map(f => f.n)); live.textContent = ""; setTimeout(() => { live.textContent = `You spelled ${words}.`; }, 30); return; }
    fresh.forEach(f => eggFound.push(f.n)); try { localStorage.setItem("it-eggs", JSON.stringify(eggFound)); } catch (e) {}
    eggShown = eggDone() ? null : fresh[fresh.length - 1].n;
    showEgg(fresh.map(f => f.n), again.map(f => f.n));
    if (eggDone()) { eggShower(site.querySelector(".s-egg-chip")); goldWhenStill(); }
    live.textContent = ""; setTimeout(() => { live.textContent = `You spelled ${words}` + (eggDone() ? `. You found all ${EGGS.length} hidden words!` : eggFound.length > 1 ? `. ${eggFound.length} of ${EGGS.length} hidden words found.` : "."); }, 30);
  }
  const EGG_GOLD = SHINE_GOLD;
  // the name turns gold as the shower ends, and only once no letter is mid-spin: redrawing the name takes a moment,
  // and doing it during the shower or under a spinning letter made both stutter
  function goldWhenStill(wait = reduceMotion() ? 0 : 2900) {
    if (wait) { setTimeout(() => goldWhenStill(0), wait); return; }
    const w = nameEl._fillCv, busy = w && w._glyphs && w._glyphs.some(g => g.base && g.base._spinning);
    if (busy) { setTimeout(() => goldWhenStill(0), 120); return; } scheduleFills();
  }
  function eggDone() { return state.details.eggs !== false && eggFound.length >= EGGS.length; }
  // the last find rains every emoji down the screen once (skipped when reduced motion is on)
  // every emoji bursts out from the middle of the screen and falls away under gravity
  let eggBursting = false;
  function eggShower(from) {
    if (reduceMotion() || eggBursting) return; eggBursting = true;
    const layer = document.createElement("div"); layer.className = "s-egg-rain"; layer.setAttribute("aria-hidden", "true");
    // kept to the page itself (in the studio, that's the preview pane)
    const r = site.getBoundingClientRect(), top = Math.max(0, r.top), bottom = Math.min(innerHeight, r.bottom), H = Math.max(0, bottom - top);
    Object.assign(layer.style, { left: r.left + "px", top: top + "px", width: r.width + "px", height: H + "px", right: "auto", bottom: "auto" });
    document.body.appendChild(layer);
    // the burst always comes out of the 64/64 badge, hard enough to cross the screen; most go up within 15° of straight up
    const o = from && from.getBoundingClientRect(), cx = o ? o.left + o.width / 2 - r.left : r.width / 2, cy = o ? o.top + o.height / 2 - top : H * 0.45;
    const reach = Math.max(r.width, H) * 0.95, g = H * 2.6;
    const bits = EGGS.map(([, em]) => em).sort(() => Math.random() - .5);
    // added a few per frame, so the browser draws them in small batches instead of all at once
    let k = 0; const batch = () => { for (let j = 0; j < 8 && k < bits.length; j++, k++) {
      // three nested layers, so each motion is exact and smooth: sideways at a steady speed, up and down along a true gravity curve
      // (a quadratic, which a cubic-bezier timing function draws exactly), and the spin, grow and fade on the emoji itself
      const d = document.createElement("span"), yb = document.createElement("span"), e = document.createElement("b");
      e.textContent = bits[k]; e.style.fontSize = (1.3 + Math.random() * 1.1) + "rem"; yb.appendChild(e); d.appendChild(yb);
      d.style.left = cx + "px"; d.style.top = cy + "px"; layer.appendChild(d);
      const ang = -Math.PI / 2 + (Math.random() - .5) * (Math.random() < .6 ? Math.PI / 6 : Math.PI * 1.25), sp = reach * (0.75 + Math.random() * 0.75), vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const dur = 1.7 + Math.random() * 0.8, spin = (Math.random() - .5) * 720, ms = dur * 1000;
      const X = vx * dur, A = vy * dur, B = g * dur * dur / 2, Y = A + B, c = Y ? A / (2 * Y) : 0.5;
      d.animate([{ transform: "translateX(0)" }, { transform: `translateX(${X.toFixed(1)}px)` }], { duration: ms, easing: "linear", fill: "forwards" });
      if (Y) yb.animate([{ transform: "translateY(0)" }, { transform: `translateY(${Y.toFixed(1)}px)` }], { duration: ms, easing: `cubic-bezier(.3333, ${(2 * c / 3).toFixed(4)}, .6667, ${((2 * c + 1) / 3).toFixed(4)})`, fill: "forwards" });
      e.animate([{ transform: "translate(-50%, -50%) rotate(0deg) scale(.3)", opacity: 1 }, { transform: `translate(-50%, -50%) rotate(${(spin / 12).toFixed(0)}deg) scale(1)`, opacity: 1, offset: 1 / 12 },
        { transform: `translate(-50%, -50%) rotate(${(spin * .75).toFixed(0)}deg) scale(1)`, opacity: 1, offset: .75 }, { transform: `translate(-50%, -50%) rotate(${spin.toFixed(0)}deg) scale(1)`, opacity: 0 }],
        { duration: ms, easing: "linear", fill: "forwards" });
    } if (k < bits.length) requestAnimationFrame(batch); };
    requestAnimationFrame(batch);
    // bursts can overlap, but a new one can start at most every half second
    setTimeout(() => layer.remove(), 2800); setTimeout(() => { eggBursting = false; }, 500);
  }


  // every word found so far, as a row of emoji in the order they were found; the newest one pops in
  function showEgg(popped, pulsed) {
    const a = site.querySelector(".s-hero .s-actions a.s-btn[href^='mailto:']") || site.querySelector(".s-actions a.s-btn[href^='mailto:']"); if (!a) return;
    const host = a.parentElement; let box = host.querySelector(":scope > .s-egg");
    if (!box) {
      box = document.createElement("div"); box.className = "s-egg";
      box.innerHTML = '<button type="button" class="s-egg-chip" aria-expanded="false"><span class="s-egg-e" aria-hidden="true"></span><span class="s-egg-n"></span></button>'
        + '<div class="s-egg-pop" hidden><p></p><ul class="s-egg-grid" aria-label="Hidden words found"></ul><button type="button" class="s-egg-again" aria-label="Replay the confetti" title="Replay the confetti" hidden>🎉</button></div>';
      host.appendChild(box);
      const chip = box.firstChild, pop = box.lastChild;
      const open = on => { pop.hidden = !on; chip.setAttribute("aria-expanded", on); if (on) placeEggPop(box); };
      chip.addEventListener("click", () => open(pop.hidden));
      pop.querySelector(".s-egg-again").addEventListener("click", () => eggShower(chip));
      pop.addEventListener("click", e => { const b = e.target.closest(".s-egg-hint"); if (!b) return; const k = +b.dataset.k;
        eggHints[k] = Math.min(EGGS[k][0][0].length + 1, (eggHints[k] || 0) + 1); try { localStorage.setItem("it-egg-hints", JSON.stringify(eggHints)); } catch (er) {}
        pop.querySelectorAll(".s-egg-hint.on").forEach(x => x.classList.remove("on")); b.classList.add("on"); eggHintCell(b);
        pop.querySelector("p").textContent = eggHintText(k); });
      document.addEventListener("click", e => { if (!pop.hidden && !e.composedPath().includes(box)) open(false); });
      box.addEventListener("keydown", e => { if (e.key === "Escape" && !pop.hidden) { open(false); chip.focus(); } });
      if (window.ResizeObserver) new ResizeObserver(() => placeEgg()).observe(host);
    }
    box.hidden = state.details.eggs === false || !eggFound.length;
    const chip = box.firstChild, last = eggFound[eggFound.length - 1], n = eggFound.length, total = EGGS.length;
    if (last != null) { const e = chip.firstChild, em = eggShown != null ? EGGS[eggShown][1] : n >= total && !(popped && popped.length && !reduceMotion()) ? "🎉" : EGGS[last][1];
      const sk = eggShown != null ? eggShown : n >= total ? null : last, sw = sk != null ? EGGS[sk][0][0] : null;
      const title = sw ? eggName(sw) : `All ${total} hidden words found`;
      // one sweep across the name can spell several words, so the badge waits until the letters settle
      // and then changes once, to the last word spelled; only a new find animates it, a re-spelled word pulses in the grid alone
      const anim = !!(popped && popped.length) || !!chip._badgeAnim, show = () => { chip._badgeT = null; chip._badgeAnim = false;
        e.textContent = em; chip.title = title; if (anim) { e.classList.remove("pop", "pulse", "cheer"); void e.offsetWidth; e.classList.add("pop"); } };
      clearTimeout(chip._badgeT); chip._badgeAnim = anim;
      if (e.textContent === em && !anim) { chip._badgeAnim = false; chip.title = title; } else if (reduceMotion()) show(); else { const settle = () => { const w = nameEl._fillCv;
          if (w && w._glyphs && w._glyphs.some(g => g.base && g.base._spinning)) chip._badgeT = setTimeout(settle, 120); else chip._badgeT = setTimeout(show, 350); };
        chip._badgeT = setTimeout(settle, 120); } }
    // the 64th find shows its own emoji first; a beat later the badge eases to pale yellow and the 🎉 swings in
    const finishing = popped && popped.length && n >= total && last != null && !reduceMotion();
    clearTimeout(chip._doneT);
    chip.lastChild.textContent = n > 1 ? `${n}/${total}` : "";
    chip.setAttribute("aria-label", `Hidden words: ${n} of ${total} found`);
    box.querySelector(".s-egg-pop").classList.toggle("done", n >= total); box.querySelector(".s-egg-again").hidden = n < total || reduceMotion(); chip.classList.toggle("done", n >= total && !finishing);
    if (finishing) {
      chip._doneT = setTimeout(() => { const e = chip.firstChild; clearTimeout(chip._badgeT); e.textContent = "🎉"; chip.classList.add("done"); e.classList.remove("pop"); void e.offsetWidth; e.classList.add("cheer"); }, 1400); }
    box.querySelector(".s-egg-pop p").textContent = n >= total ? `You found all ${total} hidden words!` : `${n} of ${total} hidden words. Spin the letters of my name to spell more, or tap a dot for a hint.`;
    const grid = box.querySelector(".s-egg-grid"); grid.textContent = "";
    // each word keeps its own square, shortest words first, then alphabetical, so hints and finds stay put
    for (const k of EGG_ORDER) { const li = document.createElement("li");
      if (eggFound.includes(k)) { const w = EGGS[k][0][0]; li.className = "s-egg-e"; li.textContent = EGGS[k][1]; li.title = eggName(w); li.setAttribute("aria-label", eggName(w)); if (popped && popped.includes(k)) li.classList.add("pop"); else if (pulsed && pulsed.includes(k)) li.classList.add("pulse"); }
      else { const b = document.createElement("button"); b.type = "button"; b.className = "s-egg-hint"; b.dataset.k = k; eggHintCell(b); li.appendChild(b); }
      grid.appendChild(li); }
    placeEgg();
  }
  function eggHintCell(b) { const k = +b.dataset.k, L = eggHints[k] || 0; b.textContent = "";
    if (L) { const g = document.createElement("span"); g.className = "ghost"; g.textContent = EGGS[k][1]; g.setAttribute("aria-hidden", "true"); b.appendChild(g); }
    b.setAttribute("aria-label", L ? eggHintText(k) : "Unfound word. Get a hint"); }
  // sits just right of the Email me button, centered on it
  function placeEgg() {
    const box = site.querySelector(".s-egg"); if (!box) return; const a = box.parentElement.querySelector("a.s-btn[href^='mailto:']"); if (!a) return;
    // the badge is a button the same height as Email me; once every word is found it turns pale yellow
    box.firstChild.style.height = a.offsetHeight + "px";
    // beside Email me when it fits; on narrow phones it sits just below Email me instead, so it never runs off the screen,
    // and the button row makes room for it there so it doesn't land on what comes next
    // where the row is too narrow, the buttons tighten up a little first so all three still share one row
    const row = box.parentElement; row.style.paddingBottom = ""; row.classList.remove("s-tight");
    const fits = () => { box.firstChild.style.height = a.offsetHeight + "px"; const g = parseFloat(getComputedStyle(row).columnGap) || 12; return [g, row.clientWidth - (a.offsetLeft + a.offsetWidth + g) - 2]; };
    let [gap, room] = fits(); if (!box.hidden && box.offsetWidth > room) { row.classList.add("s-tight"); [gap, room] = fits(); }
    if (box.hidden || box.offsetWidth <= room) { box.style.left = a.offsetLeft + a.offsetWidth + gap + "px"; box.style.top = a.offsetTop + a.offsetHeight / 2 + "px"; }
    else { row.style.paddingBottom = box.offsetHeight + 14 + "px"; box.style.left = a.offsetLeft + "px"; box.style.top = a.offsetTop + a.offsetHeight + 14 + box.offsetHeight / 2 + "px"; }

    if (!box.lastChild.hidden) placeEggPop(box);
  }
  // the grid opens below the badge, shifted left if it would run off the page
  function placeEggPop(box) {
    const pop = box.lastChild; pop.style.left = "0px";
    const r = pop.getBoundingClientRect(), sr = site.getBoundingClientRect();
    let dx = Math.min(0, sr.right - 12 - r.right); dx = Math.max(dx, sr.left + 12 - r.left); pop.style.left = Math.round(dx) + "px";
  }
  function syncEgg() {
    const box = site.querySelector(".s-egg");
    if (eggFound.length) showEgg(null); else if (box) box.hidden = true;
  }
  syncEgg();
  // a fast flick can jump right over a letter between two pointer readings, so every move is traced as a line
  // from the last reading, and each letter that line passes through counts, even if neither end lands on the name
  let lastPt = null, lastVy = 0;
  // (the last reading is kept as a page position, so a scroll under a resting cursor traces a line over the name too)
  let mouseAt = null;
  window.addEventListener("pointermove", e => { mouseAt = e.pointerType === "touch" ? null : [e.clientX, e.clientY]; nameMove(e); }, { passive: true });
  document.addEventListener("pointerleave", () => { mouseAt = null; });
  addEventListener("scroll", () => { if (!mouseAt) return; const e = { clientX: mouseAt[0], clientY: mouseAt[1], timeStamp: performance.now() }; track(e.clientX, e.clientY); nameMove(e); }, { passive: true });
  function nameMove(e) {
    const pv = lastPt, prev = pv && { x: pv.x - scrollX, y: pv.y - scrollY, t: pv.t }; lastPt = { x: e.clientX + scrollX, y: e.clientY + scrollY, t: e.timeStamp || performance.now() };
    const cur = { x: e.clientX, y: e.clientY, t: lastPt.t };
    let fx = nameFx(); if (fx === "none" || mode !== "view") return; if (fx !== "fill" && reduceMotion()) fx = "fill";
    const w = nameEl._fillCv; if (!w || !w._glyphs || !w.isConnected) return;
    const b = w.getBoundingClientRect(), a = prev || cur, seg = Math.hypot(e.clientX - a.x, e.clientY - a.y), dt = cur.t - (a.t || cur.t);
    // a long jump between readings means a fast flick: its own direction and speed are the truest; otherwise use the recent average
    const v = seg > 12 && dt > 0 && dt < 80 ? { vx: (e.clientX - a.x) / Math.max(dt, 8), vy: (e.clientY - a.y) / Math.max(dt, 8) } : swipe(e);
    const x0 = a.x - b.left, y0 = a.y - b.top, x1 = e.clientX - b.left, y1 = e.clientY - b.top;
    // skip moves nowhere near the name
    const pad = 4; if (Math.max(x0, x1) < -pad || Math.min(x0, x1) > b.width + pad || Math.max(y0, y1) < -pad || Math.min(y0, y1) > b.height + pad) { lastBob = -1; return; }
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let s = prev ? 1 : 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n;
      const i = w._glyphs.findIndex(g => x >= g.l && x <= g.l + g.w && y >= g.t && y <= g.t + g.h);
      if (i !== lastBob) { lastBob = i; if (i >= 0) playLetter(i, v, fx); } }
    // flicking up and down without leaving a letter turns it back the other way
    if (lastBob >= 0 && Math.abs(v.vy) > 0.6 && Math.abs(v.vy) > Math.abs(v.vx) && Math.sign(v.vy) !== Math.sign(lastVy) && Math.abs(lastVy) > 0.6) playLetter(lastBob, v, fx);
    if (Math.abs(v.vy) > 0.6) lastVy = v.vy;
  }
  nameEl.addEventListener("pointerdown", bobAt);
  nameEl.addEventListener("pointerleave", () => { lastBob = -1; });
  const askGlint = () => { const w = nameEl._fillCv; if (w && w._sweep) w._sweep(); };
  nameEl.addEventListener("pointerenter", askGlint); nameEl.addEventListener("focus", askGlint);
  // keyboard players: with the name focused (Tab to it, or click it), typing its letters spins them and spells words too.
  // Only while focused, so single-letter keys never fire elsewhere (WCAG 2.1.4, e.g. voice control dictating a sentence)
  let keyLast = -1;
  nameEl.tabIndex = 0; nameEl.setAttribute("aria-description", "Type letters from the name to spin them");
  // the underline marks keyboard focus only: someone who clicked or tapped the name never sees it, even if they then type
  // (browsers otherwise switch to the focus style as soon as a key is pressed)
  nameEl.addEventListener("pointerdown", () => nameEl.classList.add("by-pointer"));
  nameEl.addEventListener("blur", () => nameEl.classList.remove("by-pointer"));
  nameEl.addEventListener("keydown", e => {
    if (mode !== "view" || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const w = nameEl._fillCv; if (!w || !w._glyphs) return;
    const letters = nameEl.textContent.replace(/\s+/g, "").toLowerCase(), ch = e.key.toLowerCase();
    // a letter that appears twice (a, t, r) uses the copy after the last one typed, so "tart" turns two different t's
    const spots = [...letters].map((x, j) => x === ch ? j : -1).filter(j => j >= 0); if (!spots.length) return;
    const i = spots.find(j => j > keyLast) ?? spots[0]; keyLast = i;
    let fx = nameFx(); if (fx === "none") { eggLetter(i); return; } if (fx !== "fill" && reduceMotion()) fx = "fill";
    playLetter(i, { vx: 1, vy: 0 }, fx);
  });
  // Timeline: the accent line draws down as you scroll past each job
  function updateDraw() {
    const on = site.dataset.exp === "timeline" && state.details.draw !== false; site.dataset.draw = on ? "on" : "off"; if (!on) return;
    const still = reduceMotion(), line = window.innerHeight * 0.6;
    site.querySelectorAll(".s-exp .s-job").forEach(j => { const r = j.getBoundingClientRect();
      const p = still ? 1 : Math.max(0, Math.min(1, (line - r.top) / Math.max(1, r.height)));
      j.style.setProperty("--draw", p.toFixed(3)); j.classList.toggle("reached", still || r.top + 6 < line); });
  }
  // Email buttons also copy the address, with a small "Copied" tag (and a screen reader announcement); the mail app still opens
  const live = document.createElement("p"); live.setAttribute("role", "status");
  Object.assign(live.style, { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }); document.body.appendChild(live);
  function copyText(t) {
    let ok = false; const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); Object.assign(ta.style, { position: "fixed", opacity: "0", left: "-9999px" });
    document.body.appendChild(ta); ta.select(); try { ok = document.execCommand("copy"); } catch (e) {} ta.remove();
    if (ok) return Promise.resolve(true);
    return navigator.clipboard ? navigator.clipboard.writeText(t).then(() => true, () => false) : Promise.resolve(false);
  }
  site.addEventListener("click", e => {
    if (state.details.copyEmail === false || mode !== "view") return;
    const a = e.target.closest("a.s-btn[href^='mailto:']"); if (!a) return;
    const addr = a.getAttribute("href").slice(7).split("?")[0];
    copyText(addr).then(ok => { if (ok) showCopied(a); });
  });
  function showCopied(a) {
    const host = a.parentElement; if (getComputedStyle(host).position === "static") host.style.position = "relative";
    let tag = host.querySelector(":scope > .s-copied"); if (!tag) { tag = document.createElement("span"); tag.className = "s-copied"; tag.setAttribute("aria-hidden", "true"); tag.textContent = "Copied"; host.appendChild(tag); }
    const ar = a.getBoundingClientRect(), hr = host.getBoundingClientRect();
    tag.style.left = (ar.left - hr.left + ar.width / 2) + "px"; tag.style.top = (ar.top - hr.top - tag.offsetHeight - 10) + "px";
    tag.classList.remove("show"); void tag.offsetWidth; tag.classList.add("show");
    live.textContent = ""; setTimeout(() => { live.textContent = "Email address copied"; }, 30);
    clearTimeout(a._ct); a._ct = setTimeout(() => { tag.classList.remove("show"); setTimeout(() => { if (!tag.classList.contains("show")) tag.remove(); }, 250); }, 1600);
  }
  // follow the reduced-motion setting live if it changes while the page is open
  const rmq = window.matchMedia("(prefers-reduced-motion: reduce)"); rmq.addEventListener && rmq.addEventListener("change", () => updateDraw());
  let fillT;
  addEventListener("scatter-change", () => scheduleFills());
  function scheduleFills() { clearTimeout(fillT); fillT = setTimeout(() => {
    const F = state.fonts, c = state.colors;
    // finding every hidden word turns the name gold, for that visitor, from then on
    const gold = typeof eggDone === "function" && eggDone();
    fillHollow(nameEl, gold ? EGG_GOLD : F.display.fill ? c.nameFill : null, c.brandFill || c.accent);
    fillHollow(site.querySelector(".s-brand"), F.brand && F.brand.fill ? c.brandFill : null);
  }, 60); }
  new ResizeObserver(() => scheduleFills()).observe(site);
  document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => scheduleFills());
  site.addEventListener("input", () => scheduleFills());
  function applyKern() {
    const k = (state.fonts.display.kern || {}); const txt = nameText();
    const any = Object.values(k).some(v => +v);
    if (!any || mode === "text") { if (nameEl.dataset.kerned) { nameEl.textContent = txt; delete nameEl.dataset.kerned; } return; }
    nameEl.innerHTML = ""; nameEl.dataset.kerned = "1";
    [...txt].forEach((ch, i) => { const sp = document.createElement("span"); sp.textContent = ch; const v = +k[i] || 0; if (v && i < txt.length - 1) sp.style.marginRight = v + "em"; nameEl.appendChild(sp); });
  }

  // ---------- Start ----------
  applyKern(); scheduleFills(); queueGrain(); queueFocus(); syncEgg();
})();

/* Contact form: sends through Web3Forms (messages go to Ian's inbox).
   Without a key, Send opens the visitor's email app with the message filled in. */
(() => {
  const WEB3FORMS_KEY = "e9332311-3878-45e4-8a1f-4c8df9f4827d";
  const TO = "itsian123@gmail.com";
  const form = document.querySelector(".s-form"); if (!form) return;
  const note = form.querySelector(".s-form-note");
  const say = t => { note.textContent = ""; setTimeout(() => { note.textContent = t; }, 30); };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    if (d.get("botcheck")) return;
    const subject = `${d.get("topic")}: message from ${d.get("name")}`;
    if (!WEB3FORMS_KEY) {
      const body = `${d.get("message")}\n\n${d.get("name")}\n${d.get("email")}`;
      location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      say("Your email app should open with the message ready to send.");
      return;
    }
    const btn = form.querySelector("button[type=submit]"); btn.disabled = true; say("Sending…");
    try {
      d.append("access_key", WEB3FORMS_KEY); d.append("subject", subject); d.append("from_name", "iantarter.com");
      const r = await fetch("https://api.web3forms.com/submit", { method: "POST", body: d });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      form.reset(); say("Thanks! Your message is on its way, and I'll write back soon.");
    } catch (err) {
      say(`That didn't send. Please email me at ${TO} instead.`);
    } finally { btn.disabled = false; }
  });
})();
