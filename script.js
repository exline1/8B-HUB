import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyBqIgNlvEt58sf-_b4vjFwRsV-NwH6ocKU",
    authDomain: "b-hub-37600.firebaseapp.com",
    projectId: "b-hub-37600",
    storageBucket: "b-hub-37600.firebasestorage.app",
    messagingSenderId: "198733477541",
    appId: "1:198733477541:web:878f5f21cccf28256abf4c"
});
const db = getFirestore(app);
const colRef = collection(db, "media");

const IMGBB_KEY = "fd4821118d2741783bd5d8e826dcc3ce";
const CLD_CLOUD = "dz3gpts80";
const CLD_PRESET = "8bhubb";
const DELETE_PASS = "exline";

// ── STATE ─────────────────────────────────────────────────
let mediaItems = [], filteredItems = [];
let currentFilter = 'all', currentSort = 'date';
let selectedType = null, selectedPhoto = null, selectedVideo = null;
let lbIndex = 0, pendingDeleteId = null, pendingUnlockIdx = null;
let lockSectionOpen = false;

// ⚠️ Memory only — sahifa yangilanganda barcha qulflar qayta yopiladi
const unlockedSet = new Set();
const saveUnlocked = () => { /* memory only — intentionally empty */ };

const $ = id => document.getElementById(id);

