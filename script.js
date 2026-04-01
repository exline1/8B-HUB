import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, orderBy, query, getDocs, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBqIgNlvEt58sf-_b4vjFwRsV-NwH6ocKU",
    authDomain: "b-hub-37600.firebaseapp.com",
    projectId: "b-hub-37600",
    storageBucket: "b-hub-37600.firebasestorage.app",
    messagingSenderId: "198733477541",
    appId: "1:198733477541:web:878f5f21cccf28256abf4c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const colRef = collection(db, "media");

const IMGBB_KEY = "fd4821118d2741783bd5d8e826dcc3ce";
const CLD_CLOUD = "dz3gpts80";
const CLD_PRESET = "8bhubb";
const DELETE_PASS = "exline";
const ADMIN_EMAIL = "exlineexslize@gmail.com";
const CHAT_PASS_KEY = "8bhub_chat_pass";

// Default chat password — admin sozlamalardan o'zgartiriladi
let CHAT_PASS = localStorage.getItem(CHAT_PASS_KEY) || "sinf2024";

// ── STATE ──────────────────────────────────────────────────
let mediaItems = [], filteredItems = [];
let currentFilter = 'all', currentSort = 'date';
let selectedType = null, selectedPhoto = null, selectedVideo = null;
let lbIndex = 0, pendingDeleteId = null, pendingUnlockIdx = null;
let lockSectionOpen = false;
let currentUser = null;
let currentLbItemId = null;
let chatUnsubscribe = null;
let chatUnlocked = false;
let blockedUsers = [];

const unlockedSet = new Set();
const saveUnlocked = () => {};

const likedSet = new Set(JSON.parse(localStorage.getItem('8bhub_liked') || '[]'));
const saveLiked = () => localStorage.setItem('8bhub_liked', JSON.stringify([...likedSet]));

const $ = id => document.getElementById(id);

// ── ICONS ──────────────────────────────────────────────────
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

// ── TIME FORMAT ────────────────────────────────────────────
function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const mon = pad(d.getMonth() + 1);
    const yr = d.getFullYear();
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    return `${day}.${mon}.${yr} ${h}:${m}`;
}

function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'hozir';
    if (mins < 60) return `${mins} daqiqa oldin`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} soat oldin`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} kun oldin`;
    return formatDate(ts);
}

// ── TOAST ──────────────────────────────────────────────────
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

// ── GOOGLE AUTH ────────────────────────────────────────────
const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, async user => {
    currentUser = user;
    updateAuthUI();
    if (user) {
        // Check blocked
        const bDoc = await getDoc(doc(db, 'blocked', user.uid));
        if (bDoc.exists()) {
            showToast("Siz bloklangansiz!", 'error');
            await signOut(auth);
            return;
        }
        // Auto-fill author in upload modal
        const authorEl = $('mediaAuthor');
        if (authorEl && !authorEl.value) {
            authorEl.value = user.displayName || '';
        }
    }
});

function updateAuthUI() {
    const loginBtn = $('loginBtn');
    const mobileLoginBtn = $('mobileLoginBtn');
    const userPill = $('userPill');
    const adminMenuBtn = $('adminMenuBtn');
    const mobileUserInfo = $('mobileUserInfo');
    const mobileLogoutBtn = $('mobileLogoutBtn');

    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
        if (userPill) {
            userPill.style.display = 'flex';
            $('userAvatar').src = currentUser.photoURL || '';
            $('userDisplayName').textContent = currentUser.displayName || 'User';
        }
        if (adminMenuBtn) {
            adminMenuBtn.style.display = currentUser.email === ADMIN_EMAIL ? 'block' : 'none';
        }
        // Update menu
        const menuAvatar = $('userMenuAvatar');
        if (menuAvatar) menuAvatar.src = currentUser.photoURL || '';
        const menuName = $('userMenuName');
        if (menuName) menuName.textContent = currentUser.displayName || '';
        const menuEmail = $('userMenuEmail');
        if (menuEmail) menuEmail.textContent = currentUser.email || '';
        // Mobile user info
        if (mobileUserInfo) {
            mobileUserInfo.style.display = 'flex';
            $('mobileUserAvatar').src = currentUser.photoURL || '';
            $('mobileUserName').textContent = currentUser.displayName || 'User';
            $('mobileUserEmail').textContent = currentUser.email || '';
        }
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'flex';
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
        if (userPill) userPill.style.display = 'none';
        if ($('userMenu')) $('userMenu').style.display = 'none';
        if (mobileUserInfo) mobileUserInfo.style.display = 'none';
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none';
    }
}

window.doGoogleLogin = async () => {
    try {
        await signInWithPopup(auth, provider);
        closeLoginModal();
        showToast('Xush kelibsiz! 👋', 'success');
    } catch (e) {
        showToast('Login xatolik: ' + e.message, 'error');
    }
};

window.doLogout = async () => {
    await signOut(auth);
    chatUnlocked = false;
    if ($('userMenu')) $('userMenu').style.display = 'none';
    showToast("Chiqildi", 'info');
};

