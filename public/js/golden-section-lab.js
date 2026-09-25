import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root=document.querySelector("[data-golden-lab]");
if(!root) throw new Error("Golden-section lab not found.");

const editor=root.querySelector("[data-r-code]");
const aInput=root.querySelector("[data-a]");
const bInput=root.querySelector("[data-b]");
const tolInput=root.querySelector("[data-tol]");
const modeInput=root.querySelector("[data-mode]");
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
    ready=true;runButton.disabled=false;status.textContent="R ready · choose min or max and an interval";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,rows:[],samples:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={optimum:Number(p[1]),iterations:Number(p[2]),width:Number(p[3]),mode:p[4]};
    else if(p[0]==="ROW")result.rows.push({
      i:Number(p[1]),a:Number(p[2]),b:Number(p[3]),astar:Number(p[4]),bstar:Number(p[5]),
      fa:Number(p[6]),fb:Number(p[7]),kept:p[8],nexta:Number(p[9]),nextb:Number(p[10])
    });
    else if(p[0]==="SAMPLE")result.samples.push({x:Number(p[1]),y:Number(p[2])});
  }
  if(!result.meta)throw new Error("R returned an incomplete golden-section trace.");
  return result;
}
function renderSummary(){
  summary.innerHTML=[
    [trace.meta.mode==="min"?"Minimum estimate":"Maximum estimate",fmt(trace.meta.optimum,10)],
    ["Iterations",trace.meta.iterations],
    ["Final interval",fmt(trace.meta.width,9)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderTable(active=0){
  tableBody.replaceChildren();
  trace.rows.forEach((r,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    [r.i,fmt(r.a,6),fmt(r.b,6),fmt(r.astar,6),fmt(r.bstar,6),fmt(r.fa,6),fmt(r.fb,6),r.kept]
      .forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  });
}
function renderPlot(active=0){
  const width=720,height=360,pad=44;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const xs=trace.samples.map(p=>p.x),ys=trace.samples.map(p=>p.y);
  const xmin=Math.min(...xs),xmax=Math.max(...xs);
  let ymin=Math.min(...ys),ymax=Math.max(...ys);if(ymin===ymax){ymin-=1;ymax+=1;}
  const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const d=trace.samples.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));

  const row=trace.rows[Math.max(0,Math.min(active,trace.rows.length-1))];
  const bandY=height-24;
  plot.append(svgEl("line",{x1:mapX(row.a),x2:mapX(row.b),y1:bandY,y2:bandY,stroke:"#d6a744","stroke-width":8,"stroke-linecap":"round"}));
  for(const [x,y,color] of [[row.astar,row.fa,"#7a2d4b"],[row.bstar,row.fb,"#7a2d4b"]]){
    plot.append(svgEl("circle",{cx:mapX(x),cy:mapY(y),r:6,fill:color,stroke:"#fffdf8","stroke-width":2}));
    plot.append(svgEl("line",{x1:mapX(x),x2:mapX(x),y1:mapY(y),y2:bandY-8,stroke:color,"stroke-width":1.5,"stroke-dasharray":"5 5"}));
  }
  const optY=trace.samples.reduce((best,p)=>Math.abs(p.x-trace.meta.optimum)<Math.abs(best.x-trace.meta.optimum)?p:best,trace.samples[0]).y;
  plot.append(svgEl("circle",{cx:mapX(trace.meta.optimum),cy:mapY(optY),r:6,fill:"#d6a744",stroke:"#102b46","stroke-width":1.5}));

  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=`Iteration ${row.i}: keep the ${row.kept} subinterval`;
  plot.append(label);

  stepLabel.textContent=`Iteration ${row.i} of ${trace.meta.iterations}`;
  stepDetail.textContent=`Probe values: f(a*)=${fmt(row.fa,8)}, f(b*)=${fmt(row.fb,8)}. For a ${trace.meta.mode==="min"?"minimum":"maximum"}, the comparison keeps the ${row.kept} side and discards the other.`;
}
function showStep(i){
  if(!trace?.rows.length)return;
  const safe=Math.max(0,Math.min(i,trace.rows.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play interval search";}
async function run(){
  stopPlayback();
  const a=Number(aInput.value),b=Number(bInput.value),tol=Number(tolInput.value),mode=modeInput.value;
  if(![a,b,tol].every(Number.isFinite)||a>=b||tol<=0){status.textContent="Use finite bounds with a < b and positive tolerance.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is shrinking the search interval…";
    await webR.evalRVoid(editor.value);
    trace=parse(await webR.evalRString(`.cmna_golden_trace_text(f,a=${a},b=${b},tol=${tol},mode="${mode}")`));
    renderSummary();slider.min=0;slider.max=trace.rows.length-1;slider.value=0;slider.disabled=trace.rows.length<=1;playButton.disabled=trace.rows.length<=1;
    showStep(0);status.textContent="The curve and every interval decision were computed from your R function.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.rows.length)return;if(timer){stopPlayback();return;}
  let i=Number(slider.value);if(i>=trace.rows.length-1)i=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{i+=1;showStep(i);if(i>=trace.rows.length-1)stopPlayback();},600);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
