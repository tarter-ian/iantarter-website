// Draws the pieces' light into pictures off the page's main thread (blades.js sends the jobs). On the main thread this
// drawing held up the first seconds after loading, and a fast scroll then outran the page and showed bare olive (Ian,
// 2026-11-06). Here it runs alongside, so the pictures still arrive early and the scroll never waits for them.
// Every step matches the CSS it stands in for (dir-i.css): see the comments in blades.js bakeLight().
const texs = new Map();
const tex = url => texs.get(url) || (texs.set(url, fetch(url).then(r => (r.ok ? r.blob() : null)).then(b => b && createImageBitmap(b)).catch(() => null)), texs.get(url));
// textures are filled from copies made once at the size they're shown, shrunk smoothly the way the browser shrinks the CSS
const copies = new Map();
const copy = (url, size, dpr) => { const k = url + "@" + size + "@" + dpr;
  if (!copies.has(k)) copies.set(k, tex(url).then(img => { if (!img) return null;
    const w = Math.min(img.width, Math.round(size * dpr)), h = Math.round(img.height * w / img.width), c = new OffscreenCanvas(w, h), x = c.getContext("2d");
    x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, w, h); return c; }));
  return copies.get(k); };
// a CSS linear-gradient at angle a over a w x h box whose top-left is at (bx, by)
function lin(x, a, w, h, bx, by) {
  const r = a * Math.PI / 180, dx = Math.sin(r), dy = -Math.cos(r), L = Math.abs(w * dx) + Math.abs(h * dy), cx = bx + w / 2, cy = by + h / 2;
  return x.createLinearGradient(cx - dx * L / 2, cy - dy * L / 2, cx + dx * L / 2, cy + dy * L / 2);
}
const canvasOf = (W, H, dpr) => { const c = new OffscreenCanvas(Math.max(1, Math.ceil(W * dpr)), Math.max(1, Math.ceil(H * dpr))), x = c.getContext("2d"); x.scale(dpr, dpr); return [c, x]; };
const tileAt = (x, c, size, px, py, W, H, mode = "source-over") => { const pt = x.createPattern(c, "repeat");
  pt.setTransform(new DOMMatrix().translate(px, py).scale(size / c.width)); x.globalCompositeOperation = mode; x.fillStyle = pt; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over"; };
// the canopy light over a W x H box whose top-left lies at (ox, oy) in the scene: the page-wide falloff, the shade, the sun flecks
function lightStack(x, W, H, ox, oy, j, shade, sun) {
  const { PW, PH, fx, fy } = j, f = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, W, H); };
  { const g = lin(x, 150, PW, PH, -ox, -oy); g.addColorStop(0, "rgb(255,253,249)"); g.addColorStop(.55, "rgb(246,246,239)"); g.addColorStop(1, "rgb(232,234,223)"); f(g, "multiply"); }
  // (CSS blends gradient colours premultiplied: fading from clear white to the shade is fading the shade's own colour in)
  { x.save(); x.translate(-ox + PW * .25, -oy + PH * .15); x.scale(PW * 1.4, PH); const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(.55, "rgba(40,48,30,0)"); g.addColorStop(1, "rgba(40,48,30,.27)"); x.globalCompositeOperation = "multiply"; x.fillStyle = g;
    x.fillRect((ox - PW * .25) / (PW * 1.4), (oy - PH * .15) / PH, W / (PW * 1.4), H / PH); x.restore(); }
  tileAt(x, shade, 1600, -180 - ox - fx, -120 - oy - fy, W, H, "multiply"); tileAt(x, sun, 1600, -180 - ox - fx, -120 - oy - fy, W, H, "soft-light");
}
// PVC: a glossy face. Where the sun flecks land they glint (specular, so it sits over the colour rather than lighting it), a
// soft laminate sheen runs across from the upper left, and the lanyard slot is punched clean through with its cut wall showing.
function gloss(x, W, H, ox, oy, j, sun) {
  const dpr = j.dpr, [sc, sx] = canvasOf(W, H, dpr);
  tileAt(sx, sun, 1600, -180 - ox - j.fx, -120 - oy - j.fy, W, H); tileAt(sx, sun, 1600, -180 - ox - j.fx, -120 - oy - j.fy, W, H, "destination-in");
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "lighter"; x.globalAlpha = .35 * j.gloss.glint; x.drawImage(sc, 0, 0); x.restore();
  const f = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, W, H); };
  // the sheen: the sky's glow off the top-left corner, then one crisp-edged streak across, as a laminated card throws back a bright gap in the canopy
  { const g = lin(x, 118, W, H, 0, 0); g.addColorStop(0, "rgba(255,255,255,.3)"); g.addColorStop(.22, "rgba(255,255,255,.08)"); g.addColorStop(.34, "rgba(255,255,255,0)");
    g.addColorStop(.5, "rgba(255,255,255,0)"); g.addColorStop(.515, "rgba(255,255,255,.2)"); g.addColorStop(.6, "rgba(255,255,255,.13)"); g.addColorStop(.615, "rgba(255,255,255,0)"); f(g, "screen"); }
  const s = j.slot; if (!s) return;
  const r = (x0, y0, w, h, rad) => { x.beginPath(); x.roundRect(x0, y0, w, h, rad); };
  x.globalCompositeOperation = "source-over";
  // the lip round the hole: the cut catches light on its lower edge and is shaded along its upper one
  x.save(); r(s.x - 1.5, s.y - 1.5, s.w + 3, s.h + 3, s.h / 2 + 1.5); x.clip();
  { const g = x.createLinearGradient(0, s.y - 1.5, 0, s.y + s.h + 1.5); g.addColorStop(0, "rgba(40,36,28,.55)"); g.addColorStop(.5, "rgba(40,36,28,.1)"); g.addColorStop(1, "rgba(255,255,255,.85)"); x.fillStyle = g; x.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4); }
  x.restore();
  x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000"; r(s.x, s.y, s.w, s.h, s.h / 2); x.fill(); x.globalCompositeOperation = "source-over";
}
// a finished face onto a canvas// a finished face onto a canvas pad px bigger all round, with its drop shadow
function withShadow(face, pad, dpr, sh) { const c = new OffscreenCanvas(face.width + Math.ceil(2 * pad * dpr), face.height + Math.ceil(2 * pad * dpr)), x = c.getContext("2d");
  Object.assign(x, { shadowColor: sh[0], shadowOffsetX: sh[1] * dpr, shadowOffsetY: sh[2] * dpr, shadowBlur: sh[3] * dpr }); x.drawImage(face, pad * dpr, pad * dpr); return c; }