window.toggleUserMenu = () => {
    const menu = $('userMenu');
    if (!menu) return;
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

// Close menu on outside click
document.addEventListener('click', e => {
    const pill = $('userPill');
    const menu = $('userMenu');
    if (menu && pill && !pill.contains(e.target) && !menu.contains(e.target)) {
        menu.style.display = 'none';
    }
});

window.openLoginModal = () => {
    $('loginModal').classList.add('open');
    document.body.style.overflow = 'hidden';
};
window.closeLoginModal = () => {
    $('loginModal').classList.remove('open');
    document.body.style.overflow = '';
};

// ── FIREBASE REALTIME ──────────────────────────────────────
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

// ── FILTER / SORT ──────────────────────────────────────────
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
    ['ft-new', 'ft-top'].forEach(id => $(id) && $(id).classList.remove('active'));
    $(by === 'date' ? 'ft-new' : 'ft-top').classList.add('active');
    renderGrid();
};

// ── RENDER GRID ────────────────────────────────────────────
function renderGrid() {
    let items = currentFilter === 'all'
        ? mediaItems.slice()
        : mediaItems.filter(m => m.type === currentFilter);
    if (currentSort === 'likes') items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    // Pinned items always on top
    items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
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
        const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

        const card = document.createElement('div');
        card.className = 'media-card';
        card.setAttribute('data-type', item.type);

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

        const lockBadge = hasLock
            ? `<button class="lock-badge${unlocked ? ' unlocked' : ''}">${unlocked ? IC.lockOpen : IC.lock}</button>`
            : '';

        const playOverlay = (isVid && unlocked)
            ? `<div class="play-overlay"><div class="play-circle">${IC.play}</div></div>`
            : '';

        // Admin: delete without password
        const deleteBtn = isAdmin
            ? `<button class="delete-btn admin-delete" aria-label="O'chirish (admin)">${IC.trash}</button>`
            : `<button class="delete-btn" aria-label="O'chirish">${IC.trash}</button>`;

        // Comment button on card
        const commentBtn = `<button class="card-comment-btn" aria-label="Kommentariyalar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>`;

        // Pin badge (admin only)
        const pinBadge = item.pinned ? `<div class="pin-badge" title="Pin qilingan">📌</div>` : '';

        // Date/time badge
        const dateBadge = item.date ? `<div class="card-date">${formatDate(item.date)}</div>` : '';

        card.innerHTML = `
            <div class="thumb-wrap">
                ${thumbHtml}
                <div class="type-badge ${isVid ? 'badge-video' : 'badge-photo'}">${isVid ? IC.vid : IC.pho} ${isVid ? 'Video' : 'Rasm'}</div>
                ${lockBadge}
                ${lockOverlay}
                ${playOverlay}
                ${deleteBtn}
                ${commentBtn}
                ${pinBadge}
            </div>
            <div class="card-body">
                <div class="card-title">${item.title || 'Nomsiz'}</div>
                ${dateBadge}
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

        // Comment button — opens lightbox at comments
        card.querySelector('.card-comment-btn').addEventListener('click', e => {
            e.stopPropagation();
            if (hasLock && !unlocked) { openUnlockModal(i); return; }
            openLightbox(i);
            setTimeout(() => {
                const cl = $('lbComments');
                if (cl) cl.scrollIntoView({ behavior: 'smooth' });
            }, 400);
        });

        const delBtn = card.querySelector('.delete-btn');
        delBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (isAdmin) {
                adminDeleteMedia(item.id);
            } else {
                openPassModal(item.id);
            }
        });

        const lb = card.querySelector('.lock-badge');
        if (lb) {
            lb.addEventListener('click', e => {
                e.stopPropagation();
                if (unlocked) {
                    unlockedSet.delete(item.id);
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

// ── LIKE ───────────────────────────────────────────────────
async function toggleLike(id, cur, wasLiked) {
    if (wasLiked) likedSet.delete(id); else likedSet.add(id);
    saveLiked();
    try { await updateDoc(doc(db, "media", id), { likes: wasLiked ? cur - 1 : cur + 1 }); } catch (e) {}
}

// ── DELETE MODAL ───────────────────────────────────────────
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

// Admin: delete without password
async function adminDeleteMedia(id) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    try {
        await deleteDoc(doc(db, "media", id));
        showToast("Admin: O'chirildi ✓", 'success');
    } catch (e) {
        showToast("Xatolik: " + e.message, 'error');
    }
}

// ── UNLOCK MODAL ───────────────────────────────────────────
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

// ── UPLOAD MODAL ───────────────────────────────────────────
window.openUploadModal = () => {
    resetModal();
    $('uploadModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    // Auto-fill author if logged in
    if (currentUser) {
        setTimeout(() => {
            const authorEl = $('mediaAuthor');
            if (authorEl) authorEl.value = currentUser.displayName || '';
        }, 50);
    }
};
window.closeUploadModal = () => {
    $('uploadModal').classList.remove('open');
    document.body.style.overflow = '';
    resetModal();
};

function resetModal() {
    selectedType = null; selectedPhoto = null; selectedVideo = null;
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
    selectedPhoto = null; selectedVideo = null;
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

window.toggleLockSection = () => {
    if (lockSectionOpen) { _closeLockSection(); return; }
    $('lockAuthInput').value = '';
    $('lockAuthError').classList.remove('show');
    $('lockAuthModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('lockAuthInput').focus(), 300);
};
window.closeLockAuthModal = () => {
    $('lockAuthModal').classList.remove('open');
    document.body.style.overflow = 'hidden';
    $('lockAuthInput').value = '';
    $('lockAuthError').classList.remove('show');
};
window.confirmLockAuth = () => {
    if ($('lockAuthInput').value !== DELETE_PASS) {
        $('lockAuthError').classList.add('show');
        $('lockAuthInput').value = '';
        $('lockAuthInput').focus();
        return;
    }
    closeLockAuthModal();
    _openLockSection();
};
function _openLockSection() {
    lockSectionOpen = true;
    const ls = $('lockSection');
    if (ls) { ls.style.maxHeight = '300px'; ls.style.overflow = 'visible'; }
    const ch = $('lockChevron');
    if (ch) ch.style.transform = 'rotate(180deg)';
    const lb = $('lockToggleBtn');
    if (lb) lb.classList.add('active');
}
function _closeLockSection() {
    lockSectionOpen = false;
    const ls = $('lockSection');
    if (ls) { ls.style.maxHeight = '0'; ls.style.overflow = 'hidden'; }
    const ch = $('lockChevron');
    if (ch) ch.style.transform = 'rotate(0deg)';
    const lb = $('lockToggleBtn');
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

// ── PHOTO drag & drop ──────────────────────────────────────
const dz = $('dropZone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) processPhoto(f); });
window.handleFileSelect = e => { const f = e.target.files[0]; if (f) processPhoto(f); };

function processPhoto(f) {
    if (!f || !f.type.startsWith('image/')) { showToast('Faqat rasm fayl!', 'error'); return; }
    if (f.size > 32 * 1024 * 1024) { showToast('Rasm 32MB dan katta!', 'error'); return; }
    selectedPhoto = f;
    showPreview('filePreview', 'fileInput', 'dropZone', URL.createObjectURL(f), 'image');
    showSizeBar('photoSizeBar', 'photoSizeName', 'photoSizeVal', 'photoSizeFill', f, 32);
    $('submitBtn').disabled = false;
}
window.removePhotoFile = () => { selectedPhoto = null; clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar'); $('submitBtn').disabled = true; };

// ── VIDEO drag & drop ──────────────────────────────────────
const vdz = $('videoDzZone');
vdz.addEventListener('dragover', e => { e.preventDefault(); vdz.classList.add('drag-over'); });
vdz.addEventListener('dragleave', () => vdz.classList.remove('drag-over'));
vdz.addEventListener('drop', e => { e.preventDefault(); vdz.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) processVideo(f); });
window.handleVideoSelect = e => { const f = e.target.files[0]; if (f) processVideo(f); };

function processVideo(f) {
    if (!f || !f.type.startsWith('video/')) { showToast('Faqat video fayl!', 'error'); return; }
    if (f.size > 100 * 1024 * 1024) { showToast('Video 100MB dan katta!', 'error'); return; }
    selectedVideo = f;
    showPreview('videoPreview', 'videoInput', 'videoDzZone', URL.createObjectURL(f), 'video');
    showSizeBar('videoSizeBar', 'videoSizeName', 'videoSizeVal', 'videoSizeFill', f, 100);
    $('submitBtn').disabled = false;
}
window.removeVideoFile = () => { selectedVideo = null; clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar'); $('submitBtn').disabled = true; };

// ── HELPERS ────────────────────────────────────────────────
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

// ── SUBMIT ─────────────────────────────────────────────────
window.submitMedia = async () => {
    const title = $('mediaTitle').value.trim() || 'Nomsiz';
    let author = $('mediaAuthor').value.trim() || 'Anonim';
    // If logged in, use display name
    if (currentUser && currentUser.displayName) {
        author = currentUser.displayName;
        $('mediaAuthor').value = author;
    }
    const pwdEl = $('mediaPassword');
    const password = pwdEl ? pwdEl.value.trim() : '';

    $('submitBtn').disabled = true;
    $('progressWrap').classList.add('show');

    let url = '', thumbnail = '';

    if (selectedType === 'photo') {
        if (!selectedPhoto) { showToast('Rasm tanlanmagan!', 'error'); resetProgress(); return; }
        try {
            setProg(10, 'Rasm yuklanmoqda...');
            const fd = new FormData();
            fd.append('image', selectedPhoto);
            const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
            if (!r.ok) throw new Error('Network: ' + r.status);
            const j = await r.json();
            if (!j.success) throw new Error('ImgBB: ' + JSON.stringify(j.error));
            url = j.data.url;
            thumbnail = (j.data.thumb && j.data.thumb.url) ? j.data.thumb.url : j.data.url;
            setProg(80, 'Saqlanmoqda...');
        } catch (e) { showToast('Rasm yuklanmadi: ' + e.message, 'error'); resetProgress(); return; }
    }

    if (selectedType === 'video') {
        if (!selectedVideo) { showToast('Video tanlanmagan!', 'error'); resetProgress(); return; }
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
                xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(new Error('JSON parse error')); } };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(fd);
            });

            if (result.error) { showToast('Cloudinary xatolik: ' + result.error.message, 'error'); resetProgress(); return; }

            url = result.secure_url;
            thumbnail = result.secure_url.replace('/upload/', '/upload/so_0,w_640,h_400,c_fill,f_jpg/').replace(/\.[^/.]+$/, '.jpg');
            setProg(88, 'Saqlanmoqda...');
        } catch (e) { showToast('Video yuklanmadi: ' + e.message, 'error'); resetProgress(); return; }
    }

    try {
        const docData = {
            title, author, type: selectedType, url, thumbnail: thumbnail || '',
            likes: 0, date: Date.now(),
            uploaderUid: currentUser ? currentUser.uid : null,
            uploaderEmail: currentUser ? currentUser.email : null,
        };
        if (password) docData.password = password;
        await addDoc(colRef, docData);
        setProg(100, 'Saqlandi!');
        setTimeout(() => {
            closeUploadModal();
            showToast(password ? 'Parolli media yuklandi!' : 'Muvaffaqiyatli yuklandi!', 'success');
        }, 400);
    } catch (e) { showToast('Saqlashda xatolik: ' + e.message, 'error'); resetProgress(); }
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

// ── LIGHTBOX ───────────────────────────────────────────────
window.openLightbox = idx => {
    lbIndex = idx;
    renderLightbox();
    $('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
};
window.closeLightbox = () => {
    const el = $('lbMedia').querySelector('video, iframe');
    if (el) { if (el.tagName === 'VIDEO') el.pause(); else el.src = ''; }
    $('lightbox').classList.remove('open');
    document.body.style.overflow = '';
    $('lbMedia').innerHTML = '';
    currentLbItemId = null;
};
window.lbNav = dir => {
    const el = $('lbMedia').querySelector('video, iframe');
    if (el) { if (el.tagName === 'VIDEO') el.pause(); else el.src = ''; }
    const newIdx = (lbIndex + dir + filteredItems.length) % filteredItems.length;
    const next = filteredItems[newIdx];
    if (next && next.password && !unlockedSet.has(next.id)) {
        lbIndex = newIdx; closeLightbox(); openUnlockModal(newIdx); return;
    }
    lbIndex = newIdx;
    renderLightbox();
};

function renderLightbox() {
    const item = filteredItems[lbIndex];
    if (!item) return;
    currentLbItemId = item.id;

    const m = $('lbMedia');
    m.innerHTML = '';

    if (item.type === 'photo') {
        const img = document.createElement('img');
        img.src = item.url || ''; img.alt = item.title || '';
        m.appendChild(img);
    } else {
        const ytMatch = (item.url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
            const f = document.createElement('iframe');
            f.src = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
            f.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:16px;border:none;';
            f.allow = 'autoplay; encrypted-media';
            m.appendChild(f);
        } else {
            const v = document.createElement('video');
            v.src = item.url || ''; v.controls = true; v.autoplay = true;
            v.style.cssText = 'border-radius:16px;background:#000;';
            v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
            m.appendChild(v);
        }
    }

    const liked = likedSet.has(item.id);
    const hasLock = !!item.password;
    const isAdmin = currentUser && currentUser.email === ADMIN_EMAIL;

    const adminDeleteHtml = isAdmin ? `<button class="lb-admin-delete-btn" title="Admin: O'chirish" onclick="adminDeleteMedia('${item.id}');closeLightbox()">${IC.trash}</button>` : '';

    $('lbInfo').innerHTML = `
        <div>
            <div class="lb-title">${hasLock ? `<span class="lb-lock-icon">${IC.lockOpen}</span>` : ''}${item.title || 'Nomsiz'}</div>
            <div class="lb-author">${IC.user}${item.author || 'Anonim'}</div>
            <div class="lb-date-info">${item.date ? formatDate(item.date) : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
            ${hasLock ? `<button class="lb-relock-btn" id="lbRelockBtn" title="Qayta qulflash">${IC.lock}</button>` : ''}
            ${adminDeleteHtml}
            <button class="like-btn${liked ? ' liked' : ''}" id="lbLikeBtn">${liked ? IC.hF : IC.hE}<span>${item.likes || 0}</span></button>
        </div>`;

    $('lbLikeBtn').onclick = () => {
        const it = mediaItems.find(x => x.id === item.id);
        if (!it) return;
        toggleLike(it.id, it.likes || 0, likedSet.has(it.id));
    };

    const rlBtn = $('lbRelockBtn');
    if (rlBtn) {
        rlBtn.onclick = () => {
            unlockedSet.delete(item.id);
            closeLightbox(); renderGrid();
            showToast('Qayta qulflandi 🔒', 'info');
        };
    }

    // Load comments
    loadComments(item.id);

    // Show/hide comment form
    const form = $('lbCommentForm');
    const hint = $('lbCommentLoginHint');
    if (currentUser) {
        if (form) form.style.display = 'flex';
        if (hint) hint.style.display = 'none';
    } else {
        if (form) form.style.display = 'none';
        if (hint) hint.style.display = 'flex';
    }
}

// ── COMMENTS ───────────────────────────────────────────────
let commentsUnsub = null;

function loadComments(mediaId) {
    if (commentsUnsub) commentsUnsub();
    const list = $('lbCommentsList');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:8px 0">Yuklanmoqda...</div>';

    const commRef = collection(db, 'media', mediaId, 'comments');
    commentsUnsub = onSnapshot(query(commRef, orderBy('date', 'asc')), snap => {
        list.innerHTML = '';
        if (snap.empty) {
            list.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:8px 0">Hali kommentariya yo\'q. Birinchi bo\'ling!</div>';
            return;
        }
        snap.docs.forEach(d => {
            const c = d.data();
            const isAdmin = c.email === ADMIN_EMAIL;
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-avatar">${(c.author || 'A')[0].toUpperCase()}</div>
                <div class="comment-body">
                    <div class="comment-author">${isAdmin ? '👑 ' : ''}${c.author || 'Anonim'}<span class="comment-time">${timeAgo(c.date)}</span></div>
                    <div class="comment-text">${escHtml(c.text)}</div>
                </div>
                ${(currentUser && currentUser.email === ADMIN_EMAIL) ? `<button class="comment-delete-btn" onclick="deleteComment('${mediaId}','${d.id}')">✕</button>` : ''}
            `;
            list.appendChild(div);
        });
        list.scrollTop = list.scrollHeight;
    });
}

