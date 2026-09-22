import { WebR, ChannelType } from "https://webr.r-wasm.org/latest/webr.mjs";

const root = document.querySelector("[data-bisection-r-lab]");
if (!root) throw new Error("R bisection laboratory root not found.");

const editor = root.querySelector("[data-r-function]");
const aInput = root.querySelector("[data-r-a]");
const bInput = root.querySelector("[data-r-b]");
const tolInput = root.querySelector("[data-r-tol]");
const runButton = root.querySelector("[data-r-bisect]");
const resetButton = root.querySelector("[data-r-reset]");
const status = root.querySelector("[data-r-status]");
const explanation = root.querySelector("[data-r-explanation]");
const summary = root.querySelector("[data-r-summary]");
const plot = root.querySelector("[data-r-plot]");
const rowsBody = root.querySelector("[data-r-rows]");

let webR;
let ready = false;
let starting = null;

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

    webR = new WebR({
      interactive: false,
      channelType: ChannelType.PostMessage,
    });
    await webR.init();

    const response = await fetch("/r/cmna-workbench.R");
    if (!response.ok) throw new Error("Could not load the CMNA browser R source.");
    await webR.evalRVoid(await response.text());

    const version = await webR.evalRString('paste(R.version$major, R.version$minor, sep=".")');
    status.textContent = "R " + version + " ready · your function will run locally";
    ready = true;
    runButton.disabled = false;
  })().catch((error) => {
    status.textContent = "R failed to start: " + (error.message || error);
    throw error;
  }).finally(() => {
    starting = null;
  });

  return starting;
}

function parseTrace(payload) {
  const result = { meta: null, rows: [], samples: [] };

  for (const line of payload.trim().split("\n")) {
    const parts = line.split("\t");
    if (parts[0] === "META") {
      result.meta = {
        root: Number(parts[1]),
        iterations: Number(parts[2]),
        width: Number(parts[3]),
        initialA: Number(parts[4]),
        initialB: Number(parts[5]),
        initialFa: Number(parts[6]),
        initialFb: Number(parts[7]),
        endpoint: parts[8] || "",
      };
    } else if (parts[0] === "ROW") {
      result.rows.push({
        i: Number(parts[1]),
        a: Number(parts[2]),
        b: Number(parts[3]),
        m: Number(parts[4]),
        fm: Number(parts[5]),
        width: Number(parts[6]),
        kept: parts[7],
        nextA: Number(parts[8]),
        nextB: Number(parts[9]),
      });
    } else if (parts[0] === "SAMPLE") {
      result.samples.push({ x: Number(parts[1]), y: Number(parts[2]) });
    }
  }

  if (!result.meta) throw new Error("R returned an incomplete bisection trace.");
  return result;
}

function renderSummary(trace) {
  const m = trace.meta;
  summary.innerHTML = [
    ["Root estimate", fmt(m.root, 11)],
    ["Iterations", m.iterations],
    ["Final bracket", fmt(m.width, 9)],
  ].map(([label, value]) =>
    `<div><span>${label}</span><strong>${value}</strong></div>`
  ).join("");
}

function renderExplanation(trace, tolerance) {
  const m = trace.meta;

  if (m.endpoint) {
    explanation.innerHTML = `
      <article class="teaching-step">
        <span>1</span>
        <div>
          <h3>The problem solved itself at the boundary.</h3>
          <p>R evaluated both endpoints first. <code>f(${m.endpoint}) = 0</code>, so there is nothing to bisect: the endpoint is already a root.</p>
        </div>
      </article>
    `;
    return;
  }

  const first = trace.rows[0];
  const finalBound = Math.abs(m.initialB - m.initialA) / (2 ** m.iterations);
  const discarded = first.kept === "right"
    ? `[${fmt(first.a, 6)}, ${fmt(first.m, 6)}]`
    : `[${fmt(first.m, 6)}, ${fmt(first.b, 6)}]`;
  const kept = `[${fmt(first.nextA, 6)}, ${fmt(first.nextB, 6)}]`;

  explanation.innerHTML = `
    <article class="teaching-step">
      <span>1</span>
      <div>
        <h3>Establish the bracket.</h3>
        <p>R evaluated your function at the endpoints: <code>f(a) = ${fmt(m.initialFa, 8)}</code> and <code>f(b) = ${fmt(m.initialFb, 8)}</code>. Their signs differ, so continuity gives bisection the condition it needs: at least one root lies somewhere inside the interval.</p>
      </div>
    </article>
    <article class="teaching-step">
      <span>2</span>
      <div>
        <h3>Ask the midpoint which half survives.</h3>
        <p>The first midpoint is <code>m = ${fmt(first.m, 9)}</code>, where R found <code>f(m) = ${fmt(first.fm, 8)}</code>. The sign test discards ${discarded} and keeps <strong>${kept}</strong>.</p>
      </div>
    </article>
    <article class="teaching-step">
      <span>3</span>
      <div>
        <h3>Repeat the same argument.</h3>
        <p>Nothing conceptually new happens after that. Each iteration halves the surviving interval. After ${m.iterations} iterations, the original width <code>${fmt(Math.abs(m.initialB - m.initialA), 8)}</code> has a theoretical width of <code>${fmt(finalBound, 10)}</code>.</p>
      </div>
    </article>
    <article class="teaching-step">
      <span>4</span>
      <div>
        <h3>Stop when the uncertainty is small enough.</h3>
        <p>You asked for <code>tol = ${fmt(tolerance, 10)}</code>. R stopped with a bracket width of <code>${fmt(m.width, 10)}</code> and returned its midpoint, <strong>${fmt(m.root, 12)}</strong>, as the root estimate.</p>
      </div>
    </article>
  `;
}

