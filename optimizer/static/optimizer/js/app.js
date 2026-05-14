const metricsEl = document.getElementById('metrics');
const constraintsEl = document.getElementById('constraints');
const pipelineEl = document.getElementById('pipeline');

let previousMetrics = null;

function parseWeights(v){return v.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));}

function fmtDelta(curr, prev, percent=false){
  if(prev === null || prev === undefined || prev === 0) return {text:'—', klass:'flat'};
  const d = ((curr-prev)/Math.abs(prev))*100;
  if(Math.abs(d) < 0.05) return {text:'0.0%', klass:'flat'};
  const text = `${d > 0 ? '+' : ''}${d.toFixed(1)}%`;
  return {text, klass: d > 0 ? 'up' : 'down'};
}

function drawGeometry(geometry){
  const c=document.getElementById('airfoilCanvas'); const ctx=c.getContext('2d');
  const pad={l:70,r:40,t:36,b:36}; const w=c.width-pad.l-pad.r; const h=c.height-pad.t-pad.b;
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#f8fbff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#e6edf6';
  for(let i=0;i<=10;i++){let x=pad.l+(w/10)*i;ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,pad.t+h);ctx.stroke();}
  for(let i=0;i<=6;i++){let y=pad.t+(h/6)*i;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke();}
  const draw=(pts,color,width=2,fill=false)=>{
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=width;
    pts.forEach((p,i)=>{const x=pad.l+p[0]*w;const y=pad.t+h/2-p[1]*h*3.8; i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
    if(fill){ctx.globalAlpha=0.12;ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;}
    ctx.stroke();
  };
  draw(geometry.initial.upper,'#9cb4cc',2); draw(geometry.initial.lower,'#9cb4cc',2);
  const closed=[...geometry.optimized.upper,...[...geometry.optimized.lower].reverse()];
  draw(closed,'#2ec4dd',1.5,true);
  draw(geometry.optimized.upper,'#2ec4dd',3); draw(geometry.optimized.lower,'#2ec4dd',3);
}

function renderResult(r){
  const keys=[['cl','CL'],['cd','CD'],['cl_cd','CL/CD'],['cm','CM'],['tc','T/C']];
  metricsEl.innerHTML = keys.map(([k,label])=>{
    const d=fmtDelta(r.metrics[k], previousMetrics?.[k] ?? null);
    const value = k==='tc' ? `${(r.metrics[k]*100).toFixed(1)}%` : r.metrics[k];
    return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div><div class="delta ${d.klass}">${d.text}</div></div>`;
  }).join('');

  constraintsEl.innerHTML = `<div class="box-title">🛡️ Constraint Verification</div>` + Object.entries(r.constraints).map(([k,v])=>`
    <div class="constraint-item">
      <div class="constraint-name">${k.toUpperCase()==='TC'?'Thickness Ratio (t/c)':'Pitching Moment (C_M)'}</div>
      <div class="constraint-meta">${k.toUpperCase()}: ${v.value.toFixed(4)} • [${v.min.toFixed(2)}, ${v.max.toFixed(2)}] • <span class="${v.satisfied?'ok':'bad'}">${v.satisfied?'Satisfied ✅':'Violated ❌'}</span></div>
    </div>`).join('');

  pipelineEl.innerHTML = `<div class="box-title">📋 Optimization Pipeline</div><ul class="pipeline-list">${r.pipeline.map(s=>`<li>✅ ${s}</li>`).join('')}</ul>`;
  previousMetrics = r.metrics;
  drawGeometry(r.geometry);
}

document.getElementById('optimizeBtn').addEventListener('click', async()=>{
  const payload={
    aoa:Number(document.getElementById('aoa').value),
    reynolds:Number(document.getElementById('reynolds').value),
    upper_weights:parseWeights(document.getElementById('upper').value),
    lower_weights:parseWeights(document.getElementById('lower').value),
    leading_edge_weight:Number(document.getElementById('le').value),
    trailing_edge_offset:Number(document.getElementById('te').value),
  };
  const resp=await fetch('/api/optimize/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  renderResult(await resp.json());
});
