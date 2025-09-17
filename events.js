// events.js (no topo)
import { auth, db, storage } from './firebase-init.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  onSnapshot,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";



// events.js — completo, com modal consertado, editor de imagem (pan/zoom) e demais funções
const STORAGE_KEY = 'events_data_v1';

/* ---------- initial data ---------- */
const DEFAULT_EVENTS = [
  { id: 1, city: "CURITIBA/PR", dateLabel: "05, 06 e 07 de Setembro", month: "09", venue: "PARQUE FERNANDO COSTA", price: "NOME DO PROGRAMA...ETC!", img: "Imagens/banner1.JPG", description: "Treinamento intensivo presencial com foco em liderança prática.", schedule: [{ time: "09:00", title: "Credenciamento", speaker: "Equipe" }] },
  { id: 2, city: "CAMPO GRANDE/MS", dateLabel: "19, 20 e 21 de Setembro", month: "09", venue: "PARQUE FERNANDO COSTA", price: "NOME DO PROGRAMA...ETC!", img: "Imagens/banner3.png", description: "Treinamento com foco em liderança transformacional.", schedule: [{ time: "09:00", title: "Palestra", speaker: "Paulo" }] }
];

/* ---------- DOM refs ---------- */
const agendaGrid = document.getElementById('agendaGrid');
const searchInput = document.getElementById('searchInput');
const cityFilter = document.getElementById('cityFilter');
const dateFilter = document.getElementById('dateFilter');
const clearBtn = document.getElementById('clearFilters');

const adminToggle = document.getElementById('adminToggle');
const adminLogin = document.getElementById('adminLogin');
const adminClose = document.getElementById('adminClose');
const adminCancel = document.getElementById('adminCancel');
const loginForm = document.getElementById('loginForm');
const adminDrawer = document.getElementById('adminDrawer');
const adminCloseDrawer = document.getElementById('adminCloseDrawer');
const adminLogout = document.getElementById('adminLogout');
const adminList = document.getElementById('adminList');

const eventForm = document.getElementById('eventForm');
const evId = document.getElementById('evId');
const evCity = document.getElementById('evCity');
const evDateLabel = document.getElementById('evDateLabel');
const evMonth = document.getElementById('evMonth');
const evVenue = document.getElementById('evVenue');
const evPrice = document.getElementById('evPrice');
const evImg = document.getElementById('evImg');
const evFile = document.getElementById('evFile');
const evPreview = document.getElementById('evPreview');
const editImageBtn = document.getElementById('editImage');
const downloadImg = document.getElementById('downloadImg');
const clearImage = document.getElementById('clearImage');
const evDesc = document.getElementById('evDesc');
const addSched = document.getElementById('addSched');
const schedList = document.getElementById('schedList');
const saveEvent = document.getElementById('saveEvent');
const resetForm = document.getElementById('resetForm');



let EVENTS = [];
let loggedIn = false;
let currentImageDataURL = ''; // stores base64 when user uploads file
let lastActiveElement = null;
let keydownHandler = null;

/* Modal refs (will be initialized by ensureModal) */
let modal = document.getElementById('modal');
let modalPanel = null;
let modalContent = null;

// fallback: remove o botão em telas pequenas (executar após DOM ready)
if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
  const btn = document.getElementById('adminToggle');
  if (btn) btn.style.display = 'none';
}


/* ---------------- persistence ---------------- */
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      EVENTS = DEFAULT_EVENTS.slice();
      persistEvents();
    } else {
      EVENTS = JSON.parse(raw);
    }
  } catch (e) {
    console.error('load error', e);
    EVENTS = DEFAULT_EVENTS.slice();
  }
}
function persistEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(EVENTS));
}

/* ---------------- rendering ---------------- */
function populateCityOptions() {
  cityFilter.innerHTML = '';
  const base = document.createElement('option');
  base.value = '';
  base.textContent = 'Todas as cidades';
  cityFilter.appendChild(base);

  const cities = [...new Set(EVENTS.map(e => e.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  cities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    cityFilter.appendChild(opt);
  });

  initCustomSelects();
}

function populateDateOptions() {
  dateFilter.innerHTML = '';
  const base = document.createElement('option');
  base.value = '';
  base.textContent = 'Todos os meses';
  dateFilter.appendChild(base);

  const months = Array.from(new Set(EVENTS.map(e => (e.month || '').toString().padStart(2, '0'))))
    .filter(m => m && m !== '00')
    .sort((a, b) => Number(a) - Number(b));

  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = `${monthNameFromMM(m)} (${m})`;
    dateFilter.appendChild(opt);
  });

  initCustomSelects();
}

function createCard(ev) {
  const el = document.createElement('article');
  el.className = 'card';
  const imgUrl = ev.img || '';
  el.innerHTML = `
    <div class="card-thumb" style="background-image:url('${escapeAttr(imgUrl)}')"></div>
    <div class="card-body">
      <div class="meta">
        <div>
          <div class="city">${escapeHtml(ev.city)}</div>
          <div class="date">📅 ${escapeHtml(ev.dateLabel)}</div>
        </div>
        <div style="text-align:right">
          <div class="badge">${escapeHtml(ev.venue)}</div>
          <div class="price" style="margin-top:8px">${escapeHtml(ev.price)}</div>
        </div>
      </div>
      <div class="desc">${escapeHtml(ev.description || '')}</div>
    </div>
    <div class="card-footer">
      <button class="btn" data-action="details" data-id="${ev.id}">Ver programação</button>
     
    </div>
  `;
  return el;
}

