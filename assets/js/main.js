import { animate, createTimeline, stagger } from 'https://cdn.jsdelivr.net/npm/animejs@4.2.2/+esm';
import { initModel } from './model.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let model = null;
let scrollFrame = 0;
let currentChapter = -1;
let lastDemoAnimation = null;
const chapterPanels = $$('.story-panel');
const demoStages = $$('.demo-stage');
const progressSteps = $$('[data-progress-step]');
const progressFill = $('#storyProgressFill');
const progressValue = $('#storyProgressValue');
const stickyScene = $('#scrollSticky');
const scrollTrack = $('#scrollTrack');
const toastNode = $('#toast');
let toastTimer;

function toast(message) {
  toastNode.textContent = message;
  toastNode.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastNode.classList.remove('show'), 1800);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

// One continuous scroll timeline drives both the chapter UI and the GLB scene.
function updateStory(progress) {
  const total = chapterPanels.length;
  const chapter = Math.min(total - 1, Math.floor(progress * total));
  const localProgress = progress * total - chapter;

  if (progressFill) progressFill.style.transform = `scaleX(${progress})`;
  if (progressValue) {
    progressValue.innerHTML = `${String(chapter + 1).padStart(2, '0')} <i>/ ${String(total).padStart(2, '0')}</i>`;
  }
  if (stickyScene) stickyScene.dataset.chapter = String(chapter + 1);
  progressSteps.forEach((step, index) => step.classList.toggle('is-active', index <= chapter));

  const scrollDemoFill = $('#scrollDemoFill');
  const scrollDemoValue = $('#scrollDemoValue');
  if (scrollDemoFill) scrollDemoFill.style.width = `${Math.round(progress * 100)}%`;
  if (scrollDemoValue) scrollDemoValue.textContent = `${String(Math.round(progress * 100)).padStart(2, '0')}%`;

  if (model) model.setScrollProgress(progress);

  if (chapter !== currentChapter) {
    const previousPanel = chapterPanels[currentChapter];
    const nextPanel = chapterPanels[chapter];
    const previousDemo = demoStages[currentChapter];
    const nextDemo = demoStages[chapter];

    if (previousPanel) {
      previousPanel.classList.remove('is-active');
      previousPanel.setAttribute('aria-hidden', 'true');
      if (!reducedMotion) animate(previousPanel, {
        opacity: 0, translateY: -18, duration: 240, ease: 'in(3)'
      });
    }
    if (previousDemo) {
      previousDemo.classList.remove('is-active');
      previousDemo.setAttribute('aria-hidden', 'true');
      if (!reducedMotion) animate(previousDemo, { opacity: 0, scale: .96, duration: 180, ease: 'in(2)' });
    }

    currentChapter = chapter;
    if (nextPanel) {
      nextPanel.classList.add('is-active');
      nextPanel.setAttribute('aria-hidden', 'false');
      if (!reducedMotion) animate(nextPanel, {
        opacity: [0, 1], translateY: [22, 0], duration: 640, ease: 'out(4)'
      });
      else nextPanel.style.opacity = 1;
    }
    if (nextDemo) {
      nextDemo.classList.add('is-active');
      nextDemo.setAttribute('aria-hidden', 'false');
      if (!reducedMotion) animate(nextDemo, {
        opacity: [0, 1], scale: [.96, 1], duration: 520, ease: 'out(3)'
      });
      else nextDemo.style.opacity = 1;
    }

    // Reset and replay the demo whenever its chapter becomes active.
    replayChapterDemo(chapter);
  }

  if (chapter === 6) {
    const percent = Math.round(localProgress * 100);
    if (scrollDemoValue) scrollDemoValue.textContent = `${percent}%`;
  }
}

function getSceneProgress() {
  if (!scrollTrack) return 0;
  const trackTop = scrollTrack.getBoundingClientRect().top + window.scrollY;
  const travel = Math.max(1, scrollTrack.offsetHeight - window.innerHeight);
  return clamp((window.scrollY - trackTop) / travel);
}

function requestScrollUpdate() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    const pageTravel = document.documentElement.scrollHeight - window.innerHeight;
    $('#scrollProgress').style.width = `${pageTravel > 0 ? (window.scrollY / pageTravel) * 100 : 0}%`;
    updateStory(getSceneProgress());
  });
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);

// Intro sequence.
if (!reducedMotion) {
  const intro = createTimeline({ defaults: { ease: 'out(4)' } });
  intro
    .add('.scene-topline', { opacity: [0, 1], translateY: [-12, 0], duration: 650 })
    .add('.story-panel[data-story="0"] .story-index', { opacity: [0, 1], translateY: [12, 0], duration: 500 }, '-=280')
    .add('.story-panel[data-story="0"] h1', { opacity: [0, 1], translateY: [32, 0], duration: 850 }, '-=330')
    .add('.story-panel[data-story="0"] p', { opacity: [0, 1], translateY: [16, 0], duration: 600 }, '-=520')
    .add('.scene-object-label', { opacity: [0, 1], translateY: [8, 0], delay: stagger(90), duration: 500 }, '-=430');
}

// Demo shapes.
const staggerDemo = $('#staggerDemo');
for (let i = 0; i < 25; i += 1) {
  const dot = document.createElement('i');
  dot.className = 'stagger-dot';
  staggerDemo.appendChild(dot);
}
const staggerDots = $$('.stagger-dot', staggerDemo);

function stopDemoAnimation() {
  if (lastDemoAnimation?.pause) lastDemoAnimation.pause();
  lastDemoAnimation = null;
}

