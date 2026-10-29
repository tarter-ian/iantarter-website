// Scatters real forest-floor pieces (fern fronds, fallen leaves, needles, twigs, moss sprigs): a few on the ground, and one or two tucked under or over each card's edge.
(async () => {
  // where the site's root is, so the pages in subfolders (case studies, games) find the same files
  const ROOT = new URL("..", document.currentScript.src).href;
  const all = (await (await fetch(ROOT + "assets/forest/index.json?v=2")).json()).map(s => ({ ...s, src: ROOT + s.src }));
  const of = k => all.filter(s => k.includes(s.kind));
  let seed = 31; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  let spare = [];
  function piece(parent, sp, x, y, len, ang, cls) {
    // wide sprites (needles, some leaves) are turned upright so len is always the long side
    // a relayout reuses the pieces already on the page (same seed, same order), so they move instead of blinking out and back
    const wide = sp.w > sp.h, w = wide ? sp.h * len / sp.w : sp.w * len / sp.h, img = spare.find(n => n.dataset.src === sp.src && !n.isConnected) || new Image();
    spare.splice(spare.indexOf(img), spare.includes(img) ? 1 : 0); img.style.cssText = ""; img.dataset.src = sp.src;
    if (wide) { img.style.setProperty("--wide", "1"); }
    if (img.getAttribute("src") !== sp.src) img.src = sp.src; img.alt = ""; img.className = "litter " + cls; img.setAttribute("aria-hidden", "true");
    Object.assign(img.style, { width: w + "px", height: len + "px", left: (x - w / 2) + "px", top: (y - len / 2) + "px", transform: `rotate(${ang}deg)` });
    if (wide) { img.style.width = len + "px"; img.style.height = w + "px"; img.style.left = (x - len / 2) + "px"; img.style.top = (y - w / 2) + "px"; img.style.transform = `rotate(${ang + 90}deg)`; }
    parent.appendChild(img);
  }
  function edgeBits(el, under) {
    const w = el.offsetWidth, h = el.offsetHeight, n = 2 + (rnd() < .4);
    const sr = under.parentElement.getBoundingClientRect(), r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - sr.left, cy = r.top + r.height / 2 - sr.top;
    for (let i = 0; i < n; i++) {
      const sp = pick(of(rnd() < .35 ? ["fern"] : rnd() < .6 ? ["leaf"] : ["moss", "needle", "twig"]));
      const len = sp.kind === "fern" ? 130 + rnd() * 60 : sp.kind === "leaf" ? 58 + rnd() * 26 : 60 + rnd() * 30;
      const over = rnd() < .4, edge = pick(["top", "bottom", "left", "right"]);
      // pieces lying over a card stay at its corners, where there is never text; pieces tucked under can go anywhere along an edge
      const t = over ? (rnd() < .5 ? .01 + rnd() * .07 : .92 + rnd() * .07) : rnd() < .5 ? .06 + rnd() * .22 : .72 + rnd() * .22;
      // the piece points away from the card; its inner end reaches at most ~12px past the edge, so text is never covered
      const jit = (rnd() - .5) * 60, reach = len / 2 * Math.abs(Math.cos(jit * Math.PI / 180)) - 2 - rnd() * 6;
      const base = { top: 180, bottom: 0, left: 90, right: -90 }[edge] + jit;
      let x, y;
      if (edge === "top") { x = t * w; y = -reach; } else if (edge === "bottom") { x = t * w; y = h + reach; }
      else if (edge === "left") { x = -reach; y = t * h; } else { x = w + reach; y = t * h; }
      if (over) piece(el, sp, x, y, Math.min(len, 90), base + 180, "over");
      else piece(under, sp, cx - w / 2 + x, cy - h / 2 + y, len + 20, base + 180, "under");
    }
  }
  function ground() {
    const root = document.querySelector(".x-i"), box = document.createElement("div");
    box.className = "litter-ground"; box.setAttribute("aria-hidden", "true"); root.prepend(box);
    const W = root.offsetWidth, H = root.offsetHeight, n = Math.round(W * H / 70000);
    for (let i = 0; i < n; i++) {
      const sp = pick(of(rnd() < .55 ? ["leaf"] : ["needle", "twig", "moss"]));
      const len = sp.kind === "leaf" ? 34 + rnd() * 24 : 44 + rnd() * 34;
      piece(box, sp, rnd() * W, rnd() * H, len, rnd() * 360, "flat");
    }
  }
  // a piece lying over a card never covers its words
  const text = el => [...el.querySelectorAll("p, h3, a, li, .slip, img")].map(n => n.getBoundingClientRect());
  const hits = (a, b) => a.left < b.right + 4 && a.right > b.left - 4 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
  // laid out again (same seed, same pieces) whenever the scene changes size, so nothing drifts onto a card
  function lay() {
    seed = 31; spare = [...document.querySelectorAll(".litter")];
    document.querySelectorAll(".litter-ground, .litter-under, .litter.over").forEach(n => n.remove()); spare.forEach(n => n.remove());
    ground();
    const scene = document.querySelector(".i-scene"), under = document.createElement("div");
    under.className = "litter-under"; under.setAttribute("aria-hidden", "true"); scene.prepend(under);
    document.querySelectorAll(".card.lay").forEach(el => {
      edgeBits(el, under); const t = text(el);
      el.querySelectorAll(":scope > .litter.over").forEach(p => { const r = p.getBoundingClientRect(); if (t.some(q => hits(r, q))) p.remove(); });
    });
  }
  addEventListener("scene-layout", lay);
})();
