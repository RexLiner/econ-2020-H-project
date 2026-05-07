function solveEquilibrium() {
  const qd = previewLinear('qd-eq','qd-preview','Qd');
  const qs = previewLinear('qs-eq','qs-preview','Qs');
  const out = document.getElementById('solve-output');
  if (!qd||!qs) { out.textContent='Fix equation errors first.'; return; }
  const denom = qd.pCoeff - qs.pCoeff;
  if (Math.abs(denom)<1e-10) { out.textContent='Curves are parallel — no unique equilibrium.'; return; }
  const pStar = (qs.constant - qd.constant) / denom;
  const qStar = qd.pCoeff*pStar + qd.constant;
  if (pStar<0||qStar<0) { out.innerHTML=`Solved: P*=${fmt(pStar)}, Q*=${fmt(qStar)} — negative equilibrium, check equations.`; return; }
  document.getElementById('p-star').value = roundTo(pStar,4);
  document.getElementById('q-star').value = roundTo(qStar,4);
  out.innerHTML=`<strong>P* = ${fmt(pStar)}</strong>, <strong>Q* = ${fmt(qStar)}</strong> — filled in below.`;
}

// ── Draw market graph ─────────────────────────────────
let marketChart = null;

function drawMarketGraph() {
  const errEl = document.getElementById('market-err');
  errEl.textContent='';
  const pStar = parseFloat(document.getElementById('p-star').value);
  const qStar = parseFloat(document.getElementById('q-star').value);
  if (isNaN(pStar)||isNaN(qStar)||pStar<=0||qStar<=0) { errEl.textContent='Enter valid positive P* and Q*.'; return; }
  const qd = previewLinear('qd-eq','qd-preview','Qd');
  const qs = previewLinear('qs-eq','qs-preview','Qs');
  if (!qd||!qs) { errEl.textContent='Fix equation errors above.'; return; }

  const pMax=niceMax(pStar,2.2), qMax=niceMax(qStar,2.2);
  const sweep=(parsed)=>{
    const pts=[]; for(let i=0;i<=300;i++){const P=(i/300)*pMax; const Q=parsed.pCoeff*P+parsed.constant; if(Q>=0)pts.push({x:Q,y:P});}
    return pts;
  };

  document.getElementById('market-graph-card').style.display='block';
  document.getElementById('market-graph-card').scrollIntoView({behavior:'smooth',block:'start'});
  document.getElementById('mstat-p').textContent='$'+fmt(pStar);
  document.getElementById('mstat-q').textContent=fmt(qStar);
  document.getElementById('mstat-tr').textContent='$'+fmt(pStar*qStar);

  if (marketChart) { marketChart.destroy(); marketChart=null; }
  marketChart = makeChart('marketChart', [
    {label:'Demand (D)', data:sweep(qd), color:'#3266ad', dash:[]},
    {label:'Supply (S)', data:sweep(qs), color:'#b94040', dash:[]},
  ], {x:qStar,y:pStar}, 0, qMax, 0, pMax, 'Quantity (Q)', 'Price ($)');
}

// ═══════════════════════════════════════════════════════
//  TAB 4 — CONSUMER & PRODUCER SURPLUS
// ═══════════════════════════════════════════════════════

['sur-qd','sur-qs'].forEach(id => {
  document.getElementById(id).addEventListener('input', () =>
    previewLinear(id, id + '-preview', id === 'sur-qd' ? 'Qd' : 'Qs'));
});

let surChart = null;

function surSolve() {
  const qd  = previewLinear('sur-qd','sur-qd-preview','Qd');
  const qs  = previewLinear('sur-qs','sur-qs-preview','Qs');
  const out = document.getElementById('sur-solve-out');
  if (!qd || !qs) { out.textContent = 'Fix equation errors first.'; return; }
  const denom = qd.pCoeff - qs.pCoeff;
  if (Math.abs(denom) < 1e-10) { out.textContent = 'No unique equilibrium — parallel curves.'; return; }
  const pStar = (qs.constant - qd.constant) / denom;
  const qStar = qd.pCoeff * pStar + qd.constant;
  if (pStar < 0 || qStar < 0) { out.textContent = `Equilibrium is negative — check equations.`; return; }

  // Intercepts
  // Demand: Qd = a*P + b  →  P-intercept (Q=0): P = -b/a (demand intercept = max WTP)
  const dPint = qd.pCoeff !== 0 ? -qd.constant / qd.pCoeff : null;
  // Supply: Qs = c*P + d  →  P-intercept (Q=0): P = -d/c (supply intercept = min WTA)
  const sPint = qs.pCoeff !== 0 ? -qs.constant / qs.pCoeff : null;

  const cs = dPint !== null ? 0.5 * qStar * (dPint - pStar) : null;
  const ps = sPint !== null ? 0.5 * qStar * (pStar - sPint) : null;
  const ts = (cs !== null && ps !== null) ? cs + ps : null;

  out.innerHTML = `<strong>P* = $${fmt(pStar)}</strong>, <strong>Q* = ${fmt(qStar)}</strong> — CS = $${cs !== null ? fmt(cs) : '?'}, PS = $${ps !== null ? fmt(ps) : '?'}, TS = $${ts !== null ? fmt(ts) : '?'}`;
}

