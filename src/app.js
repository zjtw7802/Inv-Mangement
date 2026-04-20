import { loadState, saveState, nextId } from './store.js';
import { actualExpiry, daysLeft, formatDate, reminderLevel, priorityScore } from './domain.js';

const state = loadState();

const els = {
  clock: document.getElementById('clock'),
  screens: {
    inventory: document.getElementById('screen-inventory'),
    usage: document.getElementById('screen-usage'),
    empty: document.getElementById('screen-empty'),
    settings: document.getElementById('screen-settings')
  },
  tabs: [...document.querySelectorAll('.tab')],
  fab: document.getElementById('fab'),
  modal: document.getElementById('productModal'),
  productForm: document.getElementById('productForm'),
  closeModal: document.getElementById('closeModal'),
  title: document.getElementById('title'),
  subtitle: document.getElementById('subtitle')
};

function setClock() {
  const d = new Date();
  els.clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
setClock();
setInterval(setClock, 30_000);

function save() {
  saveState(state);
}

function pillByLevel(level) {
  if (level === 'P0') return '<span class="pill danger">已过期</span>';
  if (level === 'P1') return '<span class="pill warn">7天内</span>';
  return '<span class="pill safe">安全</span>';
}


function statusKey(item) {
  const left = daysLeft(actualExpiry(item));
  if (left < 0) return 'expired';
  if (left <= 7) return 'near';
  if (left <= 30) return 'soon';
  return 'safe';
}

function matchesQuickFilter(item, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'opened') return item.opened;
  if (filter === 'sealed') return !item.opened;
  if (filter === 'skincare') return item.category === '护肤';
  if (filter === 'makeup') return item.category === '彩妆';
  if (filter === 'expired') return statusKey(item) === 'expired';
  if (filter === 'near') return statusKey(item) === 'near';
  if (filter === 'soon') return statusKey(item) === 'soon';
  if (filter === 'safe') return statusKey(item) === 'safe';
  return true;
}

function inventoryList() {
  let items = [...state.products].filter(item => matchesQuickFilter(item, state.settings.quickFilter || 'all'));
  if (state.settings.sortBy === 'price') items.sort((a, b) => b.price - a.price);
  else if (state.settings.sortBy === 'expiry') items.sort((a, b) => daysLeft(actualExpiry(a)) - daysLeft(actualExpiry(b)));
  else items.sort((a, b) => priorityScore(b) - priorityScore(a));

  if (!items.length) {
    return '<div class="card muted">当前筛选下暂无产品，试试切换标签。</div>';
  }

  return items.map(item => {
    const expiry = actualExpiry(item);
    const left = daysLeft(expiry);
    const lv = reminderLevel(left);
    const usedRatio = Math.max(5, Math.min(100, 100 - Math.max(left, 0)));
    const secondary = state.settings.mode === 'pro'
      ? `<div class="muted">PAO ${item.paoMonths}月 · 未开封到期 ${formatDate(item.unopenedExpiry)}</div>`
      : '';

    return `<article class="card">
      <div class="row"><strong>${item.brand} ${item.name}</strong>${pillByLevel(lv)}</div>
      <div class="row muted"><span>${item.opened ? '已开封' : '未开封'} · ${item.category}</span><strong>剩余 ${left} 天</strong></div>
      ${secondary}
      <div class="progress"><span style="width:${usedRatio}%"></span></div>
      <div class="action">
        <button data-action="use" data-id="${item.id}">今天用一次</button>
        <button data-action="open" data-id="${item.id}">标记开封</button>
        <button data-action="delay" data-id="${item.id}">延后提醒</button>
        <button data-action="empty" data-id="${item.id}">标记空瓶</button>
      </div>
    </article>`;
  }).join('');
}

function usageList() {
  const logs = [...state.usageLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!logs.length) return '<div class="card muted">还没有使用日志，去囤货页点“今天用一次”吧。</div>';
  return logs.map(log => `<div class="card row"><div><strong>${log.name}</strong><div class="muted">${formatDate(log.date)} ${log.time}</div></div><strong>已用 ${log.leftDays} 天</strong></div>`).join('');
}

function emptyList() {
  const logs = [...state.emptyLogs].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!logs.length) return '<div class="card muted">还没有空瓶记录。</div>';
  return logs.map(log => `<div class="card row"><div><strong>${log.name}</strong><div class="muted">${formatDate(log.date)}</div></div><span class="pill safe">${log.repurchase ? '会回购' : '待评估'}</span></div>`).join('');
}

function settingsPanel() {
  const nearExpire = state.products.filter(i => daysLeft(actualExpiry(i)) <= 30).reduce((s, i) => s + Number(i.price || 0), 0);
  const saved = state.usageLogs.length * 20;
  return `
    <div class="kpis">
      <div class="card"><div class="muted">临期风险金额</div><strong>¥${nearExpire}</strong></div>
      <div class="card"><div class="muted">已规避浪费(估算)</div><strong>¥${saved}</strong></div>
    </div>
    <div class="card">
      <div class="row"><strong>显示模式</strong>
        <div>
          <button class="chip ${state.settings.mode === 'simple' ? 'active' : ''}" data-set-mode="simple">简洁</button>
          <button class="chip ${state.settings.mode === 'pro' ? 'active' : ''}" data-set-mode="pro">专业</button>
        </div>
      </div>
      <div class="row" style="margin-top:10px"><strong>排序规则</strong>
        <select id="sortSelector">
          <option value="priority" ${state.settings.sortBy === 'priority' ? 'selected' : ''}>智能优先</option>
          <option value="expiry" ${state.settings.sortBy === 'expiry' ? 'selected' : ''}>临期优先</option>
          <option value="price" ${state.settings.sortBy === 'price' ? 'selected' : ''}>价格优先</option>
        </select>
      </div>
    </div>
    <div class="card row"><strong>数据导出</strong><button id="exportBtn" class="chip">导出 CSV</button></div>
  `;
}

