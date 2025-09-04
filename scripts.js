// script.js — popula os cards com os dados da imagem
const DATA = [
  { id: 1, city: "CURITIBA/PR", date: "05, 06 e 07 de Setembro", venue: "TREINAMENTO PRESENCIAL", price: "GARANTA A SUA VAGA!", img: "card-1.jpg" },
  { id: 2, city: "CAMPO GRANDE/MS", date: "19, 20 e 21 de Setembro", venue: "TREINAMENTO PRESENCIAL", price: "GARANTA A SUA VAGA!", img: "card-2.jpg" },
  { id: 3, city: "PORTO ALEGRE/RS", date: "14, 15 e 16 de Novembro", venue: "TREINAMENTO PRESENCIAL", price: "GARANTA A SUA VAGA!", img: "card-3.jpg" },
  // center
  { id: 4, city: "SALVADOR/BA", date: "12, 13 e 14 de Dezembro", venue: "TREINAMENTO PRESENCIAL", price: "GARANTA A SUA VAGA!", img: "card-4.jpg", center: true }
];

const grid = document.getElementById('cardsGrid');
const centerCard = document.getElementById('centerCard');

function createCard(item) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `
    <div class="thumb" style="background-image:url('${item.img}')">
      <div class="thumb-logo">
        <div class="mark"></div>
        <div class="text">PROTAGON</div>
      </div>
      <div style="position:relative; z-index:2; padding-left:8px; padding-bottom:8px; font-size:16px; font-weight:700;">
        ${item.city}
      </div>
    </div>
    <div class="card-body">
      <div class="date"><span style="font-weight:700">📅</span> ${item.date}</div>
      <div class="pill">${item.venue}</div>
      <div class="card-footer">
        <div class="price">${item.price}</div>
        <button class="btn" data-id="${item.id}">GARANTA A SUA VAGA!</button>
      </div>
    </div>
  `;
  return el;
}

function render() {
  grid.innerHTML = '';
  DATA.filter(d => !d.center).forEach(d => grid.appendChild(createCard(d)));

  const center = DATA.find(d => d.center);
  if (center) {
    centerCard.className = 'card large';
    centerCard.innerHTML = `
      <div class="thumb" style="background-image:url('${center.img}')">
        <div class="thumb-logo">
          <div class="mark"></div>
          <div class="text">PROTAGON</div>
        </div>
        <div style="position:relative; z-index:2; padding-left:14px; padding-bottom:14px; font-size:18px; font-weight:700;">${center.city}</div>
      </div>
      <div class="card-body">
        <div class="date"><span style="font-weight:700">📅</span> ${center.date}</div>
        <div class="pill">${center.venue}</div>
        <div class="card-footer">
          <div class="price">${center.price}</div>
          <button class="btn" data-id="${center.id}">GARANTA A SUA VAGA!</button>
        </div>
      </div>
    `;
  }

  // attach handlers
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.id, 10);
      const item = DATA.find(x => x.id === id);
      openModal(item);
    });
  });
}

/* Modal simples */
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const closeModalBtn = document.getElementById('closeModal');

function openModal(item) {
  modalContent.innerHTML = `
    <h3 style="margin-top:0">${item.city}</h3>
    <p style="color:#bcd3c0">${item.date}</p>
    <p style="margin-top:12px">Você será redirecionado para garantir sua vaga.</p>
    <div style="margin-top:14px; display:flex; gap:10px;">
      <button id="confirm" class="btn">OK</button>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  document.getElementById('confirm').addEventListener('click', () => {
    alert('Redirecionando...'); closeModal();
  });
}
function closeModal() { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); }
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

/* inicia */
render();

const hero = document.querySelector('.hero');

setInterval(() => {
  hero.classList.toggle('active');
}, 4000);

