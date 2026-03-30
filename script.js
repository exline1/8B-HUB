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

// ─── SOZLAMALAR (siz o'zgartirmasangiz ham ishlaydi) ─────
const IMGBB_KEY = "fd4821118d2741783bd5d8e826dcc3ce";
// Cloudinary: cloudinary.com/console dan oling (FREE)
// Cloud name va unsigned upload preset kerak
const CLD_CLOUD = "dz3gpts80";   // <-- cloudinary.com console'dan
const CLD_PRESET = "8bhubb";       // <-- Settings > Upload > Unsigned preset nomi
const DELETE_PASS = "exline";
// ─────────────────────────────────────────────────────────

let mediaItems = [], filteredItems = [];
let currentFilter = 'all', currentSort = 'date';
let selectedType = null, selectedPhoto = null, selectedVideo = null;
let lbIndex = 0, pendingDeleteId = null;

const $ = id => document.getElementById(id);

// ── TOAST ─────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const t = document.createElement('div'); t.className = 'toast ' + type;
    const IC = { success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>', info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
    t.innerHTML = (IC[type] || IC.info) + `<span>${msg}</span>`;
    $('toasts').appendChild(t); setTimeout(() => t.remove(), 3500);
}

// ── FIREBASE REALTIME ─────────────────────────────────────
onSnapshot(query(colRef, orderBy("date", "desc")), snap => {
    mediaItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    $('loadingWrap').style.display = 'none';
    updateStats(); renderGrid();
}, () => { $('loadingWrap').innerHTML = '<p style="color:#ff6b6b">Ulanishda xatolik. Sahifani yangilang.</p>'; });

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
    ({ all: 'nb-all', photo: 'nb-photo', video: 'nb-video' }[type]) && $({ all: 'nb-all', photo: 'nb-photo', video: 'nb-video' }[type]).classList.add('active');
    ['ft-all', 'ft-photo', 'ft-video'].forEach(id => $(id) && $(id).classList.remove('active'));
    ({ all: 'ft-all', photo: 'ft-photo', video: 'ft-video' }[type]) && $({ all: 'ft-all', photo: 'ft-photo', video: 'ft-video' }[type]).classList.add('active');
    $('secTitle').textContent = { all: 'Barcha fayllar', photo: 'Rasmlar', video: 'Videolar' }[type];
    renderGrid();
};
window.sortMedia = by => {
    currentSort = by;
    ['ft-new', 'ft-top'].forEach(id => $(id).classList.remove('active'));
    $(by === 'date' ? 'ft-new' : 'ft-top').classList.add('active');
    renderGrid();
};

