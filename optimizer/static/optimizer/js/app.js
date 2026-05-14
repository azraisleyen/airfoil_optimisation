const metricsEl = document.getElementById('metrics');
const constraintsEl = document.getElementById('constraints');
const pipelineEl = document.getElementById('pipeline');

function parseWeights(v){return v.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));}

function drawGeometry(geometry){
  const c=document.getElementById('airfoilCanvas'); const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height); ctx.strokeStyle='#ccd8e6'; ctx.strokeRect(40,20,c.width-80,c.height-50);
  const draw=(pts,color)=>{ctx.beginPath();ctx.strokeStyle=color;pts.forEach((p,i)=>{const x=40+p[0]*(c.width-80);const y=(c.height/2)-p[1]*900; i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();};
  draw(geometry.initial.upper,'#9cb4cc'); draw(geometry.initial.lower,'#9cb4cc'); draw(geometry.optimized.upper,'#12b5d0'); draw(geometry.optimized.lower,'#12b5d0');
}

function renderResult(r){
  metricsEl.innerHTML=['cl','cd','cl_cd','cm','tc'].map(k=>`<div class="metric"><div>${k.toUpperCase()}</div><h2>${r.metrics[k]}</h2></div>`).join('');
  constraintsEl.innerHTML=`<h3>Constraint Verification</h3>${Object.entries(r.constraints).map(([k,v])=>`<p>${k.toUpperCase()}: ${v.value.toFixed(4)} (${v.satisfied?'Satisfied':'Violated'})</p>`).join('')}`;
  pipelineEl.innerHTML=`<h3>Optimization Pipeline</h3><ol>${r.pipeline.map(s=>`<li>${s}</li>`).join('')}</ol>`;
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
