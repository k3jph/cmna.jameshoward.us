const configs = {
  "/methods/bisection/": {
    id: "bisection",
    title: "Bisection",
    root: "[data-bisection-r-lab]",
    sources: ["R/bisection.R"],
    build(root) {
      const code = value(root, "[data-r-function]");
      const a = value(root, "[data-r-a]");
      const b = value(root, "[data-r-b]");
      const tol = value(root, "[data-r-tol]");
      return `${code}\n\n# Current CMNA experiment\nbisection(f, a = ${a}, b = ${b}, tol = ${tol})\n`;
    },
  },
  "/methods/newton/": {
    id: "newton",
    title: "Newton's method",
    root: "[data-root-geometry-lab]",
    sources: ["R/newton.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const x = value(root, "[data-x0]");
      const tol = value(root, "[data-tol]");
      return `${code}\n\n# Current CMNA experiment\nnewton(f, fp, x = ${x}, tol = ${tol})\n`;
    },
  },
  "/methods/secant/": {
    id: "secant",
    title: "Secant method",
    root: "[data-root-geometry-lab]",
    sources: ["R/secant.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const x = value(root, "[data-x0]");
      const tol = value(root, "[data-tol]");
      return `${code}\n\n# Current CMNA experiment\nsecant(f, x = ${x}, tol = ${tol})\n`;
    },
  },
  "/methods/root-finding/": {
    id: "root-finding-comparison",
    title: "Root-finder comparison",
    root: "[data-root-compare]",
    sources: ["R/bisection.R", "R/newton.R", "R/secant.R"],
    build(root) {
      const preset = value(root, "[data-preset]");
      const tol = value(root, "[data-tolerance]");
      const examples = {
        cubic: {
          code: "f <- function(x) x^3 - x - 2\nfp <- function(x) 3*x^2 - 1",
          a: 1, b: 2, x: 1.5,
        },
        fixed: {
          code: "f <- function(x) cos(x) - x\nfp <- function(x) -sin(x) - 1",
          a: 0, b: 1, x: 0.5,
        },
        sqrt2: {
          code: "f <- function(x) x^2 - 2\nfp <- function(x) 2*x",
          a: 1, b: 2, x: 1.5,
        },
        book: {
          code: "f <- function(x) x^3 - 2*x^2 - 159*x - 540\nfp <- function(x) 3*x^2 - 4*x - 159",
          a: 10, b: 20, x: 14,
        },
      };
      const ex = examples[preset] || examples.cubic;
      return `${ex.code}\n\n# Same problem, three CMNA methods\nbisection(f, a = ${ex.a}, b = ${ex.b}, tol = ${tol})\nnewton(f, fp, x = ${ex.x}, tol = ${tol})\nsecant(f, x = ${ex.x}, tol = ${tol})\n`;
    },
  },
  "/methods/finite-differences/": {
    id: "finite-differences",
    title: "Finite differences",
    root: "[data-diff-lab]",
    sources: ["R/findiff.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const x = value(root, "[data-x]");
      const h = value(root, "[data-h]");
      return `${code}\n\n# Current CMNA experiment\nfindiff(f, x = ${x}, h = ${h})\nsymdiff(f, x = ${x}, h = ${h})\nrdiff(f, x = ${x}, h = ${h})\n`;
    },
  },
  "/methods/interpolation/": {
    id: "interpolation",
    title: "Interpolation",
    root: "[data-interp-lab]",
    sources: ["R/polyinterp.R", "R/pwiselinterp.R", "R/cubicspline.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      return `${code}\n\n# Three CMNA interpolants\npolyinterp(x, y)\npwiselinterp(x, y)\ncubicspline(x, y)\n`;
    },
  },
  "/methods/simpson/": {
    id: "simpson",
    title: "Simpson's rule",
    root: "[data-simpson-lab]",
    sources: ["R/simp.R"],
    build(root) {
      const code = value(root, "[data-r-function]");
      const a = value(root, "[data-a]");
      const b = value(root, "[data-b]");
      const m = value(root, "[data-m]");
      return `${code}\n\n# Current CMNA experiment\nsimp(f, a = ${a}, b = ${b}, m = ${m})\n`;
    },
  },
  "/methods/gaussian-quadrature/": {
    id: "gaussian-quadrature",
    title: "Gauss-Legendre quadrature",
    root: "[data-gauss-lab]",
    sources: ["R/gaussint.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const a = value(root, "[data-a]");
      const b = value(root, "[data-b]");
      const m = value(root, "[data-m]");
      return `${code}\n\na <- ${a}\nb <- ${b}\n\n# Map [a,b] to the standard Gauss-Legendre interval [-1,1].\ng <- function(t) {\n  ((b - a) / 2) * f((a + b) / 2 + ((b - a) / 2) * t)\n}\n\ngauss.legendre(g, m = ${m})\n`;
    },
  },
  "/methods/monte-carlo/": {
    id: "monte-carlo",
    title: "Monte Carlo integration",
    root: "[data-mc-lab]",
    sources: ["R/mcintegrate.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const a = value(root, "[data-a]");
      const b = value(root, "[data-b]");
      const m = value(root, "[data-m]");
      const seed = value(root, "[data-seed]");
      return `${code}\n\nset.seed(${seed})\nmcint(f, a = ${a}, b = ${b}, m = ${m})\n`;
    },
  },
  "/methods/iterative-linear-algebra/": {
    id: "iterative-linear-algebra",
    title: "Jacobi and Gauss-Seidel",
    root: "[data-iterative-lab]",
    sources: ["R/iterativematrix.R"],
    build(root) {
      const code = value(root, "[data-r-system]");
      const tol = value(root, "[data-tol]");
      return `${code}\n\n# Same system, two CMNA iterations\njacobi(A, b, tol = ${tol})\ngaussseidel(A, b, tol = ${tol})\n`;
    },
  },
  "/methods/runge-kutta/": {
    id: "runge-kutta",
    title: "Euler, midpoint, and RK4",
    root: "[data-ivp-lab]",
    sources: ["R/ivp.R"],
    build(root) {
      const code = value(root, "[data-r-function]");
      const x0 = value(root, "[data-x0]");
      const y0 = value(root, "[data-y0]");
      const h = value(root, "[data-h]");
      const n = value(root, "[data-n]");
      return `${code}\n\n# Same IVP, three CMNA methods\neuler(f, x0 = ${x0}, y0 = ${y0}, h = ${h}, n = ${n})\nmidptivp(f, x0 = ${x0}, y0 = ${y0}, h = ${h}, n = ${n})\nrungekutta4(f, x0 = ${x0}, y0 = ${y0}, h = ${h}, n = ${n})\n`;
    },
  },
  "/methods/heat-equation/": {
    id: "heat-equation",
    title: "Heat equation",
    root: "[data-heat-lab]",
    sources: ["R/heat.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const alpha = value(root, "[data-alpha]");
      const dx = value(root, "[data-dx]");
      const dt = value(root, "[data-dt]");
      const n = value(root, "[data-n]");
      return `${code}\n\nalpha <- ${alpha}\nxdelta <- ${dx}\ntdelta <- ${dt}\nn <- ${n}\nx <- seq(0, 1, by = xdelta)\nu <- u0(x)\nheat(u, alpha, xdelta, tdelta, n)\n`;
    },
  },
  "/methods/wave-equation/": {
    id: "wave-equation",
    title: "Wave equation",
    root: "[data-wave-lab]",
    sources: ["R/wave.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const speed = value(root, "[data-speed]");
      const dx = value(root, "[data-dx]");
      const dt = value(root, "[data-dt]");
      const n = value(root, "[data-n]");
      return `${code}\n\nspeed <- ${speed}\nxdelta <- ${dx}\ntdelta <- ${dt}\nn <- ${n}\nx <- seq(0, 1, by = xdelta)\nu <- u0(x)\nwave(u, speed, xdelta, tdelta, n)\n`;
    },
  },
  "/methods/golden-section/": {
    id: "golden-section",
    title: "Golden-section search",
    root: "[data-golden-lab]",
    sources: ["R/goldsect.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const a = value(root, "[data-a]");
      const b = value(root, "[data-b]");
      const tol = value(root, "[data-tol]");
      const mode = value(root, "[data-mode]");
      const fn = mode === "max" ? "goldsectmax" : "goldsectmin";
      return `${code}\n\n# Current CMNA experiment\n${fn}(f, a = ${a}, b = ${b}, tol = ${tol})\n`;
    },
  },
  "/methods/gradient-descent/": {
    id: "gradient-descent",
    title: "Gradient descent",
    root: "[data-gradient-lab]",
    sources: ["R/gradesc.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const h = value(root, "[data-h]");
      const tol = value(root, "[data-tol]");
      return `${code}\n\n# Current CMNA experiment\ngd(fp, x0, h = ${h}, tol = ${tol})\n`;
    },
  },
  "/methods/simulated-annealing/": {
    id: "simulated-annealing",
    title: "Simulated annealing",
    root: "[data-sa-lab]",
    sources: ["R/sa.R"],
    build(root) {
      const code = value(root, "[data-r-code]");
      const temp = value(root, "[data-temp]");
      const rate = value(root, "[data-rate]");
      const seed = value(root, "[data-seed]");
      return `${code}\n\nset.seed(${seed})\nsa(f, x0, temp = ${temp}, rate = ${rate})\n`;
    },
  },
};

