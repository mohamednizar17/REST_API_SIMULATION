const $ = (sel) => document.querySelector(sel);
const prettyCustom = (obj) => {
  const baseKeys = new Set(['id','name','description','price','quantity']);
  const entries = Object.entries(obj).filter(([k]) => !baseKeys.has(k));
  if (!entries.length) return '-';
  return entries.map(([k,v]) => `${k}: ${v}`).join(', ');
};

const state = {
  baseUrl: localStorage.getItem('baseUrl') || 'https://fast-api-demo-4qmb.onrender.com',
  items: [],
  charts: {}
};

function setBaseUrl(url) {
  state.baseUrl = url.replace(/\/$/, '');
  localStorage.setItem('baseUrl', state.baseUrl);
  $('#baseUrl').value = state.baseUrl;
  $('#baseUrlStatus').textContent = state.baseUrl;
}

async function fetchItems() {
  const res = await fetch(`${state.baseUrl}/items`);
  const data = await res.json();
  state.items = data.items || [];
  renderTable();
  renderStats();
  renderCharts();
}

function renderTable() {
  const tbody = $('#itemsTable tbody');
  tbody.innerHTML = '';
  state.items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.id ?? '-'}</td>
      <td>${item.name ?? '-'}</td>
      <td>${item.description ?? ''}</td>
      <td>${item.price ?? ''}</td>
      <td>${item.quantity ?? ''}</td>
      <td>${prettyCustom(item)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderStats() {
  $('#itemCount').textContent = state.items.length;
  const totalValue = state.items.reduce((sum,i) => sum + (Number(i.price || 0) * Number(i.quantity || 0)), 0);
  $('#totalValue').textContent = totalValue.toFixed(2);
}

function renderCharts() {
  const names = state.items.map(i => i.name || `Item ${i.id}`);
  const qty = state.items.map(i => i.quantity || 0);
  const values = state.items.map(i => (i.price || 0) * (i.quantity || 0));

  const palette = ['#22d3ee','#8b5cf6','#f59e0b','#10b981','#ef4444','#3b82f6','#e11d48','#14b8a6'];

  if (state.charts.qty) state.charts.qty.destroy();
  state.charts.qty = new Chart($('#qtyChart'), {
    type: 'bar',
    data: { labels: names, datasets: [{ label: 'Quantity', data: qty, backgroundColor: palette }] },
    options: { plugins: { legend: { display:false }}, scales:{ y:{ beginAtZero:true }}}
  });

  if (state.charts.value) state.charts.value.destroy();
  state.charts.value = new Chart($('#valueChart'), {
    type: 'pie',
    data: { labels: names, datasets: [{ data: values, backgroundColor: palette }] },
    options: { plugins: { legend: { position:'bottom' }}}
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setBaseUrl(state.baseUrl);
  $('#saveBaseUrl').addEventListener('click', () => setBaseUrl($('#baseUrl').value));
  $('#backPlay').addEventListener('click', () => { window.location.href = 'index.html'; });
  fetchItems().catch(() => {
    $('#itemCount').textContent = '0';
  });
});