// ── ICONS ─────────────────────────────────────────────────
const IC = {
    img: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    vid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    pho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    hE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    hF: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
    lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    lockOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
};

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const icons = {
        success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = (icons[type] || icons.info) + `<span>${msg}</span>`;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── FIREBASE REALTIME ─────────────────────────────────────
onSnapshot(query(colRef, orderBy("date", "desc")), snap => {
    mediaItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('loadingWrap').style.display = 'none';
    updateStats();
    renderGrid();
}, () => {
    $('loadingWrap').innerHTML = '<p style="color:#ff6b6b;text-align:center;padding:20px">Ulanishda xatolik. Sahifani yangilang.</p>';
});

function updateStats() {
    $('statTotal').textContent = mediaItems.length;
    $('statPhoto').textContent = mediaItems.filter(m => m.type === 'photo').length;
    $('statVideo').textContent = mediaItems.filter(m => m.type === 'video').length;
    $('statLikes').textContent = mediaItems.reduce((s, m) => s + (m.likes || 0), 0);
}

// ── FILTER / SORT ─────────────────────────────────────────
window.filterMedia = type => {
    currentFilter = type;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const nbMap = { all: 'nb-all', photo: 'nb-photo', video: 'nb-video' };
    if ($(nbMap[type])) $(nbMap[type]).classList.add('active');
    ['ft-all', 'ft-photo', 'ft-video'].forEach(id => $(id) && $(id).classList.remove('active'));
    const ftMap = { all: 'ft-all', photo: 'ft-photo', video: 'ft-video' };
    if ($(ftMap[type])) $(ftMap[type]).classList.add('active');
    $('secTitle').textContent = { all: 'Barcha fayllar', photo: 'Rasmlar', video: 'Videolar' }[type];
    renderGrid();
};

window.sortMedia = by => {
    currentSort = by;
    ['ft-new', 'ft-top'].forEach(id => $(id).classList.remove('active'));
    $(by === 'date' ? 'ft-new' : 'ft-top').classList.add('active');
    renderGrid();
};

// ── LIKED (local) ─────────────────────────────────────────
const likedSet = new Set(JSON.parse(localStorage.getItem('8bhub_liked') || '[]'));
const saveLiked = () => localStorage.setItem('8bhub_liked', JSON.stringify([...likedSet]));

// ── RENDER GRID ───────────────────────────────────────────
function renderGrid() {
    let items = currentFilter === 'all'
        ? mediaItems.slice()
        : mediaItems.filter(m => m.type === currentFilter);
    if (currentSort === 'likes') items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    filteredItems = items;
    $('secCount').textContent = items.length + ' ta';

    const grid = $('mediaGrid');
    grid.innerHTML = '';

    if (!items.length) {
        $('emptyState').classList.add('show');
        return;
    }
    $('emptyState').classList.remove('show');

    items.forEach((item, i) => {
        const isVid = item.type === 'video';
        const liked = likedSet.has(item.id);
        const hasLock = !!item.password;
        const unlocked = !hasLock || unlockedSet.has(item.id);

        const card = document.createElement('div');
        card.className = 'media-card';
        card.setAttribute('data-type', item.type);

        // Thumbnail
        let thumbHtml;
        if (item.type === 'photo' && item.url) {
            thumbHtml = `<img class="thumb-img${hasLock && !unlocked ? ' thumb-blur' : ''}" src="${item.url}" alt="" loading="lazy">`;
        } else if (item.type === 'video' && item.thumbnail) {
            thumbHtml = `<img class="thumb-img${hasLock && !unlocked ? ' thumb-blur' : ''}" src="${item.thumbnail}" alt="" loading="lazy">`;
        } else {
            thumbHtml = `<div class="thumb-placeholder">${isVid ? IC.vid : IC.img}</div>`;
        }

        const lockOverlay = (hasLock && !unlocked) ? `
            <div class="lock-overlay">
                <div class="lock-overlay-icon">${IC.lock}</div>
                <div class="lock-overlay-text">Parol kerak</div>
            </div>` : '';

        // Lock badge — agar ochilgan bo'lsa bosish bilan qayta quflanadi
        const lockBadge = hasLock
            ? `<button class="lock-badge${unlocked ? ' unlocked' : ''}" aria-label="${unlocked ? 'Qayta qulflash' : 'Ochish'}">${unlocked ? IC.lockOpen : IC.lock}</button>`
            : '';

        const playOverlay = (isVid && unlocked)
            ? `<div class="play-overlay"><div class="play-circle">${IC.play}</div></div>`
            : '';

        // O'chirish tugmasi har doim ko'rinadi (qulflangan + ochilgan ikkalasida ham)
        card.innerHTML = `
            <div class="thumb-wrap">
                ${thumbHtml}
                <div class="type-badge ${isVid ? 'badge-video' : 'badge-photo'}">${isVid ? IC.vid : IC.pho} ${isVid ? 'Video' : 'Rasm'}</div>
                ${lockBadge}
                ${lockOverlay}
                ${playOverlay}
                <button class="delete-btn" aria-label="O'chirish">${IC.trash}</button>
            </div>
            <div class="card-body">
                <div class="card-title">${item.title || 'Nomsiz'}</div>
                <div class="card-meta">
                    <div class="card-author">
                        <div class="ava">${(item.author || 'A')[0].toUpperCase()}</div>
                        <span>${item.author || 'Anonim'}</span>
                    </div>
                    <button class="like-btn${liked ? ' liked' : ''}">${liked ? IC.hF : IC.hE}<span>${item.likes || 0}</span></button>
                </div>
            </div>`;

        card.querySelector('.like-btn').addEventListener('click', e => {
            e.stopPropagation();
            toggleLike(item.id, item.likes || 0, liked);
        });
        card.querySelector('.delete-btn').addEventListener('click', e => {
            e.stopPropagation();
            openPassModal(item.id);
        });

        // Lock badge tugmasi — ochilgan bo'lsa qayta qulflash, yopilgan bo'lsa ochish modali
        const lb = card.querySelector('.lock-badge');
        if (lb) {
            lb.addEventListener('click', e => {
                e.stopPropagation();
                if (unlocked) {
                    // Qayta qulflash
                    unlockedSet.delete(item.id);
                    saveUnlocked();
                    renderGrid();
                    showToast('Qayta qulflandi 🔒', 'info');
                } else {
                    openUnlockModal(i);
                }
            });
        }

        card.addEventListener('click', () => {
            if (hasLock && !unlocked) openUnlockModal(i);
            else openLightbox(i);
        });

        grid.appendChild(card);
    });
}

// ── LIKE ──────────────────────────────────────────────────
async function toggleLike(id, cur, wasLiked) {
    if (wasLiked) likedSet.delete(id); else likedSet.add(id);
    saveLiked();
    try { await updateDoc(doc(db, "media", id), { likes: wasLiked ? cur - 1 : cur + 1 }); } catch (e) { }
}

// ── DELETE MODAL ──────────────────────────────────────────
window.openPassModal = id => {
    pendingDeleteId = id;
    $('passInput').value = '';
    $('passError').classList.remove('show');
    $('passModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('passInput').focus(), 300);
};
window.closePassModal = () => {
    $('passModal').classList.remove('open');
    document.body.style.overflow = '';
    pendingDeleteId = null;
};
window.confirmDelete = async () => {
    if ($('passInput').value !== DELETE_PASS) {
        $('passError').classList.add('show');
        $('passInput').value = '';
        $('passInput').focus();
        return;
    }
    const id = pendingDeleteId;
    closePassModal();
    try {
        await deleteDoc(doc(db, "media", id));
        showToast("O'chirildi", 'success');
    } catch (e) {
        showToast("O'chirishda xatolik!", 'error');
    }
};

// ── UNLOCK MODAL ──────────────────────────────────────────
window.openUnlockModal = idx => {
    pendingUnlockIdx = idx;
    const item = filteredItems[idx];
    if (!item) return;

    const thumb = $('unlockThumb');
    thumb.innerHTML = '';
    const src = item.thumbnail || item.url;
    if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'unlock-preview-img';
        img.alt = '';
        thumb.appendChild(img);
        const lbl = document.createElement('div');
        lbl.className = 'unlock-item-title';
        lbl.textContent = item.title || 'Nomsiz';
        thumb.appendChild(lbl);
    }

    $('unlockInput').value = '';
    $('unlockError').classList.remove('show');
    $('unlockModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('unlockInput').focus(), 300);
};
window.closeUnlockModal = () => {
    $('unlockModal').classList.remove('open');
    document.body.style.overflow = '';
    pendingUnlockIdx = null;
};
window.submitUnlock = () => {
    if (pendingUnlockIdx === null) return;
    const item = filteredItems[pendingUnlockIdx];
    if (!item) return;

    if ($('unlockInput').value === item.password) {
        unlockedSet.add(item.id);
        saveUnlocked();
        const idx = pendingUnlockIdx;
        closeUnlockModal();
        renderGrid();
        setTimeout(() => openLightbox(idx), 120);
        showToast("Parol to'g'ri! Ochildi.", 'success');
    } else {
        $('unlockError').classList.add('show');
        $('unlockInput').value = '';
        $('unlockInput').focus();
        const inp = $('unlockInput');
        inp.classList.add('shake');
        setTimeout(() => inp.classList.remove('shake'), 400);
    }
};

// ── UPLOAD MODAL ──────────────────────────────────────────
window.openUploadModal = () => {
    resetModal();
    $('uploadModal').classList.add('open');
    document.body.style.overflow = 'hidden';
};
window.closeUploadModal = () => {
    $('uploadModal').classList.remove('open');
    document.body.style.overflow = '';
    resetModal();
};

function resetModal() {
    selectedType = null;
    selectedPhoto = null;
    selectedVideo = null;
    lockSectionOpen = false;

    $('step1').classList.add('active');
    $('step2').classList.remove('active');
    $('optPhoto').classList.remove('selected');
    $('optVideo').classList.remove('selected');

    clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar');
    clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar');

    $('mediaTitle').value = '';
    $('mediaAuthor').value = '';
    const mp = $('mediaPassword');
    if (mp) mp.value = '';

    const ls = $('lockSection');
    if (ls) { ls.style.maxHeight = '0'; ls.style.overflow = 'hidden'; }
    const ch = $('lockChevron');
    if (ch) ch.style.transform = 'rotate(0deg)';
    const lb = $('lockToggleBtn');
    if (lb) lb.classList.remove('active');

    $('progressWrap').classList.remove('show');
    $('progressFill').style.width = '0%';
    $('submitBtn').disabled = true;
}

window.goStep1 = () => {
    $('step1').classList.add('active');
    $('step2').classList.remove('active');
};

window.selectType = type => {
    selectedType = type;
    selectedPhoto = null;
    selectedVideo = null;
    $('optPhoto').classList.toggle('selected', type === 'photo');
    $('optVideo').classList.toggle('selected', type === 'video');
    $('photoDz').style.display = type === 'photo' ? '' : 'none';
    $('videoDz').style.display = type === 'video' ? '' : 'none';
    clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar');
    clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar');
    $('step1').classList.remove('active');
    $('step2').classList.add('active');
    $('submitBtn').disabled = true;
};

// ── LOCK AUTH (qulf qo'yishdan avval exline tasdiqlanadi) ────
window.toggleLockSection = () => {
    // Agar allaqachon ochiq bo'lsa — yopish
    if (lockSectionOpen) {
        _closeLockSection();
        return;
    }
    // Yopiq bo'lsa — avval exline so'rash
    $('lockAuthInput').value = '';
    $('lockAuthError').classList.remove('show');
    $('lockAuthModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('lockAuthInput').focus(), 300);
};

window.closeLockAuthModal = () => {
    $('lockAuthModal').classList.remove('open');
    document.body.style.overflow = 'hidden'; // upload modal hali ochiq
    $('lockAuthInput').value = '';
    $('lockAuthError').classList.remove('show');
};

window.confirmLockAuth = () => {
    if ($('lockAuthInput').value !== DELETE_PASS) {
        $('lockAuthError').classList.add('show');
        $('lockAuthInput').value = '';
        $('lockAuthInput').focus();
        const inp = $('lockAuthInput');
        inp.classList.add('shake');
        setTimeout(() => inp.classList.remove('shake'), 400);
        return;
    }
    // Parol to'g'ri — modal yopib, qulf bo'limini ochamiz
    $('lockAuthModal').classList.remove('open');
    document.body.style.overflow = 'hidden';
    $('lockAuthInput').value = '';
    _openLockSection();
};

function _openLockSection() {
    lockSectionOpen = true;
    const ls = $('lockSection');
    const ch = $('lockChevron');
    const lb = $('lockToggleBtn');
    if (!ls) return;
    ls.style.maxHeight = '200px';
    ls.style.overflow = 'visible';
    if (ch) ch.style.transform = 'rotate(180deg)';
    if (lb) lb.classList.add('active');
    const mp = $('mediaPassword');
    if (mp) { mp.value = 'exline'; setTimeout(() => mp.focus(), 120); }
}

function _closeLockSection() {
    lockSectionOpen = false;
    const ls = $('lockSection');
    const ch = $('lockChevron');
    const lb = $('lockToggleBtn');
    if (!ls) return;
    ls.style.maxHeight = '0';
    ls.style.overflow = 'hidden';
    if (ch) ch.style.transform = 'rotate(0deg)';
    if (lb) lb.classList.remove('active');
    const mp = $('mediaPassword');
    if (mp) mp.value = '';
}

window.togglePassVis = (inputId, btn) => {
    const input = $(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    const s = btn.querySelector('.eye-show');
    const h = btn.querySelector('.eye-hide');
    if (s) s.style.display = isPass ? 'none' : '';
    if (h) h.style.display = isPass ? '' : 'none';
};

// ── PHOTO drag & drop ─────────────────────────────────────
const dz = $('dropZone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) processPhoto(f);
});
window.handleFileSelect = e => {
    const f = e.target.files[0];
    if (f) processPhoto(f);
};

function processPhoto(f) {
    if (!f || !f.type.startsWith('image/')) {
        showToast('Faqat rasm fayl (JPG, PNG, GIF)!', 'error');
        return;
    }
    if (f.size > 32 * 1024 * 1024) {
        showToast('Rasm 32MB dan katta!', 'error');
        return;
    }
    selectedPhoto = f;
    showPreview('filePreview', 'fileInput', 'dropZone', URL.createObjectURL(f), 'image');
    showSizeBar('photoSizeBar', 'photoSizeName', 'photoSizeVal', 'photoSizeFill', f, 32);
    $('submitBtn').disabled = false;
}

window.removePhotoFile = () => {
    selectedPhoto = null;
    clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar');
    $('submitBtn').disabled = true;
};

// ── VIDEO drag & drop ─────────────────────────────────────
const vdz = $('videoDzZone');
vdz.addEventListener('dragover', e => { e.preventDefault(); vdz.classList.add('drag-over'); });
vdz.addEventListener('dragleave', () => vdz.classList.remove('drag-over'));
vdz.addEventListener('drop', e => {
    e.preventDefault();
    vdz.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) processVideo(f);
});
window.handleVideoSelect = e => {
    const f = e.target.files[0];
    if (f) processVideo(f);
};

function processVideo(f) {
    if (!f || !f.type.startsWith('video/')) {
        showToast('Faqat video fayl!', 'error');
        return;
    }
    if (f.size > 100 * 1024 * 1024) {
        showToast('Video 100MB dan katta!', 'error');
        return;
    }
    selectedVideo = f;
    showPreview('videoPreview', 'videoInput', 'videoDzZone', URL.createObjectURL(f), 'video');
    showSizeBar('videoSizeBar', 'videoSizeName', 'videoSizeVal', 'videoSizeFill', f, 100);
    $('submitBtn').disabled = false;
}

window.removeVideoFile = () => {
    selectedVideo = null;
    clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar');
    $('submitBtn').disabled = true;
};

// ── HELPERS ───────────────────────────────────────────────
function showPreview(previewId, inputId, dzId, src, kind) {
    const pr = $(previewId);
    const rm = pr.querySelector('.fp-remove');
    Array.from(pr.children).forEach(c => { if (c !== rm) c.remove(); });
    const el = document.createElement(kind === 'image' ? 'img' : 'video');
    el.src = src;
    if (kind === 'video') { el.controls = true; el.muted = true; }
    pr.insertBefore(el, rm);
    pr.classList.add('show');
    $(dzId).style.display = 'none';
}

function clearPreview(previewId, inputId, dzId, sizeBarId) {
    const pr = $(previewId);
    const rm = pr.querySelector('.fp-remove');
    Array.from(pr.children).forEach(c => { if (c !== rm) c.remove(); });
    pr.classList.remove('show');
    $(inputId).value = '';
    $(dzId).style.display = '';
    if (sizeBarId) $(sizeBarId).classList.remove('show');
}

function showSizeBar(barId, nameId, valId, fillId, f, maxMb) {
    $(barId).classList.add('show');
    const mb = (f.size / 1024 / 1024).toFixed(1);
    const pct = Math.min((f.size / (maxMb * 1024 * 1024)) * 100, 100);
    const name = f.name.length > 30 ? f.name.slice(0, 27) + '...' : f.name;
    $(nameId).textContent = name;
    $(valId).textContent = mb + 'MB / ' + maxMb + 'MB';
    $(fillId).style.width = pct + '%';
    $(fillId).style.background = pct > 80 ? '#ff6b6b' : 'linear-gradient(90deg,#ff6b00,#ff9a3c)';
}

// ── SUBMIT ────────────────────────────────────────────────
window.submitMedia = async () => {
    const title = $('mediaTitle').value.trim() || 'Nomsiz';
    const author = $('mediaAuthor').value.trim() || 'Anonim';
    const pwdEl = $('mediaPassword');
    const password = pwdEl ? pwdEl.value.trim() : '';

    $('submitBtn').disabled = true;
    $('progressWrap').classList.add('show');

    let url = '', thumbnail = '';

    // ─── RASM yuklash → ImgBB ─────────────────────────────
    if (selectedType === 'photo') {
        if (!selectedPhoto) {
            showToast('Rasm tanlanmagan!', 'error');
            resetProgress();
            return;
        }
        try {
            setProg(10, 'Rasm yuklanmoqda...');
            const fd = new FormData();
            fd.append('image', selectedPhoto);
            const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                method: 'POST',
                body: fd
            });
            if (!r.ok) throw new Error('Network: ' + r.status);
            const j = await r.json();
            if (!j.success) throw new Error('ImgBB: ' + JSON.stringify(j.error));
            url = j.data.url;
            thumbnail = (j.data.thumb && j.data.thumb.url) ? j.data.thumb.url : j.data.url;
            setProg(80, 'Saqlanmoqda...');
        } catch (e) {
            showToast('Rasm yuklanmadi: ' + e.message, 'error');
            resetProgress();
            return;
        }
    }

    // ─── VIDEO yuklash → Cloudinary ───────────────────────
    if (selectedType === 'video') {
        if (!selectedVideo) {
            showToast('Video tanlanmagan!', 'error');
            resetProgress();
            return;
        }
        try {
            setProg(5, 'Video tayyorlanmoqda...');
            const fd = new FormData();
            fd.append('file', selectedVideo);
            fd.append('upload_preset', CLD_PRESET);

            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLD_CLOUD}/video/upload`);
                xhr.upload.onprogress = ev => {
                    if (ev.lengthComputable) {
                        const p = Math.round((ev.loaded / ev.total) * 75) + 5;
                        setProg(p, `Yuklanmoqda... ${Math.round(ev.loaded / ev.total * 100)}%`);
                    }
                };
                xhr.onload = () => {
                    try { resolve(JSON.parse(xhr.responseText)); }
                    catch (e) { reject(new Error('JSON parse error')); }
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(fd);
            });

            if (result.error) {
                // Cloudinary preset xatoligi
                if (result.error.message && result.error.message.includes('preset')) {
                    showToast('Cloudinary preset topilmadi! Quyidagicha sozlang:', 'error');
                    setTimeout(() => {
                        alert(
                            'Cloudinary sozlash:\n\n' +
                            '1. cloudinary.com ga kiring\n' +
                            '2. Settings > Upload > Upload presets\n' +
                            '3. "Add upload preset" bosing\n' +
                            '4. Preset name: 8bhubb\n' +
                            '5. Signing mode: Unsigned\n' +
                            '6. Save'
                        );
                    }, 500);
                } else {
                    showToast('Cloudinary xatolik: ' + result.error.message, 'error');
                }
                resetProgress();
                return;
            }

            url = result.secure_url;
            // Video thumbnail — birinchi kadr
            thumbnail = result.secure_url
                .replace('/upload/', '/upload/so_0,w_640,h_400,c_fill,f_jpg/')
                .replace(/\.[^/.]+$/, '.jpg');
            setProg(88, 'Saqlanmoqda...');

        } catch (e) {
            showToast('Video yuklanmadi: ' + e.message, 'error');
            resetProgress();
            return;
        }
    }

    // ─── Firestore ga saqlash ─────────────────────────────
    try {
        const docData = {
            title,
            author,
            type: selectedType,
            url,
            thumbnail: thumbnail || '',
            likes: 0,
            date: Date.now()
        };
        if (password) docData.password = password;

        await addDoc(colRef, docData);
        setProg(100, 'Saqlandi!');
        setTimeout(() => {
            closeUploadModal();
            showToast(password ? 'Parolli media yuklandi!' : 'Muvaffaqiyatli yuklandi!', 'success');
        }, 400);
    } catch (e) {
        showToast('Saqlashda xatolik: ' + e.message, 'error');
        resetProgress();
    }
};

function setProg(pct, txt) {
    $('progressFill').style.width = pct + '%';
    $('progressTxt').textContent = txt;
}
function resetProgress() {
    $('progressWrap').classList.remove('show');
    $('progressFill').style.width = '0%';
    $('submitBtn').disabled = false;
}

// ── LIGHTBOX ──────────────────────────────────────────────
window.openLightbox = idx => {
    lbIndex = idx;
    renderLightbox();
    $('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
};
window.closeLightbox = () => {
    const el = $('lbMedia').querySelector('video, iframe');
    if (el) {
        if (el.tagName === 'VIDEO') el.pause();
        else el.src = '';
    }
    $('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    $('lbMedia').innerHTML = '';
};
window.lbNav = dir => {
    const el = $('lbMedia').querySelector('video, iframe');
    if (el) {
        if (el.tagName === 'VIDEO') el.pause();
        else el.src = '';
    }
    const newIdx = (lbIndex + dir + filteredItems.length) % filteredItems.length;
    const next = filteredItems[newIdx];
    if (next && next.password && !unlockedSet.has(next.id)) {
        lbIndex = newIdx;
        closeLightbox();
        openUnlockModal(newIdx);
        return;
    }
    lbIndex = newIdx;
    renderLightbox();
};

function renderLightbox() {
    const item = filteredItems[lbIndex];
    if (!item) return;
    const m = $('lbMedia');
    m.innerHTML = '';

    if (item.type === 'photo') {
        const img = document.createElement('img');
        img.src = item.url || '';
        img.alt = item.title || '';
        m.appendChild(img);
    } else {
        // YouTube tekshirish
        const ytMatch = (item.url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            const f = document.createElement('iframe');
            f.src = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
            f.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:16px;border:none;';
            f.allow = 'autoplay; encrypted-media';
            m.appendChild(f);
        } else {
            const v = document.createElement('video');
            v.src = item.url || '';
            v.controls = true;
            v.autoplay = true;
            v.style.cssText = 'border-radius:16px;background:#000;';
            // iOS uchun
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', '');
            m.appendChild(v);
        }
    }

    const liked = likedSet.has(item.id);
    const hasLock = !!item.password;

    $('lbInfo').innerHTML = `
        <div>
            <div class="lb-title">
                ${hasLock ? `<span class="lb-lock-icon">${IC.lockOpen}</span>` : ''}
                ${item.title || 'Nomsiz'}
            </div>
            <div class="lb-author">${IC.user}${item.author || 'Anonim'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
            ${hasLock ? `<button class="lb-relock-btn" id="lbRelockBtn" title="Qayta qulflash">${IC.lock}</button>` : ''}
            <button class="like-btn${liked ? ' liked' : ''}" id="lbLikeBtn">
                ${liked ? IC.hF : IC.hE}<span>${item.likes || 0}</span>
            </button>
        </div>`;

    $('lbLikeBtn').onclick = () => {
        const it = mediaItems.find(m => m.id === item.id);
        if (!it) return;
        toggleLike(it.id, it.likes || 0, likedSet.has(it.id));
    };

    const rlBtn = $('lbRelockBtn');
    if (rlBtn) {
        rlBtn.onclick = () => {
            unlockedSet.delete(item.id);
            saveUnlocked();
            closeLightbox();
            renderGrid();
            showToast('Qayta qulflandi 🔒', 'info');
        };
    }
}

// ── KEYBOARD ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ($('lockAuthModal').classList.contains('open')) {
        if (e.key === 'Escape') closeLockAuthModal();
        return;
    }
    if ($('unlockModal').classList.contains('open')) {
        if (e.key === 'Escape') closeUnlockModal();
        return;
    }
    if ($('lightbox').classList.contains('open')) {
        if (e.key === 'ArrowRight') lbNav(1);
        if (e.key === 'ArrowLeft') lbNav(-1);
        if (e.key === 'Escape') closeLightbox();
        return;
    }
    if ($('passModal').classList.contains('open') && e.key === 'Escape') closePassModal();
    if ($('uploadModal').classList.contains('open') && e.key === 'Escape') closeUploadModal();
});
