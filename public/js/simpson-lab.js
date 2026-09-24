import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root = document.querySelector("[data-simpson-lab]");
if (!root) throw new Error("Simpson laboratory root not found.");

const editor = root.querySelector("[data-r-function]");
const aInput = root.querySelector("[data-a]");
const bInput = root.querySelector("[data-b]");
const mInput = root.querySelector("[data-m]");
const runButton = root.querySelector("[data-run]");
const resetButton = root.querySelector("[data-reset]");
const status = root.querySelector("[data-status]");
const summary = root.querySelector("[data-summary]");
const plot = root.querySelector("[data-plot]");
const tableBody = root.querySelector("[data-rows]");
const playButton = root.querySelector("[data-play]");
const slider = root.querySelector("[data-step]");
const stepLabel = root.querySelector("[data-step-label]");
const stepDetail = root.querySelector("[data-step-detail]");

let webR;
let ready = false;
let starting = null;
let trace = null;
let timer = null;

function fmt(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) > 0 && (Math.abs(value) < 1e-5 || Math.abs(value) >= 1e6)) {
    return value.toExponential(4);
  }
  return Number(value.toFixed(digits)).toString();
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

async function initialise() {
  if (ready) return;
  if (starting) return starting;
  starting = (async () => {
    runButton.disabled = true;
    status.textContent = "Starting R in this browser…";
    webR = new WebR({ interactive: false, channelType: ChannelType.PostMessage });
    await webR.init();
    const response = await fetch("/r/cmna-workbench.R");
    if (!response.ok) throw new Error("Could not load CMNA R source.");
    await webR.evalRVoid(await response.text());
    const version = await webR.evalRString('paste(R.version$major,R.version$minor,sep=".")');
    ready = true;
    runButton.disabled = false;
    status.textContent = "R " + version + " ready · your integrand will run locally";
  })().catch((error) => {
    status.textContent = "R failed to start: " + (error.message || error);
    throw error;
  }).finally(() => {
    starting = null;
  });
  return starting;
}

function parse(payload) {
  const result = { meta: null, panels: [], samples: [] };
  for (const line of payload.trim().split("\n")) {
    const parts = line.split("\t");
    if (parts[0] === "META") {
      result.meta = { total: Number(parts[1]), m: Number(parts[2]), h: Number(parts[3]) };
    } else if (parts[0] === "PANEL") {
      result.panels.push({
        i: Number(parts[1]),
        x0: Number(parts[2]), xm: Number(parts[3]), x1: Number(parts[4]),
        y0: Number(parts[5]), ym: Number(parts[6]), y1: Number(parts[7]),
        area: Number(parts[8]),
      });
    } else if (parts[0] === "SAMPLE") {
      result.samples.push({ x: Number(parts[1]), y: Number(parts[2]) });
    }
  }
  if (!result.meta) throw new Error("R returned an incomplete Simpson trace.");
  return result;
}

function quadratic(panel, x) {
  const { x0, xm, x1, y0, ym, y1 } = panel;
  const l0 = ((x - xm) * (x - x1)) / ((x0 - xm) * (x0 - x1));
  const lm = ((x - x0) * (x - x1)) / ((xm - x0) * (xm - x1));
  const l1 = ((x - x0) * (x - xm)) / ((x1 - x0) * (x1 - xm));
  return y0 * l0 + ym * lm + y1 * l1;
}

