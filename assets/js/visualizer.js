// Photo preview: simulate a detail / correction / ceramic finish on the visitor's own photo.
// Everything runs in the browser; the photo never leaves the device.
(() => {
  const root = document.querySelector('[data-compare]');
  if (!root) return;
  const afterC = root.querySelector('[data-after]');
  const beforeC = root.querySelector('[data-before]');
  const beforeWrap = root.querySelector('[data-before-wrap]');
  const handle = root.querySelector('[data-handle]');
  const afterTag = root.querySelector('[data-after-tag]');
  const fileIn = document.querySelector('[data-file]');
  const samples = document.querySelector('[data-samples]');
  const finish = document.querySelector('[data-finish]');
  const beadsT = document.querySelector('[data-beads]');
  const bookBtn = document.querySelector('[data-book]');
  const dlBtn = document.querySelector('[data-download]');
  const dropHint = root.querySelector('[data-drop-hint]');

  const LABEL = { wash: 'Detail & wash', correct: 'Correction + sealant', ceramic: 'Ceramic coating' };
  const BOOK = { wash: 'premier', correct: 'correction', ceramic: 'ceramic' };
  let mode = 'ceramic', img = null, pos = 50;

  /* ---------- image processing ---------- */
  const clamp = v => v < 0 ? 0 : v > 255 ? 255 : v;

  function percentiles(d) {
    const h = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    for (let i = 0; i < d.length; i += 4) { h[0][d[i]]++; h[1][d[i + 1]]++; h[2][d[i + 2]]++; }
    const n = d.length / 4;
    return h.map(hist => {
      let acc = 0, lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.005) { lo = v; break; } }
      acc = 0;
      for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.005) { hi = v; break; } }
      return [lo, Math.max(hi, lo + 30)];
    });
  }

  function process(src, w, h, m) {
    const out = new ImageData(new Uint8ClampedArray(src.data), w, h);
    const d = out.data;
    const P = percentiles(d);
    // gray-world white balance (removes the brown "dust" cast)
    let sr = 0, sg = 0, sb = 0;
    for (let i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; }
    const n = d.length / 4, avg = (sr + sg + sb) / (3 * n);
    const wb = [avg / (sr / n), avg / (sg / n), avg / (sb / n)].map(k => 1 + (k - 1) * 0.45);

    const cfg = {
      wash:    { lv: 0.75, sat: 1.12, con: 1.06, gam: 1.0,  curve: 0.0 },
      correct: { lv: 0.85, sat: 1.18, con: 1.12, gam: 1.05, curve: 0.25 },
      ceramic: { lv: 0.9,  sat: 1.3,  con: 1.16, gam: 1.12, curve: 0.5 }
    }[m];

    for (let i = 0; i < d.length; i += 4) {
      let c = [d[i], d[i + 1], d[i + 2]];
      for (let k = 0; k < 3; k++) {
        const [lo, hi] = P[k];
        const lev = (c[k] - lo) * 255 / (hi - lo);
        let v = c[k] + (lev - c[k]) * cfg.lv;
        v *= wb[k];
        // contrast around mid grey
        v = (v - 128) * cfg.con + 128;
        // deepen shadows (rich black paint) via gamma on 0..1
        let x = clamp(v) / 255;
        x = Math.pow(x, cfg.gam);
        // S-curve for punchy highlights
        const s = x * x * (3 - 2 * x);
        x = x + (s - x) * cfg.curve;
        c[k] = x * 255;
      }
      // saturation
      const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      d[i] = clamp(l + (c[0] - l) * cfg.sat);
      d[i + 1] = clamp(l + (c[1] - l) * cfg.sat);
      d[i + 2] = clamp(l + (c[2] - l) * cfg.sat);
    }
    sharpen(out, w, h, m === 'wash' ? 0.25 : m === 'correct' ? 0.45 : 0.5);
    return out;
  }

  function sharpen(id, w, h, amt) {
    const s = id.data, o = new Uint8ClampedArray(s);
    const row = w * 4;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * row + x * 4;
        for (let k = 0; k < 3; k++) {
          const c = s[i + k];
          const blur = (s[i + k - 4] + s[i + k + 4] + s[i + k - row] + s[i + k + row]) / 4;
          o[i + k] = c + (c - blur) * amt;
        }
      }
    }
    id.data.set(o);
  }

  function addGloss(ctx, w, h) {
    // Soft overhead reflection: a broad diagonal sheen, then a thin bright streak
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'screen';
    const s = ctx.createLinearGradient(w * 0.15, 0, w * 0.55, h);
    s.addColorStop(0.42, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,0.13)'); s.addColorStop(0.58, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function addBeads(ctx, w, h) {
    // Deterministic pseudo-random so the beads don't jump around between renders
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const count = Math.round((w * h) / 2600);
    const base = Math.max(2, w / 260);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w, y = rnd() * h, r = base * (0.5 + rnd() * 1.6);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.9, 0, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.25, 'rgba(255,255,255,0.18)');
      g.addColorStop(0.8, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.32)');
      ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- render ---------- */
  function render() {
    if (!img) return;
    const maxW = 1400;
    const scale = Math.min(1, maxW / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
    [afterC, beforeC].forEach(c => { c.width = w; c.height = h; });
    const bctx = beforeC.getContext('2d');
    bctx.drawImage(img, 0, 0, w, h);
    const src = bctx.getImageData(0, 0, w, h);
    const actx = afterC.getContext('2d');
    actx.putImageData(process(src, w, h, mode), 0, 0);
    if (mode === 'ceramic') addGloss(actx, w, h);
    if (beadsT.checked) addBeads(actx, w, h);
    afterTag.textContent = LABEL[mode];
    bookBtn.href = 'book.html?service=' + BOOK[mode];
  }

  function load(src) {
    const im = new Image();
    im.onload = () => { img = im; render(); };
    im.onerror = () => { afterTag.textContent = 'That file isn’t an image we can read. Try a JPG or PNG.'; };
    im.src = src;
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    samples.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
    load(url);
  }

  /* ---------- controls ---------- */
  fileIn.addEventListener('change', () => loadFile(fileIn.files[0]));
  samples.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    samples.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    load(b.dataset.src);
  });
  finish.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    finish.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    mode = b.dataset.mode; render();
  });
  beadsT.addEventListener('change', render);

  // Before/after divider
  const setPos = p => {
    pos = Math.max(0, Math.min(100, p));
    beforeWrap.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    handle.style.left = pos + '%';
    root.setAttribute('aria-valuenow', Math.round(pos));
  };
  let dragging = false;
  const fromEvent = e => { const r = root.getBoundingClientRect(); setPos(((e.clientX - r.left) / r.width) * 100); };
  root.addEventListener('pointerdown', e => { dragging = true; root.setPointerCapture(e.pointerId); fromEvent(e); });
  root.addEventListener('pointermove', e => { if (dragging) fromEvent(e); });
  root.addEventListener('pointerup', () => { dragging = false; });
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { setPos(pos - 5); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPos(pos + 5); e.preventDefault(); }
  });

  // Drag & drop a photo onto the preview
  ['dragenter', 'dragover'].forEach(t => root.addEventListener(t, e => { e.preventDefault(); dropHint.hidden = false; }));
  ['dragleave', 'drop'].forEach(t => root.addEventListener(t, e => { e.preventDefault(); dropHint.hidden = true; }));
  root.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

  // Save the "after" image with a small credit line
  dlBtn.addEventListener('click', () => {
    if (!img) return;
    const c = document.createElement('canvas');
    c.width = afterC.width; c.height = afterC.height;
    const x = c.getContext('2d');
    x.drawImage(afterC, 0, 0);
    const fs = Math.max(14, c.width / 50);
    x.font = `600 ${fs}px "Instrument Sans", sans-serif`;
    x.fillStyle = 'rgba(7,16,34,.7)';
    const label = `Simulated ${LABEL[mode].toLowerCase()} preview · Premier Auto Detailing · (775) 420-8547`;
    const tw = x.measureText(label).width;
    x.fillRect(0, c.height - fs * 2.2, Math.min(c.width, tw + fs * 2), fs * 2.2);
    x.fillStyle = '#fff'; x.fillText(label, fs, c.height - fs * 0.8);
    c.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = 'premier-preview.jpg'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/jpeg', 0.9);
  });

  setPos(50);
  load(samples.querySelector('[aria-pressed="true"]').dataset.src);
})();
