const root = document.querySelector("[data-method-finder]");
if (!root) throw new Error("Method finder root not found.");

const taskGrid = root.querySelector("[data-task-grid]");
const panel = root.querySelector("[data-finder-panel]");
const content = root.querySelector("[data-finder-content]");
const back = root.querySelector("[data-finder-back]");

const tasks = {
  root: {
    title: "Find a real root",
    prompt: "What information do you want the method to use?",
    options: [
      {
        label: "A sign-changing bracket",
        result: {
          title: "Bisection",
          functions: ["bisection"],
          text: "Use the bracket as a guarantee and halve it repeatedly. This is the transparent, robust choice when you can establish a sign change.",
          href: "/methods/bisection/",
        },
      },
      {
        label: "A derivative and starting value",
        result: {
          title: "Newton's method",
          functions: ["newton"],
          text: "Use the local derivative to jump toward the root. Convergence can be rapid, but the starting value and derivative behavior matter.",
          href: "/methods/root-finding/",
        },
      },
      {
        label: "Function values, but no derivative",
        result: {
          title: "Secant method",
          functions: ["secant"],
          text: "Estimate the local slope from recent function values. It keeps the derivative-free flavor while behaving more like Newton than bisection.",
          href: "/methods/root-finding/",
        },
      },
    ],
  },
  integrate: {
    title: "Approximate an integral",
    prompt: "What characterizes the problem?",
    options: [
      {
        label: "A smooth finite interval",
        result: {
          title: "Newton–Cotes family",
          functions: ["midpt", "trap", "simp", "simp38"],
          text: "For ordinary finite intervals, midpoint, trapezoid, and Simpson rules make the approximation machinery especially easy to inspect.",
        },
      },
      {
        label: "I want automatic refinement",
        result: {
          title: "Adaptive / Romberg integration",
          functions: ["adaptint", "romberg"],
          text: "Use refinement as part of the algorithm when a fixed partition is not the point of the exercise.",
        },
      },
      {
        label: "The weighting or nodes are part of the method",
        result: {
          title: "Gaussian quadrature",
          functions: ["gaussint", "gauss.hermite", "gauss.laguerre", "gauss.legendre"],
          text: "Gaussian rules place evaluation points strategically rather than merely subdividing the interval uniformly.",
        },
      },
      {
        label: "Sampling is the method",
        result: {
          title: "Monte Carlo integration",
          functions: ["mcint", "mcint2"],
          text: "Use random sampling when the stochastic construction is itself the useful computational idea.",
        },
      },
    ],
  },
  linear: {
    title: "Solve a linear-algebra problem",
    prompt: "What structure can you exploit?",
    options: [
      {
        label: "A tridiagonal system",
        result: {
          title: "Tridiagonal solver",
          functions: ["tridiagmatrix"],
          text: "Do not ignore known structure: the dedicated tridiagonal method avoids treating a sparse special case as a generic dense system.",
        },
      },
      {
        label: "A decomposition is useful",
        result: {
          title: "LU or Cholesky",
          functions: ["lumatrix", "choleskymatrix"],
          text: "Factor the matrix when the factorization itself can be reused or exposes useful structure.",
        },
      },
      {
        label: "I want an iterative method",
        result: {
          title: "Jacobi, Gauss–Seidel, or conjugate gradient",
          functions: ["jacobi", "gaussseidel", "cgmmatrix"],
          text: "Iterative methods expose convergence as a sequence of improving approximations rather than one direct elimination.",
        },
      },
      {
        label: "I want direct row reduction",
        result: {
          title: "Row-reduction methods",
          functions: ["refmatrix", "rrefmatrix", "solvematrix"],
          text: "Use elementary row operations when the elimination process itself is the object you want to see.",
        },
      },
    ],
  },
  interpolate: {
    title: "Estimate between known values",
    prompt: "What kind of representation do you need?",
    options: [
      {
        label: "A simple line or polynomial",
        result: {
          title: "Linear / polynomial interpolation",
          functions: ["linterp", "polyinterp"],
          text: "Use direct polynomial constructions when the point is to build an interpolant from known samples.",
        },
      },
      {
        label: "A smooth piecewise curve",
        result: {
          title: "Cubic spline",
          functions: ["cubicspline"],
          text: "Splines keep polynomial pieces local while joining them smoothly across the data.",
        },
      },
      {
        label: "A controlled parametric curve",
        result: {
          title: "Bézier methods",
          functions: ["qbezier", "cbezier"],
          text: "Use control points to shape quadratic or cubic parametric curves.",
        },
      },
      {
        label: "A grid or image",
        result: {
          title: "Nearest-neighbor / bilinear",
          functions: ["nn", "bilinear", "resizeImageNN", "resizeImageBL"],
          text: "For gridded values, local spatial interpolation is often the natural computational structure.",
        },
      },
    ],
  },
  differentiate: {
    title: "Approximate a derivative",
    prompt: "What derivative information do you need?",
    options: [
      {
        label: "A first derivative",
        result: {
          title: "Finite differences",
          functions: ["findiff", "symdiff", "rdiff"],
          text: "Compare one-sided and symmetric finite differences to see how the stencil changes the approximation.",
        },
      },
      {
        label: "A second derivative",
        result: {
          title: "Second finite difference",
          functions: ["findiff2"],
          text: "Use the second-difference construction when curvature rather than slope is the target.",
        },
      },
    ],
  },
  optimize: {
    title: "Search for an optimum",
    prompt: "What kind of search is this?",
    options: [
      {
        label: "One-dimensional continuous search",
        result: {
          title: "Golden-section search",
          functions: ["goldsectmin", "goldsectmax"],
          text: "Use interval reduction when you want a derivative-free one-dimensional search.",
        },
      },
      {
        label: "I have gradient information",
        result: {
          title: "Gradient methods",
          functions: ["gd", "gdls", "graddsc", "gradasc"],
          text: "Follow local slope information when the objective and gradient support it.",
        },
      },
      {
        label: "I want a heuristic search",
        result: {
          title: "Hill climbing / simulated annealing",
          functions: ["hillclimbing", "sa"],
          text: "Heuristic methods trade guarantees for flexibility in landscapes where local structure may be awkward.",
        },
      },
      {
        label: "It is a discrete routing problem",
        result: {
          title: "Traveling salesperson by annealing",
          functions: ["tspsa"],
          text: "The CMNA package includes a discrete simulated-annealing application for a traveling-salesperson problem.",
        },
      },
    ],
  },
  ode: {
    title: "Advance a differential equation",
    prompt: "What are you trying to expose?",
    options: [
      {
        label: "The simplest IVP step",
        result: {
          title: "Euler method",
          functions: ["euler"],
          text: "Euler is the cleanest way to see how a derivative becomes a step from one state to the next.",
        },
      },
      {
        label: "More accurate one-step behavior",
        result: {
          title: "Midpoint / fourth-order Runge–Kutta",
          functions: ["midptivp", "rungekutta4"],
          text: "Use additional slope information inside each step to improve the local approximation.",
        },
      },
      {
        label: "A multistep method",
        result: {
          title: "Adams–Bashforth",
          functions: ["adamsbashforth"],
          text: "Reuse derivative information from previous steps instead of constructing every new step from scratch.",
        },
      },
      {
        label: "A simple PDE example",
        result: {
          title: "Heat / wave equation examples",
          functions: ["heat", "wave"],
          text: "The package includes one-dimensional examples for two canonical partial differential equations.",
        },
      },
    ],
  },
};

