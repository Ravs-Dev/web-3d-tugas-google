/* effects.js: scroll progress, active nav link, cursor glow, magnetic buttons, card tilt */
(() => {
  const fine = matchMedia('(pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.nav');

  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    nav.classList.toggle('scrolled', scrollY > 24);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('section[id]').forEach(s => spy.observe(s));

  if (!fine || reduce || !window.anime) return;

  const glow = document.createElement('div');
  glow.className = 'glow';
  document.body.appendChild(glow);
  let mx = innerWidth / 2, my = innerHeight / 2, gx = mx, gy = my;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
  (function loop() {
    gx += (mx - gx) * 0.12;
    gy += (my - gy) * 0.12;
    glow.style.transform = 'translate(' + (gx - 220) + 'px,' + (gy - 220) + 'px)';
    requestAnimationFrame(loop);
  })();

  document.querySelectorAll('.btn, .cta').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      anime({ targets: el, translateX: (e.clientX - r.left - r.width / 2) * 0.25, translateY: (e.clientY - r.top - r.height / 2) * 0.35, duration: 300, easing: 'easeOutQuad' });
    });
    el.addEventListener('pointerleave', () => anime({ targets: el, translateX: 0, translateY: 0, duration: 700, easing: 'easeOutElastic(1, .5)' }));
  });

  document.querySelectorAll('.card, .swatch').forEach(el => {
    el.classList.add('tilt');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      anime({ targets: el, rotateY: ((e.clientX - r.left) / r.width - 0.5) * 12, rotateX: -((e.clientY - r.top) / r.height - 0.5) * 12, duration: 400, easing: 'easeOutQuad' });
    });
    el.addEventListener('pointerleave', () => anime({ targets: el, rotateX: 0, rotateY: 0, duration: 900, easing: 'easeOutElastic(1, .5)' }));
  });

  document.querySelectorAll('.ph').forEach(el => {
    el.addEventListener('pointerenter', () => anime({ targets: el, scale: 1.03, duration: 500, easing: 'easeOutElastic(1, .6)' }));
    el.addEventListener('pointerleave', () => anime({ targets: el, scale: 1, duration: 500, easing: 'easeOutQuad' }));
  });
})();
