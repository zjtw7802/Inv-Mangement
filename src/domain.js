export function toDate(input) {
  return input ? new Date(`${input}T00:00:00`) : null;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = toDate(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function daysLeft(dateStr) {
  const d = toDate(dateStr);
  if (!d) return 9999;
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((d - base) / (1000 * 60 * 60 * 24));
}

export function addMonths(dateStr, months) {
  const d = toDate(dateStr);
  if (!d) return null;
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().slice(0, 10);
}

// 双效期：min(未开封到期, 开封日期+PAO)
export function actualExpiry(item) {
  const unopened = item.unopenedExpiry;
  if (!item.opened || !item.openedDate) return unopened;
  const openedExpiry = addMonths(item.openedDate, item.paoMonths);
  if (!openedExpiry) return unopened;
  return unopened <= openedExpiry ? unopened : openedExpiry;
}

export function reminderLevel(leftDays) {
  if (leftDays < 0) return 'P0';
  if (leftDays <= 7) return 'P1';
  if (leftDays <= 30) return 'P2';
  return 'P3';
}

export function priorityScore(item) {
  const left = daysLeft(actualExpiry(item));
  const urgency = Math.max(0, 100 - Math.max(left, 0));
  const openWeight = item.opened ? 100 : 50;
  const priceWeight = Math.min(100, Number(item.price || 0) / 20);
  const recentUseDecay = Math.min(100, Number(item.lastUsedDays ?? 30) * 3);
  return urgency * 0.45 + priceWeight * 0.2 + openWeight * 0.2 + recentUseDecay * 0.15;
}
