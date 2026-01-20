const $ = (sel) => document.querySelector(sel);
const pretty = (obj) => JSON.stringify(obj, null, 2);

const state = {
  baseUrl: localStorage.getItem('baseUrl') || 'https://fast-api-demo-4qmb.onrender.com',
  reqCount: 0,
  xp: 0,
  quests: { list: false, create: false, update: false, delete: false },
  customFields: [],
};

function setBaseUrl(url) {
  state.baseUrl = url.replace(/\/$/, '');
  localStorage.setItem('baseUrl', state.baseUrl);
  $('#baseUrl').value = state.baseUrl;
  $('#baseUrlStatus').textContent = state.baseUrl;
}

function viewReq(method, url, body) {
  $('#reqViewer').textContent = pretty({ method, url, body: body || undefined });
}
function viewRes(status, json) {
  $('#resViewer').textContent = pretty({ status, data: json });
}

function bumpStats(action) {
  state.reqCount += 1;
  $('#reqCount').textContent = state.reqCount;
  if (!state.quests[action]) {
    state.quests[action] = true;
    state.xp += 25;
    $('#xp').textContent = state.xp;
    $('#questsDone').textContent = Object.values(state.quests).filter(Boolean).length;
    document.querySelectorAll(`#questList li[data-quest="${action}"]`).forEach(li => li.classList.add('done'));
  }
}

async function api(method, path, payload, questKey) {
  const url = `${state.baseUrl}${path}`;
  viewReq(method, url, payload);
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { data = { note: 'No JSON body' }; }
  viewRes(`${res.status} ${res.statusText}`, data);
  bumpStats(questKey || 'list');
  if (!res.ok) throw new Error(data?.detail || 'Request failed');
  return data;
}

function randomItem() {
  const names = ['Laptop','Headphones','Keyboard','Mouse','Monitor','Tablet','Speaker','Camera'];
  const adj = ['Pro','Max','Lite','X','Plus','Neo'];
  const name = `${names[Math.floor(Math.random()*names.length)]} ${adj[Math.floor(Math.random()*adj.length)]}`;
  const price = +(Math.random()*1500 + 49).toFixed(2);
  const quantity = Math.floor(Math.random()*8)+1;
  const description = 'Auto-generated demo item';
  return { name, price, quantity, description };
}

function parseCustomValue(type, value) {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === 'true' || value === true;
  return value;
}

function renderCustomFields() {
  const holder = $('#customFieldsList');
  holder.innerHTML = '';
  const preview = {
    name: 'string',
    description: 'string?',
    price: 'number',
    quantity: 'number',
  };
  state.customFields.forEach((f, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip-small';
    chip.innerHTML = `<strong>${f.field}</strong>: ${f.value} (${f.type}) <button data-idx="${idx}">✕</button>`;
    chip.querySelector('button').addEventListener('click', () => {
      state.customFields.splice(idx,1);
      renderCustomFields();
    });
    holder.appendChild(chip);
    preview[f.field] = `${f.type}`;
  });
  $('#customPreview').textContent = pretty(preview);
}

function mergePayload(basePayload) {
  const extras = {};
  state.customFields.forEach(f => {
    extras[f.field] = parseCustomValue(f.type, f.value);
  });
  return { ...basePayload, ...extras };
}

// UI Wiring
window.addEventListener('DOMContentLoaded', () => {
  setBaseUrl(state.baseUrl);
  $('#xp').textContent = state.xp;
  $('#reqCount').textContent = state.reqCount;
  $('#questsDone').textContent = Object.values(state.quests).filter(Boolean).length;

  // Scroll shrink effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    const hero = $('.hero');
    if (currentScroll > 50) {
      hero.classList.add('scrolled');
    } else {
      hero.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  });

  $('#saveBaseUrl').addEventListener('click', () => setBaseUrl($('#baseUrl').value));

  // Custom fields form
  $('#customFieldForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const field = form.field.value.trim();
    const type = form.type.value;
    const value = form.value.value;
    if (!field) return;
    state.customFields.push({ field, type, value });
    form.reset();
    renderCustomFields();
  });
  renderCustomFields();

  // List items
  async function loadItems() {
    try {
      const data = await api('GET', '/items', null, 'list');
      $('#itemsOutput').textContent = pretty(data);
    } catch (e) {
      $('#itemsOutput').textContent = e.message;
    }
  }
  $('#refreshItems').addEventListener('click', loadItems);
  loadItems();

  // Create item
  $('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = mergePayload({
      name: form.name.value,
      description: form.description.value || undefined,
      price: parseFloat(form.price.value),
      quantity: form.quantity.value ? parseInt(form.quantity.value) : 0,
    });
    try {
      const data = await api('POST', '/items', payload, 'create');
      $('#createOutput').textContent = pretty(data);
      loadItems();
    } catch (err) {
      $('#createOutput').textContent = err.message;
    }
  });

  $('#createRandom').addEventListener('click', async () => {
    const payload = mergePayload(randomItem());
    try {
      const data = await api('POST', '/items', payload, 'create');
      $('#createOutput').textContent = pretty(data);
      loadItems();
    } catch (err) {
      $('#createOutput').textContent = err.message;
    }
  });

  // Update item
  $('#updateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = parseInt(form.id.value);
    const payload = mergePayload({});
    if (form.name.value) payload.name = form.name.value;
    if (form.description.value) payload.description = form.description.value;
    if (form.price.value) payload.price = parseFloat(form.price.value);
    if (form.quantity.value) payload.quantity = parseInt(form.quantity.value);
    try {
      const data = await api('PUT', `/items/${id}`, payload, 'update');
      $('#updateOutput').textContent = pretty(data);
      loadItems();
    } catch (err) {
      $('#updateOutput').textContent = err.message;
    }
  });

  // Delete item
  $('#deleteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const id = parseInt(form.id.value);
    try {
      const data = await api('DELETE', `/items/${id}`, null, 'delete');
      $('#deleteOutput').textContent = pretty(data);
      loadItems();
    } catch (err) {
      $('#deleteOutput').textContent = err.message;
    }
  });
});