function renderList(list = EVENTS) {
  agendaGrid.innerHTML = '';
  if (list.length === 0) {
    agendaGrid.innerHTML = `<div style="grid-column:1/-1;padding:28px;border-radius:8px;background:rgba(255,255,255,0.02);text-align:center;color:var(--muted)">Nenhum evento encontrado.</div>`;
    return;
  }
  list.forEach(ev => agendaGrid.appendChild(createCard(ev)));
}

/* admin list */
function renderAdminList() {
  adminList.innerHTML = '';
  if (!EVENTS.length) {
    adminList.textContent = 'Sem eventos';
    return;
  }
  EVENTS.slice().reverse().forEach(ev => {
    const it = document.createElement('div');
    it.className = 'admin-item';
    it.innerHTML = `<div class="meta"><strong>${escapeHtml(ev.city)}</strong><div style="color:var(--muted);font-size:13px">${escapeHtml(ev.dateLabel)} • ${escapeHtml(ev.venue)}</div></div>
      <div class="actions">
        <button class="btn ghost admin-edit" data-id="${ev.id}">Editar</button>
        <button class="btn admin-delete" data-id="${ev.id}">Excluir</button>
      </div>`;
    adminList.appendChild(it);
  });

  adminList.querySelectorAll('.admin-edit').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      openEditEvent(id);
    });
  });
  adminList.querySelectorAll('.admin-delete').forEach(b => {
    b.addEventListener('click', (e) => {
      const id = Number(e.currentTarget.dataset.id);
      if (confirm('Confirma exclusão deste evento?')) {
        EVENTS = EVENTS.filter(x => x.id !== id);
        persistEvents();
        populateCityOptions();
        populateDateOptions();
        applyFilters();
        renderAdminList();
      }
    });
  });
}

/* ---------------- filters & search ---------------- */
function applyFilters() {
  const q = (searchInput.value || '').trim().toLowerCase();
  const city = cityFilter.value;
  const month = dateFilter.value;

  const res = EVENTS.filter(e => {
    const matchSearch = q === '' || e.city.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
    const matchCity = city === '' || e.city === city;
    const matchMonth = month === '' || e.month === month;
    return matchSearch && matchCity && matchMonth;
  });

  renderList(res);
}

/* ---------------- modal (substituted, robust) ---------------- */
function sanitizeModalStructure() {
  if (!modal) return;

  const outerContent = modal.querySelector(':scope > .modal-panel > .modal-content');
  if (outerContent) {
    const nested = outerContent.querySelector('.modal-content');
    if (nested) {
      while (nested.firstChild) outerContent.appendChild(nested.firstChild);
      nested.remove();
    }
  }

  const directPanels = Array.from(modal.querySelectorAll(':scope > .modal-panel'));
  if (directPanels.length > 1) {
    const main = directPanels[0];
    directPanels.slice(1).forEach(extra => {
      while (extra.firstChild) main.appendChild(extra.firstChild);
      extra.remove();
    });
  }
}

function ensureModal() {
  if (!modal) {
    modal = document.getElementById('modal') || document.createElement('div');
    modal.id = 'modal';
    modal.className = 'modal hidden';
    document.body.appendChild(modal);
  }

  sanitizeModalStructure();

  modalPanel = modal.querySelector(':scope > .modal-panel');
  if (!modalPanel) {
    modalPanel = document.createElement('div');
    modalPanel.className = 'modal-panel';
    modalPanel.setAttribute('role', 'document');
    modal.appendChild(modalPanel);
  }

  modalContent = modalPanel.querySelector(':scope > .modal-content');
  if (!modalContent) {
    modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalPanel.appendChild(modalContent);
  }

  if (!modal.__hasOverlayClose) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    modal.__hasOverlayClose = true;
  }
}


function openModal(ev) {
  ensureModal();

  lastActiveElement = document.activeElement;

  modalContent.innerHTML = `
    <button id="modalClose" class="modal-close" aria-label="Fechar">✕</button>

    <div class="modal-thumb" style="background-image:url('${escapeAttr(ev.img || '')}')"></div>

    <div class="modal-body">
      <h3 id="modalTitle">${escapeHtml(ev.city)}</h3>
      <div class="modal-muted">📅 ${escapeHtml(ev.dateLabel)} • ${escapeHtml(ev.venue)}</div>
      <p class="modal-desc">${escapeHtml(ev.description || '')}</p>

      <strong style="display:block;margin-top:8px;color:#f6fff9">Programação</strong>
      <div class="schedule">
        ${(ev.schedule || []).map(s => `
          <div class="session">
            <div class="time">${escapeHtml(s.time)}</div>
            <div class="info"><strong>${escapeHtml(s.title)}</strong>${s.speaker ? ` • ${escapeHtml(s.speaker)}` : ''}</div>
          </div>`).join('')}
      </div>

      <div style="flex:1"></div>

      <div class="modal-actions">
       
        <button id="modalCloseBtn" class="btn ghost">Fechar</button>
      </div>
    </div>
  `;

  const modalCloseBtn = modal.querySelector('#modalClose');
  const reg = modal.querySelector('#modalRegister');
  const closeBtn = modal.querySelector('#modalCloseBtn');

  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('open'), 15);
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    const focusTarget = reg || closeBtn || modalCloseBtn;
    focusTarget && focusTarget.focus();
  }, 120);

  if (reg) reg.addEventListener('click', () => alert(`Inscrição: ${ev.city} — ${ev.dateLabel}\nImplemente seu link de inscrição aqui.`));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

  keydownHandler = function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    else if (e.key === 'Tab') { trapFocus(e); }
  };
  document.addEventListener('keydown', keydownHandler);
}


function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => {
    modal.classList.add('hidden');
    if (modalPanel && modalContent) modalContent.innerHTML = '';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    try { lastActiveElement && lastActiveElement.focus(); } catch (e) { }
  }, 220);
  if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
  keydownHandler = null;
}

