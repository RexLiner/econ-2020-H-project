// ═══════════════════════════════════════════════════════
//  MONOPOLY — EQUATION PARSERS
//  Parses P = a - bQ  or  MC = c + dQ  (linear in Q)
//  Returns { constant: a, qCoeff: -b } so val = constant + qCoeff*Q
// ═══════════════════════════════════════════════════════

function parseLinearQ(raw) {
  let s = raw.trim().replace(/\s+/g, '');
  if (!s) return null;
  // allow digits, Q, q, +, -, *, /, ., ^(only Q^-1 for ATC)
  if (/[^0-9Qq+\-*./^]/.test(s)) return null;
  s = s.replace(/q/g, 'Q');
  if (s[0] !== '-') s = '+' + s;
  const terms = s.match(/[+\-][^+\-]+/g);
  if (!terms) return null;
  let qCoeff = 0, constant = 0, invQ = 0;
  for (let t of terms) {
    if (t.includes('Q^-1') || t.includes('Q^−1') || (t.includes('/Q') && !t.includes('Q^'))) {
      // term like +10/Q or +10Q^-1
      const m = t.match(/^([+\-]?\d*\.?\d*)(?:\/Q|Q\^-1)$/);
      if (m) { let c = m[1]; if(c==='+' || c==='') c='1'; if(c==='-') c='-1'; invQ += parseFloat(c); }
    } else if (t.includes('Q')) {
      let c = t.replace(/\*?Q/, '');
      if (c==='+' || c==='') c='+1'; if (c==='-') c='-1';
      const v = parseFloat(c); if (isNaN(v)) return null;
      qCoeff += v;
    } else {
      const v = parseFloat(t); if (isNaN(v)) return null;
      constant += v;
    }
  }
  return { constant, qCoeff, invQ }; // val = constant + qCoeff*Q + invQ/Q
}

function evalLinQ(parsed, q) {
  if (!parsed) return null;
  if (q <= 0 && parsed.invQ !== 0) return null;
  return parsed.constant + parsed.qCoeff * q + (q > 0 ? parsed.invQ / q : 0);
}

function previewLinQ(inputId, previewId, label) {
  const raw = document.getElementById(inputId).value;
  const el  = document.getElementById(previewId);
  if (!raw.trim()) { el.textContent = ''; el.className = 'parse-ok'; document.getElementById(inputId).classList.remove('error'); return null; }
  const p = parseLinearQ(raw);
  if (!p) {
    el.textContent = '⚠ Cannot parse. Try: 12 - 2Q  or  4';
    el.className = 'parse-err'; document.getElementById(inputId).classList.add('error'); return null;
  }
  // Format display
  let str = '';
  if (p.constant !== 0) str += p.constant;
  if (p.qCoeff  !== 0) { const sign = p.qCoeff > 0 ? ' + ' : ' − '; str += (str ? sign : (p.qCoeff < 0 ? '−' : '')) + Math.abs(p.qCoeff) + 'Q'; }
  if (p.invQ    !== 0) { const sign = p.invQ   > 0 ? ' + ' : ' − '; str += sign + Math.abs(p.invQ) + '/Q'; }
  if (!str) str = '0';
  el.textContent = '✓ ' + label + ' = ' + str;
  el.className = 'parse-ok'; document.getElementById(inputId).classList.remove('error');
  return p;
}

['mon-demand','mon-mr','mon-mc','mon-atc'].forEach(id => {
  const previewId = id === 'mon-demand' ? 'mon-d-preview'
                  : id === 'mon-mr'     ? 'mon-mr-preview'
                  : id === 'mon-mc'     ? 'mon-mc-preview'
                  :                       'mon-atc-preview';
  const label     = id === 'mon-demand' ? 'P'   : id === 'mon-mr' ? 'MR' : id === 'mon-mc' ? 'MC' : 'ATC';
  document.getElementById(id).addEventListener('input', () => previewLinQ(id, previewId, label));
});

// Auto-derive MR from linear demand (P = a - bQ → MR = a - 2bQ)
function autoMR() {
  const d = previewLinQ('mon-demand','mon-d-preview','P');
  if (!d) { return; }
  if (d.invQ !== 0) { document.getElementById('mon-mr-preview').textContent = '⚠ Auto-derive only works for linear demand'; return; }
  // MR: same constant, double the Q coefficient
  const mrConst = d.constant;
  const mrQ     = d.qCoeff * 2;
  let str = mrConst !== 0 ? String(mrConst) : '';
  if (mrQ !== 0) {
    const sign = mrQ > 0 ? ' + ' : ' - ';
    str += (str ? sign : (mrQ < 0 ? '-' : '')) + Math.abs(mrQ) + 'Q';
  }
  document.getElementById('mon-mr').value = str || '0';
  previewLinQ('mon-mr','mon-mr-preview','MR');
}

// Solve Qmax: MR = MC  →  mrConst + mrQ*Q = mcConst + mcQ*Q
// (mrConst - mcConst) = (mcQ - mrQ)*Q
// Q = (mrConst - mcConst) / (mcQ - mrQ)
function solveMonopoly() {
  const d  = previewLinQ('mon-demand',  'mon-d-preview',  'P');
  const mr = previewLinQ('mon-mr',      'mon-mr-preview', 'MR');
  const mc = previewLinQ('mon-mc',      'mon-mc-preview', 'MC');
  const out = document.getElementById('mon-solve-out');
  if (!d || !mr || !mc) { out.textContent = 'Fix equation errors first.'; return; }

  // MR = MC: (mr.constant + mr.qCoeff*Q) = (mc.constant + mc.qCoeff*Q)
  const denom = mc.qCoeff - mr.qCoeff;
  if (Math.abs(denom) < 1e-10) {
    if (Math.abs(mr.constant - mc.constant) < 1e-10) {
      out.textContent = 'MR = MC for all Q — equations are identical.';
    } else {
      out.textContent = 'No solution: MR and MC are parallel and never intersect.';
    }
    return;
  }
  const qmax  = (mr.constant - mc.constant) / denom;
  const pstar = evalLinQ(d,  qmax);
  const mcVal = evalLinQ(mc, qmax);

  if (qmax <= 0) { out.innerHTML = 'Solved Q<sub>max</sub> = ' + fmt(qmax) + ' — negative, check equations.'; return; }

  // ATC at Qmax
  const atcParsed = previewLinQ('mon-atc','mon-atc-preview','ATC');
  const atcVal = atcParsed ? evalLinQ(atcParsed, qmax) : mcVal;

  // Fill in fields
  document.getElementById('mon-qmax').value    = roundTo(qmax, 4);
  document.getElementById('mon-pstar').value   = roundTo(pstar, 4);
  document.getElementById('mon-mc-val').value  = roundTo(mcVal, 4);
  document.getElementById('mon-atc-val').value = roundTo(atcVal, 4);

  out.innerHTML = '<strong>Q<sub>max</sub> = ' + fmt(qmax) + '</strong>, <strong>P* = $' + fmt(pstar) + '</strong>, MC = $' + fmt(mcVal) + ', ATC = $' + fmt(atcVal) + ' — filled in below.';
}

