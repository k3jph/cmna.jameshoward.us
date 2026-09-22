import { presets, bisectionTrace, formatNumber } from "./numerical-functions.js";

const root = document.querySelector("[data-bisection-lab]");
if (!root) {
  throw new Error("Bisection lab root not found.");
}

const presetSelect = root.querySelector("[data-preset]");
const toleranceSelect = root.querySelector("[data-tolerance]");
const runButton = root.querySelector("[data-run]");
const playButton = root.querySelector("[data-play]");
const slider = root.querySelector("[data-step]");
const expression = root.querySelector("[data-expression]");
const summary = root.querySelector("[data-summary]");
const status = root.querySelector("[data-status]");
const plot = root.querySelector("[data-plot]");
const tableBody = root.querySelector("[data-rows]");
const stepLabel = root.querySelector("[data-step-label]");

let currentPreset;
let trace;
let timer;

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function mapX(x, xmin, xmax, width, pad) {
  return pad + ((x - xmin) / (xmax - xmin)) * (width - 2 * pad);
}

function mapY(y, ymin, ymax, height, pad) {
  return height - pad - ((y - ymin) / (ymax - ymin)) * (height - 2 * pad);
}

function renderPlot(stepIndex = 0) {
  const width = 720;
  const height = 360;
  const pad = 42;
  plot.innerHTML = "";
  plot.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const first = trace.rows[0];
  const xmin = first.a;
  const xmax = first.b;
  const samples = Array.from({ length: 160 }, (_, i) => {
    const x = xmin + (i / 159) * (xmax - xmin);
    return { x, y: currentPreset.f(x) };
  }).filter((point) => Number.isFinite(point.y));

  let ymin = Math.min(...samples.map((p) => p.y), 0);
  let ymax = Math.max(...samples.map((p) => p.y), 0);
  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }
  const yPad = (ymax - ymin) * 0.1;
  ymin -= yPad;
  ymax += yPad;

  const bg = svgEl("rect", { x: 0, y: 0, width, height, fill: "#fffdf8" });
  plot.append(bg);

  const axisY = mapY(0, ymin, ymax, height, pad);
  plot.append(svgEl("line", {
    x1: pad, x2: width - pad, y1: axisY, y2: axisY,
    stroke: "#8b949c", "stroke-width": 1,
  }));

  const d = samples.map((p, i) => {
    const x = mapX(p.x, xmin, xmax, width, pad);
    const y = mapY(p.y, ymin, ymax, height, pad);
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  plot.append(svgEl("path", {
    d, fill: "none", stroke: "#102b46", "stroke-width": 3,
  }));

  const row = trace.rows[Math.min(stepIndex, trace.rows.length - 1)];
  const bracketY = height - 24;
  const ax = mapX(row.a, xmin, xmax, width, pad);
  const bx = mapX(row.b, xmin, xmax, width, pad);
  const mx = mapX(row.m, xmin, xmax, width, pad);

  plot.append(svgEl("line", {
    x1: ax, x2: bx, y1: bracketY, y2: bracketY,
    stroke: "#d6a744", "stroke-width": 8, "stroke-linecap": "round",
  }));

  for (const [x, fill, radius] of [
    [ax, "#7a2d4b", 8],
    [bx, "#7a2d4b", 8],
    [mx, "#d6a744", 7],
  ]) {
    plot.append(svgEl("circle", { cx: x, cy: bracketY, r: radius, fill }));
  }

  const my = mapY(currentPreset.f(row.m), ymin, ymax, height, pad);
  plot.append(svgEl("line", {
    x1: mx, x2: mx, y1: bracketY - 10, y2: my,
    stroke: "#7a2d4b", "stroke-width": 2, "stroke-dasharray": "6 5",
  }));
  plot.append(svgEl("circle", {
    cx: mx, cy: my, r: 6, fill: "#7a2d4b", stroke: "#fffdf8", "stroke-width": 2,
  }));

  const label = svgEl("text", {
    x: pad, y: 24, fill: "#5f6b74", "font-size": 14,
    "font-family": "system-ui, sans-serif",
  });
  label.textContent = `Iteration ${row.i}: [${formatNumber(row.a, 5)}, ${formatNumber(row.b, 5)}]`;
  plot.append(label);

  stepLabel.textContent = `Iteration ${row.i} of ${trace.iterations}`;
}

function renderTable() {
  tableBody.innerHTML = "";
  for (const row of trace.rows) {
    const tr = document.createElement("tr");
    for (const value of [
      row.i,
      formatNumber(row.a, 7),
      formatNumber(row.b, 7),
      formatNumber(row.m, 7),
      formatNumber(row.fm, 5),
      formatNumber(row.width, 5),
    ]) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    tableBody.append(tr);
  }
}

function stopPlayback() {
  if (timer) window.clearInterval(timer);
  timer = null;
  playButton.textContent = "Play convergence";
}

function run() {
  stopPlayback();
  currentPreset = presets[presetSelect.value];
  const tol = Number(toleranceSelect.value);
  expression.textContent = currentPreset.expression;

  try {
    trace = bisectionTrace(
      currentPreset.f,
      currentPreset.a,
      currentPreset.b,
      tol,
      100,
    );
  } catch (error) {
    status.textContent = error.message;
    summary.innerHTML = "";
    plot.innerHTML = "";
    tableBody.innerHTML = "";
    return;
  }

  status.textContent = "The bracket contracts by a factor of two on each successful iteration.";
  summary.innerHTML = `
    <div><span>Root estimate</span><strong>${formatNumber(trace.root, 10)}</strong></div>
    <div><span>Iterations</span><strong>${trace.iterations}</strong></div>
    <div><span>Final width</span><strong>${formatNumber(trace.width, 8)}</strong></div>
  `;

  slider.min = 0;
  slider.max = Math.max(0, trace.rows.length - 1);
  slider.value = 0;
  slider.disabled = trace.rows.length <= 1;
  renderTable();
  renderPlot(0);
}

slider.addEventListener("input", () => {
  stopPlayback();
  renderPlot(Number(slider.value));
});

playButton.addEventListener("click", () => {
  if (!trace?.rows.length) return;
  if (timer) {
    stopPlayback();
    return;
  }

  let step = Number(slider.value);
  if (step >= trace.rows.length - 1) step = -1;
  playButton.textContent = "Pause";

  timer = window.setInterval(() => {
    step += 1;
    slider.value = step;
    renderPlot(step);
    if (step >= trace.rows.length - 1) stopPlayback();
  }, 550);
});

runButton.addEventListener("click", run);
presetSelect.addEventListener("change", run);
toleranceSelect.addEventListener("change", run);
run();