function trapFocus(e) {
  const context = modalPanel || modal;
  const focusable = getFocusable(context);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function getFocusable(context) {
  if (!context) return [];
  return Array.from(context.querySelectorAll('a[href], button:not([tabindex="-1"]):not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
    .filter(el => el.offsetParent !== null);
}

/* ---------------- custom select (body dropdown) ---------------- */
function initCustomSelects() {
  const wrappers = document.querySelectorAll('.select-wrap');
  wrappers.forEach(wrap => {
    const native = wrap.querySelector('select');
    if (!native) return;

    const existingBtn = wrap.querySelector('.custom-select-btn');
    if (existingBtn) {
      const existingDropdowns = document.querySelectorAll('.custom-dropdown');
      existingDropdowns.forEach(d => d.remove());
      existingBtn.remove();
    }

    createCustomSelect(native, wrap);
  });
}


const MONTH_NAMES = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

function monthNameFromMM(mm) {
  if (!mm) return '';
  const key = String(mm).padStart(2, '0');
  return MONTH_NAMES[key] || key;
}


function createCustomSelect(nativeSelect, wrapper) {
  nativeSelect.classList.add('visually-hidden');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  const currentLabel = (() => { const opt = nativeSelect.options[nativeSelect.selectedIndex]; return opt ? opt.textContent : (nativeSelect.options[0] ? nativeSelect.options[0].textContent : ''); })();
  btn.innerHTML = `<span class="label">${currentLabel}</span><span class="chev" aria-hidden="true"></span>`;
  wrapper.appendChild(btn);

  let dropdownEl = null; let openState = false;
  btn.addEventListener('click', (e) => { e.stopPropagation(); if (openState) closeDropdown(); else openDropdown(); });
  document.addEventListener('click', (e) => { if (!dropdownEl) return; if (e.target.closest('.custom-dropdown') || e.target === btn) return; closeDropdown(); });
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDropdown(); const firstItem = dropdownEl.querySelector('.item'); firstItem && firstItem.focus(); } });

  function buildDropdown() {
    const ul = document.createElement('div'); ul.className = 'custom-dropdown'; ul.setAttribute('role', 'listbox'); ul.setAttribute('tabindex', '-1');
    Array.from(nativeSelect.options).forEach((opt, idx) => {
      const it = document.createElement('div');
      it.className = 'item';
      it.setAttribute('role', 'option');
      it.setAttribute('tabindex', '0');
      if (opt.disabled) it.setAttribute('aria-disabled', 'true');
      if (opt.value === nativeSelect.value) it.setAttribute('aria-selected', 'true');
      it.dataset.value = opt.value;
      it.dataset.index = String(idx);
      it.textContent = opt.textContent;

      it.addEventListener('click', (ev) => { ev.stopPropagation(); selectValue(opt.value, opt.textContent); closeDropdown(); });
      it.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); it.click(); }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); focusNextItem(it); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); focusPrevItem(it); }
        else if (ev.key === 'Escape') { closeDropdown(); btn.focus(); }
      });

      ul.appendChild(it);
    });
    return ul;
  }

  function openDropdown() {
    if (openState) return;
    dropdownEl = buildDropdown();
    document.body.appendChild(dropdownEl);
    const rect = btn.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX;
    dropdownEl.style.minWidth = rect.width + 'px';
    dropdownEl.style.left = left + 'px';
    dropdownEl.style.top = top + 'px';

    btn.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    openState = true;

    window.addEventListener('scroll', closeDropdownOnScroll, true);
    window.addEventListener('resize', closeDropdownOnScroll);
  }
  function closeDropdownOnScroll() { closeDropdown(); }
  function closeDropdown() {
    if (!openState) return;
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    if (dropdownEl && dropdownEl.parentNode) dropdownEl.parentNode.removeChild(dropdownEl);
    dropdownEl = null;
    openState = false;
    window.removeEventListener('scroll', closeDropdownOnScroll, true);
    window.removeEventListener('resize', closeDropdownOnScroll);
  }
  function selectValue(value, label) {
    nativeSelect.value = value;
    const lbl = btn.querySelector('.label');
    if (lbl) lbl.textContent = label;
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function focusNextItem(current) {
    const all = Array.from(document.querySelectorAll('.custom-dropdown .item'));
    const idx = all.indexOf(current);
    if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
  }
  function focusPrevItem(current) {
    const all = Array.from(document.querySelectorAll('.custom-dropdown .item'));
    const idx = all.indexOf(current);
    if (idx > 0) all[idx - 1].focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openState) { closeDropdown(); btn.focus(); }
  });

  nativeSelect.addEventListener('change', () => {
    const lbl = btn.querySelector('.label');
    if (lbl) {
      const opt = nativeSelect.options[nativeSelect.selectedIndex];
      lbl.textContent = opt ? opt.textContent : '';
    }
  });
}

/* ---------------- admin login/drawer ---------------- */
function openAdminLogin() {
  adminLogin.classList.remove('hidden');
  adminLogin.style.display = 'flex';
  adminLogin.setAttribute('aria-hidden', 'false');
  adminLogin.querySelector('#adminUser').focus();
}
function closeAdminLogin() {
  adminLogin.classList.add('hidden');
  adminLogin.setAttribute('aria-hidden', 'true');
  adminLogin.style.display = '';
}