// ── IKONKALAR ─────────────────────────────────────────────
const IC = {
    img: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    vid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    pho: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    hE: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    hF: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>`
};

// ── LIKED (localStorage) ──────────────────────────────────
const likedSet = new Set(JSON.parse(localStorage.getItem('8bhub_liked') || '[]'));
const saveLiked = () => localStorage.setItem('8bhub_liked', JSON.stringify([...likedSet]));

// ── RENDER ────────────────────────────────────────────────
function renderGrid() {
    let items = currentFilter === 'all' ? [...mediaItems] : mediaItems.filter(m => m.type === currentFilter);
    if (currentSort === 'likes') items.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    filteredItems = items;
    $('secCount').textContent = items.length + ' ta';
    const grid = $('mediaGrid'); grid.innerHTML = '';
    if (!items.length) { $('emptyState').classList.add('show'); return; }
    $('emptyState').classList.remove('show');

    items.forEach((item, i) => {
        const isVid = item.type === 'video', liked = likedSet.has(item.id);
        const card = document.createElement('div');
        card.className = 'media-card'; card.setAttribute('data-type', item.type);

        let thumbHtml;
        if (item.type === 'photo' && item.url) thumbHtml = `<img class="thumb-img" src="${item.url}" alt="" loading="lazy">`;
        else if (item.type === 'video' && item.thumbnail) thumbHtml = `<img class="thumb-img" src="${item.thumbnail}" alt="" loading="lazy">`;
        else thumbHtml = `<div class="thumb-placeholder">${isVid ? IC.vid : IC.img}</div>`;

        card.innerHTML = `
      <div class="thumb-wrap">
        ${thumbHtml}
        <div class="type-badge ${isVid ? 'badge-video' : 'badge-photo'}">${isVid ? IC.vid : IC.pho} ${isVid ? 'Video' : 'Rasm'}</div>
        <div class="play-overlay"><div class="play-circle">${IC.play}</div></div>
        <button class="delete-btn">${IC.trash}</button>
      </div>
      <div class="card-body">
        <div class="card-title">${item.title || 'Nomsiz'}</div>
        <div class="card-meta">
          <div class="card-author"><div class="ava">${(item.author || 'A')[0].toUpperCase()}</div><span>${item.author || 'Anonim'}</span></div>
          <button class="like-btn ${liked ? 'liked' : ''}">${liked ? IC.hF : IC.hE}<span>${item.likes || 0}</span></button>
        </div>
      </div>`;

        card.querySelector('.like-btn').addEventListener('click', e => { e.stopPropagation(); toggleLike(item.id, item.likes || 0, liked); });
        card.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); openPassModal(item.id); });
        card.addEventListener('click', () => openLightbox(i));
        grid.appendChild(card);
    });
}

// ── LIKE ──────────────────────────────────────────────────
async function toggleLike(id, cur, wasLiked) {
    if (wasLiked) likedSet.delete(id); else likedSet.add(id);
    saveLiked();
    try { await updateDoc(doc(db, "media", id), { likes: wasLiked ? cur - 1 : cur + 1 }); } catch (e) { }
}

// ── PASS MODAL ────────────────────────────────────────────
window.openPassModal = id => {
    pendingDeleteId = id; $('passInput').value = ''; $('passError').classList.remove('show');
    $('passModal').classList.add('open'); document.body.style.overflow = 'hidden';
    setTimeout(() => $('passInput').focus(), 300);
};
window.closePassModal = () => { $('passModal').classList.remove('open'); document.body.style.overflow = ''; pendingDeleteId = null; };
window.confirmDelete = async () => {
    if ($('passInput').value !== DELETE_PASS) { $('passError').classList.add('show'); $('passInput').value = ''; $('passInput').focus(); return; }
    const id = pendingDeleteId; closePassModal();
    try { await deleteDoc(doc(db, "media", id)); showToast("O'chirildi", 'success'); }
    catch (e) { showToast("O'chirishda xatolik!", 'error'); }
};

// ── UPLOAD MODAL ──────────────────────────────────────────
window.openUploadModal = () => { resetModal(); $('uploadModal').classList.add('open'); document.body.style.overflow = 'hidden'; };
window.closeUploadModal = () => { $('uploadModal').classList.remove('open'); document.body.style.overflow = ''; resetModal(); };

function resetModal() {
    selectedType = null; selectedPhoto = null; selectedVideo = null;
    $('step1').classList.add('active'); $('step2').classList.remove('active');
    $('optPhoto').classList.remove('selected'); $('optVideo').classList.remove('selected');
    clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar');
    clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar');
    $('mediaTitle').value = ''; $('mediaAuthor').value = '';
    $('progressWrap').classList.remove('show'); $('progressFill').style.width = '0%';
    $('submitBtn').disabled = true;
}

window.goStep1 = () => { $('step1').classList.add('active'); $('step2').classList.remove('active'); };

window.selectType = type => {
    selectedType = type;
    $('optPhoto').classList.toggle('selected', type === 'photo');
    $('optVideo').classList.toggle('selected', type === 'video');
    $('photoDz').style.display = type === 'photo' ? '' : 'none';
    $('videoDz').style.display = type === 'video' ? '' : 'none';
    $('step1').classList.remove('active'); $('step2').classList.add('active');
    $('submitBtn').disabled = true;
};

// ── PHOTO ─────────────────────────────────────────────────
const dz = $('dropZone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) processPhoto(f); });
window.handleFileSelect = e => { if (e.target.files[0]) processPhoto(e.target.files[0]); };

function processPhoto(f) {
    if (!f.type.startsWith('image/')) { showToast('Faqat rasm!', 'error'); return; }
    if (f.size > 32 * 1024 * 1024) { showToast('Rasm 32MB dan katta!', 'error'); return; }
    selectedPhoto = f;
    showPreview('filePreview', 'fileInput', 'dropZone', URL.createObjectURL(f), 'image');
    showSizeBar('photoSizeBar', 'photoSizeName', 'photoSizeVal', 'photoSizeFill', f, 32);
    $('submitBtn').disabled = false;
}
window.removePhotoFile = () => { selectedPhoto = null; clearPreview('filePreview', 'fileInput', 'dropZone', 'photoSizeBar'); $('submitBtn').disabled = true; };

// ── VIDEO ─────────────────────────────────────────────────
const vdz = $('videoDzZone');
vdz.addEventListener('dragover', e => { e.preventDefault(); vdz.classList.add('drag-over'); });
vdz.addEventListener('dragleave', () => vdz.classList.remove('drag-over'));
vdz.addEventListener('drop', e => { e.preventDefault(); vdz.classList.remove('drag-over'); const f = e.dataTransfer.files[0]; if (f) processVideo(f); });
window.handleVideoSelect = e => { if (e.target.files[0]) processVideo(e.target.files[0]); };

function processVideo(f) {
    if (!f.type.startsWith('video/')) { showToast('Faqat video!', 'error'); return; }
    if (f.size > 100 * 1024 * 1024) { showToast('Video 100MB dan katta!', 'error'); return; }
    selectedVideo = f;
    showPreview('videoPreview', 'videoInput', 'videoDzZone', URL.createObjectURL(f), 'video');
    showSizeBar('videoSizeBar', 'videoSizeName', 'videoSizeVal', 'videoSizeFill', f, 100);
    $('submitBtn').disabled = false;
}
window.removeVideoFile = () => { selectedVideo = null; clearPreview('videoPreview', 'videoInput', 'videoDzZone', 'videoSizeBar'); $('submitBtn').disabled = true; };

// ── HELPERS ───────────────────────────────────────────────
function showPreview(previewId, inputId, dzId, src, kind) {
    const pr = $(previewId), rm = pr.querySelector('.fp-remove');
    Array.from(pr.children).forEach(c => { if (c !== rm) c.remove(); });
    const el = document.createElement(kind === 'image' ? 'img' : 'video');
    el.src = src; if (kind === 'video') { el.controls = true; el.muted = true; }
    pr.insertBefore(el, rm); pr.classList.add('show');
    $(dzId).style.display = 'none';
}
function clearPreview(previewId, inputId, dzId, sizeBarId) {
    const pr = $(previewId), rm = pr.querySelector('.fp-remove');
    Array.from(pr.children).forEach(c => { if (c !== rm) c.remove(); });
    pr.classList.remove('show'); $(inputId).value = ''; $(dzId).style.display = '';
    if (sizeBarId) $(sizeBarId).classList.remove('show');
}
function showSizeBar(barId, nameId, valId, fillId, f, maxMb) {
    $(barId).classList.add('show');
    const mb = (f.size / 1024 / 1024).toFixed(1), pct = Math.min((f.size / (maxMb * 1024 * 1024)) * 100, 100);
    $(nameId).textContent = f.name.length > 30 ? f.name.slice(0, 27) + '...' : f.name;
    $(valId).textContent = mb + 'MB / ' + maxMb + 'MB';
    $(fillId).style.width = pct + '%';
    $(fillId).style.background = pct > 80 ? '#ff6b6b' : 'linear-gradient(90deg,#ff6b00,#ff9a3c)';
}

// ── SUBMIT ────────────────────────────────────────────────
window.submitMedia = async () => {
    const title = $('mediaTitle').value.trim() || 'Nomsiz';
    const author = $('mediaAuthor').value.trim() || 'Anonim';
    $('submitBtn').disabled = true; $('progressWrap').classList.add('show');

    let url = '', thumbnail = '';

    // ── RASM → ImgBB ──────────────────────────────────────
    if (selectedType === 'photo') {
        if (!selectedPhoto) { showToast('Rasm tanlang!', 'error'); resetProgress(); return; }
        try {
            setProg(15, 'Rasm yuklanmoqda...');
            const fd = new FormData(); fd.append('image', selectedPhoto);
            const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: 'POST', body: fd });
            const j = await r.json();
            if (!j.success) throw new Error('ImgBB');
            url = j.data.url; thumbnail = j.data.thumb?.url || j.data.url;
            setProg(85, 'Saqlanmoqda...');
        } catch (e) {
            showToast('Rasm yuklanmadi! Internet muammosi bo\'lishi mumkin.', 'error');
            resetProgress(); return;
        }
    }

    // ── VIDEO → Cloudinary (unsigned) ─────────────────────
    if (selectedType === 'video') {
        if (!selectedVideo) { showToast('Video tanlang!', 'error'); resetProgress(); return; }
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
                        const p = Math.round(ev.loaded / ev.total * 78) + 5;
                        setProg(p, `Yuklanmoqda... ${Math.round(ev.loaded / ev.total * 100)}%`);
                    }
                };
                xhr.onload = () => { try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); } };
                xhr.onerror = () => reject(new Error('Network'));
                xhr.send(fd);
            });

            if (result.error) throw new Error(result.error.message || 'Cloudinary error');
            url = result.secure_url;
            // avtomatik thumbnail (birinchi frame)
            thumbnail = result.secure_url
                .replace('/upload/', '/upload/so_0,w_640,h_400,c_fill,f_jpg/')
                .replace(/\.[^/.]+$/, '.jpg');
            setProg(90, 'Saqlanmoqda...');
        } catch (e) {
            // Cloudinary sozlanmagan bo'lsa — foydali xabar
            if (e.message && e.message.includes('upload_preset')) {
                showToast('Cloudinary preset topilmadi. Quyidagi yo\'riqnomaga qarang.', 'error');
                alert('Video yuklash uchun Cloudinary sozlash kerak:\n\n1. cloudinary.com ga kiring (bepul ro\'yxat)\n2. Settings > Upload > "Add upload preset"\n3. Signing mode: Unsigned\n4. Preset nomini nusxalab index.html dagi CLD_PRESET ga joylashtiring\n5. Cloud name ni ham CLD_CLOUD ga joylashtiring');
            } else {
                showToast('Video yuklanmadi: ' + e.message, 'error');
            }
            resetProgress(); return;
        }
    }

    // ── Firebase'ga yozish ────────────────────────────────
    try {
        await addDoc(colRef, { title, author, type: selectedType, url, thumbnail: thumbnail || '', likes: 0, date: Date.now() });
        setProg(100, 'Saqlandi!');
        setTimeout(() => { closeUploadModal(); showToast('Muvaffaqiyatli yuklandi!', 'success'); }, 400);
    } catch (e) {
        showToast('Firebase xatolik: ' + e.message, 'error'); resetProgress();
    }
};

function setProg(pct, txt) { $('progressFill').style.width = pct + '%'; $('progressTxt').textContent = txt; }
function resetProgress() { $('progressWrap').classList.remove('show'); $('progressFill').style.width = '0%'; $('submitBtn').disabled = false; }

// ── LIGHTBOX ──────────────────────────────────────────────
window.openLightbox = idx => { lbIndex = idx; renderLightbox(); $('lightbox').classList.add('open'); document.body.style.overflow = 'hidden'; };
window.closeLightbox = () => {
    const el = $('lbMedia').querySelector('video,iframe');
    if (el) { if (el.tagName === 'VIDEO') el.pause(); else el.src = ''; }
    $('lightbox').classList.remove('open'); document.body.style.overflow = ''; $('lbMedia').innerHTML = '';
};
window.lbNav = dir => {
    const el = $('lbMedia').querySelector('video,iframe');
    if (el) { if (el.tagName === 'VIDEO') el.pause(); else el.src = ''; }
    lbIndex = (lbIndex + dir + filteredItems.length) % filteredItems.length; renderLightbox();
};

function renderLightbox() {
    const item = filteredItems[lbIndex]; if (!item) return;
    const m = $('lbMedia'); m.innerHTML = '';
    if (item.type === 'photo') {
        const img = document.createElement('img'); img.src = item.url || ''; img.alt = item.title || ''; m.appendChild(img);
    } else {
        const ytM = (item.url || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytM) {
            const f = document.createElement('iframe');
            f.src = `https://www.youtube.com/embed/${ytM[1]}?autoplay=1`;
            f.style.cssText = 'width:100%;aspect-ratio:16/9;border-radius:16px;border:none;';
            f.allow = 'autoplay;encrypted-media'; m.appendChild(f);
        } else {
            // Cloudinary yoki boshqa to'g'ridan-to'g'ri video URL
            const v = document.createElement('video');
            v.src = item.url || ''; v.controls = true; v.autoplay = true;
            v.style.cssText = 'border-radius:16px;background:#000;';
            m.appendChild(v);
        }
    }
    const liked = likedSet.has(item.id);
    $('lbInfo').innerHTML = `
    <div><div class="lb-title">${item.title || 'Nomsiz'}</div>
    <div class="lb-author">${IC.user}${item.author || 'Anonim'}</div></div>
    <button class="like-btn ${liked ? 'liked' : ''}" id="lbLikeBtn">${liked ? IC.hF : IC.hE}<span>${item.likes || 0}</span></button>`;
    $('lbLikeBtn').onclick = () => {
        const it = mediaItems.find(m => m.id === item.id); if (!it) return;
        toggleLike(it.id, it.likes || 0, likedSet.has(it.id));
    };
}

// ── KEYBOARD ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
    if ($('lightbox').classList.contains('open')) {
        if (e.key === 'ArrowRight') lbNav(1);
        if (e.key === 'ArrowLeft') lbNav(-1);
        if (e.key === 'Escape') closeLightbox();
    }
    if ($('passModal').classList.contains('open') && e.key === 'Escape') closePassModal();
    if ($('uploadModal').classList.contains('open') && e.key === 'Escape') closeUploadModal();
});