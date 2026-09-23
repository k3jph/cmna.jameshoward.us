import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root=document.querySelector("[data-ivp-lab]");
if(!root) throw new Error("IVP lab root not found.");

const editor=root.querySelector("[data-r-function]");
const x0Input=root.querySelector("[data-x0]");
const y0Input=root.querySelector("[data-y0]");
const hInput=root.querySelector("[data-h]");
const nInput=root.querySelector("[data-n]");
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

function fmt(v,d=7){
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
  if(ready)return;
  if(starting)return starting;
  starting=(async()=>{
    runButton.disabled=true;status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok)throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;status.textContent="R ready · define f(x,y) and an initial value";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,series:{Euler:[],Midpoint:[],RK4:[]},steps:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={n:Number(p[1]),h:Number(p[2])};
    else if(p[0]==="SERIES")result.series[p[1]].push({x:Number(p[2]),y:Number(p[3])});
    else if(p[0]==="STEP")result.steps.push({
      i:Number(p[1]),x:Number(p[2]),y:Number(p[3]),
      s1:Number(p[4]),s2:Number(p[5]),s3:Number(p[6]),s4:Number(p[7]),
      xn:Number(p[8]),yn:Number(p[9])
    });
  }
  if(!result.meta)throw new Error("R returned an incomplete IVP trace.");
  return result;
}
function renderSummary(){
  const e=trace.series.Euler.at(-1),m=trace.series.Midpoint.at(-1),r=trace.series.RK4.at(-1);
  summary.innerHTML=[
    ["Euler final y",fmt(e?.y,9)],
    ["Midpoint final y",fmt(m?.y,9)],
    ["RK4 final y",fmt(r?.y,9)],
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderTable(active=0){
  tableBody.replaceChildren();
  trace.steps.forEach((s,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    [s.i,fmt(s.x,6),fmt(s.y,7),fmt(s.s1,6),fmt(s.s2,6),fmt(s.s3,6),fmt(s.s4,6),fmt(s.yn,7)]
      .forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  });
}
function renderPlot(active=0){
  const width=720,height=360,pad=46;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const all=Object.values(trace.series).flat();
  let xmin=Math.min(...all.map(p=>p.x)),xmax=Math.max(...all.map(p=>p.x));
  let ymin=Math.min(...all.map(p=>p.y)),ymax=Math.max(...all.map(p=>p.y));
  if(xmin===xmax){xmin-=1;xmax+=1;} if(ymin===ymax){ymin-=1;ymax+=1;}
  const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:height-pad,y2:height-pad,stroke:"#8b949c"}));
  plot.append(svgEl("line",{x1:pad,x2:pad,y1:pad,y2:height-pad,stroke:"#8b949c"}));
  const specs=[
    ["Euler","#8b949c",2],
    ["Midpoint","#d6a744",2.5],
    ["RK4","#102b46",3.5],
  ];
  for(const [name,color,strokeWidth] of specs){
    const points=trace.series[name].slice(0,Math.min(active+2,trace.series[name].length));
    const d=points.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:color,"stroke-width":strokeWidth,"stroke-linejoin":"round"}));
    points.forEach((p,i)=>{
      if(i===points.length-1)plot.append(svgEl("circle",{cx:mapX(p.x),cy:mapY(p.y),r:5,fill:color,stroke:"#fffdf8","stroke-width":2}));
    });
  }
  const s=trace.steps[Math.min(active,trace.steps.length-1)];
  if(s){
    const xmid=s.x+trace.meta.h/2;
    const stagePoints=[
      [s.x,s.y,"#7a2d4b"],
      [xmid,s.y+s.s1/2,"#7a2d4b"],
      [xmid,s.y+s.s2/2,"#7a2d4b"],
      [s.xn,s.y+s.s3,"#7a2d4b"],
    ];
    stagePoints.forEach(([x,y,color])=>plot.append(svgEl("circle",{cx:mapX(x),cy:mapY(y),r:4.2,fill:color})));
  }
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Euler (gray), midpoint (gold), RK4 (blue); Murrey points are RK4 stage evaluations";
  plot.append(label);
}
function showStep(index){
  if(!trace?.steps.length)return;
  const safe=Math.max(0,Math.min(index,trace.steps.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
  const s=trace.steps[safe];
  stepLabel.textContent=`RK4 step ${s.i} of ${trace.meta.n}`;
  stepDetail.textContent=`At x=${fmt(s.x,6)}, RK4 samples four slopes: s₁=${fmt(s.s1,6)}, s₂=${fmt(s.s2,6)}, s₃=${fmt(s.s3,6)}, s₄=${fmt(s.s4,6)}. Their weighted combination advances y from ${fmt(s.y,7)} to ${fmt(s.yn,7)}.`;
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play steps";}
async function run(){
  stopPlayback();
  const x0=Number(x0Input.value),y0=Number(y0Input.value),h=Number(hInput.value),n=Number(nInput.value);
  if(![x0,y0,h,n].every(Number.isFinite)||h===0||n<1||!Number.isInteger(n)||n>200){
    status.textContent="Use finite x₀, y₀, nonzero h, and an integer n from 1 to 200.";return;
  }
  if(!editor.value.trim()){status.textContent="Define f as function(x,y) first.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is advancing your differential equation…";
    await webR.evalRVoid(editor.value);
    const payload=await webR.evalRString(`.cmna_ivp_trace_text(f,x0=${x0},y0=${y0},h=${h},n=${n})`);
    trace=parse(payload);renderSummary();
    slider.min=0;slider.max=Math.max(0,trace.steps.length-1);slider.value=0;slider.disabled=trace.steps.length<=1;playButton.disabled=trace.steps.length<=1;
    showStep(0);
    status.textContent="All three trajectories were computed by R from the function you supplied.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.steps.length)return;if(timer){stopPlayback();return;}
  let step=Number(slider.value);if(step>=trace.steps.length-1)step=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{step+=1;showStep(step);if(step>=trace.steps.length-1)stopPlayback();},650);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
