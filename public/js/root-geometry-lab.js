import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root=document.querySelector("[data-root-geometry-lab]");
if(!root) throw new Error("Root geometry lab not found.");

const method=root.dataset.method;
const editor=root.querySelector("[data-r-code]");
const x0Input=root.querySelector("[data-x0]");
const tolInput=root.querySelector("[data-tol]");
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
  if(ready)return;
  if(starting)return starting;
  starting=(async()=>{
    runButton.disabled=true;status.textContent="Starting R in this browser…";
    webR=new WebR({interactive:false,channelType:ChannelType.PostMessage});
    await webR.init();
    const response=await fetch("/r/cmna-workbench.R");
    if(!response.ok)throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;
    status.textContent="R ready · supply your function"+(method==="newton"?" and derivative":"");
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,rows:[],samples:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={root:Number(p[1]),iterations:Number(p[2]),xmin:Number(p[3]),xmax:Number(p[4])};
    else if(p[0]==="SAMPLE")result.samples.push({x:Number(p[1]),y:Number(p[2])});
    else if(p[0]==="ROW"){
      if(method==="newton"){
        result.rows.push({i:Number(p[1]),x:Number(p[2]),fx:Number(p[3]),fpx:Number(p[4]),nextx:Number(p[5])});
      }else{
        result.rows.push({i:Number(p[1]),oldx:Number(p[2]),oldfx:Number(p[3]),x:Number(p[4]),fx:Number(p[5]),nextx:Number(p[6])});
      }
    }
  }
  if(!result.meta)throw new Error("R returned an incomplete trace.");
  return result;
}
function renderSummary(){
  const last=trace.rows.at(-1);
  const residual=method==="newton"?Math.abs(last?.fx??0):Math.abs(last?.fx??0);
  summary.innerHTML=[
    ["Root estimate",fmt(trace.meta.root,11)],
    ["Iterations",trace.meta.iterations],
    ["Last |f(x)|",fmt(residual,9)]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function renderTable(active=0){
  tableBody.replaceChildren();
  trace.rows.forEach((r,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    const vals=method==="newton"
      ? [r.i,fmt(r.x,8),fmt(r.fx,8),fmt(r.fpx,8),fmt(r.nextx,8)]
      : [r.i,fmt(r.oldx,8),fmt(r.x,8),fmt(r.fx,8),fmt(r.nextx,8)];
    vals.forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.append(td);});
    tableBody.append(tr);
  });
}
function renderPlot(active=0){
  const width=720,height=360,pad=46;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const samples=trace.samples;
  let ymin=Math.min(...samples.map(p=>p.y),0),ymax=Math.max(...samples.map(p=>p.y),0);
  if(ymin===ymax){ymin-=1;ymax+=1;} const yp=(ymax-ymin)*0.1;ymin-=yp;ymax+=yp;
  const {xmin,xmax}=trace.meta;
  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c","stroke-width":1}));
  const d=samples.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3}));

  const row=trace.rows[Math.min(active,trace.rows.length-1)];
  if(!row)return;
  if(method==="newton"){
    const xLeft=xmin,xRight=xmax;
    const yLeft=row.fx+row.fpx*(xLeft-row.x), yRight=row.fx+row.fpx*(xRight-row.x);
    plot.append(svgEl("line",{x1:mapX(xLeft),x2:mapX(xRight),y1:mapY(yLeft),y2:mapY(yRight),stroke:"#7a2d4b","stroke-width":2.5}));
    plot.append(svgEl("circle",{cx:mapX(row.x),cy:mapY(row.fx),r:6,fill:"#7a2d4b",stroke:"#fffdf8","stroke-width":2}));
    plot.append(svgEl("circle",{cx:mapX(row.nextx),cy:axisY,r:6,fill:"#d6a744",stroke:"#fffdf8","stroke-width":2}));
    stepDetail.textContent=`At x=${fmt(row.x,8)}, R found f(x)=${fmt(row.fx,8)} and f'(x)=${fmt(row.fpx,8)}. The tangent crosses the x-axis at ${fmt(row.nextx,9)}, which becomes the next Newton iterate.`;
  }else{
    const slope=(row.fx-row.oldfx)/(row.x-row.oldx);
    const xLeft=xmin,xRight=xmax;
    const yLeft=row.oldfx+slope*(xLeft-row.oldx), yRight=row.oldfx+slope*(xRight-row.oldx);
    plot.append(svgEl("line",{x1:mapX(xLeft),x2:mapX(xRight),y1:mapY(yLeft),y2:mapY(yRight),stroke:"#7a2d4b","stroke-width":2.5}));
    plot.append(svgEl("circle",{cx:mapX(row.oldx),cy:mapY(row.oldfx),r:5.5,fill:"#7a2d4b"}));
    plot.append(svgEl("circle",{cx:mapX(row.x),cy:mapY(row.fx),r:5.5,fill:"#7a2d4b"}));
    plot.append(svgEl("circle",{cx:mapX(row.nextx),cy:axisY,r:6,fill:"#d6a744",stroke:"#fffdf8","stroke-width":2}));
    stepDetail.textContent=`The secant through x=${fmt(row.oldx,7)} and x=${fmt(row.x,7)} crosses the axis at ${fmt(row.nextx,9)}. That intercept becomes the next approximation.`;
  }
  const label=svgEl("text",{x:pad,y:23,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=method==="newton"?"Murrey tangent; gold intercept is the next Newton iterate":"Murrey chord; gold intercept is the next secant iterate";
  plot.append(label);
  stepLabel.textContent=`Iteration ${row.i} of ${trace.meta.iterations}`;
}
function showStep(i){
  if(!trace?.rows.length)return;
  const safe=Math.max(0,Math.min(i,trace.rows.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play convergence";}
async function run(){
  stopPlayback();
  const x0=Number(x0Input.value),tol=Number(tolInput.value);
  if(!Number.isFinite(x0)||!Number.isFinite(tol)||tol<=0){status.textContent="Use a finite starting value and positive tolerance.";return;}
  if(!editor.value.trim()){status.textContent="Define the required R functions first.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is tracing "+(method==="newton"?"Newton's method":"the secant method")+"…";
    await webR.evalRVoid(editor.value);
    const call=method==="newton"
      ? `.cmna_newton_trace_text(f,fp,x=${x0},tol=${tol},m=100)`
      : `.cmna_secant_trace_text(f,x=${x0},tol=${tol},m=100)`;
    trace=parse(await webR.evalRString(call));renderSummary();
    slider.min=0;slider.max=Math.max(0,trace.rows.length-1);slider.value=0;slider.disabled=trace.rows.length<=1;playButton.disabled=trace.rows.length<=1;
    showStep(0);status.textContent="The curve and every geometric step came from the R function you supplied.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.rows.length)return;if(timer){stopPlayback();return;}
  let step=Number(slider.value);if(step>=trace.rows.length-1)step=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{step+=1;showStep(step);if(step>=trace.rows.length-1)stopPlayback();},650);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
