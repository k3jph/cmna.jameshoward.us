import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root=document.querySelector("[data-interp-lab]");
if(!root) throw new Error("Interpolation lab not found.");

const editor=root.querySelector("[data-r-code]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const summary=root.querySelector("[data-summary]");
const plot=root.querySelector("[data-plot]");
const slider=root.querySelector("[data-step]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");
const playButton=root.querySelector("[data-play]");
const tableBody=root.querySelector("[data-rows]");

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
  if(ready)return;if(starting)return starting;
  starting=(async()=>{
    runButton.disabled=true;status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok) throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;status.textContent="R ready · define x and y";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={points:[],samples:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="POINT")result.points.push({i:Number(p[1]),x:Number(p[2]),y:Number(p[3])});
    else if(p[0]==="SAMPLE")result.samples.push({x:Number(p[1]),poly:Number(p[2]),piece:Number(p[3]),spline:Number(p[4])});
  }
  if(!result.points.length||!result.samples.length)throw new Error("R returned an incomplete interpolation trace.");
  return result;
}
function renderSummary(){
  summary.innerHTML=[
    ["Data points",trace.points.length],
    ["Polynomial degree",trace.points.length-1],
    ["Spline pieces",Math.max(1,trace.points.length-1)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderTable(){
  tableBody.replaceChildren();
  trace.points.forEach(p=>{
    const tr=document.createElement("tr");
    [p.i,fmt(p.x,7),fmt(p.y,7)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  });
}
function renderPlot(index=0){
  const width=720,height=390,pad=46;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));

  const xs=trace.samples.map(s=>s.x);
  const ys=trace.samples.flatMap(s=>[s.poly,s.piece,s.spline]).filter(Number.isFinite);
  let xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);
  if(ymin===ymax){ymin-=1;ymax+=1;}const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);

  const specs=[
    ["poly","#102b46",3],
    ["piece","#d6a744",2.3],
    ["spline","#7a2d4b",3]
  ];
  for(const [key,color,w] of specs){
    const d=trace.samples.map((s,i)=>`${i?"L":"M"}${mapX(s.x).toFixed(2)},${mapY(s[key]).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:color,"stroke-width":w}));
  }
  trace.points.forEach(p=>plot.append(svgEl("circle",{cx:mapX(p.x),cy:mapY(p.y),r:6,fill:"#fffdf8",stroke:"#102b46","stroke-width":2.5})));

  const s=trace.samples[Math.max(0,Math.min(index,trace.samples.length-1))];
  const x=mapX(s.x);
  plot.append(svgEl("line",{x1:x,x2:x,y1:pad,y2:height-pad,stroke:"#8b949c","stroke-width":1,"stroke-dasharray":"5 5"}));
  for(const [key,color] of [["poly","#102b46"],["piece","#d6a744"],["spline","#7a2d4b"]]){
    plot.append(svgEl("circle",{cx:x,cy:mapY(s[key]),r:5,fill:color,stroke:"#fffdf8","stroke-width":1.5}));
  }
  const label=svgEl("text",{x:pad,y:23,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Blue polynomial · gold piecewise linear · Murrey natural cubic spline";
  plot.append(label);

  stepLabel.textContent=`x = ${fmt(s.x,6)}`;
  stepDetail.textContent=`Polynomial: ${fmt(s.poly,8)} · piecewise linear: ${fmt(s.piece,8)} · spline: ${fmt(s.spline,8)}.`;
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Sweep across x";}
async function run(){
  stopPlayback();runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is constructing three interpolants from your data…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(".cmna_interp_trace_text(x,y)"));
    renderSummary();renderTable();
    slider.min=0;slider.max=trace.samples.length-1;slider.value=0;slider.disabled=false;playButton.disabled=false;
    renderPlot(0);status.textContent="All three curves were computed in R from the same data points.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();renderPlot(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace)return;if(timer){stopPlayback();return;}
  let i=Number(slider.value);if(i>=trace.samples.length-1)i=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{i+=3;if(i>=trace.samples.length)i=trace.samples.length-1;slider.value=i;renderPlot(i);if(i>=trace.samples.length-1)stopPlayback();},40);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