function renderSummary() {
  const cumulative = trace.panels.reduce((sum, p) => sum + p.area, 0);
  summary.innerHTML = [
    ["Simpson estimate", fmt(trace.meta.total, 11)],
    ["Panels", trace.meta.m],
    ["Panel width", fmt(trace.meta.h, 8)],
  ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
  if (Math.abs(cumulative - trace.meta.total) > 1e-8) {
    status.textContent = "Panel accounting differs slightly from the total because of floating-point rounding.";
  }
}

function renderTable(activeIndex = 0) {
  tableBody.replaceChildren();
  trace.panels.forEach((panel, index) => {
    const tr = document.createElement("tr");
    if (index === activeIndex) tr.classList.add("is-current");
    const cumulative = trace.panels.slice(0, index + 1).reduce((sum, p) => sum + p.area, 0);
    [panel.i, fmt(panel.x0,6), fmt(panel.xm,6), fmt(panel.x1,6), fmt(panel.area,8), fmt(cumulative,8)]
      .forEach((value) => {
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(td);
      });
    tableBody.append(tr);
  });
}

function renderPlot(activeIndex = 0) {
  const width = 720, height = 360, pad = 44;
  plot.replaceChildren();
  plot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  if (!trace?.samples.length) return;

  const xmin = Math.min(...trace.samples.map(p => p.x));
  const xmax = Math.max(...trace.samples.map(p => p.x));
  let ymin = Math.min(...trace.samples.map(p => p.y), 0);
  let ymax = Math.max(...trace.samples.map(p => p.y), 0);

  for (const panel of trace.panels) {
    for (let j=0;j<=20;j++) {
      const x = panel.x0 + (j/20)*(panel.x1-panel.x0);
      const y = quadratic(panel,x);
      if (Number.isFinite(y)) { ymin=Math.min(ymin,y); ymax=Math.max(ymax,y); }
    }
  }
  if (ymin === ymax) { ymin -= 1; ymax += 1; }
  const yp=(ymax-ymin)*0.1; ymin-=yp; ymax+=yp;

  const mapX=x=>pad+((x-xmin)/(xmax-xmin))*(width-2*pad);
  const mapY=y=>height-pad-((y-ymin)/(ymax-ymin))*(height-2*pad);
  const axisY=mapY(0);

  plot.append(svgEl("rect",{x:0,y:0,width,height,fill:"#fffdf8"}));
  plot.append(svgEl("line",{x1:pad,x2:width-pad,y1:axisY,y2:axisY,stroke:"#8b949c","stroke-width":1}));

  trace.panels.forEach((panel,index)=>{
    const pts=[];
    for(let j=0;j<=34;j++){
      const x=panel.x0+(j/34)*(panel.x1-panel.x0);
      pts.push([mapX(x),mapY(quadratic(panel,x))]);
    }
    const fillPath = [
      `M${mapX(panel.x0)},${axisY}`,
      ...pts.map(([x,y])=>`L${x.toFixed(2)},${y.toFixed(2)}`),
      `L${mapX(panel.x1)},${axisY} Z`,
    ].join(" ");
    plot.append(svgEl("path",{
      d:fillPath,
      fill:index===activeIndex?"rgba(122,45,75,0.22)":"rgba(214,167,68,0.09)",
      stroke:index===activeIndex?"#7a2d4b":"#d6a744",
      "stroke-width":index===activeIndex?2.5:1,
    }));
  });

  const fpath=trace.samples.map((p,i)=>`${i?"L":"M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`).join(" ");
  plot.append(svgEl("path",{d:fpath,fill:"none",stroke:"#102b46","stroke-width":3}));

  const panel=trace.panels[Math.min(activeIndex,trace.panels.length-1)];
  for(const [x,y] of [[panel.x0,panel.y0],[panel.xm,panel.ym],[panel.x1,panel.y1]]){
    plot.append(svgEl("circle",{cx:mapX(x),cy:mapY(y),r:5.5,fill:"#7a2d4b",stroke:"#fffdf8","stroke-width":2}));
  }

  const label=svgEl("text",{x:pad,y:23,fill:"#5f6b74","font-size":14,"font-family":"system-ui,sans-serif"});
  label.textContent=`Panel ${panel.i}: parabola through endpoint–midpoint–endpoint samples`;
  plot.append(label);

  const cumulative=trace.panels.slice(0,activeIndex+1).reduce((sum,p)=>sum+p.area,0);
  stepLabel.textContent=`Panel ${panel.i} of ${trace.meta.m}`;
  stepDetail.textContent=`This panel contributes ${fmt(panel.area,9)}. The running Simpson estimate through this panel is ${fmt(cumulative,10)}.`;
}

function stopPlayback(){
  if(timer) clearInterval(timer);
  timer=null;
  playButton.textContent="Play panels";
}

function showStep(index){
  if(!trace?.panels.length) return;
  const safe=Math.max(0,Math.min(index,trace.panels.length-1));
  slider.value=safe;
  renderPlot(safe);
  renderTable(safe);
}

async function run(){
  stopPlayback();
  const a=Number(aInput.value), b=Number(bInput.value), m=Number(mInput.value);
  if(![a,b,m].every(Number.isFinite) || a===b || m<1 || !Number.isInteger(m) || m>100){
    status.textContent="Use distinct finite bounds and an integer panel count from 1 to 100.";
    return;
  }
  if(!editor.value.trim()){ status.textContent="Define f as an R function first."; return; }

  runButton.disabled=true;
  playButton.disabled=true;
  slider.disabled=true;
  summary.replaceChildren(); plot.replaceChildren(); tableBody.replaceChildren(); stepDetail.textContent="";
  try{
    await initialise();
    status.textContent="R is evaluating your integrand and building Simpson panels…";
    await webR.evalRVoid(editor.value);
    const payload=await webR.evalRString(`.cmna_simpson_trace_text(f,a=${a},b=${b},m=${m})`);
    trace=parse(payload);
    renderSummary();
    slider.min=0; slider.max=Math.max(0,trace.panels.length-1); slider.value=0;
    slider.disabled=trace.panels.length<=1; playButton.disabled=trace.panels.length<=1;
    renderTable(0); renderPlot(0);
    status.textContent="The blue curve is your R function; the shaded quadratic panels are Simpson's approximations.";
  }catch(error){
    status.textContent=error.message||String(error);
  }finally{
    runButton.disabled=false;
  }
}

slider.addEventListener("input",()=>{stopPlayback();showStep(Number(slider.value));});
playButton.addEventListener("click",()=>{
  if(!trace?.panels.length) return;
  if(timer){stopPlayback();return;}
  let step=Number(slider.value);
  if(step>=trace.panels.length-1) step=-1;
  playButton.textContent="Pause";
  timer=setInterval(()=>{
    step+=1; showStep(step);
    if(step>=trace.panels.length-1) stopPlayback();
  },650);
});
runButton.addEventListener("click",run);
resetButton.addEventListener("click",()=>location.reload());
initialise();