window.submitComment = async () => {
    if (!currentUser) { openLoginModal(); return; }
    const inp = $('lbCommentInput');
    const text = inp.value.trim();
    if (!text || !currentLbItemId) return;
    inp.value = '';
    try {
        await addDoc(collection(db, 'media', currentLbItemId, 'comments'), {
            text,
            author: currentUser.displayName || 'Anonim',
            email: currentUser.email,
            uid: currentUser.uid,
            avatar: currentUser.photoURL || '',
            date: Date.now()
        });
    } catch (e) {
        showToast('Kommentariya yuborilmadi: ' + e.message, 'error');
        inp.value = text;
    }
};

window.deleteComment = async (mediaId, commentId) => {
    try {
        await deleteDoc(doc(db, 'media', mediaId, 'comments', commentId));
        showToast("Kommentariya o'chirildi", 'success');
    } catch (e) {
        showToast("Xatolik: " + e.message, 'error');
    }
};

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── CHAT ───────────────────────────────────────────────────
window.openChatModal = () => {
    $('chatModal').classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!currentUser) {
        showChatLock();
        showToast("Chat uchun avval login qiling", 'info');
        return;
    }

    if (chatUnlocked) {
        showChatContent();
    } else {
        showChatLock();
    }
};

window.closeChatModal = () => {
    $('chatModal').classList.remove('open');
    document.body.style.overflow = '';
    if (chatUnsubscribe) { chatUnsubscribe(); chatUnsubscribe = null; }
};

