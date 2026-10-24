// Scale only text inside links and buttons so their frames do not move.
function setInteractiveText(control, text) {
  const label = document.createElement('span');
  label.className = 'hover-text';
  label.textContent = text;
  control.replaceChildren(label);
}
document.querySelectorAll('a, button').forEach(control => {
  if (control.matches('.contact-close')) return;
  const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.parentElement.closest('.site-header .monogram')) continue;
    if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  }
  nodes.forEach(node => {
    const label = document.createElement('span');
    label.className = 'hover-text';
    node.replaceWith(label);
    label.append(node);
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#starfield');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let stars = [], width = 0, height = 0, frame = 0;
  let animation;
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Deterministic stars keep resizing and screenshots calm.
    let seed = 1907;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    stars = Array.from({ length: Math.min(210, Math.round(width * height / 6500)) }, () => ({
      x: random() * width, y: random() * height, r: .35 + random() * 1.05,
      opacity: .15 + random() * .65, phase: random() * Math.PI * 2, speed: .25 + random() * .7
    }));
    draw(performance.now());
  }
  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const alpha = s.opacity * (reducedMotion.matches ? .8 : .65 + .35 * Math.sin(time * .0007 * s.speed + s.phase));
      ctx.fillStyle = `rgba(240,234,238,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      if (s.r > 1.15) {
        ctx.strokeStyle = `rgba(244,219,204,${alpha * .3})`; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(s.x - 3, s.y); ctx.lineTo(s.x + 3, s.y);
        ctx.moveTo(s.x, s.y - 3); ctx.lineTo(s.x, s.y + 3); ctx.stroke();
      }
    }
  }
  function tick(time) {
    if (++frame % 2 === 0) draw(time); // A restrained 30 fps shimmer.
    animation = requestAnimationFrame(tick);
  }
  function restart() {
    cancelAnimationFrame(animation); draw(performance.now());
    if (!reducedMotion.matches && !document.hidden) animation = requestAnimationFrame(tick);
  }
  resize(); restart();
  window.addEventListener('resize', resize, { passive: true });
  reducedMotion.addEventListener('change', restart);
  document.addEventListener('visibilitychange', restart);
}

const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');
if (menuButton && nav) {
  const closeMenu = () => { nav.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); setInteractiveText(menuButton, 'Menu'); };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
    setInteractiveText(menuButton, open ? 'Close' : 'Menu');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
}

const heroVideo = document.querySelector('#hero-video');
if (heroVideo) {
  const play = document.querySelector('#video-play');
  const update = () => {
    setInteractiveText(play, heroVideo.paused ? 'Play video' : 'Pause video');
    play.setAttribute('aria-label', heroVideo.paused ? 'Play opening drone video' : 'Pause opening drone video');
  };
  if (reducedMotion.matches) {
    heroVideo.autoplay = false;
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }
  else heroVideo.play().catch(() => update());
  play.addEventListener('click', () => { if (heroVideo.paused) heroVideo.play().catch(update); else heroVideo.pause(); });
  heroVideo.addEventListener('play', update); heroVideo.addEventListener('pause', update);
  heroVideo.addEventListener('error', () => { setInteractiveText(play, 'Video unavailable'); play.disabled = true; });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { heroVideo.autoplay = false; heroVideo.pause(); }
  });
  let resumeOnVisible = false;
  new IntersectionObserver(entries => {
    const visible = entries[0].isIntersecting;
    if (!visible) { resumeOnVisible = !heroVideo.paused; heroVideo.pause(); }
    else if (resumeOnVisible && !reducedMotion.matches) { heroVideo.play().catch(update); resumeOnVisible = false; }
  }, { threshold: .05 }).observe(heroVideo);
  update();
}

const lightbox = document.querySelector('#lightbox');
if (lightbox) {
  const img = lightbox.querySelector('img'); const caption = lightbox.querySelector('p');
  document.querySelectorAll('[data-lightbox]').forEach(button => button.addEventListener('click', () => {
    img.src = button.dataset.lightbox; img.alt = button.querySelector('img').alt;
    caption.textContent = img.alt; lightbox.showModal();
  }));
  lightbox.querySelector('button').addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener('close', () => { img.removeAttribute('src'); });
}
document.querySelectorAll('video:not(#hero-video)').forEach(video => video.addEventListener('play', () => {
  document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
}));
const progress = document.querySelector('.progress');
if (progress) window.addEventListener('scroll', () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${total > 0 ? window.scrollY / total * 100 : 0}%`;
}, { passive: true });

const contactDialog = document.querySelector('#contact-dialog');
if (contactDialog) {
  const opener = document.querySelector('[data-open-contact]');
  opener.addEventListener('click', () => contactDialog.showModal());
  contactDialog.querySelector('[data-close-contact]').addEventListener('click', () => contactDialog.close());
  contactDialog.addEventListener('click', event => {
    if (event.target !== contactDialog) return;
    const rect = contactDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) contactDialog.close();
  });
  contactDialog.addEventListener('close', () => opener.focus());
  const form = contactDialog.querySelector('form');
  const status = contactDialog.querySelector('#contact-status');
  const submit = form.querySelector('[type="submit"]');
  let sending = false;
  function updateContactValidity() {
    for (const field of form.querySelectorAll('input[required], textarea[required]')) {
      field.setCustomValidity(field.value.trim() ? '' : 'Please fill out this field.');
    }
    submit.disabled = sending || Boolean(form.dataset.unconfigured) || !form.checkValidity();
  }
  form.addEventListener('input', updateContactValidity);
  form.addEventListener('change', updateContactValidity);
  contactDialog.addEventListener('toggle', updateContactValidity);
  updateContactValidity();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    updateContactValidity();
    if (sending || form.dataset.unconfigured || !form.reportValidity()) return;
    sending = true;
    submit.disabled = true;
    setInteractiveText(submit, 'Sending…');
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your message…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST', body: new FormData(form),
        headers: { Accept: 'application/json' }, signal: controller.signal
      });
      if (!response.ok) throw new Error('Submission failed');
      form.reset();
      status.textContent = 'Thanks! Your message has been sent.';
    } catch {
      status.textContent = 'Your message could not be confirmed as sent. Your text is still here; please try again or reach me on LinkedIn.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      updateContactValidity();
      setInteractiveText(submit, 'Send Message');
      form.removeAttribute('aria-busy');
    }
  });
}
