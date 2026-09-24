import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root = document.querySelector("[data-iterative-lab]");
if (!root) throw new Error("Iterative linear algebra lab root not found.");

const editor=root.querySelector("[data-r-system]");
const tolInput=root.querySelector("[data-tol]");
const runButton=root.querySelector("[data-run]");
const resetButton=root.querySelector("[data-reset]");
const status=root.querySelector("[data-status]");
const plot=root.querySelector("[data-plot]");
const tableBody=root.querySelector("[data-rows]");
const summary=root.querySelector("[data-summary]");
const playButton=root.querySelector("[data-play]");
const slider=root.querySelector("[data-step]");
const stepLabel=root.querySelector("[data-step-label]");
const stepDetail=root.querySelector("[data-step-detail]");

let webR, ready=false, starting=null, trace=null, timer=null;

function fmt(v,d=7){
  if(!Number.isFinite(v)) return "—";
  if(Math.abs(v)>0&&(Math.abs(v)<1e-5||Math.abs(v)>=1e6)) return v.toExponential(4);
  return Number(v.toFixed(d)).toString();
}
function svgEl(name,attrs={}){
  const el=document.createElementNS("http://www.w3.org/2000/svg",name);
  for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);
  return el;
}
async function initialise(){
  if(ready) return;
  if(starting) return starting;
  starting=(async()=>{
    runButton.disabled=true;
    status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok) throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true; runButton.disabled=false;
    status.textContent="R is ready · define A and b, then compare the iterations";
  })().finally(()=>{starting=null;});
  return starting;
}

function parse(payload){
  const result={direct:[],rows:{Jacobi:[], "Gauss-Seidel":[]}, n:0};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META"){
      result.n=Number(p[1]);
      result.direct=(p[2]||"").split(",").map(Number);
    }else if(p[0]==="ROW"){
      const row={
        method:p[1], i:Number(p[2]),
        vector:p[3].split(",").map(Number),
        residual:Number(p[4]), delta:Number(p[5]),
      };
      result.rows[row.method].push(row);
    }
  }
  return result;
}

function renderSummary(){
  const j=trace.rows.Jacobi.at(-1);
  const g=trace.rows["Gauss-Seidel"].at(-1);
  summary.innerHTML=[
    ["Direct solution", "["+trace.direct.map(x=>fmt(x,6)).join(", ")+"]"],
    ["Jacobi iterations", j?.i ?? 0],
    ["Gauss-Seidel iterations", g?.i ?? 0],
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}

function renderPlot(active=0){
  const width=720,height=360,pad=48;
  plot.replaceChildren(); plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));

  const all=[...trace.rows.Jacobi,...trace.rows["Gauss-Seidel"]];
  const maxIter=Math.max(1,...all.map(r=>r.i));
  const logs=all.map(r=>Math.log10(Math.max(r.residual,1e-16)));
  let minLog=Math.min(...logs,-12), maxLog=Math.max(...logs,0);
  if(minLog===maxLog){minLog-=1;maxLog+=1;}
  const mapX=i=>pad+(i/maxIter)*(width-2*pad);
  const mapY=l=>height-pad-((l-minLog)/(maxLog-minLog))*(height-2*pad);

  for(let k=0;k<=4;k++){
    const y=pad+k*(height-2*pad)/4;
    plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:y,y2:y,stroke:"#e1dbd0","stroke-width":1}));
  }
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:height-pad,y2:height-pad,stroke:"#8b949c"}));
  plot.append(svgEl("line",{x1:pad,x2:pad,y1:pad,y2:height-pad,stroke:"#8b949c"}));

  const series=[
    ["Jacobi",trace.rows.Jacobi,"#102b46"],
    ["Gauss-Seidel",trace.rows["Gauss-Seidel"],"#7a2d4b"],
  ];
  for(const [,rows,color] of series){
    const d=rows.map((r,i)=>`${i?"L":"M"}${mapX(r.i).toFixed(2)},${mapY(Math.log10(Math.max(r.residual,1e-16))).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:color,"stroke-width":3}));
    const row=rows[Math.min(active,rows.length-1)];
    if(row) plot.append(svgEl("circle",{cx:mapX(row.i),cy:mapY(Math.log10(Math.max(row.residual,1e-16))),r:6,fill:color,stroke:"#fffdf8","stroke-width":2}));
  }
  const label=svgEl("text",{x:pad,y:22,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Residual norm ||Ax-b|| by iteration";
  plot.append(label);
}

function renderTable(active=0){
  tableBody.replaceChildren();
  const max=Math.max(trace.rows.Jacobi.length,trace.rows["Gauss-Seidel"].length);
  for(let i=0;i<max;i++){
    const j=trace.rows.Jacobi[i], g=trace.rows["Gauss-Seidel"][i];
    const tr=document.createElement("tr");
    if(i===active) tr.classList.add("is-current");
    const vals=[
      i+1,
      j?"["+j.vector.map(v=>fmt(v,5)).join(", ")+"]":"—",
      j?fmt(j.residual,5):"—",
      g?"["+g.vector.map(v=>fmt(v,5)).join(", ")+"]":"—",
      g?fmt(g.residual,5):"—",
    ];
    vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  }
}

function showStep(index){
  if(!trace) return;
  const max=Math.max(trace.rows.Jacobi.length,trace.rows["Gauss-Seidel"].length);
  const safe=Math.max(0,Math.min(index,max-1));
  slider.value=safe; renderPlot(safe); renderTable(safe);
  const j=trace.rows.Jacobi[Math.min(safe,trace.rows.Jacobi.length-1)];
  const g=trace.rows["Gauss-Seidel"][Math.min(safe,trace.rows["Gauss-Seidel"].length-1)];
  stepLabel.textContent=`Iteration ${safe+1} of ${max}`;
  stepDetail.textContent=`Jacobi residual: ${j?fmt(j.residual,7):"—"} · Gauss-Seidel residual: ${g?fmt(g.residual,7):"—"}. Each method uses the newest approximation differently, which is why their paths separate.`;
}
function stopPlayback(){if(timer) clearInterval(timer);timer=null;playButton.textContent="Play convergence";}

async function run(){
  stopPlayback();
  const tol=Number(tolInput.value);
  if(!Number.isFinite(tol)||tol<=0){status.textContent="Tolerance must be positive.";return;}
  runButton.disabled=true; playButton.disabled=true; slider.disabled=true;
  plot.replaceChildren();tableBody.replaceChildren();summary.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();
    status.textContent="R is iterating on your system…";
    await webR.evalRVoid(editor.value);
    const payload=await webR.evalRString(`.cmna_iterative_trace_text(A,b,tol=${tol},maxiter=100)`);
    trace=parse(payload);
    renderSummary();
    const max=Math.max(trace.rows.Jacobi.length,trace.rows["Gauss-Seidel"].length);
    slider.min=0;slider.max=Math.max(0,max-1);slider.value=0;slider.disabled=max<=1;playButton.disabled=max<=1;
    showStep(0);
    status.textContent="Blue is Jacobi; Murrey is Gauss-Seidel. The direct R solution is shown for reference.";
  }catch(error){
    status.textContent=error.message||String(error);
  }finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace) return;
  if(timer){stopPlayback();return;}
  const max=Math.max(trace.rows.Jacobi.length,trace.rows["Gauss-Seidel"].length);
  let step=Number(slider.value);if(step>=max-1)step=-1;
  playButton.textContent="Pause";
  timer=setInterval(()=>{step+=1;showStep(step);if(step>=max-1)stopPlayback();},600);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
