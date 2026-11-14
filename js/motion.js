/* motion.js: anime.js letter reveal for headings, staggered reveals as each section scrolls in */
(() => {
  if (!window.anime || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const plays = new Map();
  document.querySelectorAll('.sec').forEach(sec => {
    const h = sec.querySelector('h2');
    if (h) {
      const text = h.textContent;
      h.setAttribute('aria-label', text);
      h.innerHTML = [...text].map(c => c === ' ' ? ' ' : '<span class="ch" aria-hidden="true">' + c + '</span>').join('');
      anime.set(h.querySelectorAll('.ch'), { translateY: '0.8em', opacity: 0 });
    }
    const items = sec.querySelectorAll('.grid > *, .timeline li, .split > div, .wrap > p, details');
    const bars = sec.querySelectorAll('.swatch i');
    anime.set(items, { opacity: 0, translateY: 28 });
    anime.set(bars, { scaleX: 0 });
    plays.set(sec, () => {
      if (h) anime({ targets: h.querySelectorAll('.ch'), translateY: 0, opacity: 1, duration: 900, delay: anime.stagger(22), easing: 'easeOutExpo' });
      anime({ targets: items, opacity: 1, translateY: 0, duration: 900, delay: anime.stagger(90, { start: 180 }), easing: 'easeOutExpo' });
      anime({ targets: bars, scaleX: 1, duration: 1000, delay: anime.stagger(120, { start: 320 }), easing: 'easeOutExpo' });
    });
  });

  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    plays.get(en.target)();
  }), { threshold: 0.15 });
  plays.forEach((_, sec) => io.observe(sec));
})();
