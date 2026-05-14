const metricsEl = document.getElementById('metrics');
const constraintsEl = document.getElementById('constraints');
const pipelineEl = document.getElementById('pipeline');
const experimentEl = document.getElementById('experiment');
const xaiEl = document.getElementById('xai');

let previousMetrics = { cl: 0.923, cd: 0.0112, cl_cd: 82.4, cm: -0.0520, tc: 0.109 };

function parseWeights(v){return v.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));}
function fmtDelta(curr, prev){ if(!prev) return {text:'—', klass:'flat'}; const d=((curr-prev)/Math.abs(prev))*100; return {text:`${d>0?'+':''}${d.toFixed(1)}%`, klass:d>0?'up':'down'}; }

function drawGeometry(geometry){
  const c=document.getElementById('airfoilCanvas'); const ctx=c.getContext('2d');
  const pad={l:90,r:46,t:30,b:56}; const w=c.width-pad.l-pad.r; const h=c.height-pad.t-pad.b;
  ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#f8fbff'; ctx.fillRect(0,0,c.width,c.height); ctx.strokeStyle='#e6edf6'; ctx.font='12px Inter'; ctx.fillStyle='#8aa0b7';
  for(let i=0;i<=4;i++){ const x=pad.l+(w/4)*i; ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+h);ctx.stroke(); ctx.fillText((i*0.25).toFixed(2),x-10,c.height-24); }
  for(let i=0;i<=4;i++){ const y=pad.t+(h/4)*i; ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke(); }
  ctx.fillText('x/c', pad.l + w/2 - 10, c.height-8); ctx.save(); ctx.translate(24,pad.t+h/2); ctx.rotate(-Math.PI/2); ctx.fillText('y/c',0,0); ctx.restore();
  const draw=(pts,color,width=2,fill=false)=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=width;pts.forEach((p,i)=>{const x=pad.l+p[0]*w;const y=pad.t+h/2-p[1]*h*3.6;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}); if(fill){ctx.globalAlpha=.12;ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;} ctx.stroke();};
  draw(geometry.initial.upper,'#a4b9ce',2); draw(geometry.initial.lower,'#a4b9ce',2); const closed=[...geometry.optimized.upper,...[...geometry.optimized.lower].reverse()]; draw(closed,'#2ec4dd',1.5,true); draw(geometry.optimized.upper,'#2ec4dd',2.5); draw(geometry.optimized.lower,'#2ec4dd',2.5);
}

function renderResult(r){
  const keys=[['cl','CL'],['cd','CD'],['cl_cd','CL/CD'],['cm','CM'],['tc','T/C']];
  metricsEl.innerHTML = keys.map(([k,label])=>{const d=fmtDelta(r.metrics[k], previousMetrics?.[k]); const value=k==='tc'?`${(r.metrics[k]*100).toFixed(1)}%`:r.metrics[k]; return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div><div class="delta ${d.klass}">${d.text}</div></div>`;}).join('');
  constraintsEl.innerHTML = `<div class="box-title">🛡️ Constraint Verification</div>` + Object.entries(r.constraints).map(([k,v])=>`<div class="constraint-item"><div class="constraint-name">${k==='tc'?'Thickness Ratio (t/c)':'Pitching Moment (C_M)'}</div><div class="constraint-meta">${k.toUpperCase()}: ${v.value.toFixed(4)} • [${v.min.toFixed(2)}, ${v.max.toFixed(2)}] • <span class="${v.satisfied?'ok':'bad'}">${v.satisfied?'Satisfied ✅':'Violated ❌'}</span></div></div>`).join('');
  pipelineEl.innerHTML = `<div class="box-title">📋 Optimization Pipeline</div><ul class="pipeline-list">${r.pipeline.map(s=>`<li>✅ ${s}</li>`).join('')}</ul>`;

  experimentEl.innerHTML = `<div class="box-title">🧪 LLM Experiment Orchestration</div>
    <div class="meta-line"><b>Run ID:</b> ${r.experiment.context.run_id}</div>
    <div class="meta-line"><b>Config:</b> ${r.experiment.context.config_version} | <b>Dataset:</b> ${r.experiment.context.dataset_version}</div>
    <div class="meta-line"><b>Policy:</b> ${r.experiment.context.policy_version}</div>
    <div class="meta-line"><b>Summary:</b> ${r.experiment.summary}</div>
    <ul class="note-list">${r.experiment.comparison_notes.map(n=>`<li>${n}</li>`).join('')}</ul>`;

  xaiEl.innerHTML = `<div class="box-title">🔍 XAI Analysis</div>
    ${r.xai.feature_importance.map(f=>`<div class="xai-row"><span class="xai-key">${f.feature}</span><span class="xai-val">${f.score}</span></div>`).join('')}
    <div class="meta-line"><b>CM Risk:</b> ${r.xai.sensitivity.cm_risk_zone.toUpperCase()} | <b>t/c Risk:</b> ${r.xai.sensitivity.tc_risk_zone.toUpperCase()}</div>
    <div class="meta-line"><b>Trade-off:</b> ${r.xai.sensitivity.dominant_tradeoff}</div>
    <div class="meta-line"><b>Attention Proxy:</b> ${r.xai.attention_proxy.region} — ${r.xai.attention_proxy.explanation}</div>`;

  previousMetrics = r.metrics;
  drawGeometry(r.geometry);
}

document.getElementById('optimizeBtn').addEventListener('click', async()=>{
  const payload={aoa:Number(aoa.value),reynolds:Number(reynolds.value),upper_weights:parseWeights(upper.value),lower_weights:parseWeights(lower.value),leading_edge_weight:Number(le.value),trailing_edge_offset:Number(te.value)};
  const resp=await fetch('/api/optimize/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  renderResult(await resp.json());
});