function renderTask(task) {
  const definition = tasks[task];
  if (!definition) return;

  taskGrid.hidden = true;
  panel.hidden = false;
  content.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = definition.title;
  content.append(heading);

  const prompt = document.createElement("p");
  prompt.className = "finder-prompt";
  prompt.textContent = definition.prompt;
  content.append(prompt);

  const options = document.createElement("div");
  options.className = "finder-options";

  for (const option of definition.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "finder-option";
    button.textContent = option.label;
    button.addEventListener("click", () => renderResult(definition, option));
    options.append(button);
  }

  content.append(options);
}

function renderResult(definition, option) {
  const result = option.result;
  content.innerHTML = "";

  const eyebrow = document.createElement("p");
  eyebrow.className = "section-kicker";
  eyebrow.textContent = definition.title;
  content.append(eyebrow);

  const heading = document.createElement("h2");
  heading.textContent = result.title;
  content.append(heading);

  const text = document.createElement("p");
  text.className = "finder-result-copy";
  text.textContent = result.text;
  content.append(text);

  const functions = document.createElement("div");
  functions.className = "finder-functions";
  for (const name of result.functions) {
    const code = document.createElement("code");
    code.textContent = name;
    functions.append(code);
  }
  content.append(functions);

  if (result.href) {
    const link = document.createElement("a");
    link.className = "button finder-result-link";
    link.href = result.href;
    link.textContent = "Open the related CMNA page";
    content.append(link);
  }

  const again = document.createElement("button");
  again.type = "button";
  again.className = "finder-again";
  again.textContent = "Choose a different constraint";
  again.addEventListener("click", () => renderTask(
    Object.keys(tasks).find((key) => tasks[key] === definition),
  ));
  content.append(again);
}

root.querySelectorAll("[data-task]").forEach((button) => {
  button.addEventListener("click", () => renderTask(button.dataset.task));
});

back.addEventListener("click", () => {
  panel.hidden = true;
  taskGrid.hidden = false;
  content.innerHTML = "";
});
