/* ===================================================
   Admin Page Logic
   =================================================== */

const STORAGE_KEYS = {
  profile:  'im_profile',
  gallery:  (n) => `im_gallery_${n}`,
  caption:  (n) => `im_caption_${n}`,
  password: 'im_admin_pw',
};
const DEFAULT_PASSWORD = 'admin1234';
const MAX_WIDTH  = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;

/* ─── Helpers ─── */
function getPassword() {
  return localStorage.getItem(STORAGE_KEYS.password) || DEFAULT_PASSWORD;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('adminToast');
  toast.textContent = msg;
  toast.className = `admin-toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* 이미지 리사이즈 (Canvas) */
function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ─── Login ─── */
const loginScreen = document.getElementById('loginScreen');
const adminPanel  = document.getElementById('adminPanel');

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const pw    = document.getElementById('adminPw').value;
  const error = document.getElementById('loginError');
  if (pw === getPassword()) {
    loginScreen.style.display = 'none';
    adminPanel.style.display  = 'block';
    loadAll();
  } else {
    error.style.display = 'flex';
    document.getElementById('adminPw').value = '';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  adminPanel.style.display  = 'none';
  loginScreen.style.display = 'flex';
  document.getElementById('adminPw').value = '';
});

/* ─── Load saved data ─── */
function loadAll() {
  // Profile
  const savedProfile = localStorage.getItem(STORAGE_KEYS.profile);
  if (savedProfile) applyProfilePreview(savedProfile);

  // Gallery
  for (let i = 1; i <= 6; i++) {
    const savedImg     = localStorage.getItem(STORAGE_KEYS.gallery(i));
    const savedCaption = localStorage.getItem(STORAGE_KEYS.caption(i));
    const slot = document.querySelector(`.admin-gallery-slot[data-slot="${i}"]`);
    if (!slot) continue;
    if (savedImg)     applyGalleryPreview(slot, savedImg);
    if (savedCaption) slot.querySelector('.admin-gallery-caption').value = savedCaption;
  }
}

/* ─── Profile ─── */
function applyProfilePreview(src) {
  const img         = document.getElementById('profilePreviewImg');
  const placeholder = document.getElementById('profilePlaceholder');
  img.src           = src;
  img.style.display = 'block';
  placeholder.style.display = 'none';
  document.getElementById('profileFileName').textContent = '사진이 선택되었습니다.';
}

document.getElementById('profileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const b64 = await resizeImage(file);
  applyProfilePreview(b64);
  document.getElementById('profileFileName').textContent = file.name;
  // 즉시 저장
  localStorage.setItem(STORAGE_KEYS.profile, b64);
  showToast('프로필 사진이 저장되었습니다!');
});

document.getElementById('clearProfile').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEYS.profile);
  const img         = document.getElementById('profilePreviewImg');
  const placeholder = document.getElementById('profilePlaceholder');
  img.src           = '';
  img.style.display = 'none';
  placeholder.style.display = 'flex';
  document.getElementById('profileFileName').textContent = '선택된 파일 없음';
  showToast('프로필 사진이 삭제되었습니다.', 'error');
});

/* ─── Gallery ─── */
function applyGalleryPreview(slot, src) {
  const img      = slot.querySelector('.admin-gallery-slot__img');
  const fallback = slot.querySelector('.admin-gallery-slot__fallback');
  img.src           = src;
  img.style.display = 'block';
  fallback.style.display = 'none';
  slot.classList.add('admin-gallery-slot--has-image');
}

document.querySelectorAll('.admin-gallery-slot').forEach((slot) => {
  const input = slot.querySelector('.admin-gallery-input');
  const n     = parseInt(slot.dataset.slot, 10);

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await resizeImage(file);
    applyGalleryPreview(slot, b64);
    localStorage.setItem(STORAGE_KEYS.gallery(n), b64);
    const caption = slot.querySelector('.admin-gallery-caption').value;
    localStorage.setItem(STORAGE_KEYS.caption(n), caption);
    showToast(`갤러리 ${String(n).padStart(2,'0')} 사진이 저장되었습니다!`);
  });

  slot.querySelector('.admin-gallery-slot__clear').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEYS.gallery(n));
    const img      = slot.querySelector('.admin-gallery-slot__img');
    const fallback = slot.querySelector('.admin-gallery-slot__fallback');
    img.src           = '';
    img.style.display = 'none';
    fallback.style.display = 'flex';
    slot.classList.remove('admin-gallery-slot--has-image');
    showToast(`갤러리 ${String(n).padStart(2,'0')} 사진이 삭제되었습니다.`, 'error');
  });
});

/* ─── Save All ─── */
document.getElementById('saveAllBtn').addEventListener('click', () => {
  for (let i = 1; i <= 6; i++) {
    const slot    = document.querySelector(`.admin-gallery-slot[data-slot="${i}"]`);
    if (!slot) continue;
    const caption = slot.querySelector('.admin-gallery-caption').value;
    localStorage.setItem(STORAGE_KEYS.caption(i), caption);
  }
  showToast('모든 변경사항이 저장되었습니다! ✓');
});

/* ─── Export / Import ─── */
document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {};
  const profile = localStorage.getItem(STORAGE_KEYS.profile);
  if (profile) data.profile = profile;
  for (let i = 1; i <= 6; i++) {
    const img     = localStorage.getItem(STORAGE_KEYS.gallery(i));
    const caption = localStorage.getItem(STORAGE_KEYS.caption(i));
    if (img)     data[`gallery_${i}`]  = img;
    if (caption) data[`caption_${i}`]  = caption;
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `imhyunsoo-photos-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('내보내기 완료! 파일을 다운로드했습니다.');
});

