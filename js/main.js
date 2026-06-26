/* ===================================================
   임현수 강사 랜딩페이지 - Main JS
   =================================================== */

(function () {
  'use strict';

  /* ─── Nav: Scroll shadow + hamburger ─── */
  const header    = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
    floatingCta.classList.toggle('show', window.scrollY > 400);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });

  // Close menu on nav link click
  navMenu.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navMenu.classList.remove('open');
    });
  });

  /* ─── Active nav link on scroll ─── */
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav__link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => sectionObserver.observe(s));

  /* ─── Counter animation ─── */
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1600;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current);
    }, 16);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num').forEach(el => counterObserver.observe(el));

  /* ─── Expertise card reveal ─── */
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay || 0, 10) * 80;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.expertise-card').forEach(card => cardObserver.observe(card));

  /* ─── Gallery lightbox ─── */
  const lightbox     = document.getElementById('lightbox');
  const lbImg        = document.getElementById('lightboxImg');
  const lbCaption    = document.getElementById('lightboxCaption');
  const lbClose      = document.getElementById('lightboxClose');
  const lbPrev       = document.getElementById('lightboxPrev');
  const lbNext       = document.getElementById('lightboxNext');

  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  let currentIndex   = 0;

  function openLightbox(index) {
    const item   = galleryItems[index];
    const img    = item.querySelector('img');
    const caption = item.querySelector('.gallery-item__caption');

    // 실제 사진이 있을 때만 라이트박스 표시
    if (!img || img.style.display === 'none') return;

    lbImg.src        = img.src;
    lbImg.alt        = img.alt;
    lbCaption.textContent = caption ? caption.textContent : '';
    currentIndex     = index;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function shiftLightbox(dir) {
    const next = (currentIndex + dir + galleryItems.length) % galleryItems.length;
    openLightbox(next);
  }

  galleryItems.forEach((item, i) => {
    item.setAttribute('tabindex', '0');
    item.addEventListener('click', () => openLightbox(i));
    item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openLightbox(i); });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => shiftLightbox(-1));
  lbNext.addEventListener('click', () => shiftLightbox(1));

  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   shiftLightbox(-1);
    if (e.key === 'ArrowRight')  shiftLightbox(1);
  });

  /* ─── Floating CTA ─── */
  const floatingCta = document.getElementById('floatingCta');

  /* ─── Contact Form ─── */
  const form = document.getElementById('contactForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    let valid = true;
    ['org', 'name', 'phone'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        el.classList.add('error');
        valid = false;
      } else {
        el.classList.remove('error');
      }
    });

    if (!valid) {
      showToast('필수 항목을 입력해 주세요.', 'error');
      return;
    }

    // Simulate form submission (replace with real endpoint)
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 전송 중...';

    await new Promise(r => setTimeout(r, 1200));

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 문의 보내기';
    form.reset();

    showToast('문의가 접수되었습니다. 빠르게 연락드리겠습니다!');
  });

  // Remove error class on input
  form.querySelectorAll('input, textarea, select').forEach(el => {
    el.addEventListener('input', () => el.classList.remove('error'));
  });

  /* ─── Toast ─── */
  function showToast(msg) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  /* ─── Smooth scroll offset (fixed header) ─── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = header.offsetHeight + 8;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
    });
  });

})();
