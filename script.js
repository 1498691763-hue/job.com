const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? '打开导航菜单' : '关闭导航菜单');
    nav.classList.toggle('is-open', !open);
  });

  nav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航菜单');
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target) && !menuButton.contains(event.target)) {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', '打开导航菜单');
    }
  });
}

document.querySelectorAll('a[href="#top"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

const currentPage = location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('.media-gallery').forEach((gallery) => {
  const slides = [...gallery.querySelectorAll(':scope > figure')];
  if (!slides.length) return;

  slides.forEach((slide) => {
    const picture = slide.querySelector('img');
    const caption = slide.querySelector('figcaption');
    if (!picture || !caption) return;

    const title = caption.textContent.trim();
    slide.dataset.title = title;
    slide.dataset.image = picture.getAttribute('src');
    picture.title = '双击查看大图';
    picture.tabIndex = 0;
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'gallery-open';
    openButton.textContent = '查看大图';
    openButton.setAttribute('aria-label', `查看大图：${title}`);
    caption.append(openButton);
  });

  const openDetail = (slide) => {
    if (!slide?.dataset.image) return;
    const detail = new URL('photo.html', location.href);
    detail.searchParams.set('image', slide.dataset.image);
    detail.searchParams.set('title', slide.dataset.title);
    detail.searchParams.set('from', currentPage);
    location.assign(detail.href);
  };
  gallery.addEventListener('dblclick', (event) => {
    if (event.target.matches('img')) openDetail(event.target.closest('figure'));
  });
  gallery.addEventListener('click', (event) => {
    if (event.target.closest('.gallery-open')) openDetail(event.target.closest('figure'));
  });
  gallery.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.matches('img')) openDetail(event.target.closest('figure'));
  });

  const track = document.createElement('div');
  track.className = 'carousel-track';
  if (slides.length > 1) {
    const lastCopy = slides.at(-1).cloneNode(true);
    const firstCopy = slides[0].cloneNode(true);
    [lastCopy, firstCopy].forEach((copy) => {
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelector('img').tabIndex = -1;
      copy.querySelector('img').loading = 'eager';
      copy.querySelector('.gallery-open').tabIndex = -1;
    });
    track.append(lastCopy, ...slides, firstCopy);
  } else {
    gallery.classList.add('is-single');
    track.append(...slides);
  }
  gallery.append(track);

  let current = slides.length > 1 ? 1 : 0;
  let timer;
  let visible = false;
  let hovering = false;
  let focused = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const allSlides = [...track.children];
  const setActive = () => {
    allSlides.forEach((slide, index) => slide.classList.toggle('is-active', index === current));
  };
  const position = (animate) => {
    const slide = allSlides[current];
    const inset = (gallery.clientWidth - slide.offsetWidth) / 2;
    track.style.transitionDuration = animate && !reducedMotion.matches ? '.55s' : '0s';
    track.style.transform = `translate3d(${inset - slide.offsetLeft}px, 0, 0)`;
    setActive();
  };
  position(false);
  new ResizeObserver(() => position(false)).observe(gallery);

  if (slides.length < 2) return;

  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.innerHTML = '<button type="button" class="carousel-prev" aria-label="上一张图片">‹</button><span class="carousel-count" aria-live="polite"></span><button type="button" class="carousel-next" aria-label="下一张图片">›</button>';
  gallery.append(controls);
  const count = controls.querySelector('.carousel-count');
  const updateCount = () => {
    const shown = current === 0 ? slides.length : current === slides.length + 1 ? 1 : current;
    count.textContent = `${shown} / ${slides.length}`;
  };
  const stop = () => { clearInterval(timer); timer = undefined; };
  const goTo = (index) => { current = index; position(true); updateCount(); };
  const start = () => {
    stop();
    if (!visible || hovering || focused || document.hidden || reducedMotion.matches) return;
    timer = setInterval(() => goTo(current + 1), 3000);
  };

  controls.querySelector('.carousel-prev').addEventListener('click', () => { goTo(current - 1); start(); });
  controls.querySelector('.carousel-next').addEventListener('click', () => { goTo(current + 1); start(); });
  track.addEventListener('transitionend', (event) => {
    if (event.propertyName !== 'transform') return;
    if (current === 0) { current = slides.length; position(false); }
    if (current === slides.length + 1) { current = 1; position(false); }
    updateCount();
  });
  gallery.addEventListener('pointerenter', () => { hovering = true; stop(); });
  gallery.addEventListener('pointerleave', () => { hovering = false; start(); });
  gallery.addEventListener('focusin', () => { focused = true; stop(); });
  gallery.addEventListener('focusout', () => { focused = gallery.contains(document.activeElement); if (!focused) start(); });
  document.addEventListener('visibilitychange', start);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) allSlides.forEach((slide) => { slide.querySelector('img').loading = 'eager'; });
    start();
  }, { threshold: 0.25 }).observe(gallery);
  updateCount();
});

