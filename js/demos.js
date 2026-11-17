/* demos.js: small, interactive Anime.js demonstrations */
(() => {
  const anime = window.anime;
  if (!anime) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const staggerDemo = document.querySelector('#demo-stagger .grid5');
  if (staggerDemo) {
    for (let i = 0; i < 20; i += 1) {
      const tile = document.createElement('i');
      tile.setAttribute('aria-hidden', 'true');
      staggerDemo.appendChild(tile);
    }
    const tiles = staggerDemo.querySelectorAll('i');
    const playStagger = () => {
      anime.remove(tiles);
      anime({
        targets: tiles,
        scale: reduced ? [1, 1] : [0.35, 1],
        opacity: [0.35, 1],
        rotate: reduced ? 0 : [0, 90],
        delay: anime.stagger(38, { grid: [5, 4], from: 'center' }),
        duration: 640,
        easing: 'easeOutElastic(1, .7)'
      });
    };
    document.querySelector('#demo-stagger .play')?.addEventListener('click', playStagger);
    playStagger();
  }

  const layerCard = document.querySelector('#demo-layers');
  const layerBox = layerCard?.querySelector('.box');
  layerCard?.querySelector('.play')?.addEventListener('click', () => {
    if (!layerBox) return;
    anime.remove(layerBox);
    anime({
      targets: layerBox,
      rotate: reduced ? 0 : [0, 180],
      scale: [1, 1.14, 1],
      translateY: reduced ? 0 : [0, -12, 0],
      duration: 900,
      easing: 'easeInOutCubic'
    });
  });

  const controlCard = document.querySelector('#demo-controls');
  const controlBar = controlCard?.querySelector('.bar i');
  const controlButtons = controlCard?.querySelectorAll('[data-act]');
  let controlAnimation = null;
  if (controlBar && controlButtons?.length) {
    controlAnimation = anime({
      targets: controlBar,
      width: ['0%', '100%'],
      autoplay: false,
      duration: 2200,
      easing: 'linear'
    });
    controlButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.dataset.act;
        if (action === 'play') controlAnimation.play();
        if (action === 'pause') controlAnimation.pause();
        if (action === 'reverse') {
          controlAnimation.reverse();
          controlAnimation.play();
        }
      });
    });
  }

  const dragArea = document.querySelector('#demo-drag .drag');
  const ball = dragArea?.querySelector('.ball');
  if (dragArea && ball) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;

    ball.addEventListener('pointerdown', event => {
      dragging = true;
      startX = event.clientX - offsetX;
      startY = event.clientY - offsetY;
      ball.setPointerCapture(event.pointerId);
      anime.remove(ball);
      event.preventDefault();
    });
    ball.addEventListener('pointermove', event => {
      if (!dragging) return;
      offsetX = event.clientX - startX;
      offsetY = event.clientY - startY;
      ball.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px)';
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      anime({
        targets: ball,
        translateX: 0,
        translateY: 0,
        duration: reduced ? 0 : 760,
        easing: 'easeOutElastic(1, .65)',
        complete: () => {
          offsetX = 0;
          offsetY = 0;
          ball.style.transform = '';
        }
      });
    };
    ball.addEventListener('pointerup', release);
    ball.addEventListener('pointercancel', release);
  }
})();
