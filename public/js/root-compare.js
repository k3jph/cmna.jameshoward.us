import {
  presets,
  bisectionTrace,
  newtonTrace,
  secantTrace,
  formatNumber,
} from "./numerical-functions.js";

const root = document.querySelector("[data-root-compare]");
if (!root) throw new Error("Root comparison lab root not found.");

const presetSelect = root.querySelector("[data-preset]");
const toleranceSelect = root.querySelector("[data-tolerance]");
const runButton = root.querySelector("[data-run]");
const expression = root.querySelector("[data-expression]");
const cards = root.querySelector("[data-cards]");
const plot = root.querySelector("[data-plot]");
const note = root.querySelector("[data-note]");

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

function seriesPoints(rows, width, height, pad, maxIter, minLog, maxLog) {
  return rows.map((row) => {
    const residual = Math.max(row.residual ?? Math.abs(row.fm), 1e-16);
    const log = Math.log10(residual);
    const x = pad + (row.i / Math.max(1, maxIter)) * (width - 2 * pad);
    const y = height - pad - ((log - minLog) / Math.max(1e-9, maxLog - minLog)) * (height - 2 * pad);
    return [x, y];
  });
}

function renderChart(series) {
  const width = 720;
  const height = 360;
  const pad = 52;
  plot.innerHTML = "";
  plot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  plot.append(svgEl("rect", { x: 0, y: 0, width, height, fill: "#fffdf8" }));

  const rows = series.flatMap((s) => s.rows);
  const maxIter = Math.max(...rows.map((r) => r.i), 1);
  const logs = rows.map((r) => Math.log10(Math.max(r.residual ?? Math.abs(r.fm), 1e-16)));
  const minLog = Math.min(...logs, -12);
  const maxLog = Math.max(...logs, 0);

  for (let i = 0; i <= 4; i += 1) {
    const y = pad + (i / 4) * (height - 2 * pad);
    plot.append(svgEl("line", {
      x1: pad, x2: width - pad, y1: y, y2: y,
      stroke: "#e1dbd0", "stroke-width": 1,
    }));
  }

  plot.append(svgEl("line", {
    x1: pad, x2: width - pad, y1: height - pad, y2: height - pad,
    stroke: "#8b949c", "stroke-width": 1,
  }));
  plot.append(svgEl("line", {
    x1: pad, x2: pad, y1: pad, y2: height - pad,
    stroke: "#8b949c", "stroke-width": 1,
  }));

  const colors = ["#102b46", "#7a2d4b", "#d6a744"];
  series.forEach((item, index) => {
    const points = seriesPoints(item.rows, width, height, pad, maxIter, minLog, maxLog);
    const d = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    plot.append(svgEl("path", {
      d,
      fill: "none",
      stroke: colors[index],
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round",
    }));
    points.forEach(([x, y]) => {
      plot.append(svgEl("circle", {
        cx: x, cy: y, r: 3.5, fill: colors[index],
      }));
    });
  });

  const xLabel = svgEl("text", {
    x: width / 2, y: height - 10, "text-anchor": "middle",
    fill: "#5f6b74", "font-size": 13, "font-family": "system-ui, sans-serif",
  });
  xLabel.textContent = "iteration";
  plot.append(xLabel);

  const yLabel = svgEl("text", {
    x: 16, y: height / 2, transform: `rotate(-90 16 ${height / 2})`,
    "text-anchor": "middle", fill: "#5f6b74", "font-size": 13,
    "font-family": "system-ui, sans-serif",
  });
  yLabel.textContent = "log10 residual";
  plot.append(yLabel);
}

function run() {
  const preset = presets[presetSelect.value];
  const tol = Number(toleranceSelect.value);
  expression.textContent = preset.expression;

  const bis = bisectionTrace(preset.f, preset.a, preset.b, tol, 100);
  const bisRows = bis.rows.map((row) => ({
    i: row.i,
    x: row.m,
    residual: Math.abs(row.fm),
  }));
  const newt = newtonTrace(preset.f, preset.df, preset.x0, tol, 100);
  const sec = secantTrace(preset.f, preset.x0, tol, 100);

  const results = [
    { name: "Bisection", result: { ...bis, rows: bisRows }, tone: "azure" },
    { name: "Newton", result: newt, tone: "murrey" },
    { name: "Secant", result: sec, tone: "gold" },
  ];

  cards.innerHTML = results.map(({ name, result, tone }) => `
    <article class="compare-card compare-${tone}">
      <span>${name}</span>
      <strong>${formatNumber(result.root, 10)}</strong>
      <small>${result.iterations} iteration${result.iterations === 1 ? "" : "s"}</small>
      ${result.failed ? `<em>${result.failed}</em>` : ""}
    </article>
  `).join("");

  renderChart(results.map(({ name, result }) => ({ name, rows: result.rows })));
  note.textContent =
    "The chart compares residual |f(x)| by iteration. Newton and secant follow the control flow of the CMNA package implementations; bisection uses the displayed bracket.";
}

runButton.addEventListener("click", run);
presetSelect.addEventListener("change", run);
toleranceSelect.addEventListener("change", run);
run();