const detailImage = document.querySelector('#detail-image');
if (detailImage) {
  const params = new URLSearchParams(location.search);
  const imagePath = params.get('image') || '';
  const title = params.get('title') || '图片详情';
  const from = params.get('from') || '';
  const allowedPages = ['education.html', 'research.html', 'practice.html', 'project-management.html', 'interests.html'];
  if (/^assets\/(photos|documents)\/[a-z0-9-]+\.(jpg|png)$/.test(imagePath)) {
    detailImage.src = imagePath;
    detailImage.alt = title;
    detailImage.hidden = false;
    document.querySelector('#detail-title').textContent = title;
    document.title = `${title}｜蔡坤廷`;
    detailImage.addEventListener('click', () => detailImage.classList.toggle('is-zoomed'));
  } else {
    document.querySelector('#detail-title').textContent = '未找到这张图片';
    document.querySelector('#detail-hint').hidden = true;
  }
  if (allowedPages.includes(from)) document.querySelector('#detail-back').href = from;
}

const sampleVideo = document.querySelector('.sample-video');
if (sampleVideo) {
  const toggle = document.querySelector('.video-toggle');
  const seek = document.querySelector('.video-seek');
  const time = document.querySelector('.video-time');
  const mute = document.querySelector('.video-mute');
  const fullscreen = document.querySelector('.video-fullscreen');
  const error = document.querySelector('.video-error');
  sampleVideo.controls = false;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };
  const updateTime = () => {
    const duration = sampleVideo.duration;
    if (!Number.isFinite(duration)) return;
    seek.value = String(Math.round(sampleVideo.currentTime / duration * 1000));
    time.textContent = `${formatTime(sampleVideo.currentTime)} / ${formatTime(duration)}`;
  };
  const updatePlay = () => {
    const paused = sampleVideo.paused;
    toggle.textContent = paused ? '播放' : '暂停';
    toggle.setAttribute('aria-label', paused ? '播放视频' : '暂停视频');
  };
  const playPause = () => {
    if (sampleVideo.paused) sampleVideo.play().catch(() => { error.hidden = false; });
    else sampleVideo.pause();
  };

  toggle.addEventListener('click', playPause);
  sampleVideo.addEventListener('click', playPause);
  sampleVideo.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); playPause(); }
  });
  seek.addEventListener('input', () => {
    if (!Number.isFinite(sampleVideo.duration)) return;
    sampleVideo.currentTime = Number(seek.value) / 1000 * sampleVideo.duration;
    updateTime();
  });
  mute.addEventListener('click', () => {
    sampleVideo.muted = !sampleVideo.muted;
    mute.textContent = sampleVideo.muted ? '取消静音' : '静音';
    mute.setAttribute('aria-label', sampleVideo.muted ? '取消静音' : '静音');
  });
  fullscreen.addEventListener('click', () => {
    const panel = sampleVideo.closest('.work-sample');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (panel.requestFullscreen) panel.requestFullscreen();
  });
  sampleVideo.addEventListener('loadedmetadata', updateTime);
  sampleVideo.addEventListener('timeupdate', updateTime);
  sampleVideo.addEventListener('seeked', updateTime);
  sampleVideo.addEventListener('play', updatePlay);
  sampleVideo.addEventListener('pause', updatePlay);
  sampleVideo.addEventListener('error', () => { error.hidden = false; });
}