function replayChapterDemo(chapter) {
  if (reducedMotion) return;
  stopDemoAnimation();

  if (chapter === 1) playWaapi();
  if (chapter === 2) playTimeline();
  if (chapter === 3) playStagger();
  if (chapter === 4) playSvgPath();
}

function playWaapi() {
  const shape = $('#waapiShape');
  if (!shape) return;
  lastDemoAnimation = animate(shape, {
    translateX: [0, 35, -18, 0],
    rotate: ['-12deg', '28deg', '-16deg', '-12deg'],
    scale: [1, 1.14, .95, 1],
    duration: 1500,
    ease: 'out(4)'
  });
}

function playTimeline() {
  const bars = $$('.timeline-bar');
  if (!bars.length) return;
  bars.forEach((bar) => { bar.style.width = '0%'; });
  const timeline = createTimeline({ defaults: { ease: 'out(4)', duration: 520 } });
  timeline
    .add('.bar-a', { width: ['0%', '72%'] })
    .add('.bar-b', { width: ['0%', '88%'] }, '-=240')
    .add('.bar-c', { width: ['0%', '58%'] }, '-=240')
    .add('#timelinePlayhead', { opacity: [0, 1], left: ['23px', '92%'], duration: 1150, ease: 'linear' }, 0);
  lastDemoAnimation = timeline;
}

function playStagger() {
  if (!staggerDots.length) return;
  lastDemoAnimation = animate(staggerDots, {
    scale: [0, 1],
    rotate: [-90, 0],
    translateY: [18, 0],
    delay: stagger(45, { grid: [5, 5], from: 'center' }),
    duration: 650,
    ease: 'out(4)'
  });
}

function playSvgPath() {
  const path = $('#pathProgress');
  const dot = $('#pathDot');
  if (!path) return;
  path.style.strokeDashoffset = '400';
  if (dot) {
    dot.setAttribute('cx', '18');
    dot.setAttribute('cy', '132');
  }
  lastDemoAnimation = animate(path, {
    strokeDashoffset: [400, 0],
    duration: 1450,
    ease: 'inOut(3)'
  });
}

$$('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'waapi') playWaapi();
    if (action === 'timeline') playTimeline();
    if (action === 'stagger') playStagger();
    if (action === 'path') playSvgPath();
  });
});

// Spring-like draggable object. The mouse/touch drag is intentionally local to the demo.
const springStage = $('#springStage');
const springObject = $('#springObject');
const springRange = $('#springRange');
let springDragging = false;
let springStartX = 0;
let springBaseX = 0;

function setSpringX(value, duration = 0) {
  if (reducedMotion) {
    springObject.style.transform = `translateX(${value}px)`;
    return;
  }
  animate(springObject, {
    translateX: value,
    duration: duration || 1,
    ease: duration ? 'outElastic(1, .55)' : 'linear'
  });
}

springObject.addEventListener('pointerdown', (event) => {
  springDragging = true;
  springStartX = event.clientX;
  springBaseX = springObject.offsetLeft - (springStage.clientWidth - springObject.offsetWidth) / 2;
  springObject.setPointerCapture?.(event.pointerId);
});
springObject.addEventListener('pointermove', (event) => {
  if (!springDragging) return;
  const limit = Math.max(0, (springStage.clientWidth - springObject.offsetWidth) / 2 - 20);
  const next = clamp(springBaseX + event.clientX - springStartX, -limit, limit);
  springObject.style.transform = `translateX(${next}px)`;
});
function releaseSpring() {
  if (!springDragging) return;
  springDragging = false;
  springObject.style.transform = '';
  animate(springObject, {
    translateX: [springBaseX, 0],
    rotate: ['8deg', '0deg'],
    duration: 900,
    ease: 'outElastic(1, .48)'
  });
}
springObject.addEventListener('pointerup', releaseSpring);
springObject.addEventListener('pointercancel', releaseSpring);
springRange.addEventListener('input', () => {
  const amount = (Number(springRange.value) - 50) * 1.5;
  setSpringX(amount, 360);
});
springRange.addEventListener('change', () => setSpringX(0, 900));

// The list acts like an animation-engine menu and jumps to the matching scroll chapter.
$$('[data-jump]').forEach((button) => {
  button.addEventListener('click', () => {
    const chapter = Number(button.dataset.jump);
    const trackTop = scrollTrack.getBoundingClientRect().top + window.scrollY;
    const travel = scrollTrack.offsetHeight - window.innerHeight;
    const fraction = chapter / Math.max(1, chapterPanels.length - 1);
    window.scrollTo({
      top: trackTop + travel * fraction,
      behavior: reducedMotion ? 'auto' : 'smooth'
    });
  });
});

// Navigation and scroll spy.
const navLinks = $$('.nav-link');
const sections = [$('#engine'), $('#elements'), $('#code')];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id));
  });
}, { threshold: 0.32 });
sections.forEach((section) => section && sectionObserver.observe(section));

const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');
menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
$$('.nav-link').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

// Copy the example code.
$('#copyCode').addEventListener('click', async () => {
  const code = `import { animate, stagger } from 'animejs';

animate('.element', {
  y: [32, 0],
  opacity: [0, 1],
  delay: stagger(80),
  ease: 'outExpo',
  duration: 900,
});`;
  try {
    await navigator.clipboard.writeText(code);
    toast('Code copied to clipboard');
  } catch {
    toast('Clipboard permission is unavailable');
  }
});

// Load the exact supplied GLB once. The same object is the centrepiece of the whole page.
model = initModel($('#heroModel'), {
  theme: 'dark',
  autoRotate: false,
  radius: 1.34,
  cameraDistance: 5.2
});
updateStory(0);
requestScrollUpdate();

window.addEventListener('beforeunload', () => {
  model?.dispose();
  stopDemoAnimation();
});