function renderRows(trace) {
  rowsBody.innerHTML = "";
  for (const row of trace.rows) {
    const tr = document.createElement("tr");
    const values = [
      row.i,
      fmt(row.a, 7),
      fmt(row.b, 7),
      fmt(row.m, 7),
      fmt(row.fm, 6),
      row.kept,
    ];
    values.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    });
    rowsBody.append(tr);
  }
}

function renderPlot(trace) {
  const width = 760;
  const height = 430;
  const pad = 48;
  const graphBottom = 285;
  plot.replaceChildren();
  plot.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const samples = trace.samples.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!samples.length) return;

  const xmin = trace.meta.initialA;
  const xmax = trace.meta.initialB;
  let ymin = Math.min(...samples.map((p) => p.y), 0);
  let ymax = Math.max(...samples.map((p) => p.y), 0);
  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }
  const extra = (ymax - ymin) * 0.08;
  ymin -= extra;
  ymax += extra;

  const mapX = (x) => pad + ((x - xmin) / (xmax - xmin)) * (width - 2 * pad);
  const mapY = (y) => graphBottom - pad - ((y - ymin) / (ymax - ymin)) * (graphBottom - 2 * pad);

  plot.append(svgEl("rect", { x: 0, y: 0, width, height, fill: "#fffdf8" }));

  const zeroY = mapY(0);
  plot.append(svgEl("line", {
    x1: pad, x2: width - pad, y1: zeroY, y2: zeroY,
    stroke: "#9aa2a8", "stroke-width": 1,
  }));

  const d = samples.map((p, i) =>
    `${i ? "L" : "M"}${mapX(p.x).toFixed(2)},${mapY(p.y).toFixed(2)}`
  ).join(" ");
  plot.append(svgEl("path", {
    d, fill: "none", stroke: "#102b46", "stroke-width": 3,
  }));

  const rootX = mapX(trace.meta.root);
  plot.append(svgEl("line", {
    x1: rootX, x2: rootX, y1: 18, y2: height - 24,
    stroke: "#7a2d4b", "stroke-width": 2, "stroke-dasharray": "6 5",
  }));

  const rows = trace.rows;
  const visible = rows.length <= 12
    ? rows
    : [...rows.slice(0, 6), ...rows.slice(-6)];
  const ladderTop = 315;
  const ladderHeight = 82;
  const spacing = visible.length > 1 ? ladderHeight / (visible.length - 1) : 0;

  visible.forEach((row, index) => {
    const y = ladderTop + index * spacing;
    plot.append(svgEl("line", {
      x1: mapX(row.a), x2: mapX(row.b), y1: y, y2: y,
      stroke: "#d6a744", "stroke-width": 5, "stroke-linecap": "round",
      opacity: 0.9,
    }));
    plot.append(svgEl("circle", { cx: mapX(row.m), cy: y, r: 4.5, fill: "#7a2d4b" }));
  });

  const label = svgEl("text", {
    x: pad, y: 22, fill: "#5f6b74", "font-size": 13,
    "font-family": "system-ui, sans-serif",
  });
  label.textContent = "Function evaluated by R; nested bars show the shrinking brackets";
  plot.append(label);
}

async function run() {
  const a = Number(aInput.value);
  const b = Number(bInput.value);
  const tol = Number(tolInput.value);

  if (![a, b, tol].every(Number.isFinite) || tol <= 0) {
    status.textContent = "Use finite numeric endpoints and a positive tolerance.";
    return;
  }
  if (a >= b) {
    status.textContent = "The interval must satisfy a < b.";
    return;
  }
  if (!editor.value.trim()) {
    status.textContent = "Define f as an R function first.";
    return;
  }

  runButton.disabled = true;
  explanation.replaceChildren();
  summary.replaceChildren();
  plot.replaceChildren();
  rowsBody.replaceChildren();

  try {
    await initialise();
    status.textContent = "R is evaluating your function and instrumenting bisection…";
    await webR.evalRVoid(editor.value);

    const call = `.cmna_bisection_trace_text(f, a=${a}, b=${b}, tol=${tol}, m=100)`;
    const payload = await webR.evalRString(call);
    const trace = parseTrace(payload);

    renderSummary(trace);
    renderExplanation(trace, tol);
    renderRows(trace);
    renderPlot(trace);
    status.textContent = "Everything below was produced from the R function you supplied.";
  } catch (error) {
    status.textContent = error.message || String(error);
    explanation.innerHTML = `
      <article class="teaching-step teaching-error">
        <span>!</span>
        <div>
          <h3>Bisection refused the problem.</h3>
          <p>${String(error.message || error).replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>
          <p>That is useful information: check the R function, the interval, and especially whether the endpoint values have opposite signs.</p>
        </div>
      </article>
    `;
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", run);
resetButton.addEventListener("click", () => location.reload());

initialise();
