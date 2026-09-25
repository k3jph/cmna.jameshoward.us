import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";
const root=document.querySelector("[data-wave-lab]");
if(!root) throw new Error("Wave lab not found.");

const editor=root.querySelector("[data-r-code]");
const speedInput=root.querySelector("[data-speed]");
const dxInput=root.querySelector("[data-dx]");
const dtInput=root.querySelector("[data-dt]");
const nInput=root.querySelector("[data-n]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const summary=root.querySelector("[data-summary]");
const plot=root.querySelector("[data-plot]");
const slider=root.querySelector("[data-step]");
const playButton=root.querySelector("[data-play]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");
const tableBody=root.querySelector("[data-rows]");

let webR,ready=false,starting=null,trace=null,timer=null;

function fmt(v,d=7){if(!Number.isFinite(v))return "—";if(Math.abs(v)>0&&(Math.abs(v)<1e-5||Math.abs(v)>=1e6))return v.toExponential(4);return Number(v.toFixed(d)).toString();}
function svgEl(name,attrs={}){const el=document.createElementNS("http://www.w3.org/2000/svg",name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
async function initialise(){
  if(ready)return;if(starting)return starting;
  starting=(async()=>{
    runButton.disabled=true;status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok)throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;status.textContent="R ready · define u0(x)";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,x:[],frames:[]},temp={};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={m:Number(p[1]),n:Number(p[2]),cfl:Number(p[3]),dx:Number(p[4]),dt:Number(p[5])};
    else if(p[0]==="X")result.x[Number(p[1])-1]=Number(p[2]);
    else if(p[0]==="U"){const t=Number(p[1]),i=Number(p[2])-1,v=Number(p[3]);if(!temp[t])temp[t]=[];temp[t][i]=v;}
  }
  Object.keys(temp).sort((a,b)=>Number(a)-Number(b)).forEach(k=>result.frames.push(temp[k]));
  if(!result.meta||!result.frames.length)throw new Error("R returned an incomplete wave trace.");
  return result;
}
function renderSummary(){
  const last=trace.frames.at(-1);
  const amp=Math.max(...last)-Math.min(...last);
  summary.innerHTML=[
    ["Courant number",fmt(trace.meta.cfl,7)],
    ["time steps",trace.meta.n],
    ["final amplitude",fmt(amp,8)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderPlot(active=0){
  const width=720,height=350,pad=44;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const vals=trace.frames.flat();let ymin=Math.min(...vals),ymax=Math.max(...vals);if(ymin===ymax){ymin-=1;ymax+=1;}const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const xmin=Math.min(...trace.x),xmax=Math.max(...trace.x);
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c"}));
  const ghostIds=[0,Math.floor(trace.frames.length/4),Math.floor(trace.frames.length/2),Math.floor(3*trace.frames.length/4)];
  ghostIds.forEach((id,j)=>{
    const frame=trace.frames[id];
    const d=frame.map((v,i)=>`${i?"L":"M"}${mapX(trace.x[i]).toFixed(2)},${mapY(v).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:"#d6a744","stroke-width":1.2,opacity:0.15+0.12*j}));
  });
  const frame=trace.frames[Math.max(0,Math.min(active,trace.frames.length-1))];
  const d=frame.map((v,i)=>`${i?"L":"M"}${mapX(trace.x[i]).toFixed(2)},${mapY(v).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=`Wave profile at time step ${active}`;plot.append(label);
  stepLabel.textContent=`time step ${active} of ${trace.meta.n}`;
  const min=Math.min(...frame),max=Math.max(...frame);
  stepDetail.textContent=`min u=${fmt(min,7)} · max u=${fmt(max,7)} · Courant number=${fmt(trace.meta.cfl,6)}.`;
}
function renderTable(active=0){
  tableBody.replaceChildren();
  const ids=[0,Math.floor(trace.meta.n/4),Math.floor(trace.meta.n/2),Math.floor(3*trace.meta.n/4),trace.meta.n];
  for(const t of [...new Set(ids)]){
    const f=trace.frames[t];const tr=document.createElement("tr");if(t===active)tr.classList.add("is-current");
    [t,Math.min(...f),Math.max(...f)].forEach((v,i)=>{const td=document.createElement("td");td.textContent=i===0?v:fmt(v,8);tr.append(td);});tableBody.append(tr);
  }
}
function showStep(i){if(!trace)return;const safe=Math.max(0,Math.min(i,trace.frames.length-1));slider.value=safe;renderPlot(safe);renderTable(safe);}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play wave";}
async function run(){
  stopPlayback();
  const speed=Number(speedInput.value),dx=Number(dxInput.value),dt=Number(dtInput.value),n=Number(nInput.value);
  if(![speed,dx,dt,n].every(Number.isFinite)||speed<=0||dx<=0||dt<=0||n<1||n>300||!Number.isInteger(n)){status.textContent="Use positive finite speed, dx, dt, and integer n from 1 to 300.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is propagating your initial displacement…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_wave_trace_text(u0,speed=${speed},xdelta=${dx},tdelta=${dt},n=${n})`));
    renderSummary();slider.min=0;slider.max=trace.meta.n;slider.value=0;slider.disabled=false;playButton.disabled=false;showStep(0);
    status.textContent=trace.meta.cfl>1?"Courant number exceeds 1; instability may be visible.":"The wave is evolving inside R. Play time forward.";
  }catch(error){status.textContent=error.message||String(error);}finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{if(!trace)return;if(timer){stopPlayback();return;}let i=Number(slider.value);if(i>=trace.meta.n)i=-1;playButton.textContent="Pause";timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.meta.n)stopPlayback();},85);});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();