import { animate, createTimeline, stagger } from 'https://cdn.jsdelivr.net/npm/animejs/+esm';
import { initModel } from './model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer;
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 2200);
}

// Intro: a short, coordinated sequence rather than a static page load.
if (!prefersReducedMotion) {
  const intro = createTimeline({ defaults: { ease: 'outExpo' } });
  intro
    .add('.hero-eyebrow', { opacity: [0, 1], y: [14, 0], duration: 650 })
    .add('.hero-title', { opacity: [0, 1], y: [34, 0], duration: 850 }, '-=360')
    .add('.hero-description', { opacity: [0, 1], y: [18, 0], duration: 700 }, '-=520')
    .add('.hero-buttons .button', { opacity: [0, 1], y: [14, 0], delay: stagger(90), duration: 650 }, '-=470')
    .add('.hero-meta', { opacity: [0, 1], y: [12, 0], duration: 600 }, '-=400')
    .add('.hero-visual', { opacity: [0, 1], scale: [.92, 1], duration: 1100 }, '-=900');
}

// Reveal page sections as they enter the viewport.
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    observer.unobserve(element);
    if (prefersReducedMotion) {
      element.style.opacity = 1;
      element.style.transform = 'none';
      return;
    }
    animate(element, {
      opacity: [0, 1],
      y: [26, 0],
      duration: 850,
      ease: 'outExpo'
    });
  });
}, { threshold: 0.13 });
$$('.reveal').forEach((element) => revealObserver.observe(element));

// Page progress indicator.
const progress = $('#scrollProgress');
let scrollTicking = false;
let heroModel = null;
let detailModel = null;

function updateModelScrollMotion() {
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const heroRect = $('#heroVisual').getBoundingClientRect();
  const heroProgress = clamp01((window.innerHeight - heroRect.top) / (window.innerHeight + heroRect.height));
  heroModel?.setScrollProgress(heroProgress);

  const track = $('#scrollTrack');
  if (!track) return;
  const trackTop = track.getBoundingClientRect().top + window.scrollY;
  const trackDistance = Math.max(1, track.offsetHeight - window.innerHeight);
  const sceneProgress = clamp01((window.scrollY - trackTop) / trackDistance);
  detailModel?.setScrollProgress(sceneProgress);
  updateStoryChapter(sceneProgress);
}

// Scroll chapters: the copy and progress rail change while the 3D scene stays pinned.
let currentStoryChapter = -1;
const storyPanels = $$('.story-panel');
const storySteps = $$('[data-progress-step]');
const storyProgressValue = $('#storyProgressValue');
const storyProgressFill = $('#storyProgressFill');

function updateStoryChapter(progress) {
  const chapter = Math.min(storyPanels.length - 1, Math.floor(progress * storyPanels.length));
  const sticky = $('#scrollSticky');
  if (sticky) sticky.dataset.chapter = String(chapter + 1);
  if (storyProgressFill) storyProgressFill.style.transform = 'scaleX(' + progress + ')';
  if (storyProgressValue) {
    storyProgressValue.innerHTML = String(chapter + 1).padStart(2, '0') + ' <i>/ ' + String(storyPanels.length).padStart(2, '0') + '</i>';
  }
  storySteps.forEach((step, index) => step.classList.toggle('is-active', index <= chapter));
  if (chapter === currentStoryChapter) return;

  const previous = storyPanels[currentStoryChapter];
  const next = storyPanels[chapter];
  if (previous) {
    previous.classList.remove('is-active');
    previous.setAttribute('aria-hidden', 'true');
    if (!prefersReducedMotion) {
      animate(previous, { opacity: 0, translateY: -22, duration: 260, ease: 'in(3)' });
    }
  }

  currentStoryChapter = chapter;
  if (next) {
    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');
    if (prefersReducedMotion) {
      next.style.opacity = 1;
      next.style.transform = 'none';
    } else {
      animate(next, { opacity: [0, 1], translateY: [34, 0], duration: 620, ease: 'out(4)' });
    }
  }
}
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    progress.style.width = percent + '%';
    updateModelScrollMotion();
    scrollTicking = false;
  });
}, { passive: true });

