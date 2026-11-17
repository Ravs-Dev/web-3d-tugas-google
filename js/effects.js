/* effects.js: optimized Anime.js interactions for scroll, pointer and cards */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const nav = document.querySelector('.nav');

  // Scroll work is coalesced into one animation frame instead of running for every event.
  let progress = document.querySelector('.progress');
  if (!progress) {
    progress = document.createElement('div');
    progress.className = 'progress';
    document.body.appendChild(progress);
  }

  let scrollFrame = 0;
  const updateScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
    });
  };
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', updateScroll, { passive: true });
  updateScroll();

  if (nav && 'IntersectionObserver' in window) {
    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const sections = document.querySelectorAll('section[id]');
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        links.forEach(link => {
          link.classList.toggle('on', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-42% 0px -52% 0px' });
    sections.forEach(section => spy.observe(section));
  }

  if (reduce || !finePointer) return;

  // A single spotlight follows the pointer. No Anime.js instance is created per pointer event.
  const glow = document.createElement('div');
  glow.className = 'glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.appendChild(glow);

  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let glowFrame = 0;
  const moveGlow = event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (glowFrame) return;
    glowFrame = requestAnimationFrame(() => {
      glowFrame = 0;
      glow.style.transform = 'translate3d(' + (pointerX - 220) + 'px,' + (pointerY - 220) + 'px,0)';
    });
  };
  window.addEventListener('pointermove', moveGlow, { passive: true });

  // Magnetic controls use CSS variables so movement stays cheap and predictable.
  document.querySelectorAll('.btn, .cta, .play').forEach(element => {
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.12;
      element.style.setProperty('--mag-x', Math.max(-7, Math.min(7, x)) + 'px');
      element.style.setProperty('--mag-y', Math.max(-7, Math.min(7, y)) + 'px');
    }, { passive: true });
    element.addEventListener('pointerleave', () => {
      element.style.setProperty('--mag-x', '0px');
      element.style.setProperty('--mag-y', '0px');
    });
  });

  // Lightweight card tilt. Pointer movement updates one element only.
  document.querySelectorAll('.card, .swatch').forEach(card => {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = 'perspective(900px) rotateX(' + (-y * 5) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-2px)';
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });

  // Ripple feedback on buttons.
  document.querySelectorAll('.btn, .cta, .play').forEach(button => {
    button.addEventListener('click', event => {
      if (!window.anime) return;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = (event.clientX - rect.left) + 'px';
      ripple.style.top = (event.clientY - rect.top) + 'px';
      button.appendChild(ripple);
      anime({
        targets: ripple,
        scale: [0, 1],
        opacity: [0.35, 0],
        duration: 620,
        easing: 'easeOutExpo',
        complete: () => ripple.remove()
      });
    });
  });

  // FAQ answers enter smoothly when opened.
  if (window.anime) {
    document.querySelectorAll('details').forEach(detail => {
      detail.addEventListener('toggle', () => {
        if (!detail.open) return;
        const answer = detail.querySelector('p');
        if (!answer) return;
        anime.remove(answer);
        anime({
          targets: answer,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 420,
          easing: 'easeOutCubic'
        });
      });
    });
  }
})();
