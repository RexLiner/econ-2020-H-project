// ── Tab switching ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════
function showTab(id, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  btn.classList.add('active');
}

// ── Utilities ───────────────────────────────────────────────
function roundTo(v, dp) { return Math.round(v * 10**dp) / 10**dp; }
function fmt(v) { return parseFloat(v.toFixed(2)).toString(); }
function setText(id, v) { document.getElementById(id).textContent = v; }

// ── Simple modal popup ───────────────────────────────
function showModal(title, message) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent  = message;
  document.getElementById('app-modal').style.display = 'flex';
}
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('modal-close');
  if (btn) btn.addEventListener('click', () => {
    document.getElementById('app-modal').style.display = 'none';
  });
  document.getElementById('app-modal').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
  });
});