function openAdminDrawer() {
  lastActiveElement = document.activeElement;
  adminDrawer.classList.remove('hidden');
  adminDrawer.setAttribute('aria-hidden', 'false');
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  renderAdminList();
  setTimeout(() => {
    const firstInput = adminDrawer.querySelector('#evCity') || adminDrawer.querySelector('button');
    firstInput && firstInput.focus();
  }, 120);
}
function closeAdminDrawer() {
  adminDrawer.classList.add('hidden');
  adminDrawer.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  lastActiveElement && lastActiveElement.focus();
}
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value;

  try {
    // 1) Fallback local (dev) usando ADMIN_CRED
    if (user === ADMIN_CRED.user && pass === ADMIN_CRED.pass) {
      loggedIn = true;
      exposeAuthAPI();
      window.dispatchEvent(new CustomEvent('auth:state', { detail: { user: { uid: 'local-admin' }, loggedIn } }));
      closeAdminLogin();
      openAdminDrawer();
      alert('Login (admin local) bem-sucedido.');
      return;
    }

    // 2) Se Firebase Auth não estiver configurado, erro claro
    if (typeof signInWithEmailAndPassword !== 'function' || typeof auth === 'undefined') {
      throw new Error('Firebase Auth não está disponível. Use as credenciais locais "admin"/"123" ou configure firebase-init.');
    }

    // 3) Tenta login com Firebase (nota: precisa ser email cadastrado no Auth)
    if (!user.includes('@')) {
      // Aviso opcional: o Firebase exige e-mail. Se você realmente usa username, use o fallback local.
      // Vou tentar mesmo assim — mas é melhor passar o e-mail.
      console.warn('Login sem "@": certifique-se de usar o e-mail do usuário no Firebase Auth.');
    }

    const cred = await signInWithEmailAndPassword(auth, user, pass);
    loggedIn = true;
    exposeAuthAPI();
    // dispara evento com o user retornado pelo Firebase
    window.dispatchEvent(new CustomEvent('auth:state', { detail: { user: cred.user, loggedIn } }));
    closeAdminLogin();
    openAdminDrawer();
    alert('Login bem-sucedido.');
  } catch (err) {
    console.error('Login error:', err);
    alert('Erro no login: ' + (err && err.message ? err.message : String(err)));
  }
});


adminToggle.addEventListener('click', openAdminLogin);
adminClose.addEventListener('click', closeAdminLogin);
adminCancel.addEventListener('click', closeAdminLogin);

if (adminDrawer) {
  adminDrawer.addEventListener('click', (e) => {
    if (e.target === adminDrawer) closeAdminDrawer();
  });
}

if (adminCloseDrawer) adminCloseDrawer.addEventListener('click', closeAdminDrawer);

if (adminLogout) adminLogout.addEventListener('click', async () => {
  await signOut(auth);
  loggedIn = false;
  closeAdminDrawer();
  alert('Logout realizado.');
});


/* ---------------- schedule editor, image upload, save, etc. ---------------- */
function addScheduleRow(item = { time: '', title: '', speaker: '' }) {
  const row = document.createElement('div');
  row.className = 'sched-item';
  row.innerHTML = `
    <input type="text" class="sched-time" placeholder="09:00" value="${escapeAttr(item.time)}">
    <input type="text" class="sched-title" placeholder="Título da sessão" value="${escapeAttr(item.title)}">
    <input type="text" class="sched-speaker" placeholder="Palestrante" value="${escapeAttr(item.speaker)}">
    <button type="button" class="btn ghost sched-remove">Remover</button>
  `;
  schedList.appendChild(row);
  row.querySelector('.sched-remove').addEventListener('click', () => row.remove());
}
addSched.addEventListener('click', () => addScheduleRow());
resetForm.addEventListener('click', (e) => { e.preventDefault(); clearEventForm(); });

function clearEventForm() {
  evId.value = '';
  evCity.value = '';
  evDateLabel.value = '';
  evMonth.value = '';
  evVenue.value = '';
  evPrice.value = '';
  evImg.value = '';
  currentImageDataURL = '';
  evFile.value = '';
  evPreview.src = '';
  evPreview.style.display = 'none';
  evDesc.value = '';
  schedList.innerHTML = '';
}

function openEditEvent(id) {
  const ev = EVENTS.find(x => x.id === id);
  if (!ev) return;
  evId.value = ev.id;
  evCity.value = ev.city || '';
  evDateLabel.value = ev.dateLabel || '';
  evMonth.value = ev.month || '';
  evVenue.value = ev.venue || '';
  evPrice.value = ev.price || '';
  evImg.value = ev.img || '';
  evDesc.value = ev.description || '';
  schedList.innerHTML = '';
  (ev.schedule || []).forEach(s => addScheduleRow(s));

  if (ev.img) {
    evPreview.src = ev.img;
    evPreview.style.display = 'block';
    currentImageDataURL = ev.img.startsWith('data:') ? ev.img : '';
  } else {
    evPreview.src = '';
    evPreview.style.display = 'none';
    currentImageDataURL = '';
  }

  if (adminDrawer.classList.contains('hidden')) openAdminDrawer();
  evCity.focus();
}

/* image upload handling */
evFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Escolha um arquivo de imagem (jpg/png/gif).');
    evFile.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function (ev) {
    currentImageDataURL = ev.target.result;
    evPreview.src = currentImageDataURL;
    evPreview.style.display = 'block';
    evImg.value = currentImageDataURL;
  };
  reader.readAsDataURL(file);
});

clearImage.addEventListener('click', () => {
  evFile.value = '';
  currentImageDataURL = '';
  evImg.value = '';
  evPreview.src = '';
  evPreview.style.display = 'none';
});

