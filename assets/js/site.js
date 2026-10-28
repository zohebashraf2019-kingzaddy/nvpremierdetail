// Premier Auto Detailing — shared behaviour
(() => {
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = document.body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', String(open));
      if (open) header.classList.add('is-solid'); else onScroll();
    });
    document.querySelectorAll('.drawer a').forEach(a => a.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());

  // Gallery filter
  const filters = document.querySelector('[data-filters]');
  const gallery = document.querySelector('[data-gallery]');
  if (filters && gallery) {
    filters.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      filters.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const f = btn.dataset.filter;
      gallery.querySelectorAll('figure').forEach(fig => {
        fig.classList.toggle('is-hidden', f !== 'all' && !fig.dataset.tags.split(' ').includes(f));
      });
    });
  }

  // Lightbox
  if (gallery) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = '<button class="lb-btn lb-close" aria-label="Close">&times;</button><button class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button><img alt=""><button class="lb-btn lb-next" aria-label="Next photo">&#8250;</button><p></p>';
    document.body.appendChild(lb);
    const img = lb.querySelector('img'), cap = lb.querySelector('p');
    let idx = 0, lastFocus = null;
    const visible = () => [...gallery.querySelectorAll('figure:not(.is-hidden)')];
    const show = i => {
      const items = visible();
      idx = (i + items.length) % items.length;
      const fig = items[idx], im = fig.querySelector('img');
      img.src = im.currentSrc || im.src; img.alt = im.alt;
      cap.textContent = fig.querySelector('figcaption')?.textContent || '';
    };
    const open = fig => { lastFocus = document.activeElement; show(visible().indexOf(fig)); lb.classList.add('is-open'); lb.querySelector('.lb-close').focus(); document.body.style.overflow = 'hidden'; };
    const close = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
    gallery.querySelectorAll('figure').forEach(fig => {
      fig.tabIndex = 0;
      fig.addEventListener('click', () => open(fig));
      fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig); } });
    });
    lb.querySelector('.lb-close').onclick = close;
    lb.querySelector('.lb-prev').onclick = () => show(idx - 1);
    lb.querySelector('.lb-next').onclick = () => show(idx + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // Videos: play only while on screen; sound toggle
  const vids = document.querySelectorAll('video[data-autoplay]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) en.target.play().catch(() => {}); else en.target.pause();
    }), { threshold: 0.35 });
    vids.forEach(v => io.observe(v));
  }
  const muted = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  const loud = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  document.querySelectorAll('.reel .sound').forEach(btn => {
    const v = btn.parentElement.querySelector('video');
    btn.innerHTML = muted;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.reel video').forEach(o => { if (o !== v) { o.muted = true; o.parentElement.querySelector('.sound').innerHTML = muted; } });
      v.muted = !v.muted;
      if (!v.muted) v.play().catch(() => {});
      btn.innerHTML = v.muted ? muted : loud;
      btn.setAttribute('aria-label', v.muted ? 'Turn sound on' : 'Turn sound off');
    });
  });

  // One-time in-view flag (used by the studio teaser line drawing)
  const flag = document.querySelectorAll('[data-inview]');
  if ('IntersectionObserver' in window) {
    const io2 = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in-view'); io2.unobserve(en.target); }
    }), { threshold: 0.3 });
    flag.forEach(el => io2.observe(el));
  } else flag.forEach(el => el.classList.add('in-view'));
})();