// Mobile navigation.
const menuToggle = $('#menuToggle');
const nav = $('#mainNav');
menuToggle.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});
$$('.nav-link').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

// Hover demo — animate the object toward the pointer and spring it back.
const hoverObject = $('#hoverObject');
hoverObject.addEventListener('pointermove', (event) => {
  const rect = hoverObject.getBoundingClientRect();
  const dx = (event.clientX - rect.left - rect.width / 2) / rect.width;
  const dy = (event.clientY - rect.top - rect.height / 2) / rect.height;
  animate(hoverObject, {
    rotate: [ -9 + dx * 13 ],
    x: dx * 10,
    y: dy * 10,
    scale: 1.07,
    duration: 220,
    ease: 'outQuad'
  });
});
hoverObject.addEventListener('pointerleave', () => {
  animate(hoverObject, { rotate: -9, x: 0, y: 0, scale: 1, duration: 850, ease: 'outElastic(1, .5)' });
});

// Build the stagger grid and replay its movement on demand.
const staggerGrid = $('#staggerGrid');
for (let i = 0; i < 25; i += 1) {
  const dot = document.createElement('span');
  dot.className = 'stagger-dot';
  staggerGrid.appendChild(dot);
}
function replayStagger() {
  animate('.stagger-dot', {
    scale: [{ to: .35 }, { to: 1 }],
    rotate: [{ to: 90 }, { to: 0 }],
    y: [{ to: -17 }, { to: 0 }],
    delay: stagger(38, { grid: [5, 5], from: 'center' }),
    duration: 520,
    ease: 'outBack'
  });
}
$('#staggerReplay').addEventListener('click', replayStagger);
replayStagger();

// Easing demo: range input scrubs the ball, Play runs the same journey.
const easeSlider = $('#easeSlider');
const easeBall = $('#easeBall');
let easingAnimation = null;
function setEasePosition(value) {
  const width = easeBall.parentElement.clientWidth - easeBall.offsetWidth;
  easeBall.style.transform = 'translateX(' + (Number(value) / 100 * width) + 'px)';
}
easeSlider.addEventListener('input', () => {
  if (easingAnimation) easingAnimation.pause();
  setEasePosition(easeSlider.value);
});
$('#easePlay').addEventListener('click', () => {
  if (easingAnimation) easingAnimation.pause();
  easeSlider.value = 0;
  setEasePosition(0);
  const distance = easeBall.parentElement.clientWidth - easeBall.offsetWidth;
  easingAnimation = animate(easeBall, {
    translateX: [0, distance],
    duration: 1500,
    ease: 'outExpo',
    onUpdate: (self) => { easeSlider.value = Math.round(self.progress); }
  });
  easingAnimation.then(() => { easeSlider.value = 100; });
});
window.addEventListener('resize', () => {
  setEasePosition(easeSlider.value);
  updateModelScrollMotion();
});

// Subtle feature-card reactions.
$$('.feature-card').forEach((card) => {
  card.addEventListener('pointerenter', () => animate(card, { y: -5, duration: 260, ease: 'outQuad' }));
  card.addEventListener('pointerleave', () => animate(card, { y: 0, duration: 450, ease: 'outExpo' }));
});

// Copy a real Anime.js example from the code panel.
$('#copyCode').addEventListener('click', async () => {
  const snippet = `import { animate, stagger } from 'animejs';

animate('.letter', {
  y: [32, 0],
  opacity: [0, 1],
  delay: stagger(80),
  ease: 'outExpo',
  duration: 900,
});`;
  try {
    await navigator.clipboard.writeText(snippet);
    toast('Animation snippet copied');
  } catch {
    toast('Clipboard is unavailable in this browser');
  }
});

// Start the supplied Blender GLB in both 3D feature areas.
heroModel = initModel($('#heroModel'), {
  theme: 'light',
  autoRotate: true,
  radius: 1.12,
  cameraDistance: 5.15
});
detailModel = initModel($('#detailModel'), {
  theme: 'dark',
  autoRotate: true,
  radius: 1.22,
  cameraDistance: 5.35
});
updateModelScrollMotion();
window.addEventListener('beforeunload', () => {
  heroModel?.dispose();
  detailModel?.dispose();
});
