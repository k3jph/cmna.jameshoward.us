import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";
const root=document.querySelector("[data-sa-lab]");
if(!root) throw new Error("Simulated annealing lab not found.");

const editor=root.querySelector("[data-r-code]");
const tempInput=root.querySelector("[data-temp]");
const rateInput=root.querySelector("[data-rate]");
const seedInput=root.querySelector("[data-seed]");
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
async function initialise(){if(ready)return;if(starting)return starting;starting=(async()=>{runButton.disabled=true;status.textContent="Starting R in this browser…";webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});await webR.init();const response=await fetch("/r/cmna-workbench.R");if(!response.ok)throw new Error("Could not load CMNA R source.");await webR.evalRVoid(await response.text());ready=true;runButton.disabled=false;status.textContent="R ready · define f and x0";})().finally(()=>{starting=null;});return starting;}
function parse(payload){
  const result={meta:null,rows:[],grid:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={iterations:Number(p[1]),b1:Number(p[2]),b2:Number(p[3]),best:Number(p[4]),xmin:Number(p[5]),xmax:Number(p[6]),ymin:Number(p[7]),ymax:Number(p[8])};
    else if(p[0]==="ROW")result.rows.push({i:Number(p[1]),temp:Number(p[2]),p1:Number(p[3]),p2:Number(p[4]),py:Number(p[5]),accepted:Number(p[6])===1,x1:Number(p[7]),x2:Number(p[8]),y:Number(p[9]),b1:Number(p[10]),b2:Number(p[11]),best:Number(p[12]),prob:Number(p[13])});
    else if(p[0]==="GRID")result.grid.push({x:Number(p[1]),y:Number(p[2]),z:Number(p[3])});
  }
  if(!result.meta)throw new Error("R returned an incomplete annealing trace.");return result;
}
function color(t){const c=Math.max(0,Math.min(1,t));const a=[244,240,231],b=[122,45,75];const vals=a.map((v,i)=>Math.round(v+(b[i]-v)*Math.sqrt(c)));return `rgb(${vals.join(",")})`;}
function renderSummary(){
  const acc=trace.rows.filter(r=>r.accepted).length;
  summary.innerHTML=[
    ["best point",`[${fmt(trace.meta.b1,6)}, ${fmt(trace.meta.b2,6)}]`],
    ["best f(x)",fmt(trace.meta.best,9)],
    ["accepted moves",`${acc} / ${trace.meta.iterations}`]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderPlot(active=0){
  const width=720,height=440,pad=46;plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const m=trace.meta,mapX=x=>pad+((x-m.xmin)/(m.xmax-m.xmin))*(width-2*pad),mapY=y=>height-pad-((y-m.ymin)/(m.ymax-m.ymin))*(height-2*pad);
  const zs=trace.grid.map(g=>g.z),zmin=Math.min(...zs),zmax=Math.max(...zs);
  const xs=[...new Set(trace.grid.map(g=>g.x))].sort((a,b)=>a-b),ys=[...new Set(trace.grid.map(g=>g.y))].sort((a,b)=>a-b);
  const cw=(width-2*pad)/Math.max(1,xs.length-1),ch=(height-2*pad)/Math.max(1,ys.length-1);
  for(const g of trace.grid){const t=(g.z-zmin)/Math.max(1e-12,zmax-zmin);plot.append(svgEl("rect",{x:mapX(g.x)-cw/2,y:mapY(g.y)-ch/2,width:cw+0.5,height:ch+0.5,fill:color(t),opacity:0.6}));}
  const rows=trace.rows.slice(0,Math.min(active+1,trace.rows.length));
  if(rows.length){
    const d=rows.map((r,i)=>`${i?"L":"M"}${mapX(r.x1).toFixed(2)},${mapY(r.x2).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":2.5,"stroke-linejoin":"round"}));
    rows.forEach((r,i)=>{plot.append(svgEl("circle",{cx:mapX(r.x1),cy:mapY(r.x2),r:i===rows.length-1?6:2.8,fill:r.accepted?"#d6a744":"#8b949c",stroke:"#fffdf8","stroke-width":1}));});
  }
  const r=trace.rows[Math.min(active,trace.rows.length-1)];
  if(r){
    plot.append(svgEl("line",{x1:mapX(r.x1),y1:mapY(r.x2),x2:mapX(r.p1),y2:mapY(r.p2),stroke:r.accepted?"#d6a744":"#8b949c","stroke-width":2,"stroke-dasharray":"5 4"}));
    plot.append(svgEl("circle",{cx:mapX(r.p1),cy:mapY(r.p2),r:5,fill:r.accepted?"#d6a744":"#8b949c",stroke:"#fffdf8","stroke-width":1.5}));
    stepLabel.textContent=`Iteration ${r.i} of ${trace.meta.iterations}`;
    stepDetail.textContent=`T=${fmt(r.temp,5)} · proposal f=${fmt(r.py,8)} · acceptance probability=${fmt(r.prob,6)} · ${r.accepted?"accepted":"rejected"} · best so far=${fmt(r.best,8)}.`;
  }
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});label.textContent="Gold accepted moves · gray rejected proposals · dark blue accepted path";plot.append(label);
}
function renderTable(active=0){
  tableBody.replaceChildren();const stride=Math.max(1,Math.floor(trace.rows.length/35));
  trace.rows.forEach((r,index)=>{if(index%stride!==0&&index!==active&&index!==trace.rows.length-1)return;const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");[r.i,fmt(r.temp,5),fmt(r.py,7),r.accepted?"yes":"no",fmt(r.best,7)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});tableBody.append(tr);});
}
function showStep(i){if(!trace?.rows.length)return;const safe=Math.max(0,Math.min(i,trace.rows.length-1));slider.value=safe;renderPlot(safe);renderTable(safe);}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play annealing";}
async function run(){
  stopPlayback();const temp=Number(tempInput.value),rate=Number(rateInput.value),seed=Number(seedInput.value);
  if(![temp,rate,seed].every(Number.isFinite)||temp<=1||rate<=0||rate>=1){status.textContent="Use temp > 1, rate between 0 and 1, and a finite seed.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is annealing your objective…";await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_sa_trace_text(f,x0,temp=${temp},rate=${rate},seed=${seed})`));
    renderSummary();slider.min=0;slider.max=trace.rows.length-1;slider.value=0;slider.disabled=trace.rows.length<=1;playButton.disabled=trace.rows.length<=1;showStep(0);status.textContent="The objective, random proposals, acceptance decisions, and best-so-far state all came from R.";
  }catch(error){status.textContent=error.message||String(error);}finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{if(!trace?.rows.length)return;if(timer){stopPlayback();return;}let i=Number(slider.value);if(i>=trace.rows.length-1)i=-1;playButton.textContent="Pause";timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.rows.length-1)stopPlayback();},55);});
runButton.addEventListener("click",run);resetButton.addEventListener("click",()=>location.reload());initialise();