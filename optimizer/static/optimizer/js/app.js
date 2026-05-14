const metricsEl = document.getElementById('metrics');
const constraintsEl = document.getElementById('constraints');
const pipelineEl = document.getElementById('pipeline');

let previousMetrics = { cl: 0.923, cd: 0.0112, cl_cd: 82.4, cm: -0.0520, tc: 0.109 };

function parseWeights(v){return v.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));}

function fmtDelta(curr, prev){
  if(prev === null || prev === undefined || prev === 0) return {text:'—', klass:'flat'};
  const d = ((curr-prev)/Math.abs(prev))*100;
  if(Math.abs(d) < 0.05) return {text:'0.0%', klass:'flat'};
  const text = `${d > 0 ? '+' : ''}${d.toFixed(1)}%`;
  return {text, klass: d > 0 ? 'up' : 'down'};
}

function drawGeometry(geometry){
  const c=document.getElementById('airfoilCanvas'); const ctx=c.getContext('2d');
  const pad={l:90,r:46,t:30,b:56}; const w=c.width-pad.l-pad.r; const h=c.height-pad.t-pad.b;
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#f8fbff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#e6edf6';

  ctx.font='12px Inter, Arial'; ctx.fillStyle='#8aa0b7';
  for(let i=0;i<=4;i++){
    const value=(i*0.25).toFixed(2); const x=pad.l+(w/4)*i;
    ctx.beginPath(); ctx.moveTo(x,pad.t); ctx.lineTo(x,pad.t+h); ctx.stroke();
    ctx.fillText(value, x-10, c.height-24);
  }
  for(let i=0;i<=4;i++){
    const y=pad.t+(h/4)*i;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.stroke();
  }

  ctx.strokeStyle='#cfdae8';
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+h);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pad.l,pad.t+h/2);ctx.lineTo(pad.l+w,pad.t+h/2);ctx.stroke();

  ctx.fillStyle='#8098af';
  ctx.fillText('x/c', pad.l + w/2 - 10, c.height-8);
  ctx.save();
  ctx.translate(24,pad.t+h/2); ctx.rotate(-Math.PI/2); ctx.fillText('y/c',0,0); ctx.restore();

  const draw=(pts,color,width=2,fill=false)=>{
    ctx.beginPath(); ctx.strokeStyle=color; ctx.lineWidth=width;
    pts.forEach((p,i)=>{const x=pad.l+p[0]*w;const y=pad.t+h/2-p[1]*h*3.6; i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
    if(fill){ctx.globalAlpha=0.12;ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;}
    ctx.stroke();
  };
  draw(geometry.initial.upper,'#a4b9ce',2); draw(geometry.initial.lower,'#a4b9ce',2);
  const closed=[...geometry.optimized.upper,...[...geometry.optimized.lower].reverse()];
  draw(closed,'#2ec4dd',1.5,true);
  draw(geometry.optimized.upper,'#2ec4dd',2.5); draw(geometry.optimized.lower,'#2ec4dd',2.5);
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