// ── Draw Monopoly Graph ───────────────────────────────
let monChart = null;

function drawMonopolyGraph() {
  const errEl = document.getElementById('mon-err');
  errEl.textContent = '';

  const qmax   = parseFloat(document.getElementById('mon-qmax').value);
  const pstar  = parseFloat(document.getElementById('mon-pstar').value);
  const mcVal  = parseFloat(document.getElementById('mon-mc-val').value);
  const atcVal = parseFloat(document.getElementById('mon-atc-val').value);

  if (isNaN(qmax) || qmax <= 0)  { errEl.textContent = 'Enter Qmax (solve first or type manually).'; return; }
  if (isNaN(pstar) || pstar <= 0){ errEl.textContent = 'Enter P*.'; return; }
  if (isNaN(mcVal))               { errEl.textContent = 'Enter MC at Qmax.'; return; }

  const dParsed  = previewLinQ('mon-demand',  'mon-d-preview',  'P');
  const mrParsed = previewLinQ('mon-mr',      'mon-mr-preview', 'MR');
  const mcParsed = previewLinQ('mon-mc',      'mon-mc-preview', 'MC');
  const atcParsed= parseLinearQ(document.getElementById('mon-atc').value.trim());

  if (!dParsed || !mrParsed || !mcParsed) { errEl.textContent = 'Fix equation errors above.'; return; }

  // Find competitive equilibrium: P = MC  →  d.constant + d.qCoeff*Q = mc.constant + mc.qCoeff*Q
  const compDenom = mcParsed.qCoeff - dParsed.qCoeff;
  let qComp = null, pComp = null;
  if (Math.abs(compDenom) > 1e-10) {
    qComp = (dParsed.constant - mcParsed.constant) / compDenom;
    pComp = evalLinQ(dParsed, qComp);
    if (qComp <= 0) { qComp = null; pComp = null; }
  }

  // Axis ranges
  const xMax = niceMax(qComp ? Math.max(qComp, qmax) : qmax, 1.55);
  const yMax = niceMax(Math.max(pstar, dParsed.constant || pstar), 1.18);
  const STEPS = 400;

  // Build curve points
  function buildCurve(parsed, xStart, xEnd) {
    const pts = [], dq = (xEnd - xStart) / STEPS;
    for (let i = 0; i <= STEPS; i++) {
      const q = xStart + i * dq;
      const y = evalLinQ(parsed, q);
      if (y !== null && isFinite(y) && y >= -0.5 && y <= yMax * 1.15) pts.push({x: q, y: Math.max(0, y)});
    }
    return pts;
  }

  const demandPts = buildCurve(dParsed,  0.01, xMax);
  const mrPts     = buildCurve(mrParsed, 0.01, xMax).filter(p => p.y >= 0);
  const mcPts     = buildCurve(mcParsed, 0,    xMax);

  // ATC: if provided and different from MC, draw it; else draw MC as flat ATC line
  let atcPts = [];
  const atcSrc = atcParsed || mcParsed;
  atcPts = buildCurve(atcSrc, 0.01, xMax);

  // MR line endpoint — where MR hits 0 or x-axis
  const mrEndQ = mrParsed.qCoeff < 0 ? -mrParsed.constant / mrParsed.qCoeff : xMax;

  // Profit shading: rectangle from Q=0 to Q=qmax, between P* and ATC
  const atcAtQ = isNaN(atcVal) ? mcVal : atcVal;
  const profit = (pstar - atcAtQ) * qmax;
  const isProfit = profit > 0.01;
  const isLoss   = profit < -0.01;
  const piHi = Math.max(pstar, atcAtQ), piLo = Math.min(pstar, atcAtQ);
  const profitShade = [{x:0,y:piHi},{x:qmax,y:piHi},{x:qmax,y:piLo},{x:0,y:piLo},{x:0,y:piHi}];
  const profitColor = isProfit ? 'rgba(42,122,75,0.18)' : isLoss ? 'rgba(185,64,64,0.18)' : 'rgba(200,170,0,0.1)';

  // DWL triangle: the welfare loss from Qmax to Qcomp
  // Correct vertices (Q on x-axis, P on y-axis):
  //   A = (Qmax, P*)     → point on demand curve at monopoly output
  //   B = (Qcomp, Pcomp) → competitive equilibrium (D = MC)
  //   C = (Qmax, mcVal)  → MC level at Qmax (bottom-left of triangle)
  // This forms the standard textbook DWL triangle
  const mcAtQmax = evalLinQ(mcParsed, qmax) || mcVal;
  let dwlShade = [], dwlArea = null;
  if (qComp && pComp !== null) {
    dwlShade = [
      {x: qmax,  y: pstar},   // A: top-left — monopoly price
      {x: qComp, y: pComp},   // B: top-right — competitive eq
      {x: qmax,  y: mcAtQmax}, // C: bottom-left — MC at Qmax
      {x: qmax,  y: pstar}    // close path
    ];
    // Area = ½ × base × height
    // base = Qcomp − Qmax (horizontal), height = P* − MC (vertical)
    dwlArea = 0.5 * Math.abs(qComp - qmax) * Math.abs(pstar - mcAtQmax);
  }

  // Vertical dashed lines: at Qmax down, at Qcomp down
  // Horizontal dashed lines: at P*, at ATC
  // These will be drawn by plugin

  document.getElementById('mon-graph-card').style.display = 'block';
  document.getElementById('mon-graph-card').scrollIntoView({ behavior:'smooth', block:'start' });

  // Stats
  setText('mstat-qmax',   fmt(qmax));
  setText('mstat-pstar',  '$' + fmt(pstar));
  setText('mstat-profit', (profit >= 0 ? '+' : '') + '$' + fmt(profit));
  setText('mstat-dwl',    dwlArea !== null ? '$' + fmt(dwlArea) : 'N/A (need D=MC intersection)');
  document.getElementById('mstat-profit-tile').className = 'stat ' + (isProfit ? 'profit' : isLoss ? 'loss' : 'breakeven');

  // Analysis
  setText('an-mon-profit', (profit >= 0 ? '+' : '') + '$' + fmt(profit));
  document.getElementById('an-mon-profit-formula').textContent =
    'π = Q × (P* − ATC) = ' + fmt(qmax) + ' × ($' + fmt(pstar) + ' − $' + fmt(atcAtQ) + ') = $' + fmt(profit);
  if (dwlArea !== null) {
    setText('an-mon-dwl', '$' + fmt(dwlArea));
    document.getElementById('an-mon-dwl-formula').textContent =
      'DWL = ½ × (' + fmt(qComp) + ' − ' + fmt(qmax) + ') × ($' + fmt(pstar) + ' − $' + fmt(mcVal) + ') = $' + fmt(dwlArea);
  } else {
    setText('an-mon-dwl', 'N/A');
  }
  const compTxt = qComp ? 'Q = ' + fmt(qComp) + ', P = $' + fmt(pComp) : 'Cannot find (parallel curves)';
  setText('an-mon-comp', compTxt);

  if (monChart) { monChart.destroy(); monChart = null; }

  const datasets = [
    // Demand — blue solid
    { label:'D', data:demandPts, showLine:true, fill:false,
      borderColor:'#3266ad', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // MR — purple solid
    { label:'MR', data:mrPts, showLine:true, fill:false,
      borderColor:'#7c3aab', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // MC — red (solid or near-flat)
    { label:'MC', data:mcPts, showLine:true, fill:false,
      borderColor:'#b94040', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    // ATC — orange (may overlap MC if same)
    { label:'ATC', data:atcPts, showLine:true, fill:false,
      borderColor:'#c96a12', backgroundColor:'transparent', pointRadius:0, borderWidth:2, tension:0,
      borderDash: atcParsed ? [] : [6,3] },
    // Qmax dot on demand curve (the monopoly price point)
    { label:'Monopoly P*', data:[{x:qmax, y:pstar}], showLine:false,
      pointRadius:7, pointBackgroundColor:'#3266ad', pointBorderColor:'#fff', pointBorderWidth:2 },
    // Qmax dot on MC=MR
    { label:'MR=MC', data:[{x:qmax, y:mcVal}], showLine:false,
      pointRadius:7, pointBackgroundColor:'#1a1a18', pointBorderColor:'#fff', pointBorderWidth:2 },
  ];

  if (qComp && pComp !== null) {
    datasets.push({
      label:'Comp. Eq.', data:[{x:qComp, y:pComp}], showLine:false,
      pointRadius:6, pointBackgroundColor:'#2a7a4b', pointBorderColor:'#fff', pointBorderWidth:2
    });
  }

  const opts = baseOptions('Quantity (Q)', 'Price / Cost ($)', 0, xMax, 0, yMax);
  opts.layout = { padding: { right: 50, top: 15, bottom: 20 } };
  opts.plugins.tooltip.filter = item => !['Profit/Loss','DWL','Shading'].includes(item.dataset.label);
  opts.plugins.tooltip.callbacks.label = c => {
    const lbl = c.dataset.label;
    if (lbl === 'Monopoly P*') return 'Monopoly Price: P* = $' + fmt(c.parsed.y) + ' at Q = ' + fmt(c.parsed.x);
    if (lbl === 'MR=MC')       return 'Profit-max: MR=MC at Q=' + fmt(c.parsed.x) + ', $' + fmt(c.parsed.y);
    if (lbl === 'Comp. Eq.')   return 'Competitive eq.: Q=' + fmt(c.parsed.x) + ', P=$' + fmt(c.parsed.y);
    return lbl + ': $' + fmt(c.parsed.y) + ' at Q=' + fmt(c.parsed.x);
  };

  // Plugin for on-graph labels, drop-lines, and region labels
  opts._monMeta = { qmax, pstar, mcVal, mcAtQmax, atcAtQ, qComp, pComp, isProfit, isLoss, profit, dwlArea, yMax,
                    dParsed, mrParsed, mcPts, atcPts, demandPts, mrPts };

  monChart = new Chart(document.getElementById('monChart').getContext('2d'), {
    type: 'scatter', data: { datasets }, options: opts
  });

  // Cache solution for price ceiling sub-graph
  cacheMonSolution(dParsed, mrParsed, mcParsed, qmax, pstar, qComp, pComp, atcAtQ);
}

// ── On-graph label plugin for monopoly ───────────────
const monopolyLabelPlugin = {
  id: 'monopolyLabels',
  afterDraw(chart) {
    const meta = chart.options._monMeta;
    if (!meta) return;
    const { qmax, pstar, mcVal, mcAtQmax, atcAtQ, qComp, pComp, isProfit, isLoss, profit, dwlArea,
            dParsed, mrParsed, mcPts, atcPts, demandPts, mrPts } = meta;
    const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
    const pxX = v => xs.getPixelForValue(v);
    const pxY = v => ys.getPixelForValue(v);
    const ca = chart.chartArea;

    // ── Clip to chart area for shading ──────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(ca.left, ca.top, ca.right - ca.left, ca.bottom - ca.top);
    ctx.clip();

    // ── Profit/loss region — follows ATC curve on bottom edge ──────────
    // Shape: ceiling line P* across top, ATC curve on bottom, bounded 0→Qmax
    if (Math.abs(pstar - atcAtQ) > 0.1) {
      const profitSteps = 120;
      const dqP = qmax / profitSteps;
      // Get ATC/MC parsed to trace curve (use atcPts dataset if available)
      const atcDs = chart.data.datasets ? chart.data.datasets.find(d => d.label === 'ATC') : null;
      const mcDs2 = chart.data.datasets ? chart.data.datasets.find(d => d.label === 'MC') : null;

      ctx.beginPath();
      // Top: horizontal line at P* from 0 to Qmax
      ctx.moveTo(pxX(0), pxY(pstar));
      ctx.lineTo(pxX(qmax), pxY(pstar));
      // Right edge down to ATC at Qmax
      ctx.lineTo(pxX(qmax), pxY(atcAtQ));
      // Bottom: trace ATC (or MC) dataset backwards from Qmax to 0
      const bottomDs = atcDs || mcDs2;
      if (bottomDs && bottomDs.data && bottomDs.data.length > 1) {
        // Find points within 0..Qmax range, reversed
        const inRange = bottomDs.data.filter(p => p.x >= 0 && p.x <= qmax);
        for (let i = inRange.length - 1; i >= 0; i--) {
          ctx.lineTo(pxX(inRange[i].x), pxY(inRange[i].y));
        }
      } else {
        // Fallback: flat line at atcAtQ
        ctx.lineTo(pxX(0), pxY(atcAtQ));
      }
      ctx.closePath();
      ctx.fillStyle   = isProfit ? 'rgba(42,122,75,0.18)' : 'rgba(185,64,64,0.18)';
      ctx.strokeStyle = isProfit ? 'rgba(42,122,75,0.45)' : 'rgba(185,64,64,0.45)';
      ctx.lineWidth   = 1.2;
      ctx.fill();
      ctx.stroke();
    }

    // ── DWL triangle: A=(Qmax,P*), B=(Qcomp,Pcomp), C=(Qmax,MC) ─────
    if (qComp && pComp !== null && dwlArea !== null) {
      const mcAtQmaxP = meta.mcAtQmax || mcVal;
      ctx.beginPath();
      ctx.moveTo(pxX(qmax),  pxY(pstar));       // A: monopoly price at Qmax
      ctx.lineTo(pxX(qComp), pxY(pComp));       // B: competitive equilibrium
      ctx.lineTo(pxX(qmax),  pxY(mcAtQmaxP));  // C: MC level at Qmax
      ctx.closePath();
      ctx.fillStyle   = 'rgba(200,140,0,0.28)';
      ctx.strokeStyle = 'rgba(150,95,0,0.75)';
      ctx.lineWidth   = 1.8;
      ctx.setLineDash([]);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // ── From here: draw outside clip so labels can overflow slightly ──
    ctx.save();

    // Helpers for drop-lines
    function vLine(q, fromY, color) {
      ctx.beginPath(); ctx.setLineDash([5,4]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.moveTo(pxX(q), pxY(fromY)); ctx.lineTo(pxX(q), ca.bottom);
      ctx.stroke(); ctx.setLineDash([]);
    }
    function hLine(yVal, x0, x1, color) {
      ctx.beginPath(); ctx.setLineDash([5,4]);
      ctx.strokeStyle = color; ctx.lineWidth = 1.4;
      ctx.moveTo(pxX(x0), pxY(yVal)); ctx.lineTo(pxX(x1), pxY(yVal));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Vertical drop-lines
    vLine(qmax,  pstar, 'rgba(0,0,0,0.38)');
    if (qComp) vLine(qComp, pComp, 'rgba(42,122,75,0.45)');

    // Horizontal reference lines
    hLine(pstar,  0, qmax,               'rgba(0,0,0,0.30)');
    hLine(mcVal,  0, qComp || qmax*1.3,  'rgba(185,64,64,0.30)');
    if (Math.abs(atcAtQ - mcVal) > 0.2) {
      hLine(atcAtQ, 0, qmax,             'rgba(201,106,18,0.30)');
    }

    // ── On-curve labels — find closest dataset point to target Q ──
    function evalCurveNear(pts, q) {
      if (!pts || pts.length < 2) return null;
      let best = null, bestDist = Infinity;
      for (const pt of pts) {
        const d = Math.abs(pt.x - q);
        if (d < bestDist) { bestDist = d; best = pt; }
      }
      return best;
    }

    const labelQ  = xs.max * 0.84; // D and MC label position
    const mrLabelQ = xs.max * 0.55; // MR hits zero sooner, label earlier

    ctx.font = 'bold 12px -apple-system, sans-serif';

    // D — above the demand line
    const dPt = evalCurveNear(demandPts, labelQ);
    if (dPt && dPt.y >= ys.min && dPt.y <= ys.max) {
      ctx.fillStyle = '#3266ad'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('D', pxX(dPt.x) + 5, pxY(dPt.y) - 5);
    }

    // MR — below the MR line, at earlier Q so it's still positive
    const mrPt = evalCurveNear(mrPts, mrLabelQ);
    if (mrPt && mrPt.y >= ys.min + 1 && mrPt.y <= ys.max) {
      ctx.fillStyle = '#7c3aab'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('MR', pxX(mrPt.x) + 8, pxY(mrPt.y) + 10);
    }

    // MC — above the MC line
    const mcLabelQ = xs.max * 0.80;
    const mcPtL = evalCurveNear(mcPts, mcLabelQ);
    if (mcPtL && mcPtL.y >= ys.min && mcPtL.y <= ys.max) {
      ctx.fillStyle = '#b94040'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('MC', pxX(mcPtL.x) + 5, pxY(mcPtL.y) - 5);
    }

    // ATC — below ATC line if different from MC
    if (atcPts && atcPts.length > 0 && Math.abs(atcAtQ - mcVal) > 0.1) {
      const atcPtL = evalCurveNear(atcPts, labelQ);
      if (atcPtL && atcPtL.y >= ys.min && atcPtL.y <= ys.max) {
        ctx.fillStyle = '#c96a12'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('ATC', pxX(atcPtL.x) + 5, pxY(atcPtL.y) + 5);
      }
    } else if (!atcPts || atcPts.length === 0 || Math.abs(atcAtQ - mcVal) <= 0.1) {
      // MC = ATC case — relabel MC
      if (mcPtL) {
        ctx.fillStyle = '#b94040'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('MC = ATC', pxX(mcPtL.x) + 5, pxY(mcPtL.y) - 5);
      }
    }

    // ── Axis tick labels ──────────────────────────────────
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#1a1a18';
    ctx.fillText('Qmax', pxX(qmax), ca.bottom + 5);
    if (qComp) {
      ctx.fillStyle = '#2a7a4b';
      ctx.fillText('Qcomp', pxX(qComp), ca.bottom + 5);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3266ad';
    ctx.fillText('P*', ca.left - 4, pxY(pstar));
    ctx.fillStyle = '#b94040';
    ctx.fillText('MC', ca.left - 4, pxY(mcVal));

    // ── π label inside profit rectangle ──────────────────
    if (Math.abs(pstar - atcAtQ) > 0.3) {
      // Centroid of rectangle
      const cq = qmax / 2;
      const cp = (pstar + atcAtQ) / 2;
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isProfit ? 'rgba(30,110,55,0.85)' : 'rgba(160,40,40,0.85)';
      ctx.fillText(isProfit ? '+π' : '−π', pxX(cq), pxY(cp));
    }

    // ── DWL label inside triangle ─────────────────────────
    // Centroid of triangle A=(Qmax,P*), B=(Qcomp,Pcomp), C=(Qmax,MC)
    if (qComp && dwlArea !== null) {
      const mcAtQmaxL = mcAtQmax ?? mcVal;
      const cq = (qmax + qComp + qmax) / 3;
      const cp = (pstar + pComp + mcAtQmaxL) / 3;
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(140,85,0,0.88)';
      ctx.fillText('DWL', pxX(cq), pxY(cp));
    }

    ctx.restore();
  }
};

Chart.register(monopolyLabelPlugin);

// ═══════════════════════════════════════════════════════
//  CHART FACTORIES
// ═══════════════════════════════════════════════════════
function makeChart(canvasId, lines, eqPt, xMin, xMax, yMin, yMax, xLabel, yLabel) {
  const datasets = lines.map(l=>({
    label:l.label, data:l.data, showLine:true,
    borderColor:l.color, backgroundColor: l.fill ? (l.bg||'transparent') : 'transparent',
    fill: l.fill||false,
    pointRadius:0, borderWidth:l.width||2.5,
    borderDash:l.dash||[], tension:0
  }));
  if(eqPt) datasets.push({
    label:'Equilibrium', data:[eqPt], showLine:false,
    pointRadius:8, pointBackgroundColor:'#1a1a18',
    pointBorderColor:'#fff', pointBorderWidth:2.5
  });
  return new Chart(document.getElementById(canvasId).getContext('2d'),{
    type:'scatter', data:{datasets},
    options: baseOptions(xLabel,yLabel,xMin,xMax,yMin,yMax)
  });
}

// ═══════════════════════════════════════════════════════
//  FIRM CHART — with on-curve labels, Q_max dropline, π label
// ═══════════════════════════════════════════════════════

// Custom Chart.js plugin: draws labels directly on curves
const firmLabelPlugin = {
  id: 'firmLabels',
  afterDraw(chart) {
    const meta = chart.options._firmMeta;
    if (!meta) return;
    const ctx = chart.ctx;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    // Helper: convert data coords → pixel coords
    const px = (x, y) => ({ x: xScale.getPixelForValue(x), y: yScale.getPixelForValue(y) });

    // Helper: find point on a dataset at a given x fraction (0–1)
    function ptAtFrac(pts, frac) {
      if (!pts || pts.length === 0) return null;
      const idx = Math.min(Math.floor(pts.length * frac), pts.length - 1);
      return pts[idx];
    }

    ctx.save();
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';

    // ── On-curve labels ──────────────────────────────
    // Each label: find a point ~80% along the curve, draw label to its right
    const labels = [
      { pts: meta.mcPts,  text: 'MC',    color: '#b94040', frac: 0.82, offsetX: 6, offsetY: -4 },
      { pts: meta.atcPts, text: 'ATC',   color: '#c96a12', frac: 0.87, offsetX: 6, offsetY:  0 },
      { pts: meta.avcPts, text: 'AVC',   color: '#1a7a7a', frac: 0.90, offsetX: 6, offsetY:  0 },
    ];

    for (const lbl of labels) {
      const pt = ptAtFrac(lbl.pts, lbl.frac);
      if (!pt || pt.y > chart.scales.y.max * 1.05) continue;
      const pix = px(pt.x, pt.y);
      if (pix.x > chart.chartArea.right - 5) continue; // don't draw outside chart
      ctx.fillStyle = lbl.color;
      ctx.fillText(lbl.text, pix.x + lbl.offsetX, pix.y + lbl.offsetY);
    }

    // ── P = MR label — right end of the MR line ──────
    if (meta.mrPts && meta.mrPts.length > 0) {
      const mrY = meta.mrPts[0].y;
      const labelX = chart.chartArea.right - 4;
      const labelY = yScale.getPixelForValue(mrY);
      ctx.fillStyle = '#3266ad';
      ctx.textAlign = 'right';
      ctx.fillText('P = MR', labelX, labelY - 9);
      ctx.textAlign = 'left';
    }

    // ── Q_max vertical dashed drop-line ──────────────
    if (meta.eqPt) {
      const eqPixX = xScale.getPixelForValue(meta.eqPt.x);
      const eqPixY = yScale.getPixelForValue(meta.eqPt.y);
      const baseY  = chart.chartArea.bottom;

      ctx.beginPath();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.moveTo(eqPixX, eqPixY);
      ctx.lineTo(eqPixX, baseY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Q_max label below x-axis
      ctx.fillStyle = '#1a1a18';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Qmax', eqPixX, baseY + 14);
      ctx.textAlign = 'left';
    }

    // ── ATC dot at Q_max ─────────────────────────────
    if (meta.eqPt && meta.atcPts && meta.atcPts.length > 0) {
      const qmx = meta.eqPt.x;
      // find closest ATC point to qmx
      const atcPt = meta.atcPts.reduce((best, p) =>
        Math.abs(p.x - qmx) < Math.abs(best.x - qmx) ? p : best, meta.atcPts[0]);
      const apix = px(atcPt.x, atcPt.y);
      ctx.beginPath();
      ctx.arc(apix.x, apix.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#b94040';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ── π label inside shading rectangle ─────────────
    if (meta.shadePts && meta.shadePts.length >= 4 && meta.eqPt) {
      const hi = meta.shadePts[0].y;  // top of shading
      const lo = meta.shadePts[2].y;  // bottom of shading
      const qr = meta.eqPt.x;         // right edge = Q_max
      // Center the π label in the rectangle
      const cx = qr * 0.45;
      const cy = (hi + lo) / 2;
      const cpix = px(cx, cy);
      if (cpix.x > chart.chartArea.left && cpix.y > chart.chartArea.top) {
        ctx.font = 'bold 15px Georgia, serif';
        ctx.fillStyle = meta.isProfit ? 'rgba(42,122,75,0.75)' : 'rgba(185,64,64,0.75)';
        ctx.textAlign = 'center';
        ctx.fillText(meta.isProfit ? '+π' : '−π', cpix.x, cpix.y);
        ctx.textAlign = 'left';
      }
    }

    ctx.restore();
  }
};

Chart.register(firmLabelPlugin);

function makeFirmChart(canvasId, shadeColor, mcPts, atcPts, avcPts, mrPts, shadePts, eqPt, isProfit, xMin, xMax, yMin, yMax) {
  const datasets = [
    // Shading first (behind everything)
    { label:'Shading', data:shadePts, showLine:true, fill:true,
      borderColor:'transparent', backgroundColor:shadeColor,
      pointRadius:0, borderWidth:0, tension:0 },
    // Cost curves
    { label:'MC',  data:mcPts,  showLine:true, fill:false,
      borderColor:'#b94040', backgroundColor:'transparent',
      pointRadius:0, borderWidth:2.5, tension:0, borderDash:[] },
    { label:'ATC', data:atcPts, showLine:true, fill:false,
      borderColor:'#c96a12', backgroundColor:'transparent',
      pointRadius:0, borderWidth:2.5, tension:0, borderDash:[] },
    { label:'AVC', data:avcPts, showLine:true, fill:false,
      borderColor:'#1a7a7a', backgroundColor:'transparent',
      pointRadius:0, borderWidth:2, tension:0, borderDash:[6,3] },
    // MR = P horizontal line
    { label:'P = MR', data:mrPts, showLine:true, fill:false,
      borderColor:'#3266ad', backgroundColor:'transparent',
      pointRadius:0, borderWidth:2.5, tension:0, borderDash:[9,4] },
  ];

  // Equilibrium dot at MR = MC intersection
  if (eqPt) datasets.push({
    label:'Q_max (MR=MC)', data:[eqPt], showLine:false,
    pointRadius:8, pointBackgroundColor:'#1a1a18',
    pointBorderColor:'#ffffff', pointBorderWidth:2.5
  });

  const opts = baseOptions('Quantity (q)', '$ Cost / Revenue', xMin, xMax, yMin, yMax);
  opts.layout = { padding: { right: 40, top: 10, bottom: 20 } };
  opts.plugins.tooltip.filter = item => item.dataset.label !== 'Shading';
  opts.plugins.tooltip.callbacks.label = c => {
    if (c.dataset.label === 'Q_max (MR=MC)') return 'Qmax = ' + fmt(c.parsed.x) + ',  P = $' + fmt(c.parsed.y);
    return c.dataset.label + ': $' + fmt(c.parsed.y) + ' at q = ' + fmt(c.parsed.x);
  };
  // Pass data for the plugin to use
  opts._firmMeta = { mcPts, atcPts, avcPts, mrPts, shadePts, eqPt, isProfit };

  return new Chart(document.getElementById(canvasId).getContext('2d'), {
    type: 'scatter',
    data: { datasets },
    options: opts
  });
}

// Round a value UP to a nice axis max with fine granularity
function niceMax(v, extra) {
  const val = v * (extra || 1.15);
  if (val <= 0) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  // Use ~10 ticks: pick step so that val/step ≈ 8-10
  const rawStep = val / 8;
  const stepMag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep = [1,2,2.5,5,10].map(f => f * stepMag).find(s => s >= rawStep) || stepMag * 10;
  return Math.ceil(val / niceStep) * niceStep;
}

function baseOptions(xLabel, yLabel, xMin, xMax, yMin, yMax) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 280 },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: c => `${c.dataset.label}: $${fmt(c.parsed.y)} at ${fmt(c.parsed.x)}` } }
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, font: { size: 11 }, color: '#6b6a64' },
        min: xMin, max: xMax,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { color: '#6b6a64' }
      },
      y: {
        title: { display: true, text: yLabel, font: { size: 11 }, color: '#6b6a64' },
        min: yMin, max: yMax,
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: { color: '#6b6a64', callback: v => '$' + v, maxTicksLimit: 10 }
      }
    }
  };
}

// ═══════════════════════════════════════════════════════
//  MONOPOLY PRICE CEILING GRAPH
//  Uses already-solved monopoly values — no re-entry needed
// ═══════════════════════════════════════════════════════

let monCeilChart = null;
let _monSolution = null; // stores last solved monopoly values

// Called at end of drawMonopolyGraph() to cache values
function cacheMonSolution(dP, mrP, mcP, qmax, pstar, qComp, pComp, atcAtQ) {
  _monSolution = { dP, mrP, mcP, qmax, pstar, qComp, pComp, atcAtQ };
  // Update display in ceiling sub-card
  setText('mon-ceil-pstar', '$' + fmt(pstar));
  setText('mon-ceil-qmax',  fmt(qmax));
  setText('mon-ceil-qcomp', qComp ? fmt(qComp) : 'N/A');
}

function drawMonCeiling() {
  const errEl = document.getElementById('mon-ceil-err');
  errEl.textContent = '';

  if (!_monSolution) {
    errEl.textContent = 'Solve the monopoly graph first (click "Generate Monopoly Graph" above).';
    return;
  }

  const ceiling = parseFloat(document.getElementById('mon-ceiling').value);
  if (isNaN(ceiling) || ceiling <= 0) { errEl.textContent = 'Enter a valid ceiling price.'; return; }

  const { dP, mrP, mcP, qmax, pstar, qComp, pComp, atcAtQ } = _monSolution;

  const isBinding = ceiling < pstar;

  // At ceiling price:
  // Qd at ceiling: from demand  Q = dP.constant + dP.qCoeff * ceiling
  // Qs at ceiling: from MC (supply) — treat MC as supply curve
  //   MC is constant or linear: Qs = (ceiling - mcP.constant) / mcP.qCoeff if qCoeff>0, else ceiling>=mc means full supply
  const qdAtCeil = evalLinQ(dP, ceiling);
  // Supply: if MC is flat (qCoeff≈0), Qs = qComp (firm produces competitive Q when P >= MC)
  // If ceiling < MC, Qs = 0
  let qsAtCeil;
  if (Math.abs(mcP.qCoeff) < 1e-6) {
    // flat MC — Qs = anything up to competitive quantity when P >= MC
    qsAtCeil = ceiling >= mcP.constant ? (qComp || qmax * 2) : 0;
  } else {
    qsAtCeil = Math.max(0, evalLinQ(mcP, ceiling));
  }

  const qTraded   = Math.min(qdAtCeil, qsAtCeil);
  const shortage  = Math.max(0, qdAtCeil - qsAtCeil);

  // DWL that remains after ceiling:
  // Original DWL was triangle from Qmax to Qcomp
  // After ceiling at qTraded, remaining DWL = triangle from qTraded to Qcomp
  // = ½ × (Qcomp - qTraded) × (Pcomp_demand - MC_at_qcomp)
  // Simplified: remaining DWL ≈ ½ × (Qcomp - qTraded) × (ceiling - mcAtComp)
  const mcAtComp  = evalLinQ(mcP, qComp || qmax) || mcP.constant;
  const dAtTraded = evalLinQ(dP, qTraded);
  const remainDWL = qComp ? Math.max(0, 0.5 * (qComp - qTraded) * Math.abs(dAtTraded - mcAtComp)) : null;

  // CS gained vs pure monopoly: rectangle between P* and ceiling, from 0 to qTraded
  const csGain = isBinding ? (pstar - ceiling) * qTraded : 0;

  // Build curve points
  const xMax = niceMax(qComp ? Math.max(qComp, qmax) : qmax, 1.65);
  const yMax = niceMax(Math.max(pstar, dP.constant || pstar), 1.22);
  const STEPS = 400;

  function buildC(parsed, x0, x1) {
    const pts = [], dq = (x1 - x0) / STEPS;
    for (let i = 0; i <= STEPS; i++) {
      const q = x0 + i * dq;
      const y = evalLinQ(parsed, q);
      if (y !== null && isFinite(y) && y >= 0 && y <= yMax * 1.1) pts.push({ x: q, y: y });
    }
    return pts;
  }

  const demandPts = buildC(dP,  0.01, xMax);
  const mrPts     = buildC(mrP, 0.01, xMax).filter(p => p.y >= 0);
  const mcPts_    = buildC(mcP, 0,    xMax);
  const ceilLine  = [{ x: 0, y: ceiling }, { x: xMax, y: ceiling }];

  // Shading regions (drawn via plugin):
  // 1. CS gained = green rectangle: x 0→qTraded, y ceiling→pstar
  // 2. Remaining DWL triangle: (qTraded, ceiling_demand_price) → (qComp, pComp) → (qTraded, mcAtTraded)
  // 3. Shortage bar: qsAtCeil → qdAtCeil at ceiling price

  document.getElementById('mon-ceil-graph-wrap').style.display = 'block';
  document.getElementById('mon-ceil-graph-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Stats
  setText('mcs-ceiling',  '$' + fmt(ceiling));
  setText('mcs-shortage', isBinding ? fmt(shortage) + ' units' : 'Not binding (ceiling above P*)');
  const bindSub = document.getElementById('mcs-binding-sub');
  if (bindSub) bindSub.textContent = isBinding ? 'Below P* = $' + fmt(pstar) : 'Above P* — no effect';

  if (monCeilChart) { monCeilChart.destroy(); monCeilChart = null; }

  const datasets = [
    { label:'D',  data:demandPts, showLine:true, fill:false, borderColor:'#3266ad', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    { label:'MR', data:mrPts,     showLine:true, fill:false, borderColor:'#7c3aab', backgroundColor:'transparent', pointRadius:0, borderWidth:2,   tension:0 },
    { label:'MC', data:mcPts_,    showLine:true, fill:false, borderColor:'#b94040', backgroundColor:'transparent', pointRadius:0, borderWidth:2.5, tension:0 },
    { label:'Ceiling', data:ceilLine, showLine:true, fill:false, borderColor:'#c00', backgroundColor:'transparent', pointRadius:0, borderWidth:3, tension:0, borderDash:[] },
    { label:'Qmax',  data:[{ x:qmax,  y:pstar }],  showLine:false, pointRadius:8, pointBackgroundColor:'#1a1a18', pointBorderColor:'#fff', pointBorderWidth:2 },
    { label:'Qcomp', data: qComp ? [{ x:qComp, y:pComp }] : [], showLine:false, pointRadius:7, pointBackgroundColor:'#2a7a4b', pointBorderColor:'#fff', pointBorderWidth:2 },
  ];

  const opts = baseOptions('Quantity (Q)', 'Price / Cost ($)', 0, xMax, 0, yMax);
  opts.layout = { padding: { right: 55, top: 15, bottom: 22 } };
  opts.plugins.tooltip.callbacks.label = c => {
    if (c.dataset.label === 'Ceiling') return `Price Ceiling = $${fmt(c.parsed.y)}`;
    if (c.dataset.label === 'Qmax')    return `Qmax = ${fmt(c.parsed.x)}, P* = $${fmt(c.parsed.y)}`;
    if (c.dataset.label === 'Qcomp')   return `Qcomp = ${fmt(c.parsed.x)}, P = $${fmt(c.parsed.y)}`;
    return `${c.dataset.label}: $${fmt(c.parsed.y)} at Q=${fmt(c.parsed.x)}`;
  };

  // Store data for plugin — pass mcP from _monSolution so getATC works correctly
  // atcP: use entered ATC equation if present, otherwise use mcP (which has correct qCoeff)
  const rawAtcStr = document.getElementById('mon-atc').value.trim();
  const atcParsedCeil = (rawAtcStr && rawAtcStr.length > 0)
    ? (parseLinearQ(rawAtcStr) || mcP)
    : mcP;  // mcP already has correct constant AND qCoeff (e.g. 5 + 20Q)
  opts._ceilMeta = {
    ceiling, pstar, qmax, qComp, pComp, qTraded, qdAtCeil, qsAtCeil,
    shortage, isBinding, csGain, dP, mcP, atcP: atcParsedCeil, yMax
  };

  monCeilChart = new Chart(document.getElementById('monCeilChart').getContext('2d'), {
    type: 'scatter', data: { datasets }, options: opts
  });
}

// ── Price ceiling label + shading plugin ─────────────
const monCeilPlugin = {
  id: 'monCeilLabels',
  afterDraw(chart) {
    const m = chart.options._ceilMeta;
    if (!m) return;
    const { ceiling, pstar, qmax, qComp, pComp, qTraded, qdAtCeil, qsAtCeil,
            shortage, isBinding, dP, mcP, atcP } = m;
    const ctx = chart.ctx, xs = chart.scales.x, ys = chart.scales.y;
    const ca  = chart.chartArea;
    const pxX = v => xs.getPixelForValue(v);
    const pxY = v => ys.getPixelForValue(v);

    // ── Helpers (scoped at top so usable everywhere) ──────
    function getATC(q) {
      const qSafe = Math.max(q, 0.01);
      // evalLinQ returns constant + qCoeff*q + invQ/q
      // This correctly handles both flat (MC=4) and sloped (MC=5+20Q) curves
      if (atcP) {
        const v = evalLinQ(atcP, qSafe);
        if (v !== null && isFinite(v) && v > 0) return v;
      }
      const v2 = evalLinQ(mcP, qSafe);
      if (v2 !== null && isFinite(v2) && v2 > 0) return v2;
      return mcP.constant || 0;
    }

    function nearestPt(dataset, targetX) {
      if (!dataset || !dataset.data || dataset.data.length < 2) return null;
      let best = null, bestD = Infinity;
      for (const pt of dataset.data) {
        const d = Math.abs(pt.x - targetX);
        if (d < bestD) { bestD = d; best = pt; }
      }
      return best;
    }

    const firmReceives = isBinding ? ceiling : pstar;
    const atcAtQmax    = getATC(qmax);
    const showProfit   = firmReceives > atcAtQmax + 0.5;
    const showLoss     = firmReceives < atcAtQmax - 0.5;

    // ── 1. CLIP BLOCK — canvas shading ───────────────────
    ctx.save();
    ctx.beginPath();
    ctx.rect(ca.left, ca.top, ca.right - ca.left, ca.bottom - ca.top);
    ctx.clip();

    // π region — area between ceiling line and ATC curve, 0 to Qmax
    // Color determined by whether ceiling > ATC at Qmax (the profit-max point)
    if (showProfit || showLoss) {
      const steps = 200;
      const dqP   = qmax / steps;
      const isLoss = showLoss; // determined by ATC at Qmax vs ceiling

      ctx.beginPath();
      // Ceiling line: left to right
      ctx.moveTo(pxX(0),    pxY(firmReceives));
      ctx.lineTo(pxX(qmax), pxY(firmReceives));
      // Right edge to ATC at Qmax
      ctx.lineTo(pxX(qmax), pxY(atcAtQmax));
      // ATC curve back from Qmax to 0
      for (let i = steps - 1; i >= 0; i--) {
        const q = i * dqP;
        ctx.lineTo(pxX(q), pxY(getATC(q)));
      }
      ctx.closePath();
      ctx.fillStyle   = isLoss ? 'rgba(185,64,64,0.20)' : 'rgba(42,122,75,0.22)';
      ctx.strokeStyle = isLoss ? 'rgba(185,64,64,0.50)' : 'rgba(42,122,75,0.55)';
      ctx.lineWidth   = 1.3;
      ctx.fill();
      ctx.stroke();
    }

    // DWL triangle — same as main monopoly graph
    if (qComp && pComp !== null) {
      const mcAtQmax = (evalLinQ(mcP, qmax) !== null) ? evalLinQ(mcP, qmax) : mcP.constant;
      ctx.beginPath();
      ctx.moveTo(pxX(qmax),  pxY(pstar));
      ctx.lineTo(pxX(qComp), pxY(pComp));
      ctx.lineTo(pxX(qmax),  pxY(mcAtQmax));
      ctx.closePath();
      ctx.fillStyle   = 'rgba(200,140,0,0.28)';
      ctx.strokeStyle = 'rgba(150,95,0,0.75)';
      ctx.lineWidth   = 1.8;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();

    // ── 2. UNCLIPPED BLOCK — lines, labels, text ─────────
    ctx.save();

    // Shortage arrow
    if (isBinding && shortage > 0.01) {
      const x1 = pxX(qsAtCeil), x2 = pxX(qdAtCeil);
      const ay = pxY(ceiling) - 22;
      ctx.strokeStyle = '#c00'; ctx.fillStyle = '#c00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x1+8, ay); ctx.lineTo(x2-8, ay); ctx.stroke();
      [[x1,1],[x2,-1]].forEach(([x,d]) => {
        ctx.beginPath();
        ctx.moveTo(x+d*7,ay); ctx.lineTo(x+d*13,ay-4); ctx.lineTo(x+d*13,ay+4);
        ctx.closePath(); ctx.fill();
      });
      ctx.font = 'bold 10.5px -apple-system,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#c00';
      ctx.fillText('Shortage = ' + fmt(shortage) + ' units', (x1+x2)/2, ay-4);
    }

    // Drop-lines
    ctx.setLineDash([5,4]); ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pxX(qmax), pxY(pstar)); ctx.lineTo(pxX(qmax), ca.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pxX(qmax), pxY(pstar)); ctx.lineTo(ca.left,   pxY(pstar)); ctx.stroke();
    if (qComp) {
      ctx.strokeStyle = 'rgba(42,122,75,0.4)';
      ctx.beginPath(); ctx.moveTo(pxX(qComp),pxY(pComp)); ctx.lineTo(pxX(qComp),ca.bottom); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Curve labels — find nearest dataset point to target x, offset text off the line
    const dDs  = chart.data.datasets.find(d => d.label === 'D');
    const mrDs = chart.data.datasets.find(d => d.label === 'MR');
    const mcDs = chart.data.datasets.find(d => d.label === 'MC');

    ctx.font = 'bold 12px -apple-system,sans-serif';

    // D — label above line at 80% of x-axis
    const dPt = nearestPt(dDs, xs.max * 0.80);
    if (dPt && pxY(dPt.y) >= ca.top && pxY(dPt.y) <= ca.bottom) {
      ctx.fillStyle = '#3266ad'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('D', pxX(dPt.x) + 4, pxY(dPt.y) - 6);
    }

    // MR — find 80% through positive MR points, label below and to the right
    const validMR = mrDs ? mrDs.data.filter(p => p.y > 0.5) : [];
    if (validMR.length > 0) {
      const mrPt = validMR[Math.floor(validMR.length * 0.80)];
      if (pxY(mrPt.y) >= ca.top && pxY(mrPt.y) <= ca.bottom) {
        ctx.fillStyle = '#7c3aab'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('MR', pxX(mrPt.x) + 8, pxY(mrPt.y) + 10);
      }
    }

    // MC — label above line at 75% of x-axis
    const mcPt = nearestPt(mcDs, xs.max * 0.75);
    if (mcPt && pxY(mcPt.y) >= ca.top && pxY(mcPt.y) <= ca.bottom) {
      ctx.fillStyle = '#b94040'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText('MC', pxX(mcPt.x) + 4, pxY(mcPt.y) - 6);
    }

    // Axis labels
    ctx.font = 'bold 10.5px -apple-system,sans-serif';
    ctx.fillStyle = '#444';   ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('P*',     ca.left - 4, pxY(pstar));
    ctx.fillStyle = '#c00';
    ctx.fillText('P ceil', ca.left - 4, pxY(ceiling));
    ctx.fillStyle = '#1a1a18'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Qmax', pxX(qmax), ca.bottom + 5);
    if (qComp) { ctx.fillStyle = '#2a7a4b'; ctx.fillText('Qcomp', pxX(qComp), ca.bottom + 5); }

    // π label — sign and color based on Qmax (overall picture)
    if (showProfit || showLoss) {
      const midQ   = qmax * 0.5;
      const atcMid = getATC(midQ);
      const midP   = (firmReceives + atcMid) / 2;
      ctx.font = 'bold 13px Georgia,serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = showLoss ? 'rgba(185,64,64,0.92)' : 'rgba(30,110,55,0.92)';
      ctx.fillText(showLoss ? '\u2212\u03c0' : '+\u03c0', pxX(midQ), pxY(midP));
    }

    // DWL label — triangle centroid
    if (qComp) {
      const mcAtQmax = (evalLinQ(mcP, qmax) !== null) ? evalLinQ(mcP, qmax) : mcP.constant;
      const cq = (qmax + qComp + qmax) / 3;
      const cp = (pstar + pComp + mcAtQmax) / 3;
      ctx.font = 'bold 11px -apple-system,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(140,85,0,0.9)';
      ctx.fillText('DWL', pxX(cq), pxY(cp));
    }

    // "Price / Ceiling" stacked label right of chart
    ctx.font = 'bold 11px -apple-system,sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c00';
    ctx.textBaseline = 'middle';
    ctx.fillText('Price',   ca.right + 6, pxY(ceiling) - 8);
    ctx.fillText('Ceiling', ca.right + 6, pxY(ceiling) + 8);

    ctx.restore();
  }
};
Chart.register(monCeilPlugin);