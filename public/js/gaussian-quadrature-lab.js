import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root=document.querySelector("[data-gauss-lab]");
if(!root) throw new Error("Gaussian quadrature lab not found.");

const editor=root.querySelector("[data-r-code]");
const aInput=root.querySelector("[data-a]");
const bInput=root.querySelector("[data-b]");
const mInput=root.querySelector("[data-m]");
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
    ready=true;runButton.disabled=false;status.textContent="R ready · choose a Gauss-Legendre rule";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,nodes:[],curve:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={total:Number(p[1]),m:Number(p[2])};
    else if(p[0]==="NODE")result.nodes.push({i:Number(p[1]),x:Number(p[2]),y:Number(p[3]),w:Number(p[4]),contrib:Number(p[5])});
    else if(p[0]==="CURVE")result.curve.push({x:Number(p[1]),y:Number(p[2])});
  }
  if(!result.meta)throw new Error("R returned an incomplete Gaussian trace.");
  return result;
}
function renderSummary(){
  const abs=trace.nodes.reduce((s,n)=>s+Math.abs(n.contrib),0);
  summary.innerHTML=[
    ["Gauss-Legendre estimate",fmt(trace.meta.total,11)],
    ["Nodes",trace.meta.m],
    ["Σ |contribution|",fmt(abs,10)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderTable(active=0){
  tableBody.replaceChildren();
  trace.nodes.forEach((n,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    [index+1,fmt(n.x,7),fmt(n.y,7),fmt(n.w,8),fmt(n.contrib,9)].forEach(v=>{
      const td=document.createElement("td");td.textContent=v;tr.append(td);
    });
    tableBody.append(tr);
  });
}
function renderPlot(active=0){
  const width=720,height=360,pad=44;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const xs=trace.curve.map(p=>p.x),ys=trace.curve.map(p=>p.y);
  const xmin=Math.min(...xs),xmax=Math.max(...xs);
  let ymin=Math.min(...ys,0),ymax=Math.max(...ys,0);if(ymin===ymax){ymin-=1;ymax+=1;}
  const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c"}));
  const d=trace.curve.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));

  trace.nodes.forEach((n,index)=>{
    const activeNode=index===active;
    const h=Math.max(3,Math.min(28,Math.abs(n.w)*35));
    plot.append(svgEl("line",{x1:mapX(n.x),x2:mapX(n.x),y1:axisY,y2:mapY(n.y),stroke:activeNode?"#7a2d4b":"#d6a744","stroke-width":activeNode?3:1.6,opacity:activeNode?1:0.75}));
    plot.append(svgEl("circle",{cx:mapX(n.x),cy:mapY(n.y),r:activeNode?7:4.5,fill:activeNode?"#7a2d4b":"#d6a744",stroke:"#fffdf8","stroke-width":1.5}));
    plot.append(svgEl("rect",{x:mapX(n.x)-3,y:height-pad+5,width:6,height:h,fill:activeNode?"#7a2d4b":"#d6a744",opacity:0.85}));
  });
  const node=trace.nodes[Math.max(0,Math.min(active,trace.nodes.length-1))];
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Nodes are not evenly spaced; bars below the axis suggest relative quadrature weights";
  plot.append(label);

  stepLabel.textContent=`Node ${active+1} of ${trace.nodes.length}`;
  stepDetail.textContent=`x=${fmt(node.x,8)}, f(x)=${fmt(node.y,8)}, weight=${fmt(node.w,9)}, contribution to the transformed integral=${fmt(node.contrib,10)}.`;
}
function showStep(i){
  if(!trace?.nodes.length)return;
  const safe=Math.max(0,Math.min(i,trace.nodes.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play nodes";}
async function run(){
  stopPlayback();
  const a=Number(aInput.value),b=Number(bInput.value),m=Number(mInput.value);
  if(![a,b,m].every(Number.isFinite)||a===b||![5,10,20].includes(m)){status.textContent="Use distinct finite bounds and 5, 10, or 20 nodes.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is evaluating your function only at the Gaussian nodes…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_gauss_legendre_trace_text(f,a=${a},b=${b},m=${m})`));
    renderSummary();slider.min=0;slider.max=trace.nodes.length-1;slider.value=0;slider.disabled=trace.nodes.length<=1;playButton.disabled=trace.nodes.length<=1;
    showStep(0);status.textContent="The node locations, weights, and function evaluations all came from the Gauss-Legendre rule in R.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.nodes.length)return;if(timer){stopPlayback();return;}
  let i=Number(slider.value);if(i>=trace.nodes.length-1)i=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.nodes.length-1)stopPlayback();},700);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
