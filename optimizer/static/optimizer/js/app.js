const metricsEl = document.getElementById('metrics');
const constraintsEl = document.getElementById('constraints');
const pipelineEl = document.getElementById('pipeline');
const experimentEl = document.getElementById('experiment');
const xaiEl = document.getElementById('xai');
const modelStatus = document.getElementById('modelStatus');

const chartOx = 80, chartOy = 170, chartSx = 660, chartSy = 500;
let previousMetrics = { cl: 0.923, cd: 0.0112, cl_cd: 82.4, cm: -0.0520, tc: 0.109 };

function parseWeights(v) { return v.split(',').map(x => Number(x.trim())).filter(x => !Number.isNaN(x)); }
function fmtDelta(curr, prev) { if (!prev) return '—'; const d = ((curr - prev) / Math.abs(prev)) * 100; return `${d > 0 ? '+' : ''}${d.toFixed(1)}%`; }

function airfoilToPath(pts, ox, oy, sx, sy) {
  let d = `M ${ox + pts[0][0] * sx} ${oy - pts[0][1] * sy}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${ox + pts[i][0] * sx} ${oy - pts[i][1] * sy}`;
  d += ' Z';
  return d;
}

function renderGeometry(geometry) {
  const initPts = [...geometry.initial.upper, ...[...geometry.initial.lower].reverse()];
  const optPts = [...geometry.optimized.upper, ...[...geometry.optimized.lower].reverse()];
  document.getElementById('initialAirfoil').setAttribute('d', airfoilToPath(initPts, chartOx, chartOy, chartSx, chartSy));
  document.getElementById('optimizedAirfoil').setAttribute('d', airfoilToPath(optPts, chartOx, chartOy, chartSx, chartSy));
}

function renderResult(r) {
  const labels = [['cl', 'CL'], ['cd', 'CD'], ['cl_cd', 'CL/CD'], ['cm', 'CM'], ['tc', 't/c']];
  metricsEl.innerHTML = labels.map(([k, label]) => `<div class="metric-card"><p class="text-xs text-navy-400">${label}</p><p class="mono text-xl font-bold">${k === 'tc' ? (r.metrics[k] * 100).toFixed(1) + '%' : r.metrics[k]}</p><p class="text-xs text-emerald-600">${fmtDelta(r.metrics[k], previousMetrics[k])}</p></div>`).join('');

  constraintsEl.innerHTML = `<h3 class="text-sm font-bold mb-2">Constraint Verification</h3>` + Object.entries(r.constraints).map(([k, v]) => `<p class="text-xs">${k.toUpperCase()}: ${v.value.toFixed(4)} (${v.satisfied ? '✅' : '❌'})</p>`).join('');
  xaiEl.innerHTML = `<h3 class="text-sm font-bold mb-2">Model Explainability (XAI)</h3>${r.xai.feature_importance.map(f => `<p class="text-xs">${f.feature}: ${f.score}</p>`).join('')}`;
  pipelineEl.innerHTML = `<h3 class="text-sm font-bold mb-2">Optimization Pipeline</h3>${r.pipeline.map(s => `<p class="text-xs">✅ ${s}</p>`).join('')}`;
  experimentEl.innerHTML = `<h3 class="text-sm font-bold mb-2">Experiment Summary</h3><p class="text-xs">${r.experiment.summary}</p>`;

  previousMetrics = r.metrics;
  renderGeometry(r.geometry);
}

document.querySelectorAll('input[name="modelSelect"]').forEach(r => {
  r.addEventListener('change', e => modelStatus.textContent = `${e.target.value} model loaded`);
});

document.getElementById('optimizeBtn').addEventListener('click', async () => {
  const btn = document.getElementById('optimizeBtn');
  const model = document.querySelector('input[name="modelSelect"]:checked').value;
  btn.disabled = true;
  btn.textContent = 'Analyzing...';
  modelStatus.textContent = `${model} model analyzing...`;

  const payload = {
    model,
    aoa: Number(aoa.value),
    reynolds: Number(reynolds.value),
    upper_weights: parseWeights(upper.value),
    lower_weights: parseWeights(lower.value),
    leading_edge_weight: Number(le.value),
    trailing_edge_offset: Number(te.value),
  };

  const resp = await fetch('/api/optimize/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await resp.json();
  renderResult(data);
  modelStatus.textContent = `${model} model ready`;
  btn.disabled = false;
  btn.textContent = 'Optimize & Explain';
});