function showChatLock() {
    $('chatLockScreen').style.display = 'block';
    $('chatContent').style.display = 'none';
    $('chatPassInput').value = '';
    $('chatPassError').classList.remove('show');
    setTimeout(() => $('chatPassInput').focus(), 300);
}

function showChatContent() {
    $('chatLockScreen').style.display = 'none';
    $('chatContent').style.display = 'flex';
    startChatListener();
    setTimeout(() => $('chatInput').focus(), 300);
}

window.submitChatPass = () => {
    if (!currentUser) {
        closeChatModal();
        openLoginModal();
        return;
    }
    const entered = $('chatPassInput').value;
    if (entered === CHAT_PASS) {
        chatUnlocked = true;
        showChatContent();
    } else {
        $('chatPassError').classList.add('show');
        $('chatPassInput').value = '';
        $('chatPassInput').classList.add('shake');
        setTimeout(() => $('chatPassInput').classList.remove('shake'), 400);
    }
};

function startChatListener() {
    if (chatUnsubscribe) return;
    const chatRef = collection(db, 'chat');
    chatUnsubscribe = onSnapshot(query(chatRef, orderBy('date', 'asc')), snap => {
        const msgs = $('chatMessages');
        if (!msgs) return;
        msgs.innerHTML = '';
        snap.docs.forEach(d => {
            const msg = d.data();
            const isMe = currentUser && msg.uid === currentUser.uid;
            const isAdminMsg = msg.email === ADMIN_EMAIL;
            const div = document.createElement('div');
            div.className = 'chat-msg' + (isMe ? ' chat-msg-me' : '');
            div.innerHTML = `
                <div class="chat-msg-author">${isAdminMsg ? '👑 ' : ''}${msg.author || 'Anonim'}</div>
                <div class="chat-msg-bubble">${escHtml(msg.text)}</div>
                <div class="chat-msg-time">${timeAgo(msg.date)}</div>
                ${currentUser && currentUser.email === ADMIN_EMAIL ? `<button class="chat-delete-btn" onclick="adminDeleteChatMsg('${d.id}')">✕</button>` : ''}
            `;
            msgs.appendChild(div);
        });
        msgs.scrollTop = msgs.scrollHeight;
    });
}

