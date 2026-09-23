import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root=document.querySelector("[data-gradient-lab]");
if(!root) throw new Error("Gradient laboratory root not found.");

const editor=root.querySelector("[data-r-code]");
const hInput=root.querySelector("[data-h]");
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
    if(!response.ok) throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    ready=true;runButton.disabled=false;status.textContent="R ready · define f, fp, and x0";
  })().finally(()=>{starting=null;});
  return starting;
}
function parse(payload){
  const result={meta:null,rows:[],grid:[]};
  for(const line of payload.trim().split("\n")){
    const p=line.split("\t");
    if(p[0]==="META")result.meta={
      iterations:Number(p[1]),x1:Number(p[2]),x2:Number(p[3]),value:Number(p[4]),
      xmin:Number(p[5]),xmax:Number(p[6]),ymin:Number(p[7]),ymax:Number(p[8])
    };
    else if(p[0]==="ROW")result.rows.push({
      i:Number(p[1]),x1:Number(p[2]),x2:Number(p[3]),value:Number(p[4]),gradnorm:Number(p[5])
    });
    else if(p[0]==="GRID")result.grid.push({x:Number(p[1]),y:Number(p[2]),z:Number(p[3])});
  }
  if(!result.meta)throw new Error("R returned an incomplete gradient trace.");
  return result;
}
function renderSummary(){
  const m=trace.meta;
  summary.innerHTML=[
    ["Final point",`[${fmt(m.x1,7)}, ${fmt(m.x2,7)}]`],
    ["f(x)",fmt(m.value,9)],
    ["Iterations",m.iterations]
  ].map(([l,v])=>`<div><span>${l}</span><strong>${v}</strong></div>`).join("");
}
function heatColor(t){
  const clamped=Math.max(0,Math.min(1,t));
  const a=[244,240,231], b=[122,45,75];
  const vals=a.map((v,i)=>Math.round(v+(b[i]-v)*clamped));
  return `rgb(${vals[0]},${vals[1]},${vals[2]})`;
}
function renderPlot(active=0){
  const width=720,height=440,pad=48;
  plot.replaceChildren();plot.setAttribute("viewBox",`0 0 ${width} ${height}`);
  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  const m=trace.meta;
  const mapX=x=>pad+((x-m.xmin)/(m.xmax-m.xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-m.ymin)/(m.ymax-m.ymin))*(height-2*pad);

  const zs=trace.grid.map(g=>g.z).filter(Number.isFinite);
  let zmin=Math.min(...zs), zmax=Math.max(...zs);
  if(zmin===zmax){zmin-=1;zmax+=1;}
  const xs=[...new Set(trace.grid.map(g=>g.x))].sort((a,b)=>a-b);
  const ys=[...new Set(trace.grid.map(g=>g.y))].sort((a,b)=>a-b);
  const cellW=(width-2*pad)/Math.max(1,xs.length-1);
  const cellH=(height-2*pad)/Math.max(1,ys.length-1);
  for(const g of trace.grid){
    const t=(g.z-zmin)/(zmax-zmin);
    plot.append(svgEl("rect",{
      x:mapX(g.x)-cellW/2,y:mapY(g.y)-cellH/2,width:cellW+0.6,height:cellH+0.6,
      fill:heatColor(Math.sqrt(Math.max(0,t))),opacity:0.62
    }));
  }

  const pts=trace.rows.slice(0,Math.min(active+1,trace.rows.length));
  if(pts.length){
    const d=pts.map((p,i)=>`${i?"L":"M"}${mapX(p.x1).toFixed(2)},${mapY(p.x2).toFixed(2)}`).join(" ");
    plot.append(svgEl("path",{d,fill:"none",stroke:"#102b46","stroke-width":3.5,"stroke-linecap":"round","stroke-linejoin":"round"}));
    pts.forEach((p,i)=>{
      plot.append(svgEl("circle",{
        cx:mapX(p.x1),cy:mapY(p.x2),r:i===pts.length-1?6:3.2,
        fill:i===pts.length-1?"#d6a744":"#102b46",stroke:"#fffdf8","stroke-width":1.5
      }));
    });
  }
  const label=svgEl("text",{x:pad,y:24,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent="Objective surface sampled by R; dark blue path is gradient descent";
  plot.append(label);

  const row=trace.rows[Math.min(active,trace.rows.length-1)];
  stepLabel.textContent=`Iteration ${row.i} of ${trace.meta.iterations}`;
  stepDetail.textContent=`x = [${fmt(row.x1,7)}, ${fmt(row.x2,7)}], f(x) = ${fmt(row.value,9)}, ||∇f|| = ${fmt(row.gradnorm,8)}.`;
}
function renderTable(active=0){
  tableBody.replaceChildren();
  trace.rows.forEach((r,index)=>{
    const tr=document.createElement("tr");if(index===active)tr.classList.add("is-current");
    [r.i,fmt(r.x1,7),fmt(r.x2,7),fmt(r.value,9),fmt(r.gradnorm,8)].forEach(v=>{
      const td=document.createElement("td");td.textContent=v;tr.append(td);
    });
    tableBody.append(tr);
  });
}
function showStep(index){
  if(!trace?.rows.length)return;
  const safe=Math.max(0,Math.min(index,trace.rows.length-1));
  slider.value=safe;renderPlot(safe);renderTable(safe);
}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;playButton.textContent="Play descent";}
async function run(){
  stopPlayback();
  const h=Number(hInput.value),tol=Number(tolInput.value);
  if(!Number.isFinite(h)||h<=0||!Number.isFinite(tol)||tol<=0){status.textContent="Use positive finite h and tolerance.";return;}
  if(!editor.value.trim()){status.textContent="Define f, fp, and x0 in R.";return;}
  runButton.disabled=true;playButton.disabled=true;slider.disabled=true;
  summary.replaceChildren();plot.replaceChildren();tableBody.replaceChildren();stepDetail.textContent="";
  try{
    await initialise();status.textContent="R is following your gradient…";
    await webR.evalRVoid(editor.value);
    const payload=await webR.evalRString(`.cmna_gradient_trace_text(f,fp,x0,h=${h},tol=${tol},m=250,grid=31)`);
    trace=parse(payload);renderSummary();
    slider.min=0;slider.max=Math.max(0,trace.rows.length-1);slider.value=0;slider.disabled=trace.rows.length<=1;playButton.disabled=trace.rows.length<=1;
    showStep(0);
    status.textContent="The objective surface and every descent step came from the R functions you supplied.";
  }catch(error){status.textContent=error.message||String(error);}
  finally{runButton.disabled=false;}
}
slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.rows.length)return;if(timer){stopPlayback();return;}
  let step=Number(slider.value);if(step>=trace.rows.length-1)step=-1;playButton.textContent="Pause";
  timer=setInterval(()=>{step+=1;showStep(step);if(step>=trace.rows.length-1)stopPlayback();},450);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