function drawSurplusGraph() {
  const errEl = document.getElementById('sur-err');
  errEl.textContent = '';

  const qd = previewLinear('sur-qd','sur-qd-preview','Qd');
  const qs = previewLinear('sur-qs','sur-qs-preview','Qs');
  if (!qd || !qs) { errEl.textContent = 'Enter valid Qd and Qs equations.'; return; }

  const denom = qd.pCoeff - qs.pCoeff;
  if (Math.abs(denom) < 1e-10) { errEl.textContent = 'No equilibrium — parallel curves.'; return; }
  const pStar = (qs.constant - qd.constant) / denom;
  const qStar = qd.pCoeff * pStar + qd.constant;
  if (pStar <= 0 || qStar <= 0) { errEl.textContent = 'Equilibrium is negative — check equations.'; return; }

  // P-intercepts
  const dPint = qd.pCoeff !== 0 ? -qd.constant / qd.pCoeff : pStar * 2;
  const sPint = qs.pCoeff !== 0 ? Math.max(0, -qs.constant / qs.pCoeff) : 0;

  const cs = 0.5 * qStar * (dPint - pStar);
  const ps = 0.5 * qStar * (pStar - sPint);
  const ts = cs + ps;

  const pMax = niceMax(dPint, 1.18);
  const qMax = niceMax(qStar, 1.85);

  const sweep = (parsed) => {
    const pts = [];
    for (let i = 0; i <= 300; i++) {
      const P = (i / 300) * pMax;
      const Q = parsed.pCoeff * P + parsed.constant;
      if (Q >= 0) pts.push({x: Q, y: P});
    }
    return pts;
  };

  // CS triangle: (0, dPint) → (qStar, pStar) → (0, pStar) → back
  const csShade = [{x:0, y:dPint}, {x:qStar, y:pStar}, {x:0, y:pStar}, {x:0, y:dPint}];
  // PS triangle: (0, sPint) → (qStar, pStar) → (0, pStar) → back
  const psShade = [{x:0, y:sPint}, {x:qStar, y:pStar}, {x:0, y:pStar}, {x:0, y:sPint}];

  // Stats
  setText('surstat-cs',  '$' + fmt(cs));
  setText('surstat-ps',  '$' + fmt(ps));
  setText('surstat-ts',  '$' + fmt(ts));
  setText('surstat-eq',  `P*=$${fmt(pStar)}, Q*=${fmt(qStar)}`);

  setText('an-sur-cs',   '$' + fmt(cs));
  document.getElementById('an-sur-cs-f').textContent =
    `½ × ${fmt(qStar)} × ($${fmt(dPint)} − $${fmt(pStar)}) = $${fmt(cs)}`;
  setText('an-sur-ps',   '$' + fmt(ps));
  document.getElementById('an-sur-ps-f').textContent =
    `½ × ${fmt(qStar)} × ($${fmt(pStar)} − $${fmt(sPint)}) = $${fmt(ps)}`;
  setText('an-sur-ts',   '$' + fmt(ts));
  setText('an-sur-dint', '$' + fmt(dPint) + ' (max willingness to pay)');
  setText('an-sur-sint', '$' + fmt(sPint) + ' (min willingness to accept)');

  document.getElementById('sur-graph-card').style.display = 'block';
  document.getElementById('sur-graph-card').scrollIntoView({behavior:'smooth', block:'start'});

  if (surChart) { surChart.destroy(); surChart = null; }

  const datasets = [
    // CS shading — blue
    { label:'CS', data: csShade, showLine:true, fill:true,
      borderColor:'rgba(50,102,173,0.4)', backgroundColor:'rgba(50,102,173,0.18)',
      pointRadius:0, borderWidth:1, tension:0 },
    // PS shading — red/orange
    { label:'PS', data: psShade, showLine:true, fill:true,
      borderColor:'rgba(185,64,64,0.4)', backgroundColor:'rgba(185,64,64,0.18)',
      pointRadius:0, borderWidth:1, tension:0 },
    // Demand
    { label:'D', data: sweep(qd), showLine:true, fill:false,
      borderColor:'#3266ad', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // Supply
    { label:'S', data: sweep(qs), showLine:true, fill:false,
      borderColor:'#b94040', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // Equilibrium dot
    { label:'Equilibrium', data:[{x:qStar, y:pStar}], showLine:false,
      pointRadius:8, pointBackgroundColor:'#1a1a18', pointBorderColor:'#fff', pointBorderWidth:2.5 },
  ];

  const opts = baseOptions('Quantity (Q)', 'Price ($)', 0, qMax, 0, pMax);
  opts.layout = { padding: { right: 55, top: 15, bottom: 20 } };
  opts.plugins.tooltip.filter = item => !['CS','PS'].includes(item.dataset.label);
  opts._surMeta = { pStar, qStar, dPint, sPint, cs, ps, ts, qd, qs };

  surChart = new Chart(document.getElementById('surChart').getContext('2d'), {
    type: 'scatter', data: { datasets }, options: opts
  });
}

// ── Surplus label plugin ──────────────────────────────
const surLabelPlugin = {
  id: 'surLabels',
  afterDraw(chart) {
    const m = chart.options._surMeta;
    if (!m) return;
    const { pStar, qStar, dPint, sPint, cs, ps, qd, qs } = m;
    const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
    const ca  = chart.chartArea;
    ctx.save();

    // ── Re-draw shading triangles sharply via canvas ──────
    // (ensures clean fill regardless of Chart.js dataset order)
    ctx.beginPath(); ctx.rect(ca.left, ca.top, ca.right-ca.left, ca.bottom-ca.top); ctx.clip();
    const pxX = v => xs.getPixelForValue(v);
    const pxY = v => ys.getPixelForValue(v);

    // CS triangle: (0,dPint) → (qStar,pStar) → (0,pStar)
    ctx.beginPath();
    ctx.moveTo(pxX(0),     pxY(dPint));
    ctx.lineTo(pxX(qStar), pxY(pStar));
    ctx.lineTo(pxX(0),     pxY(pStar));
    ctx.closePath();
    ctx.fillStyle = 'rgba(50,102,173,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,102,173,0.35)'; ctx.lineWidth = 1.2;
    ctx.stroke();

    // PS triangle: (0,sPint) → (qStar,pStar) → (0,pStar)
    ctx.beginPath();
    ctx.moveTo(pxX(0),     pxY(sPint));
    ctx.lineTo(pxX(qStar), pxY(pStar));
    ctx.lineTo(pxX(0),     pxY(pStar));
    ctx.closePath();
    ctx.fillStyle = 'rgba(185,64,64,0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(185,64,64,0.32)'; ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
    ctx.save();

    // ── Dashed drop-lines to equilibrium ──
    ctx.beginPath(); ctx.setLineDash([5,4]);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.4;
    ctx.moveTo(pxX(qStar), pxY(pStar)); ctx.lineTo(pxX(qStar), ca.bottom); ctx.stroke();
    ctx.moveTo(pxX(qStar), pxY(pStar)); ctx.lineTo(ca.left,     pxY(pStar)); ctx.stroke();
    ctx.setLineDash([]);

    // ── CS label — placed inside triangle, clear of center ──
    {
      // Triangle centroid: ((0+qStar+0)/3, (dPint+pStar+pStar)/3)
      const cq = qStar / 3;
      const cp = (dPint + pStar + pStar) / 3;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(30,70,160,0.88)';
      ctx.fillText('CS', pxX(cq), pxY(cp));
      ctx.font = '10.5px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(30,70,160,0.7)';
      ctx.fillText('$' + fmt(cs), pxX(cq), pxY(cp) + 15);
    }

    // ── PS label — triangle centroid ──
    {
      const cq = qStar / 3;
      const cp = (sPint + pStar + pStar) / 3;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(155,40,40,0.88)';
      ctx.fillText('PS', pxX(cq), pxY(cp));
      ctx.font = '10.5px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(155,40,40,0.7)';
      ctx.fillText('$' + fmt(ps), pxX(cq), pxY(cp) + 15);
    }

    // ── Curve labels — offset from line ──
    // D label: at 80% of Q range, positioned ABOVE the demand line
    // S label: at 80% of Q range, positioned BELOW the supply line
    const rightQ = xs.max * 0.80;
    function curveP(parsed, q) {
      return Math.abs(parsed.pCoeff) > 1e-10 ? (q - parsed.constant) / parsed.pCoeff : null;
    }
    const dP = curveP(qd, rightQ);
    const sP = curveP(qs, rightQ);

    ctx.font = 'bold 12.5px -apple-system, sans-serif';
    if (dP !== null && dP >= ys.min && dP <= ys.max) {
      ctx.fillStyle = '#2555a0';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('D', pxX(rightQ) + 5, pxY(dP) - 3);  // above line
    }
    if (sP !== null && sP >= ys.min && sP <= ys.max) {
      ctx.fillStyle = '#a03030';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('S', pxX(rightQ) + 5, pxY(sP) + 3);   // below line
    }

    // ── Axis labels ──
    ctx.font = 'bold 10.5px -apple-system, sans-serif'; ctx.fillStyle = '#444';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('P*', ca.left - 4, pxY(pStar));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Q*', pxX(qStar), ca.bottom + 5);

    // ── Intercept labels — placed to the right of Y-axis (inside chart) ──
    // Max WTP label: just above and right of the Y-axis intercept
    ctx.font = '10px -apple-system, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(40,80,180,0.7)';
    ctx.fillText('Max WTP', ca.left + 4, pxY(dPint) - 2);

    if (sPint > ys.min + 0.5) {
      ctx.fillStyle = 'rgba(160,40,40,0.7)';
      ctx.textBaseline = 'top';
      ctx.fillText('Min WTA', ca.left + 4, pxY(sPint) + 2);
    }

    ctx.restore();
  }
};
Chart.register(surLabelPlugin);