window.sendChatMessage = async () => {
    if (!currentUser || !chatUnlocked) return;
    const inp = $('chatInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    try {
        await addDoc(collection(db, 'chat'), {
            text,
            author: currentUser.displayName || 'Anonim',
            email: currentUser.email,
            uid: currentUser.uid,
            date: Date.now()
        });
    } catch (e) {
        showToast('Yuborilmadi: ' + e.message, 'error');
        inp.value = text;
    }
};

window.adminDeleteChatMsg = async (msgId) => {
    try {
        await deleteDoc(doc(db, 'chat', msgId));
    } catch (e) {
        showToast('Xatolik: ' + e.message, 'error');
    }
};

// ── ADMIN PANEL ────────────────────────────────────────────
window.openAdminPanel = () => {
    if (!currentUser || currentUser.email !== ADMIN_EMAIL) {
        showToast("Ruxsat yo'q!", 'error');
        return;
    }
    $('adminModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    loadAdminMedia();
    loadBlockedUsers();
};
window.closeAdminPanel = () => {
    $('adminModal').classList.remove('open');
    document.body.style.overflow = '';
};

window.adminTab = (tab) => {
    ['media','chat','settings'].forEach(t => {
        const tabEl = $('admin' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab');
        if (tabEl) tabEl.style.display = t === tab ? 'block' : 'none';
    });
    ['aTab1','aTab2','aTab3'].forEach(id => $(id) && $(id).classList.remove('active'));
    const tabMap = { media: 'aTab1', chat: 'aTab2', settings: 'aTab3' };
    if ($(tabMap[tab])) $(tabMap[tab]).classList.add('active');

    if (tab === 'chat') loadAdminChatLog();
    if (tab === 'settings') loadBlockedUsers();
};

function loadAdminMedia() {
    const list = $('adminMediaList');
    if (!list) return;
    list.innerHTML = '';
    mediaItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'admin-media-item';
        div.innerHTML = `
            <div class="admin-media-thumb">
                ${item.thumbnail || item.url ? `<img src="${item.thumbnail || item.url}" alt="">` : '<div class="admin-no-thumb">🎬</div>'}
            </div>
            <div class="admin-media-info">
                <div class="admin-media-title">${item.title || 'Nomsiz'}</div>
                <div class="admin-media-meta">${item.author || 'Anonim'} • ${formatDate(item.date)}</div>
            </div>
            <div class="admin-media-actions">
                <button class="admin-action-btn delete" onclick="adminDeleteMedia('${item.id}')">🗑 O'chirish</button>
                <button class="admin-action-btn" onclick="adminTogglePin('${item.id}',${!!item.pinned})">${item.pinned ? '📌 Pindan chiqar' : '📌 Pin qil'}</button>
                ${item.uploaderUid ? `<button class="admin-action-btn block" onclick="blockUser('${item.uploaderUid}','${item.author || ''}')">🚫 Bloklash</button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}

async function loadAdminChatLog() {
    const list = $('adminChatList');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-dim);font-size:12px">Yuklanmoqda...</div>';
    const snap = await getDocs(query(collection(db, 'chat'), orderBy('date', 'desc')));
    list.innerHTML = '';
    snap.docs.forEach(d => {
        const msg = d.data();
        const div = document.createElement('div');
        div.className = 'admin-chat-item';
        div.innerHTML = `
            <div class="admin-chat-author">${msg.author} <span style="color:var(--text-dim);font-size:11px">${formatDate(msg.date)}</span></div>
            <div class="admin-chat-text">${escHtml(msg.text)}</div>
            <button class="admin-action-btn delete" style="margin-top:6px" onclick="adminDeleteChatMsg('${d.id}')">🗑 O'chirish</button>
        `;
        list.appendChild(div);
    });
}

async function loadBlockedUsers() {
    const list = $('blockedUsersList');
    if (!list) return;
    const snap = await getDocs(collection(db, 'blocked'));
    list.innerHTML = '';
    if (snap.empty) { list.innerHTML = '<div style="color:var(--text-dim);font-size:12px">Bloklangan foydalanuvchilar yo\'q</div>'; return; }
    snap.docs.forEach(d => {
        const data = d.data();
        const div = document.createElement('div');
        div.className = 'blocked-user-item';
        div.innerHTML = `
            <span>${data.name || d.id}</span>
            <button class="admin-action-btn" onclick="unblockUser('${d.id}')">♻ Qayta berish</button>
        `;
        list.appendChild(div);
    });
}

window.blockUser = async (uid, name) => {
    if (!confirm(`"${name}" foydalanuvchini bloklashni tasdiqlaysizmi?`)) return;
    try {
        await setDoc(doc(db, 'blocked', uid), { name, blockedAt: Date.now() });
        showToast(`${name} bloklandi`, 'info');
        loadBlockedUsers();
    } catch (e) {
        showToast('Xatolik: ' + e.message, 'error');
    }
};

window.unblockUser = async (uid) => {
    try {
        await deleteDoc(doc(db, 'blocked', uid));
        showToast('Blok olib tashlandi', 'success');
        loadBlockedUsers();
    } catch (e) {
        showToast('Xatolik: ' + e.message, 'error');
    }
};

window.changeChatPass = () => {
    const newPass = $('newChatPass').value.trim();
    if (!newPass) { showToast('Yangi parolni kiriting!', 'error'); return; }
    CHAT_PASS = newPass;
    localStorage.setItem(CHAT_PASS_KEY, newPass);
    $('newChatPass').value = '';
    showToast('Chat paroli o\'zgartirildi ✓', 'success');
};

// ── KEYBOARD ───────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ($('lockAuthModal').classList.contains('open')) { if (e.key === 'Escape') closeLockAuthModal(); return; }
    if ($('unlockModal').classList.contains('open')) { if (e.key === 'Escape') closeUnlockModal(); return; }
    if ($('lightbox').classList.contains('open')) {
        if (e.key === 'ArrowRight') lbNav(1);
        if (e.key === 'ArrowLeft') lbNav(-1);
        if (e.key === 'Escape') closeLightbox();
        return;
    }
    if ($('passModal').classList.contains('open') && e.key === 'Escape') closePassModal();
    if ($('uploadModal').classList.contains('open') && e.key === 'Escape') closeUploadModal();
    if ($('loginModal').classList.contains('open') && e.key === 'Escape') closeLoginModal();
    if ($('chatModal').classList.contains('open') && e.key === 'Escape') closeChatModal();
    if ($('adminModal').classList.contains('open') && e.key === 'Escape') closeAdminPanel();
});