function value(root, selector) {
  const el = root.querySelector(selector);
  return el ? el.value : "";
}

function encodeText(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeText(text) {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function controlKey(el) {
  for (const attr of el.attributes) {
    if (attr.name.startsWith("data-") && !["data-step", "data-r-step"].includes(attr.name)) {
      return attr.name.slice(5);
    }
  }
  return el.name || el.id || null;
}

function stateControls(root) {
  return [...root.querySelectorAll(
    ".r-guided-editor textarea, .r-guided-editor input, .r-guided-editor select, .lab-controls input, .lab-controls select"
  )].filter((el) => controlKey(el));
}

function captureState(root) {
  const state = {};
  for (const el of stateControls(root)) {
    state[controlKey(el)] = el.type === "checkbox" ? el.checked : el.value;
  }
  return state;
}

function applyState(root, state) {
  for (const el of stateControls(root)) {
    const key = controlKey(el);
    if (!(key in state)) continue;
    if (el.type === "checkbox") el.checked = Boolean(state[key]);
    else el.value = state[key];
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

function saveText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function notify(toolbar, text) {
  const status = toolbar.querySelector("[data-lab-tool-status]");
  status.textContent = text;
  window.clearTimeout(status._timer);
  status._timer = window.setTimeout(() => { status.textContent = ""; }, 2500);
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
}

function sourceUrl(path) {
  return `https://raw.githubusercontent.com/k3jph/cmna-pkg/main/${path}`;
}

function injectToolbar(config, root) {
  const toolbar = document.createElement("section");
  toolbar.className = "lab-utility-bar";
  toolbar.innerHTML = `
    <div class="lab-utility-copy">
      <span>Experiment tools</span>
      <strong>Keep the current problem.</strong>
    </div>
    <div class="lab-utility-actions">
      <button type="button" data-share>Share state</button>
      <button type="button" data-export>Export R</button>
      <button type="button" data-workbench>Open in Workbench</button>
      <button type="button" data-source>Show CMNA source</button>
      <a href="/teaching/worksheet/?lab=${encodeURIComponent(config.id)}">Prediction worksheet</a>
    </div>
    <span class="lab-tool-status" data-lab-tool-status aria-live="polite"></span>
  `;

  const anchor = root.querySelector(".lab-summary") || root.firstElementChild;
  if (anchor) anchor.before(toolbar);
  else root.prepend(toolbar);

  const drawer = document.createElement("section");
  drawer.className = "lab-source-drawer";
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="lab-source-head">
      <div>
        <span>Canonical package source</span>
        <h3>${config.title}</h3>
      </div>
      <button type="button" data-copy-source disabled>Copy source</button>
    </div>
    <div class="lab-source-files" data-source-files></div>
  `;
  toolbar.after(drawer);

  toolbar.querySelector("[data-share]").addEventListener("click", async () => {
    const payload = encodeText(JSON.stringify({ id: config.id, state: captureState(root) }));
    const url = new URL(location.href);
    url.hash = "lab=" + payload;
    history.replaceState(null, "", url);
    try {
      await copy(url.href);
      notify(toolbar, "Share URL copied.");
    } catch {
      notify(toolbar, "Share URL is in the address bar.");
    }
  });

  toolbar.querySelector("[data-export]").addEventListener("click", () => {
    const script = config.build(root);
    saveText(`cmna-${config.id}.R`, script);
    notify(toolbar, "R script exported.");
  });

  toolbar.querySelector("[data-workbench]").addEventListener("click", () => {
    const script = config.build(root);
    location.href = "/workbench/#code=" + encodeText(script);
  });

  toolbar.querySelector("[data-source]").addEventListener("click", async (event) => {
    drawer.hidden = !drawer.hidden;
    event.currentTarget.textContent = drawer.hidden ? "Show CMNA source" : "Hide CMNA source";
    if (drawer.hidden || drawer.dataset.loaded) return;

    const target = drawer.querySelector("[data-source-files]");
    target.innerHTML = "<p>Loading canonical package source…</p>";

    try {
      const chunks = [];
      for (const path of config.sources) {
        const response = await fetch(sourceUrl(path));
        if (!response.ok) throw new Error(`Could not load ${path}`);
        const text = await response.text();
        chunks.push({ path, text });
      }
      target.replaceChildren();
      for (const chunk of chunks) {
        const section = document.createElement("section");
        const heading = document.createElement("h4");
        heading.textContent = chunk.path;
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = chunk.text;
        pre.append(code);
        section.append(heading, pre);
        target.append(section);
      }
      drawer.dataset.loaded = "1";
      drawer._sourceText = chunks.map((c) => `# ${c.path}\n${c.text}`).join("\n\n");
      drawer.querySelector("[data-copy-source]").disabled = false;
    } catch (error) {
      target.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = error.message || String(error);
      target.append(p);
    }
  });

  drawer.querySelector("[data-copy-source]").addEventListener("click", async () => {
    if (!drawer._sourceText) return;
    await copy(drawer._sourceText);
    notify(toolbar, "Package source copied.");
  });
}

function restoreSharedState(config, root) {
  if (!location.hash.startsWith("#lab=")) return;
  try {
    const payload = JSON.parse(decodeText(location.hash.slice(5)));
    if (payload.id !== config.id || !payload.state) return;
    applyState(root, payload.state);
    const run = root.querySelector("[data-run], [data-r-bisect]");
    if (run) window.setTimeout(() => run.click(), 80);
  } catch {
    // A bad fragment should never make the laboratory unusable.
  }
}

const config = configs[location.pathname];
if (config) {
  const root = document.querySelector(config.root);
  if (root) {
    restoreSharedState(config, root);
    injectToolbar(config, root);
  }
}
