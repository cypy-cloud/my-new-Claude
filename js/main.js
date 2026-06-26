/* ===================================================
   임현수 강사 랜딩페이지 - Main JS
   =================================================== */

/* ===================================================
   강의 후기 데이터 (testimonials)
   ---------------------------------------------------
   후기를 직접 추가하려면 아래 배열에 객체를 추가하세요.
   필드 설명:
     rating  : 별점 (1~5, 소수점 가능 예: 4.5)
     text    : 후기 본문
     org     : 기관/직무 (예: "대기업 인사팀 · 과장")
     topic   : 교육 주제 (예: "MBTI 조직소통 교육")

   ── 구글 설문지/시트 자동 연동 방법 (추후 구현) ──────
   방법 A. Google Apps Script Web App 활용
     1. 구글 시트에서 확장 프로그램 > Apps Script 열기
     2. doGet() 함수로 JSON 응답 반환하는 웹앱 배포
     3. 아래 loadTestimonialsFromSheet() 함수의 SHEET_API_URL에
        배포된 웹앱 URL 입력 후 주석 해제

   방법 B. 공개 CSV 링크 활용 (Apps Script 없이)
     1. 구글 시트 > 파일 > 웹에 게시 > CSV 형식으로 게시
     2. 아래 loadTestimonialsFromCSV() 함수의 CSV_URL에
        복사한 링크 입력 후 주석 해제
   ────────────────────────────────────────────────── */
const testimonials = [
  {
    rating : 5,
    text   : '강의가 어렵지 않고 현장에서 바로 적용할 수 있어 좋았습니다. 이론 설명보다 실습 중심이라 교육 후 바로 업무에 써볼 수 있었습니다.',
    org    : '제조기업 · 팀장',
    topic  : '리더십 교육',
  },
  {
    rating : 5,
    text   : '팀원 성향을 이해하고 소통하는 방법을 구체적으로 배울 수 있었습니다. MBTI가 단순한 유형 구분이 아니라 실제 협업에 이렇게 활용될 수 있다는 게 인상적이었어요.',
    org    : '공공기관 · 교육담당자',
    topic  : 'MBTI 조직소통 교육',
  },
  {
    rating : 5,
    text   : 'AI를 막연하게만 생각했는데 실제 업무에 활용할 수 있다는 자신감이 생겼습니다. 비전공자도 쉽게 따라갈 수 있도록 설명해 주셔서 감사했습니다.',
    org    : '금융기관 · 대리',
    topic  : 'AI 활용 교육',
  },
];

/*
─── 방법 A: Apps Script 웹앱에서 불러오기 ───────────────
async function loadTestimonialsFromSheet() {
  const SHEET_API_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
  try {
    const res  = await fetch(SHEET_API_URL);
    const data = await res.json(); // [{ rating, text, org, topic }, ...]
    return data;
  } catch (e) {
    console.warn('시트 로딩 실패, 기본 데이터 사용:', e);
    return testimonials;
  }
}

─── 방법 B: 공개 CSV에서 불러오기 ──────────────────────
async function loadTestimonialsFromCSV() {
  const CSV_URL = 'YOUR_PUBLIC_GOOGLE_SHEET_CSV_URL_HERE';
  // 시트 컬럼 순서: rating, text, org, topic
  try {
    const res  = await fetch(CSV_URL);
    const text = await res.text();
    const rows = text.trim().split('\n').slice(1); // 헤더 제외
    return rows.map(row => {
      const [rating, text, org, topic] = row.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      return { rating: parseFloat(rating), text, org, topic };
    });
  } catch (e) {
    console.warn('CSV 로딩 실패, 기본 데이터 사용:', e);
    return testimonials;
  }
}
*/

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

  /* ─── Reviews: render from testimonials array ─── */
  (function renderReviews(data) {
    const grid       = document.getElementById('reviewsGrid');
    const avgEl      = document.getElementById('avgScore');
    const avgStarsEl = document.getElementById('avgStars');
    const countEl    = document.getElementById('reviewCount');
    const moreWrap   = document.getElementById('reviewsMore');
    const moreBtn    = document.getElementById('reviewsMoreBtn');
    if (!grid) return;

    const INITIAL_SHOW = 3;
    let showAll = false;

    function starHTML(rating) {
      let html = '';
      for (let i = 1; i <= 5; i++) {
        if (rating >= i)       html += '<i class="fa-solid fa-star"></i>';
        else if (rating >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
        else                   html += '<i class="fa-regular fa-star empty"></i>';
      }
      return html;
    }

    function cardHTML(item) {
      return `
        <div class="review-card">
          <div class="review-stars">${starHTML(item.rating)}</div>
          <p class="review-text">"${item.text}"</p>
          <span class="review-topic">${item.topic}</span>
          <div class="review-author">
            <div class="author-avatar"><i class="fa-solid fa-user"></i></div>
            <div>
              <strong>${item.org}</strong>
              <span>${item.topic}</span>
            </div>
          </div>
        </div>`;
    }

    function render(items) {
      grid.innerHTML = items.map(cardHTML).join('');
    }

    function updateSummary(items) {
      const avg = items.reduce((s, i) => s + i.rating, 0) / items.length;
      avgEl.textContent      = avg.toFixed(1);
      avgStarsEl.innerHTML   = starHTML(avg);
      countEl.textContent    = items.length;
    }

    // 초기 렌더
    render(data.slice(0, INITIAL_SHOW));
    updateSummary(data);

    if (data.length > INITIAL_SHOW) {
      moreWrap.style.display = 'block';
      moreBtn.addEventListener('click', () => {
        showAll = !showAll;
        render(showAll ? data : data.slice(0, INITIAL_SHOW));
        moreBtn.innerHTML = showAll
          ? '접기 <i class="fa-solid fa-chevron-up"></i>'
          : '후기 더 보기 <i class="fa-solid fa-chevron-down"></i>';
      });
    }
  })(testimonials);
  /*
    구글 시트/CSV 연동 시에는 위 (testimonials) 를 아래처럼 교체:
    loadTestimonialsFromSheet().then(renderReviews);
    또는
    loadTestimonialsFromCSV().then(renderReviews);
  */

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
    ['org', 'uname', 'uphone'].forEach(id => {
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

    const SHEET_URL = 'https://script.google.com/macros/s/AKfycbw1wsFJ93nVDiFuqm8e9VCxuEM97ZjzVs9Qge1Uzy9uB5ksdTGr8nrRtbQ1EsyOFfXscA/exec';

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 전송 중...';

    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org:    document.getElementById('org').value.trim(),
          uname:  document.getElementById('uname').value.trim(),
          uphone: document.getElementById('uphone').value.trim(),
          msg:    document.getElementById('message').value.trim(),
        }),
      });
      form.reset();
      showToast('문의가 접수되었습니다. 빠르게 연락드리겠습니다!');
    } catch {
      showToast('전송 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 문의 보내기';
    }
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
      const offset = header.offsetHeight + 16;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

})();
