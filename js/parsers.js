// ═══════════════════════════════════════════════════════
//  MARKET EQUILIBRIUM — LINEAR PARSER  (Q = aP + b)
// ═══════════════════════════════════════════════════════
function parseLinearP(raw) {
  let s = raw.trim().replace(/\s+/g,'');
  if (!s) return null;
  if (/[^0-9Pp+\-*.]/.test(s)) return null;
  s = s.replace(/p/g,'P');
  if (s[0] !== '-') s = '+' + s;
  const terms = s.match(/[+\-][^+\-]+/g);
  if (!terms) return null;
  let pCoeff = 0, constant = 0;
  for (let t of terms) {
    if (t.includes('P')) {
      let c = t.replace(/\*?P/,'');
      if (c==='+' || c==='') c='+1';
      if (c==='-') c='-1';
      const v = parseFloat(c); if (isNaN(v)) return null;
      pCoeff += v;
    } else {
      const v = parseFloat(t); if (isNaN(v)) return null;
      constant += v;
    }
  }
  return { pCoeff, constant };
}

function fmtLinear({ pCoeff: a, constant: b }, label) {
  let s = '';
  if (a !== 0) s += (a===1?'':(a===-1?'-':a))+'P';
  if (b !== 0) { if (s && b>0) s+=' + '+b; else if (s && b<0) s+=' − '+Math.abs(b); else s+=b; }
  if (!s) s = '0';
  return label+' = '+s;
}

function previewLinear(inputId, previewId, label) {
  const raw = document.getElementById(inputId).value;
  const el  = document.getElementById(previewId);
  if (!raw.trim()) { el.textContent=''; el.className='parse-ok'; document.getElementById(inputId).classList.remove('error'); return null; }
  const p = parseLinearP(raw);
  if (!p) {
    el.textContent='⚠ Cannot parse. Try: -2P + 12';
    el.className='parse-err'; document.getElementById(inputId).classList.add('error'); return null;
  }
  el.textContent='✓ '+fmtLinear(p, label);
  el.className='parse-ok'; document.getElementById(inputId).classList.remove('error');
  return p;
}

document.getElementById('qd-eq').addEventListener('input',()=>previewLinear('qd-eq','qd-preview','Qd'));
document.getElementById('qs-eq').addEventListener('input',()=>previewLinear('qs-eq','qs-preview','Qs'));

// ── Solve ──────────────────────────────────────────────