// ── PIN ────────────────────────────────────────────────────
window.adminTogglePin = async (id, isPinned) => {
    try {
        await updateDoc(doc(db, 'media', id), { pinned: !isPinned });
        showToast(isPinned ? 'Pin olib tashlandi' : 'Pin qilindi 📌', 'success');
        loadAdminMedia();
    } catch (e) {
        showToast('Xatolik: ' + e.message, 'error');
    }
};

// ── LEADERBOARD ────────────────────────────────────────────
let lbCurrentTab = 'uploads';

window.openLeaderboard = () => {
    $('leaderboardModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    renderLeaderboard('uploads');
};
window.closeLeaderboard = () => {
    $('leaderboardModal').classList.remove('open');
    document.body.style.overflow = '';
};
window.lbSwitchTab = (tab) => {
    lbCurrentTab = tab;
    ['lbTab1','lbTab2'].forEach(id => $(id) && $(id).classList.remove('active'));
    $(tab === 'uploads' ? 'lbTab1' : 'lbTab2').classList.add('active');
    renderLeaderboard(tab);
};

function renderLeaderboard(tab) {
    const list = $('leaderboardList');
    if (!list) return;
    const counts = {};
    mediaItems.forEach(item => {
        const key = item.author || 'Anonim';
        if (tab === 'uploads') {
            counts[key] = (counts[key] || 0) + 1;
        } else {
            counts[key] = (counts[key] || 0) + (item.likes || 0);
        }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = sorted.length ? sorted.map(([name, val], i) => `
        <div class="lb-row">
            <span class="lb-rank">${medals[i] || (i + 1)}</span>
            <div class="lb-ava">${name[0].toUpperCase()}</div>
            <span class="lb-name">${name}</span>
            <span class="lb-val">${val} ${tab === 'uploads' ? 'ta' : '❤️'}</span>
        </div>
    `).join('') : '<div style="color:var(--text-dim);font-size:13px;padding:12px 0">Hali ma\'lumot yo\'q</div>';
}

// ── BIRTHDAY ───────────────────────────────────────────────
window.openBirthdayModal = async () => {
    $('birthdayModal').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (currentUser) {
        $('myBirthdaySection').style.display = 'block';
        // Load own birthday
        try {
            const bdDoc = await getDoc(doc(db, 'birthdays', currentUser.uid));
            if (bdDoc.exists()) $('myBdayInput').value = bdDoc.data().date || '';
        } catch(e) {}
    }
    loadBirthdays();
};
window.closeBirthdayModal = () => {
    $('birthdayModal').classList.remove('open');
    document.body.style.overflow = '';
};
window.saveBirthday = async () => {
    if (!currentUser) return;
    const date = $('myBdayInput').value;
    if (!date) { showToast("Sanani tanlang!", 'error'); return; }
    try {
        await setDoc(doc(db, 'birthdays', currentUser.uid), {
            date, name: currentUser.displayName || 'Anonim', uid: currentUser.uid
        });
        showToast("Saqlandi! 🎂", 'success');
        loadBirthdays();
    } catch(e) { showToast("Xatolik: " + e.message, 'error'); }
};

async function loadBirthdays() {
    const list = $('birthdayList');
    if (!list) return;
    list.innerHTML = '<div style="color:var(--text-dim);font-size:12px">Yuklanmoqda...</div>';
    try {
        const snap = await getDocs(collection(db, 'birthdays'));
        const today = new Date();
        const toMD = d => { const dt = new Date(d); return (dt.getMonth() + 1) * 100 + dt.getDate(); };
        const todayMD = (today.getMonth() + 1) * 100 + today.getDate();
        const items = snap.docs.map(d => d.data()).filter(b => b.date);
        items.sort((a, b) => {
            const aMD = toMD(a.date), bMD = toMD(b.date);
            const aDiff = (aMD - todayMD + 1231) % 1231;
            const bDiff = (bMD - todayMD + 1231) % 1231;
            return aDiff - bDiff;
        });
        list.innerHTML = items.length ? items.slice(0, 15).map(b => {
            const dt = new Date(b.date);
            const isToday = dt.getDate() === today.getDate() && dt.getMonth() === today.getMonth();
            const months = ['Yan','Feb','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
            return `<div class="birthday-row${isToday ? ' birthday-today' : ''}">
                <span class="bday-icon">${isToday ? '🎉' : '🎂'}</span>
                <span class="bday-name">${b.name}</span>
                <span class="bday-date">${dt.getDate()} ${months[dt.getMonth()]}</span>
                ${isToday ? '<span class="bday-today-badge">Bugun!</span>' : ''}
            </div>`;
        }).join('') : '<div style="color:var(--text-dim);font-size:13px">Hali hech kim qo\'shmagan</div>';
    } catch(e) { list.innerHTML = '<div style="color:#ff6b6b;font-size:12px">Xatolik</div>'; }
}

// ── WAKE LOCK (ekran qotmaslik) ────────────────────────────
let wakeLock = null;

async function requestWakeLock() {
    // Screen Wake Lock API - zamonaviy qurilmalar uchun
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { wakeLock = null; });
            return;
        } catch(e) {}
    }
    // Fallback: video trick - eski qurilmalar uchun (J seriya va h.k.)
    startVideoWakeLock();
}

function startVideoWakeLock() {
    try {
        const v = document.createElement('video');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.muted = true;
        v.loop = true;
        // 1x1 transparent mp4 — minimal resurs
        v.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjM4OSA5NTZjOGQ4IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTYgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAPZWxpYnJhcnkAAAAMbGlicmFyeSBmb3IgdmlkZW8AAA==';
        v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0.01;top:-2px;left:-2px;pointer-events:none;z-index:-1';
        document.body.appendChild(v);
        v.play().catch(() => {});
    } catch(e) {}
}

// Visibility change da wake lock ni qaytarish
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && 'wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
    }
});