const png = c => c.convertToBlob();

async function draw(j) {
  const { W, H, dpr, ox, oy } = j, T = (n, size) => copy(j.root + "assets/" + n, size, dpr);
  if (j.kind === "litter") { // (forest.js; first, as it needs none of the light textures below) a fallen leaf or frond with its look (a little desaturated and darkened, a soft shadow) baked in, P px bigger all round for the shadow
    const img = await tex(j.src); if (!img) return null;
    const [c, x] = canvasOf(j.w + 2 * j.P, j.h + 2 * j.P, dpr); x.filter = j.filter; x.drawImage(img, j.P, j.P, j.w, j.h); return [await png(c)];
  }
  if (j.kind === "ground") { // the shade and the falloff folded into one soft map for the whole page (half size), and the moss with its 20% shade
    const k = .5, PW = j.PW, PH = j.PH, [shade, mossImg] = await Promise.all([tex(j.root + "assets/tex/canopy-shade-L.webp"), j.moss ? tex(j.root + "assets/tex/moss-quiet-2k.webp") : null]);
    if (!shade || (j.moss && !mossImg)) return null;
    const c = new OffscreenCanvas(Math.ceil(PW * k), Math.ceil(PH * k)), x = c.getContext("2d"); x.scale(k, k);
    const fill = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, PW, PH); };
    fill("#fff", "source-over");
    { const g = lin(x, 150, PW, PH, 0, 0); g.addColorStop(0, "rgb(255,253,249)"); g.addColorStop(.55, "rgb(246,246,239)"); g.addColorStop(1, "rgb(232,234,223)"); fill(g, "multiply"); }
    { x.save(); x.translate(PW * .25, PH * .15); x.scale(PW * 1.4, PH); const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(.55, "rgba(40,48,30,0)"); g.addColorStop(1, "rgba(40,48,30,.27)"); x.globalCompositeOperation = "multiply"; x.fillStyle = g; x.fillRect(-.25 / 1.4, -.15, 1 / 1.4, 1); x.restore(); }
    { const pt = x.createPattern(shade, "repeat"); pt.setTransform(new DOMMatrix().translate(-180 - j.fx, -120 - j.fy).scale(1600 / shade.width)); fill(pt, "multiply"); }
    let mb = null;
    if (mossImg) { const m = new OffscreenCanvas(mossImg.width, mossImg.height), mx = m.getContext("2d"); mx.drawImage(mossImg, 0, 0); mx.fillStyle = "rgba(22,28,12,.2)"; mx.fillRect(0, 0, m.width, m.height);
      mb = await m.convertToBlob({ type: "image/webp", quality: 1 }); }
    // (the map is opaque and soft, so a JPEG carries it: a PNG of it was ~3 MB, slow to encode here and slow to decode on the page)
    return [await c.convertToBlob({ type: "image/jpeg", quality: .95 }), mb];
  }
  const [sun, shadeC, shadeL] = await Promise.all([T("tex/canopy-sun-2.webp", 1600), T("tex/canopy-shade-card.webp", 1600), T("tex/canopy-shade-L.webp", 1600)]);
  if (!sun || !shadeC || !shadeL) return null;
  if (j.kind === "card") { // the colour, the paper, (cards: a pale wash and a sheen), then the light
    const paper = await T(j.paper, j.paperW); if (!paper) return null;
    const [c, x] = canvasOf(W, H, dpr), fill = (st, mode) => { x.globalCompositeOperation = mode; x.fillStyle = st; x.fillRect(0, 0, W, H); };
    fill(`rgb(${j.bg})`, "source-over"); tileAt(x, paper, j.paperW, 0, 0, W, H, j.paperBlend);
    if (j.sheen) { fill("rgba(248,248,246,.78)", "source-over");
      const g = lin(x, 125, W, H, 0, 0); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.4, "rgba(255,255,255,0)"); g.addColorStop(.65, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.12)"); fill(g, "source-over"); }
    if (j.band) { // (ID badges) the employer's colour printed across the top, under the same light
      const b = j.band; x.globalCompositeOperation = "multiply"; x.fillStyle = b.color; x.fillRect(0, 0, W, b.h); x.globalCompositeOperation = "source-over"; }
    lightStack(x, W, H, ox, oy, j, j.shade === "L" ? shadeL : shadeC, sun);
    if (j.gloss) gloss(x, W, H, ox, oy, j, sun);
    return [await png(c)];
  }
  if (j.kind === "sheet") { // the light layer alone (it multiplies over the paper), 14px past the sheet as its CSS box is
    const P = 14, [c, x] = canvasOf(W + 2 * P, H + 2 * P, dpr); lightStack(x, W + 2 * P, H + 2 * P, ox - P, oy - P, j, shadeC, sun); return [await png(c)];
  }
  if (j.kind === "sign") { // wood, a top-lit sheen, then the light
    const wood = await T("tex/wood095_tile-1024.webp", 520); if (!wood) return null;
    const [c, x] = canvasOf(W, H, dpr); tileAt(x, wood, 520, 0, (H - 520 * wood.height / wood.width) * .3, W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(.4, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.18)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    lightStack(x, W, H, ox, oy, j, shadeL, sun); return [await png(c)];
  }
  if (j.kind === "tag") { // manila card cut to a tag, its punched hole, the light, and its shadow
    const p006 = await T("tex/paper006_tile-1024.webp", 260); if (!p006) return null;
    const [c, x] = canvasOf(W, H, dpr), th = 260 * p006.height / p006.width;
    x.beginPath(); x.moveTo(11, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(11, H); x.lineTo(0, H - 11); x.lineTo(0, 11); x.closePath(); x.clip();
    tileAt(x, p006, 260, (W - 260) / 2, (H - th) / 2, W, H); x.globalCompositeOperation = "multiply"; x.fillStyle = "rgba(236,222,180,.55)"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "source-over";
    x.beginPath(); x.arc(15, H / 2, 6.75, 0, 7); x.fillStyle = "#c9b98e"; x.fill(); x.beginPath(); x.arc(15, H / 2, 3.5, 0, 7); x.fillStyle = "#34402a"; x.fill();
    lightStack(x, W, H, ox, oy, j, shadeC, sun); return [await png(withShadow(c, 6, dpr, ["rgba(10,14,4,.4)", 1, 2, 1.5]))];
  }
  if (j.kind === "tape") { // real tape: the torn ends kept, the middle stretched (as its border-image did), the light at 90% over its middle (as its ::after did), a faint shadow
    const tp = await tex(j.tape); if (!tp) return null;
    const [c, x] = canvasOf(W, H, dpr), iw = tp.width, ih = tp.height, e = 34;
    x.drawImage(tp, 0, 0, e, ih, 0, 0, 13, H); x.drawImage(tp, iw - e, 0, e, ih, W - 13, 0, 13, H); x.drawImage(tp, e, 0, iw - 2 * e, ih, 13, 0, W - 26, H);
    const [lc, lx] = canvasOf(W - 44, H - 2, dpr); lx.fillStyle = "#fff"; lx.fillRect(0, 0, W, H); lightStack(lx, W - 44, H - 2, ox + 22, oy + 1, j, shadeC, sun);
    // multiply only where the tape is: the light drawn into a copy masked by the tape's own alpha
    const [mc, mx] = canvasOf(W, H, dpr); mx.drawImage(lc, 22, 1, W - 44, H - 2); mx.globalCompositeOperation = "destination-in"; mx.setTransform(1, 0, 0, 1, 0, 0); mx.drawImage(c, 0, 0);
    x.globalAlpha = .9; x.globalCompositeOperation = "multiply"; x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(mc, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    return [await png(withShadow(c, 4, dpr, ["rgba(10,14,4,.22)", 0, 1, .6]))];
  }
  return null;
}
onmessage = async e => { let blobs = null; try { blobs = await draw(e.data.job); } catch (err) { blobs = null; } postMessage({ id: e.data.id, blobs }); };
