import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root=document.querySelector("[data-diff-lab]");
if(!root) throw new Error("Differentiation lab root not found.");

const editor=root.querySelector("[data-r-code]");
const xInput=root.querySelector("[data-x]");
const hInput=root.querySelector("[data-h]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const summary=root.querySelector("[data-summary]");
const plot=root.querySelector("[data-plot]");
const tableBody=root.querySelector("[data-rows]");
const playButton=root.querySelector("[data-play]");
const slider=root.querySelector("[data-step]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");

let webR,ready=false,starting=null,trace=null,timer=null;

function fmt(v,d=8){
  if(!Number.isFinite(v)) return "—";
  if(Math.abs(v)>0&&(Math.abs(v)<1e-5||Math.abs(v)>=1e6)) return v.toExponential(4);
  return Number(v.toFixed(d)).toString();
}
function svgEl(name,attrs={}){
  const el=document.createElementNS("http://www.w3.org/2000/svg",name);
  for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
  return el;
}
async function initialise(){
  if(ready)return;if(starting)return starting;
  starting=(async()=>{
    runButton.disabled=true;status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok)throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;status.textContent="R ready · define f and optionally fp";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,rows:[],samples:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={x:Number(p[1]),h:Number(p[2]),exact:Number(p[3]),xmin:Number(p[4]),xmax:Number(p[5])};
    else if(p[0]==="ROW")result.rows.push({i:Number(p[1]),h:Number(p[2]),fd:Number(p[3]),sd:Number(p[4]),rd:Number(p[5])});
    else if(p[0]==="SAMPLE")result.samples.push({x:Number(p[1]),y:Number(p[2])});
  }
  if(!result.meta)throw new Error("R returned an incomplete finite-difference trace.");
  return result;
}
function nearestY(x){
  let best=trace.samples[0];
  for(const p of trace.samples)if(Math.abs(p.x-x)<Math.abs(best.x-x))best=p;
  return best.y;
}
function renderSummary(){
  const row=trace.rows.at(-1), exact=trace.meta.exact;
  summary.innerHTML=[
    ["smallest h",fmt(row.h,8)],
    ["symmetric estimate",fmt(row.sd,10)],
    ["Richardson estimate",fmt(row.rd,10)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
  if(Number.isFinite(exact)){
    summary.children[2].querySelector("span").textContent="exact derivative";
    summary.children[2].querySelector("strong").textContent=fmt(exact,10);
  }
}
function renderTable(active=0){
  tableBody.replaceChildren();
  const exact=trace.meta.exact;
  trace.rows.forEach((r,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    const vals=[r.i,r.h,r.fd,r.sd,r.rd];
    if(Number.isFinite(exact))vals.push(Math.abs(r.sd-exact));
    vals.forEach((v,i)=>{
      const td=document.createElement("td");td.textContent=i===0?v:fmt(v,9);tr.append(td);
    });
    tableBody.append(tr);
  });
}
function renderPlot(active=0){
  const width=720,height=360,pad=46;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  let ymin=Math.min(...trace.samples.map(p=>p.y),0),ymax=Math.max(...trace.samples.map(p=>p.y),0);
  if(ymin===ymax){ymin-=1;ymax+=1;}const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const {xmin,xmax,x}=trace.meta;
  const mapX=v=>pad+((v-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=v=>height-pad-((v-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c"}));
  const d=trace.samples.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));

  const row=trace.rows[Math.min(active,trace.rows.length-1)];
  const fx=nearestY(x), fplus=nearestY(x+row.h), fminus=nearestY(x-row.h);
  const lines=[
    ["forward",row.fd,fx,x,"#d6a744"],
    ["symmetric",row.sd,fx,x,"#7a2d4b"]
  ];
  for(const [,slope,y0,x0,color] of lines){
    const yl=y0+slope*(xmin-x0),yr=y0+slope*(xmax-x0);
    plot.append(svgEl("line",{x1:mapX(xmin),x2:mapX(xmax),y1:mapY(yl),y2:mapY(yr),stroke:color,"stroke-width":2.2}));
  }
  if(Number.isFinite(trace.meta.exact)){
    const slope=trace.meta.exact,yl=fx+slope*(xmin-x),yr=fx+slope*(xmax-x);
    plot.append(svgEl("line",{x1:mapX(xmin),x2:mapX(xmax),y1:mapY(yl),y2:mapY(yr),stroke:"#5f6b74","stroke-width":1.5,"stroke-dasharray":"6 5"}));
  }
  for(const [px,py,color] of [[x,fx,"#102b46"],[x+row.h,fplus,"#d6a744"],[x-row.h,fminus,"#7a2d4b"]]){
    plot.append(svgEl("circle",{cx:mapX(px),cy:mapY(py),r:5.5,fill:color,stroke:"#fffdf8","stroke-width":2}));
  }
  const label=svgEl("text",{x:pad,y:23,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Gold: forward difference · Murrey: symmetric difference · dashed: exact tangent when fp is supplied";
  plot.append(label);

  stepLabel.textContent=`h = ${fmt(row.h,8)}`;
  const exactText=Number.isFinite(trace.meta.exact)?` Exact f'(x)=${fmt(trace.meta.exact,9)}.`:"";
  stepDetail.textContent=`Forward: ${fmt(row.fd,9)} · symmetric: ${fmt(row.sd,9)} · Richardson: ${fmt(row.rd,9)}.${exactText}`;
}
function showStep(i){
  if(!trace?.rows.length)return;
  const safe=Math.max(0,Math.min(i,trace.rows.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Shrink h";}
async function run(){
  stopPlayback();
  const x=Number(xInput.value),h=Number(hInput.value);
  if(!Number.isFinite(x)||!Number.isFinite(h)||h<=0){status.textContent="Use a finite x and positive h.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is evaluating finite differences across decreasing step sizes…";
    await webR.evalRVoid(editor.value);
    const payload=await webR.evalRString(`.cmna_diff_trace_text(f,x=${x},h=${h},levels=7,fp=if(exists("fp")) fp else NULL)`);
    trace=parse(payload);renderSummary();
    const extra=Number.isFinite(trace.meta.exact)?'<th>|sym-exact|</th>':'';
    const head=root.querySelector("thead tr");
    if(head&&!head.dataset.ready){head.insertAdjacentHTML("beforeend",extra);head.dataset.ready="1";}
    slider.min=0;slider.max=trace.rows.length-1;slider.value=0;slider.disabled=trace.rows.length<=1;playButton.disabled=trace.rows.length<=1;
    showStep(0);status.textContent="Each step halves h and asks R for new finite-difference estimates.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.rows.length)return;if(timer){stopPlayback();return;}
  let step=Number(slider.value);if(step>=trace.rows.length-1)step=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{step+=1;showStep(step);if(step>=trace.rows.length-1)stopPlayback();},700);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
