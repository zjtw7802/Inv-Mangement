const KEY = 'beautyguard.v1';

const seed = {
  products: [
    { id: 1, brand: '修丽可', name: 'CEF 精华', category: '护肤', season: 'all', purchaseDate: '2026-01-10', unopenedExpiry: '2028-01-10', opened: true, openedDate: '2026-02-01', paoMonths: 6, price: 1280, qty: 1, lastUsedDays: 1 },
    { id: 2, brand: '兰蔻', name: '小黑瓶精华', category: '护肤', season: 'all', purchaseDate: '2025-12-20', unopenedExpiry: '2027-12-20', opened: true, openedDate: '2026-01-15', paoMonths: 6, price: 980, qty: 1, lastUsedDays: 2 },
    { id: 3, brand: 'YSL', name: '恒久粉底液', category: '彩妆', season: 'all', purchaseDate: '2026-03-01', unopenedExpiry: '2028-03-01', opened: false, openedDate: '', paoMonths: 12, price: 620, qty: 1, lastUsedDays: 999 }
  ],
  usageLogs: [],
  emptyLogs: [],
  settings: { mode: 'simple', sortBy: 'priority', quickFilter: 'all' }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(seed);
    return { ...structuredClone(seed), ...JSON.parse(raw) };
  } catch {
    return structuredClone(seed);
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function nextId(items) {
  return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
}
