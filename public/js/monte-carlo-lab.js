import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root=document.querySelector("[data-mc-lab]");
if(!root) throw new Error("Monte Carlo lab not found.");

const editor=root.querySelector("[data-r-code]");
const aInput=root.querySelector("[data-a]");
const bInput=root.querySelector("[data-b]");
const mInput=root.querySelector("[data-m]");
const seedInput=root.querySelector("[data-seed]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const summary=root.querySelector("[data-summary]");
const curvePlot=root.querySelector("[data-curve-plot]");
const convPlot=root.querySelector("[data-conv-plot]");
const slider=root.querySelector("[data-step]");
const playButton=root.querySelector("[data-play]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");
const tableBody=root.querySelector("[data-rows]");

let webR,ready=false,starting=null,trace=null,timer=null;

function fmt(v,d=8){
  if(!Number.isFinite(v))return "—";
  if(Math.abs(v)>0&&(Math.abs(v)<1e-5||Math.abs(v)>=1e6))return v.toExponential(4);
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
    ready=true;runButton.disabled=false;status.textContent="R ready · sampling will happen locally";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,runs:[],points:[],curve:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={estimate:Number(p[1]),m:Number(p[2]),seed:Number(p[3])};
    else if(p[0]==="RUN")result.runs.push({n:Number(p[1]),estimate:Number(p[2])});
    else if(p[0]==="POINT")result.points.push({x:Number(p[1]),y:Number(p[2])});
    else if(p[0]==="CURVE")result.curve.push({x:Number(p[1]),y:Number(p[2])});
  }
  if(!result.meta)throw new Error("R returned an incomplete Monte Carlo trace.");
  return result;
}
function renderSummary(){
  const ys=trace.points.map(p=>p.y);
  const mean=ys.reduce((a,b)=>a+b,0)/Math.max(1,ys.length);
  summary.innerHTML=[
    ["Monte Carlo estimate",fmt(trace.meta.estimate,10)],
    ["Samples",trace.meta.m],
    ["Seed",trace.meta.seed]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderCurve(active=0){
  const width=720,height=340,pad=44;
  curvePlot.replaceChildren();curvePlot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  curvePlot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const xs=trace.curve.map(p=>p.x),ys=[...trace.curve.map(p=>p.y),0];
  const xmin=Math.min(...xs),xmax=Math.max(...xs);
  let ymin=Math.min(...ys),ymax=Math.max(...ys);if(ymin===ymax){ymin-=1;ymax+=1;}
  const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);
  curvePlot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c"}));
  const d=trace.curve.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  curvePlot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));

  const run=trace.runs[Math.max(0,Math.min(active,trace.runs.length-1))];
  const frac=run.n/trace.meta.m;
  const count=Math.max(1,Math.floor(frac*trace.points.length));
  trace.points.slice(0,count).forEach(p=>{
    curvePlot.append(svgEl("circle",{cx:mapX(p.x),cy:mapY(p.y),r:2.6,fill:"#7a2d4b",opacity:0.55}));
  });
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=`R sample cloud at n = ${run.n}`;
  curvePlot.append(label);
}
function renderConvergence(active=0){
  const width=720,height=300,pad=46;
  convPlot.replaceChildren();convPlot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  convPlot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  let ymin=Math.min(...trace.runs.map(r=>r.estimate)),ymax=Math.max(...trace.runs.map(r=>r.estimate));
  if(ymin===ymax){ymin-=1;ymax+=1;}const yp=(ymax-ymin)*0.12;ymin-=yp;ymax+=yp;
  const mapX=n=>pad+((n-1)/(trace.meta.m-1))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const d=trace.runs.map((r,i)=>`${i?"L":"M"}${mapX(r.n).toFixed(2)},${mapY(r.estimate).toFixed(2)}`).join(" ");
  convPlot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));
  const current=trace.runs[Math.max(0,Math.min(active,trace.runs.length-1))];
  convPlot.append(svgEl("circle",{cx:mapX(current.n),cy:mapY(current.estimate),r:6,fill:"#d6a744",stroke:"#fffdf8","stroke-width":2}));
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Running Monte Carlo estimate as sample size grows";
  convPlot.append(label);
}
function renderTable(active=0){
  tableBody.replaceChildren();
  const stride=Math.max(1,Math.floor(trace.runs.length/24));
  trace.runs.forEach((r,index)=>{
    if(index%stride!==0 && index!==trace.runs.length-1 && index!==active)return;
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    [r.n,fmt(r.estimate,10)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  });
}
function showStep(i){
  if(!trace?.runs.length)return;
  const safe=Math.max(0,Math.min(i,trace.runs.length-1));
  slider.value=safe;renderCurve(safe);renderConvergence(safe);renderTable(safe);
  const r=trace.runs[safe];
  stepLabel.textContent=`n = ${r.n}`;
  stepDetail.textContent=`With ${r.n} random evaluations, the running estimate is ${fmt(r.estimate,10)}. The final run uses ${trace.meta.m} samples.`;
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play sampling";}
async function run(){
  stopPlayback();
  const a=Number(aInput.value),b=Number(bInput.value),m=Number(mInput.value),seed=Number(seedInput.value);
  if(![a,b,m,seed].every(Number.isFinite)||a===b||m<10||m>200000||!Number.isInteger(m)){
    status.textContent="Use distinct finite bounds, a finite seed, and integer m from 10 to 200000.";return;
  }
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();curvePlot.replaceChildren();convPlot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is drawing random samples…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_mc_trace_text(f,a=${a},b=${b},m=${m},seed=${seed})`));
    renderSummary();slider.min=0;slider.max=trace.runs.length-1;slider.value=0;slider.disabled=trace.runs.length<=1;playButton.disabled=trace.runs.length<=1;
    showStep(0);status.textContent="The randomness, function evaluations, and running estimates all came from R.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.runs.length)return;if(timer){stopPlayback();return;}
  let i=Number(slider.value);if(i>=trace.runs.length-1)i=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.runs.length-1)stopPlayback();},55);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