function render(screen = 'inventory') {
  const allCount = state.products.length;
  const nearCount = state.products.filter(i => statusKey(i) === 'near').length;
  const soonCount = state.products.filter(i => statusKey(i) === 'soon').length;
  const safeCount = state.products.filter(i => statusKey(i) === 'safe').length;

  const quick = state.settings.quickFilter || 'all';
  const quickBtn = (key, label) => `<button class="chip ${quick===key?'active':''}" data-quick-filter="${key}">${label}</button>`;

  els.screens.inventory.innerHTML = `
    <div class="toolbar-wrap">
      <div class="toolbar status-row">
        ${quickBtn('all', `● 全部 ${allCount}`)}
        ${quickBtn('near', `● 临期 ${nearCount}`)}
        ${quickBtn('soon', `● 即将 ${soonCount}`)}
        ${quickBtn('safe', `● 安全 ${safeCount}`)}
      </div>
      <div class="toolbar filter-row">
        ${quickBtn('all', `全部 ${allCount}`)}
        ${quickBtn('opened', '已开封')}
        ${quickBtn('sealed', '未开封')}
        ${quickBtn('skincare', '护肤')}
        ${quickBtn('makeup', '彩妆')}
        ${quickBtn('expired', '已过期')}
      </div>
    </div>
    <div class="card"><div class="row"><strong>我的囤货</strong><span class="pill warn">${state.products.filter(i => daysLeft(actualExpiry(i)) <= 30).length} 件需处理</span></div><p class="muted">支持快速过滤：状态 / 开封状态 / 品类。</p></div>
    ${inventoryList()}
  `;

  els.screens.usage.innerHTML = usageList();
  els.screens.empty.innerHTML = emptyList();
  els.screens.settings.innerHTML = settingsPanel();

  Object.entries(els.screens).forEach(([k, node]) => node.classList.toggle('hidden', k !== screen));
  els.tabs.forEach(t => t.classList.toggle('active', t.dataset.screen === screen));

  const map = {
    inventory: ['BeautyGuard', '双效期管理 · 囤货不浪费'],
    usage: ['使用日志', '记录每次使用，智能更新到期预估'],
    empty: ['空瓶记录', '沉淀复购清单与使用成就'],
    settings: ['设置', '提醒策略 / 排序 / 数据导出']
  };
  els.title.textContent = map[screen][0];
  els.subtitle.textContent = map[screen][1];
}

let currentScreen = 'inventory';
render(currentScreen);

els.tabs.forEach(tab => tab.addEventListener('click', () => {
  currentScreen = tab.dataset.screen;
  render(currentScreen);
}));

els.screens.inventory.addEventListener('click', (e) => {
  const filterBtn = e.target.closest('button[data-quick-filter]');
  if (filterBtn) {
    state.settings.quickFilter = filterBtn.dataset.quickFilter;
    save();
    render(currentScreen);
    return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const idx = state.products.findIndex(p => p.id === id);
  if (idx < 0) return;
  const item = state.products[idx];

  if (btn.dataset.action === 'use') {
    item.lastUsedDays = 0;
    const d = new Date();
    state.usageLogs.push({ name: `${item.brand} ${item.name}`, date: d.toISOString().slice(0, 10), time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, leftDays: daysLeft(actualExpiry(item)) });
  } else if (btn.dataset.action === 'open') {
    item.opened = true;
    if (!item.openedDate) item.openedDate = new Date().toISOString().slice(0, 10);
  } else if (btn.dataset.action === 'delay') {
    item.unopenedExpiry = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  } else if (btn.dataset.action === 'empty') {
    state.emptyLogs.push({ name: `${item.brand} ${item.name}`, date: new Date().toISOString().slice(0, 10), repurchase: true });
    state.products.splice(idx, 1);
  }

  save();
  render(currentScreen);
});

els.screens.settings.addEventListener('click', (e) => {
  const m = e.target.closest('[data-set-mode]');
  if (m) {
    state.settings.mode = m.dataset.setMode;
    save();
    render(currentScreen);
    return;
  }
  if (e.target.id === 'exportBtn') {
    const header = 'id,brand,name,category,opened,openedDate,unopenedExpiry,paoMonths,price,qty\n';
    const rows = state.products.map(i => [i.id, i.brand, i.name, i.category, i.opened, i.openedDate, i.unopenedExpiry, i.paoMonths, i.price, i.qty].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `beautyguard-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }
});

els.screens.settings.addEventListener('change', (e) => {
  if (e.target.id === 'sortSelector') {
    state.settings.sortBy = e.target.value;
    save();
    render(currentScreen);
  }
});

els.fab.addEventListener('click', () => els.modal.showModal());
els.closeModal.addEventListener('click', () => els.modal.close());

els.productForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(els.productForm);
  const opened = f.get('opened') === 'true';
  state.products.unshift({
    id: nextId(state.products),
    brand: String(f.get('brand')),
    name: String(f.get('name')),
    category: String(f.get('category')),
    season: String(f.get('season')),
    purchaseDate: String(f.get('purchaseDate')),
    unopenedExpiry: String(f.get('unopenedExpiry')),
    opened,
    openedDate: opened ? String(f.get('openedDate') || new Date().toISOString().slice(0, 10)) : '',
    paoMonths: Number(f.get('paoMonths')),
    price: Number(f.get('price') || 0),
    qty: Number(f.get('qty') || 1),
    lastUsedDays: 0
  });

  save();
  els.productForm.reset();
  els.modal.close();
  render('inventory');
});