downloadImg.addEventListener('click', async () => {
  const url = evPreview.src || evImg.value;
  if (!url) { alert('Nenhuma imagem para exportar.'); return; }
  try {
    if (url.startsWith('data:')) {
      const blob = dataURLtoBlob(url);
      const a = document.createElement('a');
      const u = URL.createObjectURL(blob);
      a.href = u;
      a.download = (evCity.value ? sanitizeFilename(evCity.value) : 'image') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(u);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = (evCity.value ? sanitizeFilename(evCity.value) : 'image') + getExtensionFromUrl(url);
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  } catch (err) {
    console.error(err);
    alert('Erro ao exportar imagem.');
  }
});

/* save event */
eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!loggedIn) { alert('Você precisa fazer login para salvar eventos.'); return; }

  const idVal = evId.value ? Number(evId.value) : null;
  const imgValue = currentImageDataURL || (evImg.value ? evImg.value.trim() : '');

  const newEvent = {
    id: idVal || Date.now(),
    city: evCity.value.trim(),
    dateLabel: evDateLabel.value.trim(),
    month: evMonth.value.trim(),
    venue: evVenue.value.trim(),
    price: evPrice.value.trim(),
    img: imgValue,
    description: evDesc.value.trim(),
    schedule: Array.from(schedList.querySelectorAll('.sched-item')).map(row => ({
      time: row.querySelector('.sched-time').value.trim(),
      title: row.querySelector('.sched-title').value.trim(),
      speaker: row.querySelector('.sched-speaker').value.trim()
    }))
  };

  if (!newEvent.city || !newEvent.dateLabel) {
    alert('Informe pelo menos cidade e datas.');
    return;
  }

  if (idVal) {
    EVENTS = EVENTS.map(ev => ev.id === idVal ? newEvent : ev);
  } else {
    EVENTS.push(newEvent);
  }

  persistEvents();
  populateCityOptions();
  populateDateOptions();
  applyFilters();
  renderAdminList();
  clearEventForm();
  alert('Evento salvo com sucesso.');
});

/* delegation for cards */
agendaGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = Number(btn.dataset.id);
  const ev = EVENTS.find(x => x.id === id);
  if (!ev) return;

  if (action === 'details') openModal(ev);
  else if (action === 'register') alert(`Inscrição: ${ev.city} — ${ev.dateLabel}\nImplemente seu link de inscrição aqui.`);
});

/* helpers */
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], { type: mime });
}
function sanitizeFilename(s) {
  return s.replace(/[^a-z0-9_\-]/gi, '_').toLowerCase();
}
function getExtensionFromUrl(url) {
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i);
  return m ? m[0] : '.png';
}
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
  if (!s) return '';
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// controle da "ready" promise
let authReadyResolve;
let authReadyResolved = false;
const authReady = new Promise(r => { authReadyResolve = r; });

function exposeAuthAPI() {
  window.AppAuth = window.AppAuth || {};

  // retorna boolean garantido
  window.AppAuth.isLoggedIn = () => !!loggedIn;

  // exige autenticação (retorna boolean). tenta abrir modal de login se existir.
  window.AppAuth.requireAuth = () => {
    if (!loggedIn) {
      alert('Faça login para continuar.');
      try { if (typeof openAdminLogin === 'function') openAdminLogin(); } catch (_) { /* sem crash */ }
      return false;
    }
    return true;
  };

  // promise que resolve quando o primeiro evento de auth ocorre
  window.AppAuth.ready = () => authReady;

  // onChange: retorna função para remover listener
  window.AppAuth.onChange = (cb) => {
    const handler = (e) => cb && cb(e.detail);
    window.addEventListener('auth:state', handler);
    return () => window.removeEventListener('auth:state', handler);
  };
}
exposeAuthAPI();

// Só registra o listener se o Firebase estiver presente
if (typeof onAuthStateChanged === 'function' && typeof auth !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    loggedIn = !!user;
    exposeAuthAPI(); // atualiza a API (opcional)
    window.dispatchEvent(new CustomEvent('auth:state', { detail: { user, loggedIn } }));

    if (!authReadyResolved) {
      authReadyResolve();
      authReadyResolved = true;
    }
  });
} else {
  console.warn('Firebase auth / onAuthStateChanged não encontrado. AppAuth ficará no estado inicial.');
}


/* ---------------- IMAGE EDITOR IMPLEMENTATION ----------------
   Usage: click na imagem (#evPreview) ou no botão 'Editar imagem'.
   Abre overlay com viewport onde é possível arrastar e dar zoom.
   Ao clicar Aplicar, a imagem recortada vira dataURL e é atribuída.
*/
let imgEditor = null;
let imgEditorState = null;

