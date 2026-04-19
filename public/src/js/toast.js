// ============================================================
// TOAST — notification system
// ============================================================
let toastEl = null;
let toastTimer = null;

export function initToast() {
  toastEl = document.getElementById('toast');
}

export function showToast(msg, duration = 2500) {
  if (!toastEl) return;
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}