document.getElementById('importInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.profile) {
      localStorage.setItem(STORAGE_KEYS.profile, data.profile);
      applyProfilePreview(data.profile);
    }
    for (let i = 1; i <= 6; i++) {
      if (data[`gallery_${i}`]) {
        localStorage.setItem(STORAGE_KEYS.gallery(i), data[`gallery_${i}`]);
        const slot = document.querySelector(`.admin-gallery-slot[data-slot="${i}"]`);
        if (slot) applyGalleryPreview(slot, data[`gallery_${i}`]);
      }
      if (data[`caption_${i}`]) {
        localStorage.setItem(STORAGE_KEYS.caption(i), data[`caption_${i}`]);
        const slot = document.querySelector(`.admin-gallery-slot[data-slot="${i}"]`);
        if (slot) slot.querySelector('.admin-gallery-caption').value = data[`caption_${i}`];
      }
    }
    showToast('가져오기 완료! 사진이 복원되었습니다.');
  } catch {
    showToast('파일을 읽을 수 없습니다. JSON 파일을 확인해 주세요.', 'error');
  }
});

/* ─── Password Change Modal ─── */
const pwModal = document.getElementById('pwModal');
document.getElementById('changePasswordBtn').addEventListener('click', () => {
  pwModal.style.display = 'flex';
  document.getElementById('currentPw').value   = '';
  document.getElementById('newPw').value        = '';
  document.getElementById('newPwConfirm').value = '';
  document.getElementById('pwError').style.display = 'none';
});
document.getElementById('pwModalCancel').addEventListener('click', () => {
  pwModal.style.display = 'none';
});
document.getElementById('pwModalSave').addEventListener('click', () => {
  const current  = document.getElementById('currentPw').value;
  const newPw    = document.getElementById('newPw').value;
  const confirm  = document.getElementById('newPwConfirm').value;
  const errEl    = document.getElementById('pwError');

  if (current !== getPassword()) {
    errEl.textContent    = '현재 비밀번호가 틀렸습니다.';
    errEl.style.display  = 'flex';
    return;
  }
  if (newPw.length < 4) {
    errEl.textContent   = '새 비밀번호는 4자 이상이어야 합니다.';
    errEl.style.display = 'flex';
    return;
  }
  if (newPw !== confirm) {
    errEl.textContent   = '새 비밀번호가 일치하지 않습니다.';
    errEl.style.display = 'flex';
    return;
  }
  localStorage.setItem(STORAGE_KEYS.password, newPw);
  pwModal.style.display = 'none';
  showToast('비밀번호가 변경되었습니다!');
});
