// ═══════════════════════════════════════════════════════
//  TAB 3 — PRICE CONTROLS
// ═══════════════════════════════════════════════════════

let _pcType = null; // 'ceiling' or 'floor'

['pc-qd','pc-qs'].forEach(id => {
  document.getElementById(id).addEventListener('input', () =>
    previewLinear(id, id + '-preview', id === 'pc-qd' ? 'Qd' : 'Qs'));
});

function pcSolveEq() {
  const qd  = previewLinear('pc-qd','pc-qd-preview','Qd');
  const qs  = previewLinear('pc-qs','pc-qs-preview','Qs');
  const out = document.getElementById('pc-eq-out');
  if (!qd || !qs) { out.textContent = 'Fix equation errors first.'; return; }
  const denom = qd.pCoeff - qs.pCoeff;
  if (Math.abs(denom) < 1e-10) { out.textContent = 'Curves are parallel — no equilibrium.'; return; }
  const pStar = (qs.constant - qd.constant) / denom;
  const qStar = qd.pCoeff * pStar + qd.constant;
  if (pStar < 0 || qStar < 0) { out.innerHTML = `Negative equilibrium (P*=${fmt(pStar)}, Q*=${fmt(qStar)}) — check equations.`; return; }
  out.innerHTML = `<strong>P* = $${fmt(pStar)}</strong>, <strong>Q* = ${fmt(qStar)}</strong> — now set a price control below.`;
}

function pcSetType(type) {
  _pcType = type;
  const ceiling = document.getElementById('pc-ceiling');
  const floor   = document.getElementById('pc-floor');
  if (type === 'ceiling') { ceiling.style.fontWeight = '700'; floor.style.fontWeight = ''; }
  else                    { floor.style.fontWeight   = '700'; ceiling.style.fontWeight = ''; }
  document.getElementById('pc-eq-out').innerHTML += (document.getElementById('pc-eq-out').innerHTML.includes('→') ? '' : '') ;
}

let pcChart = null;