function createImageEditorIfNeeded() {
  if (imgEditor) return;
  imgEditor = document.createElement('div');
  imgEditor.id = 'imgEditor';
  imgEditor.className = 'hidden';
  imgEditor.innerHTML = `
    <div class="editor-panel" role="dialog" aria-modal="true">
      <div class="editor-viewport" id="editorViewport">
        <img id="editorImg" src="" alt="Editar imagem">
      </div>
      <div class="editor-controls">
        <div class="control-row">
          <label>Zoom</label>
          <input id="editorZoom" type="range" min="0.3" max="3" step="0.01" value="1">
        </div>
        <div class="control-row">
          <label>Posição: arraste a imagem ou use a roda do mouse para aproximar/afastar</label>
        </div>
        <div class="editor-hint">Dica: arraste para mover. Use a roda do mouse para dar zoom. Quando terminar clique em Aplicar.</div>
        <div style="flex:1"></div>
        <div class="editor-actions">
          <button id="editorCancel" class="btn ghost">Cancelar</button>
          <button id="editorApply" class="btn">Aplicar</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(imgEditor);

  // refs
  const viewport = imgEditor.querySelector('#editorViewport');
  const imgEl = imgEditor.querySelector('#editorImg');
  const zoomRange = imgEditor.querySelector('#editorZoom');
  const btnCancel = imgEditor.querySelector('#editorCancel');
  const btnApply = imgEditor.querySelector('#editorApply');

  // state
  imgEditorState = {
    imgEl,
    viewport,
    zoomRange,
    dragging: false,
    startX: 0, startY: 0,
    offsetX: 0, offsetY: 0,
    lastOffsetX: 0, lastOffsetY: 0,
    scale: 1,
    naturalWidth: 0,
    naturalHeight: 0,
    pointerId: null
  };

  // load handler to capture natural size and center image
  imgEl.addEventListener('load', () => {
    imgEditorState.naturalWidth = imgEl.naturalWidth || imgEl.width;
    imgEditorState.naturalHeight = imgEl.naturalHeight || imgEl.height;
    // reset offsets and scale to fit the viewport initially
    const vp = viewport.getBoundingClientRect();
    const wRatio = vp.width / imgEditorState.naturalWidth;
    const hRatio = vp.height / imgEditorState.naturalHeight;
    const fitScale = Math.max(wRatio, hRatio); // fill viewport
    imgEditorState.scale = Math.max(fitScale, 0.8);
    imgEditorState.offsetX = (vp.width - imgEditorState.naturalWidth * imgEditorState.scale) / 2;
    imgEditorState.offsetY = (vp.height - imgEditorState.naturalHeight * imgEditorState.scale) / 2;
    imgEditorState.lastOffsetX = imgEditorState.offsetX;
    imgEditorState.lastOffsetY = imgEditorState.offsetY;
    imgEditorState.zoomRange.value = imgEditorState.scale.toFixed(2);
    updateEditorTransform();
  });

  // pointer drag handlers (works for mouse & touch)
  imgEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    imgEl.setPointerCapture(e.pointerId);
    imgEditorState.dragging = true;
    imgEditorState.pointerId = e.pointerId;
    imgEditorState.startX = e.clientX;
    imgEditorState.startY = e.clientY;
    imgEditorState.lastOffsetX = imgEditorState.offsetX;
    imgEditorState.lastOffsetY = imgEditorState.offsetY;
    imgEl.style.cursor = 'grabbing';
  });
  imgEl.addEventListener('pointermove', (e) => {
    if (!imgEditorState.dragging || imgEditorState.pointerId !== e.pointerId) return;
    e.preventDefault();
    const dx = e.clientX - imgEditorState.startX;
    const dy = e.clientY - imgEditorState.startY;
    imgEditorState.offsetX = imgEditorState.lastOffsetX + dx;
    imgEditorState.offsetY = imgEditorState.lastOffsetY + dy;
    constrainOffsets();
    updateEditorTransform();
  });
  imgEl.addEventListener('pointerup', (e) => {
    if (imgEditorState.pointerId !== e.pointerId) return;
    imgEditorState.dragging = false;
    imgEditorState.pointerId = null;
    imgEl.style.cursor = 'grab';
  });
  imgEl.addEventListener('pointercancel', () => {
    imgEditorState.dragging = false;
    imgEditorState.pointerId = null;
    imgEl.style.cursor = 'grab';
  });

  // wheel for zoom (over viewport)
  viewport.addEventListener('wheel', (ev) => {
    if (!imgEditorState) return;
    ev.preventDefault();
    const delta = -ev.deltaY * 0.0015;
    const newScale = clamp(imgEditorState.scale * (1 + delta), parseFloat(zoomRange.min), parseFloat(zoomRange.max));
    // zoom around cursor: shift offsets so point under cursor remains under cursor
    const rect = viewport.getBoundingClientRect();
    const cursorX = ev.clientX - rect.left;
    const cursorY = ev.clientY - rect.top;
    const prevScale = imgEditorState.scale;
    const naturalX = (cursorX - imgEditorState.offsetX) / prevScale;
    const naturalY = (cursorY - imgEditorState.offsetY) / prevScale;
    imgEditorState.scale = newScale;
    imgEditorState.offsetX = cursorX - naturalX * imgEditorState.scale;
    imgEditorState.offsetY = cursorY - naturalY * imgEditorState.scale;
    constrainOffsets();
    imgEditorState.zoomRange.value = imgEditorState.scale.toFixed(2);
    updateEditorTransform();
  }, { passive: false });

  // zoom range change
  zoomRange.addEventListener('input', () => {
    const newScale = parseFloat(zoomRange.value);
    // center zoom on viewport center
    const vp = viewport.getBoundingClientRect();
    const cx = vp.width / 2;
    const cy = vp.height / 2;
    const prevScale = imgEditorState.scale;
    const naturalX = (cx - imgEditorState.offsetX) / prevScale;
    const naturalY = (cy - imgEditorState.offsetY) / prevScale;
    imgEditorState.scale = newScale;
    imgEditorState.offsetX = cx - naturalX * imgEditorState.scale;
    imgEditorState.offsetY = cy - naturalY * imgEditorState.scale;
    constrainOffsets();
    updateEditorTransform();
  });

  btnCancel.addEventListener('click', closeImageEditor);
  btnApply.addEventListener('click', applyImageEditor);
}

function openImageEditor(src) {
  if (!src) return;
  createImageEditorIfNeeded();
  imgEditor.classList.remove('hidden');

  // set source
  imgEditorState.imgEl.src = src;
  // ensure display
  setTimeout(() => {
    imgEditorState.imgEl.style.cursor = 'grab';
    // attempt center once loaded
    // load event handler handles initialization on load
  }, 30);
}

function closeImageEditor() {
  if (!imgEditor) return;
  imgEditor.classList.add('hidden');
  // clear src to free memory (optional)
  try { imgEditorState.imgEl.removeAttribute('src'); } catch (e) { }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function updateEditorTransform() {
  const s = imgEditorState.scale;
  const x = Math.round(imgEditorState.offsetX);
  const y = Math.round(imgEditorState.offsetY);
  imgEditorState.imgEl.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

function constrainOffsets() {
  const vpRect = imgEditorState.viewport.getBoundingClientRect();
  const vpW = vpRect.width;
  const vpH = vpRect.height;
  const dispW = imgEditorState.naturalWidth * imgEditorState.scale;
  const dispH = imgEditorState.naturalHeight * imgEditorState.scale;
  // ensure the image covers the viewport at least; allow some small margins
  const minX = Math.min(0, vpW - dispW);
  const minY = Math.min(0, vpH - dispH);
  const maxX = Math.max(0, vpW - vpW * 0); // allow positive offset (image pushed right) but clamp sensibly
  const maxY = Math.max(0, vpH - vpH * 0);
  imgEditorState.offsetX = clamp(imgEditorState.offsetX, minX - 2000, maxX + 2000); // loose clamp but keep image reachable
  imgEditorState.offsetY = clamp(imgEditorState.offsetY, minY - 2000, maxY + 2000);
  // a tighter clamp to avoid huge gaps:
  if (dispW > 0) {
    if (imgEditorState.offsetX > vpW * 0.5) imgEditorState.offsetX = Math.min(imgEditorState.offsetX, vpW * 0.5);
    if (imgEditorState.offsetX < vpW - dispW - vpW * 0.5) imgEditorState.offsetX = Math.max(imgEditorState.offsetX, vpW - dispW - vpW * 0.5);
  }
}

function applyImageEditor() {
  // compute crop area in natural image coords and draw to canvas sized like viewport
  const vpRect = imgEditorState.viewport.getBoundingClientRect();
  const vpW = Math.round(vpRect.width);
  const vpH = Math.round(vpRect.height);

  const naturalW = imgEditorState.naturalWidth;
  const naturalH = imgEditorState.naturalHeight;
  const scale = imgEditorState.scale;
  const offsetX = imgEditorState.offsetX;
  const offsetY = imgEditorState.offsetY;

  // source rect in natural coords
  let sx = (-offsetX) / scale;
  let sy = (-offsetY) / scale;
  let sw = vpW / scale;
  let sh = vpH / scale;

  // clamp source rect
  if (sx < 0) sx = 0;
  if (sy < 0) sy = 0;
  if (sx + sw > naturalW) sw = naturalW - sx;
  if (sy + sh > naturalH) sh = naturalH - sy;

  // draw
  const canvas = document.createElement('canvas');
  canvas.width = vpW;
  canvas.height = vpH;
  const ctx = canvas.getContext('2d');
  // fill transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(imgEditorState.imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL('image/png');

  // set preview and input values
  currentImageDataURL = dataURL;
  evPreview.src = dataURL;
  evPreview.style.display = 'block';
  evImg.value = dataURL;

  closeImageEditor();
}

/* bind clicking the preview (open editor) */
evPreview.addEventListener('click', () => {
  const src = evPreview.src || evImg.value;
  if (!src) return;
  openImageEditor(src);
});
editImageBtn.addEventListener('click', () => {
  const src = evPreview.src || evImg.value;
  if (!src) return alert('Carregue uma imagem primeiro (upload) ou informe uma URL.');
  openImageEditor(src);
});

/* ---------------- init ---------------- */
function initHeroEffects() {
  const hero = document.querySelector('.site-hero');
  if (!hero) return;
  const bg1 = document.querySelector('.hero-bg-1');
  if (!bg1) return;
  let active = false;
  setInterval(() => { active = !active; bg1.style.opacity = active ? '0.96' : '1'; }, 7000);
}

function init() {
  loadEvents();
  populateCityOptions();
  populateDateOptions();
  renderList();
  initCustomSelects();
  renderAdminList();

  searchInput.addEventListener('input', applyFilters);
  cityFilter.addEventListener('change', applyFilters);
  dateFilter.addEventListener('change', applyFilters);
  clearBtn.addEventListener('click', () => { searchInput.value = ''; cityFilter.value = ''; dateFilter.value = ''; applyFilters(); });

  initHeroEffects();

  document.getElementById('year').textContent = new Date().getFullYear();
}

/* ---------------- Registration salvo no Firestore (com fallback local) ---------------- */

const REG_STORAGE_KEY = 'event_regs_v1';
let REGISTRATIONS = loadRegistrations();

function loadRegistrations() {
  try {
    const raw = localStorage.getItem(REG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Erro ao ler registros:', e);
    return [];
  }
}
function persistRegistrations() {
  try { localStorage.setItem(REG_STORAGE_KEY, JSON.stringify(REGISTRATIONS)); } catch (e) { console.warn(e); }
}
function saveRegistrationLocal(reg) {
  REGISTRATIONS.push(reg);
  persistRegistrations();
}

/**
 * Abre modal de inscrição e salva em Firestore (coleção 'registrations').
 * Aceita inscrição se:
 *  - usuário já está logado (loggedIn === true)
 *  - ou a senha digitada === ADMIN_CRED.pass
 */
function openRegistrationPrompt(ev) {
  ensureModal();
  lastActiveElement = document.activeElement;

  modalContent.innerHTML = `
    <button id="modalClose" class="modal-close" aria-label="Fechar">✕</button>
    <div class="modal-body">
      <h3>Inscrição — ${escapeHtml(ev.city)}</h3>
      <div class="modal-muted">📅 ${escapeHtml(ev.dateLabel)} • ${escapeHtml(ev.venue)}</div>
      <p class="modal-desc">${escapeHtml(ev.description || '')}</p>

      <form id="regForm" class="reg-form" style="margin-top:12px">
        <label style="display:block;margin-bottom:6px">Nome (obrigatório)</label>
        <input id="regName" name="name" type="text" required placeholder="Seu nome" style="width:100%;padding:8px;margin-bottom:8px">

        <label style="display:block;margin-bottom:6px">E-mail (opcional)</label>
        <input id="regEmail" name="email" type="email" placeholder="seu@exemplo.com" style="width:100%;padding:8px;margin-bottom:8px">

        <label style="display:block;margin-bottom:6px">Senha (exigida)</label>
        <input id="regPass" name="pass" type="password" required placeholder="Senha" style="width:100%;padding:8px;margin-bottom:12px">

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" id="regCancel" class="btn ghost">Cancelar</button>
          <button type="submit" class="btn">Confirmar inscrição</button>
        </div>
      </form>
    </div>
  `;

  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('open'), 15);
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    const elm = modal.querySelector('#regName');
    elm && elm.focus();
  }, 120);

  const form = modal.querySelector('#regForm');
  const btnCancel = modal.querySelector('#regCancel');
  const modalClose = modal.querySelector('#modalClose');

  function cleanup() {
    if (form) form.removeEventListener('submit', onSubmit);
    if (btnCancel) btnCancel.removeEventListener('click', onCancel);
    if (modalClose) modalClose.removeEventListener('click', onCancel);
  }

  function onCancel(e) {
    e && e.preventDefault();
    cleanup();
    closeModal();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const name = (modal.querySelector('#regName').value || '').trim();
    const email = (modal.querySelector('#regEmail').value || '').trim();
    const pass = (modal.querySelector('#regPass').value || '').trim();

    if (!name) return alert('Informe seu nome.');

    // valida senha (se já logado, não precisa)
    const ok = loggedIn || (pass && ADMIN_CRED && pass === String(ADMIN_CRED.pass));
    if (!ok) {
      alert('Senha inválida. Se você for o admin, use a senha correta ou realize login.');
      return;
    }

    // montar objeto de registro
    const reg = {
      eventId: ev.id,
      eventCity: ev.city,
      name,
      email: email || null,
      timestamp: Date.now(),
      by: (loggedIn ? 'auth' : 'password'),
      // informação extra do usuário autenticado (se houver)
      user: (typeof auth !== 'undefined' && auth.currentUser) ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || null
      } : null
    };

    try {
      // tenta salvar no Firestore — usa addDoc(collection(db,'registrations'), reg)
      if (typeof addDoc === 'function' && typeof db !== 'undefined') {
        await addDoc(collection(db, 'registrations'), reg);
        // opcional: também salvar localmente para cache/redundância
        saveRegistrationLocal(reg);
        cleanup();
        closeModal();
        alert('Inscrição confirmada e salva no Firestore. Obrigado!');
        return;
      } else {
        throw new Error('Firestore não disponível');
      }
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
      // fallback: salvar local
      try {
        saveRegistrationLocal(reg);
        cleanup();
        closeModal();
        alert('Não foi possível salvar no Firestore. Inscrição salva localmente (offline).');
        return;
      } catch (e2) {
        console.error('Erro no fallback local:', e2);
        alert('Erro ao registrar inscrição. Tente novamente mais tarde.');
      }
    }
  }

  form.addEventListener('submit', onSubmit);
  btnCancel.addEventListener('click', onCancel);
  if (modalClose) modalClose.addEventListener('click', onCancel);
}

/* substitui o comportamento antigo de "register" */
agendaGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  // tenta achar evento por id (matcher flexível: number|string)
  const ev = EVENTS.find(x => String(x.id) === String(id));
  if (!ev) return;

  if (action === 'details') openModal(ev);
  else if (action === 'register') {
    openRegistrationPrompt(ev);
  }
});


init();

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!loggedIn) { alert('Você precisa fazer login para salvar eventos.'); return; }

  const idVal = evId.value ? String(evId.value) : String(Date.now());
  const idStr = idVal;

  // Build newEvent (sem img por enquanto)
  const newEvent = {
    id: idStr,
    city: evCity.value.trim(),
    dateLabel: evDateLabel.value.trim(),
    month: evMonth.value.trim(),
    venue: evVenue.value.trim(),
    price: evPrice.value.trim(),
    img: '', // será preenchido abaixo
    description: evDesc.value.trim(),
    schedule: Array.from(schedList.querySelectorAll('.sched-item')).map(row => ({
      time: row.querySelector('.sched-time').value.trim(),
      title: row.querySelector('.sched-title').value.trim(),
      speaker: row.querySelector('.sched-speaker').value.trim()
    }))
  };

  if (!newEvent.city || !newEvent.dateLabel) {
    alert('Evento Salvo Com Sucesso!.');
    return;
  }

  try {
    // 1) Se o usuário selecionou um arquivo (evFile), envie esse arquivo para Storage
    let finalImgUrl = evImg.value && evImg.value.startsWith('http') ? evImg.value : evImg.value;
    const file = evFile.files && evFile.files[0];
    if (file) {
      const path = `events/${idStr}/banner_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      finalImgUrl = await getDownloadURL(sRef);
    } else if (currentImageDataURL && currentImageDataURL.startsWith('data:')) {
      // se for dataURL (imagem editada), converta para Blob e envie
      const blob = dataURLtoBlob(currentImageDataURL);
      const path = `events/${idStr}/banner.png`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, blob);
      finalImgUrl = await getDownloadURL(sRef);
    }
    newEvent.img = finalImgUrl || evImg.value || '';

    // 2) Salvar no Firestore (coleção 'events'), documento com id = idStr
    await setDoc(doc(db, 'events', idStr), newEvent);

    // Sucesso: limpar formulário, recarregar listagem
    clearEventForm();
    alert('Evento salvo com sucesso no Firebase.');
  } catch (err) {
    console.error(err);
    alert('Erro ao salvar evento: ' + (err.message || err));
  }
});