// Sahifa yuklanganda wake lock boshlash
requestWakeLock();

// No-sleep: har 30 soniyada touch event simulatsiyasi (eng kuchli fallback)
setInterval(() => {
    if (document.visibilityState === 'visible') {
        try {
            const e = new Event('touchstart', { bubbles: true, cancelable: true });
            document.dispatchEvent(e);
        } catch(x) {}
    }
}, 30000);

// ── MUSIC PLAYER (SoundCloud) ──────────────────────────────
let musicExpanded = false;
let musicIframeAdded = false;

window.toggleMusic = () => {
    musicExpanded = !musicExpanded;
    const info = $('musicInfo');
    if (info) info.style.display = musicExpanded ? 'flex' : 'none';
    if (musicExpanded && !musicIframeAdded) {
        musicIframeAdded = true;
        const container = document.createElement('div');
        container.id = 'scPlayerWrap';
        container.style.cssText = 'position:fixed;bottom:140px;right:20px;z-index:899;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);width:300px';
        container.innerHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/nocopyrightsounds&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&buying=false&sharing=false&download=false&color=%23ff6b00">
        </iframe>`;
        document.body.appendChild(container);
        if ($('musicTitle')) $('musicTitle').textContent = '♪ NCS Music';
    }
    const wrap = $('scPlayerWrap');
    if (wrap) wrap.style.display = musicExpanded ? 'block' : 'none';
};

window.togglePlayPause = () => {};
window.nextTrack = () => {};
window.prevTrack = () => {};

// ── PWA ────────────────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = $('pwaBanner');
    if (banner && !localStorage.getItem('8bhub_pwa_dismissed')) {
        setTimeout(() => { banner.style.display = 'flex'; }, 3000);
    }
});

window.installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('pwaBanner').style.display = 'none';
    if (outcome === 'accepted') showToast('Ilova o\'rnatildi! 📱', 'success');
};

document.getElementById('pwaBanner')?.querySelector('.pwa-close-btn')?.addEventListener('click', () => {
    localStorage.setItem('8bhub_pwa_dismissed', '1');
});

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}
