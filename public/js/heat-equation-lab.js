import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root=document.querySelector("[data-heat-lab]");
if(!root) throw new Error("Heat equation lab not found.");

const editor=root.querySelector("[data-r-code]");
const alphaInput=root.querySelector("[data-alpha]");
const dxInput=root.querySelector("[data-dx]");
const dtInput=root.querySelector("[data-dt]");
const nInput=root.querySelector("[data-n]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const summary=root.querySelector("[data-summary]");
const plot=root.querySelector("[data-plot]");
const heatmap=root.querySelector("[data-heatmap]");
const slider=root.querySelector("[data-step]");
const playButton=root.querySelector("[data-play]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");
const tableBody=root.querySelector("[data-rows]");

let webR,ready=false,starting=null,trace=null,timer=null;

function fmt(v,d=7){
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
    ready=true;runButton.disabled=false;status.textContent="R ready · define u0(x)";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,x:[],frames:[]};
  const temp={};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={m:Number(p[1]),n:Number(p[2]),hcoef:Number(p[3]),dx:Number(p[4]),dt:Number(p[5])};
    else if(p[0]==="X")result.x[Number(p[1])-1]=Number(p[2]);
    else if(p[0]==="U"){
      const t=Number(p[1]),i=Number(p[2])-1,v=Number(p[3]);
      if(!temp[t])temp[t]=[];
      temp[t][i]=v;
    }
  }
  Object.keys(temp).sort((a,b)=>Number(a)-Number(b)).forEach(k=>result.frames.push(temp[k]));
  if(!result.meta||!result.frames.length)throw new Error("R returned an incomplete heat-equation trace.");
  return result;
}
function renderSummary(){
  const last=trace.frames.at(-1);
  const spanN=Math.max(...last)-Math.min(...last);
  summary.innerHTML=[
    ["FTCS coefficient",fmt(trace.meta.hcoef,7)],
    ["time steps",trace.meta.n],
    ["amplitude span",fmt(spanN,8)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
  if(trace.meta.hcoef>0.5) status.textContent="Warning: alpha * dt / dx^2 is above 0.5; the explicit heat scheme may be unstable.";
}
function color(t){
  const c=Math.max(0,Math.min(1,t));
  const a=[16,43,70],b=[214,167,68];
  const vals=a.map((v,i)=>Math.round(v+(b[i]-v)*c));
  return `rgb(${vals.join(",")})`;
}
function renderHeatmap(){
  const width=720,height=220,left=42,top=20;
  heatmap.replaceChildren();heatmap.setAttribute("viewBox",`0 0 ${width} ${height}`);
  heatmap.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const vals=trace.frames.flat(),vmin=Math.min(...vals),vmax=Math.max(...vals);
  const rows=trace.frames.length,cols=trace.x.length;
  const cw=(width-left-12)/cols,ch=(height-top-24)/rows;
  trace.frames.forEach((frame,t)=>{
    frame.forEach((v,i)=>{
      const p=(v-vmin)/Math.max(1e-12,vmax-vmin);
      heatmap.append(svgEl("rect",{x:left+i*cw,y:top+t*ch,width:cw+0.4,height:ch+0.4,fill:color(p)}));
    });
  });
  const l=svgEl("text",{x:left,y:14,fill:"#5f6b74","font-size":13,"font-family":"system-ui,sans-serif"});
  l.textContent="Space → · time ↓";
  heatmap.append(l);
}
function renderPlot(active=0){
  const width=720,height=340,pad=44;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const vals=trace.frames.flat();
  let ymin=Math.min(...vals),ymax=Math.max(...vals);if(ymin===ymax){ymin-=1;ymax+=1;}
  const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const xmin=Math.min(...trace.x),xmax=Math.max(...trace.x);
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);

  const ghostIds=[0,Math.floor(trace.frames.length/4),Math.floor(trace.frames.length/2),Math.floor(3*trace.frames.length/4),trace.frames.length-1];
  ghostIds.forEach((id,j)=>{
    const frame=trace.frames[id];
    const d=frame.map((v,i)=>`${i?"L":"M"}${mapX(trace.x[i]).toFixed(2)},${mapY(v).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:"#d6a744","stroke-width":1.3,opacity:0.18+0.12*j}));
  });
  const frame=trace.frames[Math.max(0,Math.min(active,trace.frames.length-1))];
  const d=frame.map((v,i)=>`${i?"L":"M"}${mapX(trace.x[i]).toFixed(2)},${mapY(v).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=`Temperature profile at time step ${active}`;
  plot.append(label);

  stepLabel.textContent=`time step ${active} of ${trace.meta.n}`;
  const min=Math.min(...frame),max=Math.max(...frame),mean=frame.reduce((a,b)=>a+b,0)/frame.length;
  stepDetail.textContent=`min u=${fmt(min,7)} · mean u=${fmt(mean,7)} · max u=${fmt(max,7)}.`;
}
function renderTable(active=0){
  tableBody.replaceChildren();
  const ids=[0,Math.floor(trace.meta.n/4),Math.floor(trace.meta.n/2),Math.floor(3*trace.meta.n/4),trace.meta.n];
  for(const t of [...new Set(ids)]){
    const f=trace.frames[t];
    const tr=document.createElement("tr");if(t===active)tr.classList.add("is-current");
    const vals=[t,Math.min(...f),f.reduce((a,b)=>a+b,0)/f.length,Math.max(...f)];
    vals.forEach((v,i)=>{const td=document.createElement("td");td.textContent=i===0?v:fmt(v,8);tr.append(td);});
    tableBody.append(tr);
  }
}
function showStep(i){
  if(!trace)return;
  const safe=Math.max(0,Math.min(i,trace.frames.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play diffusion";}
async function run(){
  stopPlayback();
  const alpha=Number(alphaInput.value),dx=Number(dxInput.value),dt=Number(dtInput.value),n=Number(nInput.value);
  if(![alpha,dx,dt,n].every(Number.isFinite)||alpha<=0||dx<=0||dt<=0||n<1||n>250||!Number.isInteger(n)){
    status.textContent="Use positive finite alpha, dx, dt, and integer n from 1 to 250.";return;
  }
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;summary.replaceChildren();plot.replaceChildren();heatmap.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is diffusing your initial condition…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_heat_trace_text(u0,alpha=${alpha},xdelta=${dx},tdelta=${dt},n=${n})`));
    renderSummary();renderHeatmap();
    slider.min=0;slider.max=trace.meta.n;slider.value=0;slider.disabled=false;playButton.disabled=false;
    showStep(0);
    if(trace.meta.hcoef<=0.5)status.textContent="The explicit heat equation is running inside R; play time forward to watch the profile diffuse.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace)return;if(timer){stopPlayback();return;}
  let i=Number(slider.value);if(i>=trace.meta.n)i=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.meta.n)stopPlayback();},90);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