function drawPriceControl() {
  const errEl = document.getElementById('pc-err');
  errEl.textContent = '';

  const qd = previewLinear('pc-qd','pc-qd-preview','Qd');
  const qs = previewLinear('pc-qs','pc-qs-preview','Qs');
  if (!qd || !qs) { errEl.textContent = 'Enter valid Qd and Qs equations.'; return; }

  // Determine which control is active
  const ceilVal = parseFloat(document.getElementById('pc-ceiling').value);
  const floorVal = parseFloat(document.getElementById('pc-floor').value);

  // Popup if both are filled and no type explicitly selected
  if (!isNaN(ceilVal) && !isNaN(floorVal) && _pcType === null) {
    showModal('⚠️ Cannot use both at once', 'A market can only have a Price Ceiling OR a Price Floor — not both at the same time. Click "▶ Use Price Ceiling" or "▶ Use Price Floor" to choose which one to apply.');
    return;
  }
  if (!isNaN(ceilVal) && !isNaN(floorVal)) {
    showModal('⚠️ Cannot use both at once', 'You have entered both a Price Ceiling and a Price Floor. A market can only have one price control at a time. The graph will use the ' + (_pcType === 'ceiling' ? 'ceiling' : 'floor') + ' you last selected. Clear the other field to avoid confusion.');
    // don't return — allow the selected one to proceed
  }

  let controlled, type;
  if (!isNaN(ceilVal) && (isNaN(floorVal) || _pcType === 'ceiling')) {
    controlled = ceilVal; type = 'ceiling';
  } else if (!isNaN(floorVal)) {
    controlled = floorVal; type = 'floor';
  } else {
    errEl.textContent = 'Enter a ceiling or floor price, then click the ▶ Use button for the one you want.'; return;
  }

  // Find free market equilibrium
  const denom = qd.pCoeff - qs.pCoeff;
  if (Math.abs(denom) < 1e-10) { errEl.textContent = 'Curves are parallel — no equilibrium.'; return; }
  const pStar = (qs.constant - qd.constant) / denom;
  const qStar = qd.pCoeff * pStar + qd.constant;

  // Quantities at controlled price
  const qdCtrl = qd.pCoeff * controlled + qd.constant;
  const qsCtrl = qs.pCoeff * controlled + qs.constant;
  const qTraded = Math.min(qdCtrl, qsCtrl); // actual quantity exchanged

  const isBinding = type === 'ceiling' ? controlled < pStar : controlled > pStar;
  const gap       = Math.abs(qdCtrl - qsCtrl);

  // DWL triangle: between Q_traded and Q* on the supply/demand gap
  // Height = |P* - controlled| (price difference)
  // Base   = |Q* - Q_traded|
  const dwl = isBinding ? 0.5 * Math.abs(qStar - qTraded) * Math.abs(pStar - controlled) : 0;

  // Build chart data — sweep P from 0 to pMax
  const pMax  = niceMax(pStar, 2.4);
  const qMax  = niceMax(Math.max(qdCtrl, qsCtrl, qStar), 1.6);
  const sweep = (parsed) => {
    const pts = [];
    for (let i = 0; i <= 300; i++) {
      const P = (i / 300) * pMax;
      const Q = parsed.pCoeff * P + parsed.constant;
      if (Q >= 0) pts.push({x: Q, y: P});
    }
    return pts;
  };

  // DWL triangle vertices (in Q,P space)
  let dwlPts = [];
  if (isBinding && qTraded > 0) {
    if (type === 'ceiling') {
      // Triangle: (qTraded, controlled), (qStar, pStar), (qTraded, pStar) — upper right of equilibrium
      dwlPts = [{x: qTraded, y: controlled}, {x: qStar, y: pStar}, {x: qTraded, y: pStar}, {x: qTraded, y: controlled}];
    } else {
      // Floor: triangle below equilibrium
      dwlPts = [{x: qTraded, y: controlled}, {x: qStar, y: pStar}, {x: qTraded, y: pStar}, {x: qTraded, y: controlled}];
    }
  }

  // Shortage/surplus shading (horizontal bar between Qd and Qs at controlled price)
  const gapShade = isBinding ? [
    {x: Math.min(qdCtrl, qsCtrl), y: controlled},
    {x: Math.max(qdCtrl, qsCtrl), y: controlled}
  ] : [];

  // Update stats
  document.getElementById('pc-graph-card').style.display = 'block';
  document.getElementById('pc-graph-card').scrollIntoView({behavior:'smooth', block:'start'});
  document.getElementById('pc-graph-title').textContent =
    type === 'ceiling' ? 'Price Ceiling Graph' : 'Price Floor Graph';
  document.getElementById('pc-analysis-title').textContent =
    type === 'ceiling' ? '📊 Price Ceiling Analysis' : '📊 Price Floor Analysis';

  setText('pcstat-pstar',  '$' + fmt(pStar));
  setText('pcstat-pctrl',  '$' + fmt(controlled));
  setText('pcstat-type',   type === 'ceiling' ? 'Maximum price (ceiling)' : 'Minimum price (floor)');
  setText('pcstat-gap',    isBinding ? fmt(gap) + ' units' : 'Not binding');
  setText('pcstat-dwl',    isBinding ? '$' + fmt(dwl) : '$0 (not binding)');
  document.getElementById('pcstat-gap-lbl').textContent = type === 'ceiling' ? 'Shortage (Qd − Qs)' : 'Surplus (Qs − Qd)';
  document.getElementById('pcstat-gap-tile').className  = 'stat ' + (isBinding ? (type === 'ceiling' ? 'loss' : 'breakeven') : '');

  // Analysis items
  setText('an-pc-qd',      fmt(qdCtrl) + ' units');
  document.getElementById('an-pc-qd-f').textContent = `Qd at P=$${fmt(controlled)}`;
  setText('an-pc-qs',      fmt(qsCtrl) + ' units');
  document.getElementById('an-pc-qs-f').textContent = `Qs at P=$${fmt(controlled)}`;
  const gapLbl = type === 'ceiling' ? 'Shortage' : 'Surplus';
  document.getElementById('an-pc-gap-lbl').textContent = gapLbl;
  setText('an-pc-gap',     isBinding ? fmt(gap) + ' units' : 'None (not binding)');
  document.getElementById('an-pc-gap-f').textContent = `|Qd − Qs| = |${fmt(qdCtrl)} − ${fmt(qsCtrl)}|`;
  setText('an-pc-dwl',     isBinding ? '$' + fmt(dwl) : '$0');
  document.getElementById('an-pc-dwl-f').textContent = `½ × ${fmt(Math.abs(qStar - qTraded))} × $${fmt(Math.abs(pStar - controlled))}`;
  setText('an-pc-binding', isBinding
    ? `Yes — ${type === 'ceiling' ? 'ceiling below' : 'floor above'} P* = $${fmt(pStar)}`
    : `No — ${type === 'ceiling' ? 'ceiling above' : 'floor below'} P* = $${fmt(pStar)}, market unaffected`);
  document.getElementById('an-pc-binding-f').textContent = isBinding
    ? `Creates a ${gapLbl.toLowerCase()} of ${fmt(gap)} units and DWL of $${fmt(dwl)}`
    : 'A non-binding control has no effect on price or quantity.';
  setText('an-pc-who', type === 'ceiling'
    ? isBinding ? 'Buyers who can find the good benefit; sellers & unlucky buyers are hurt'
                : 'No one — ceiling is above market price, no effect'
    : isBinding ? 'Sellers who can find buyers benefit; buyers & unlucky sellers are hurt'
                : 'No one — floor is below market price, no effect');
  document.getElementById('an-pc-who-f').textContent = type === 'ceiling'
    ? 'Price ceilings typically help some consumers at the cost of efficiency'
    : 'Price floors typically help some producers at the cost of efficiency';

  if (pcChart) { pcChart.destroy(); pcChart = null; }

  const datasets = [
    // DWL triangle
    { label:'DWL', data: dwlPts, showLine: true, fill: true,
      borderColor:'rgba(180,100,0,0.7)', backgroundColor:'rgba(200,140,0,0.2)',
      pointRadius:0, borderWidth:1.5, tension:0, borderDash:[4,3] },
    // Demand
    { label:'Demand (D)', data: sweep(qd), showLine:true, fill:false,
      borderColor:'#3266ad', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // Supply
    { label:'Supply (S)', data: sweep(qs), showLine:true, fill:false,
      borderColor:'#b94040', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // Controlled price horizontal line
    { label: type === 'ceiling' ? 'Price Ceiling' : 'Price Floor',
      data: [{x:0, y:controlled}, {x:qMax, y:controlled}],
      showLine:true, fill:false,
      borderColor: type === 'ceiling' ? '#b94040' : '#3266ad',
      backgroundColor:'transparent', pointRadius:0, borderWidth:3, tension:0,
      borderDash:[] },
    // Equilibrium dot
    { label:'Equilibrium', data:[{x:qStar, y:pStar}], showLine:false,
      pointRadius:7, pointBackgroundColor:'#1a1a18', pointBorderColor:'#fff', pointBorderWidth:2.5 },
    // Dots at controlled price
    { label:'Qs at control', data:[{x:qsCtrl, y:controlled}], showLine:false,
      pointRadius:6, pointBackgroundColor:'#b94040', pointBorderColor:'#fff', pointBorderWidth:2 },
    { label:'Qd at control', data:[{x:qdCtrl, y:controlled}], showLine:false,
      pointRadius:6, pointBackgroundColor:'#3266ad', pointBorderColor:'#fff', pointBorderWidth:2 },
  ];

  const opts = baseOptions('Quantity (Q)', 'Price ($)', 0, qMax, 0, pMax);
  opts.layout = { padding: { right: 55, top: 15, bottom: 20 } };
  opts.plugins.tooltip.filter = item => item.dataset.label !== 'DWL';
  opts._pcMeta = { pStar, qStar, controlled, type, qdCtrl, qsCtrl, qTraded, isBinding, gap, dwl, sweep, qd, qs };

  pcChart = new Chart(document.getElementById('pcChart').getContext('2d'), {
    type: 'scatter', data: { datasets }, options: opts
  });
}

// ── Price Control label plugin ────────────────────────
const pcLabelPlugin = {
  id: 'pcLabels',
  afterDraw(chart) {
    const m = chart.options._pcMeta;
    if (!m) return;
    const { pStar, qStar, controlled, type, qdCtrl, qsCtrl, isBinding, gap, dwl, qd, qs } = m;
    const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
    const ca = chart.chartArea;
    ctx.save();
    ctx.beginPath(); ctx.rect(ca.left, ca.top, ca.right-ca.left, ca.bottom-ca.top); ctx.clip();
    const pxX = v => xs.getPixelForValue(v);
    const pxY = v => ys.getPixelForValue(v);

    // ── DWL shading triangle (drawn first, under labels) ──
    if (isBinding) {
      const qT = Math.min(qdCtrl, qsCtrl); // quantity actually traded
      ctx.beginPath();
      ctx.moveTo(pxX(qT),    pxY(controlled));
      ctx.lineTo(pxX(qStar), pxY(pStar));
      ctx.lineTo(pxX(qT),    pxY(pStar));
      ctx.closePath();
      ctx.fillStyle   = 'rgba(200,140,0,0.22)';
      ctx.strokeStyle = 'rgba(180,110,0,0.55)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4,3]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore(); // restore clip before drawing outside-chart labels
    ctx.save();

    // ── Drop-line from equilibrium ──
    ctx.beginPath(); ctx.setLineDash([5,4]);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.4;
    ctx.moveTo(pxX(qStar), pxY(pStar)); ctx.lineTo(pxX(qStar), ca.bottom); ctx.stroke();
    ctx.moveTo(pxX(qStar), pxY(pStar)); ctx.lineTo(ca.left,     pxY(pStar)); ctx.stroke();
    ctx.setLineDash([]);

    // ── Drop-lines at controlled price intersections ──
    if (isBinding) {
      [qsCtrl, qdCtrl].forEach((q, i) => {
        ctx.beginPath(); ctx.setLineDash([4,4]);
        ctx.strokeStyle = i===0 ? 'rgba(185,64,64,0.35)' : 'rgba(50,102,173,0.35)';
        ctx.lineWidth = 1.2;
        ctx.moveTo(pxX(q), pxY(controlled)); ctx.lineTo(pxX(q), ca.bottom); ctx.stroke();
        ctx.setLineDash([]);
      });

      // Shortage/surplus double-headed arrow
      const x1 = pxX(Math.min(qdCtrl, qsCtrl)), x2 = pxX(Math.max(qdCtrl, qsCtrl));
      const arrowY = pxY(controlled) + (type === 'ceiling' ? -22 : 22);
      const arrowColor = type === 'ceiling' ? '#b94040' : '#3266ad';
      ctx.strokeStyle = arrowColor; ctx.fillStyle = arrowColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1+6, arrowY); ctx.lineTo(x2-6, arrowY); ctx.stroke();
      const ah = 5;
      [[x1,1],[x2,-1]].forEach(([x,dir]) => {
        ctx.beginPath();
        ctx.moveTo(x + dir*6, arrowY);
        ctx.lineTo(x + dir*6 + dir*ah, arrowY-ah);
        ctx.lineTo(x + dir*6 + dir*ah, arrowY+ah);
        ctx.closePath(); ctx.fill();
      });
      ctx.font = 'bold 10.5px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = arrowColor;
      ctx.fillText(
        type === 'ceiling' ? `Shortage = ${fmt(gap)}` : `Surplus = ${fmt(gap)}`,
        (x1+x2)/2, arrowY + (type === 'ceiling' ? -13 : 13)
      );
    }

    // ── Curve labels — placed at END of curve, offset ABOVE the line ──
    // Use the point where curves exit the right side of the chart
    // and offset vertically so they don't sit on the line
    ctx.font = 'bold 12.5px -apple-system, sans-serif';
    const rightQ = xs.max * 0.88; // slightly before right edge so label is visible

    function curveP(parsed, q) {
      // Qd = a*P + b  →  P = (Q - b) / a
      if (Math.abs(parsed.pCoeff) < 1e-10) return null;
      return (q - parsed.constant) / parsed.pCoeff;
    }

    const dP = curveP(qd, rightQ);  // price on demand curve at rightQ
    const sP = curveP(qs, rightQ);  // price on supply curve at rightQ

    // D label: above the demand line (demand slopes down → label above it)
    if (dP !== null && dP >= ys.min && dP <= ys.max * 1.05) {
      ctx.fillStyle = '#3266ad';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('D', pxX(rightQ) + 4, pxY(dP) - 3);
    }
    // S label: below the supply line (supply slopes up → label below it)
    if (sP !== null && sP >= ys.min && sP <= ys.max * 1.05) {
      ctx.fillStyle = '#b94040';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('S', pxX(rightQ) + 4, pxY(sP) + 3);
    }

    // Control price label — right of chart, vertically centered on line
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = type === 'ceiling' ? '#b94040' : '#3266ad';
    ctx.fillText(
      type === 'ceiling' ? `Price Ceiling = $${fmt(controlled)}` : `Price Floor = $${fmt(controlled)}`,
      ca.right + 6, pxY(controlled)
    );

    // P*, Q* axis labels
    ctx.font = 'bold 10.5px -apple-system, sans-serif';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('P*', ca.left - 4, pxY(pStar));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Q*', pxX(qStar), ca.bottom + 5);

    // DWL label inside triangle
    if (isBinding) {
      const qT = Math.min(qdCtrl, qsCtrl);
      const dlQ = (qT + qStar) / 2;
      const dlP = (controlled + pStar) / 2;
      if (dlQ > 0 && dlP > 0) {
        ctx.font = 'bold 11px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(140,85,0,0.9)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('DWL', pxX(dlQ), pxY(dlP));
      }
    }

    ctx.restore();
  }
};
Chart.register(pcLabelPlugin);