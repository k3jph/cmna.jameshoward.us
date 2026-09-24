const worksheets = {
  bisection: {
    title: "Bisection",
    predict: "Does the interval actually bracket a sign change? How many halvings should the requested tolerance require?",
    observe: "Record the first midpoint, which half survives, and the final interval width.",
    explain: "What property of the function and interval made bisection reliable here?"
  },
  newton: {
    title: "Newton's method",
    predict: "From the starting value, where should the first tangent cross the x-axis? Does that look like progress?",
    observe: "Record the first two tangent steps and the final root estimate.",
    explain: "How did the derivative and starting value control the path?"
  },
  secant: {
    title: "Secant method",
    predict: "What slope will the first two function values imply, and where should that chord cross the x-axis?",
    observe: "Record the first two chords and the resulting intercepts.",
    explain: "What did the secant method gain and lose by estimating the derivative?"
  },
  "root-finding-comparison": {
    title: "Bisection, Newton, and Secant",
    predict: "Order the three methods before running them. State whether your ordering is by iterations, function evaluations, or total information required.",
    observe: "Record iteration counts and final residuals for all three.",
    explain: "Did the method that used more information earn a useful advantage?"
  },
  "finite-differences": {
    title: "Finite differences",
    predict: "Should reducing h always improve the derivative estimate? Where do you expect the improvement to stop?",
    observe: "Record the forward, symmetric, and Richardson estimates across decreasing h.",
    explain: "Where did truncation error stop dominating and floating-point effects begin?"
  },
  interpolation: {
    title: "Interpolation",
    predict: "Which parts of the fitted curve should move if one data point changes?",
    observe: "Compare polynomial, piecewise-linear, and spline values before and after changing one point.",
    explain: "Which method behaved globally, which behaved locally, and why?"
  },
  simpson: {
    title: "Simpson's rule",
    predict: "Where should a coarse quadratic panel fit the integrand well, and where should it struggle?",
    observe: "Record panel count, estimate, and the regions where the parabolic pieces visibly miss the curve.",
    explain: "What did increasing the panel count actually change?"
  },
  "gaussian-quadrature": {
    title: "Gauss-Legendre quadrature",
    predict: "If you could place only a few function evaluations, where would you put them?",
    observe: "Record the Gaussian nodes, weights, and total estimate.",
    explain: "Why were the nodes not evenly spaced?"
  },
  "monte-carlo": {
    title: "Monte Carlo integration",
    predict: "How much should the estimate change when the sample size grows? What should changing only the seed do?",
    observe: "Record running estimates for at least two sample sizes and two seeds.",
    explain: "What kind of uncertainty remains even when the code is correct?"
  },
  "iterative-linear-algebra": {
    title: "Jacobi and Gauss-Seidel",
    predict: "Inspect A before running anything. Do you expect the iterations to behave well?",
    observe: "Record residual histories and final approximations for both methods.",
    explain: "What feature of the matrix helps explain the convergence behavior?"
  },
  "runge-kutta": {
    title: "Euler, midpoint, and RK4",
    predict: "Which method should benefit most from the chosen step size, and why?",
    observe: "Record the final values and inspect the four RK4 slope evaluations for one step.",
    explain: "What did the additional slope evaluations buy?"
  },
  "heat-equation": {
    title: "Heat equation",
    predict: "Compute alpha * dt / dx^2 before running. Should this discretization be stable?",
    observe: "Record the coefficient and how the profile changes over time.",
    explain: "If the solution becomes unstable, which numerical relationship caused it?"
  },
  "wave-equation": {
    title: "Wave equation",
    predict: "Compute speed * dt / dx. Should the finite-difference wave remain stable?",
    observe: "Record the Courant number and the evolution of the wave amplitude.",
    explain: "Separate physical motion from numerical artifacts."
  },
  "golden-section": {
    title: "Golden-section search",
    predict: "Given the two interior probes, which side of the interval should survive the first comparison?",
    observe: "Record the interval after the first three iterations.",
    explain: "What assumption about the objective makes discarding part of the interval sensible?"
  },
  "gradient-descent": {
    title: "Gradient descent",
    predict: "Which direction should the first update move? Is the selected step size likely to be timid, useful, or dangerous?",
    observe: "Record the first steps, final point, and gradient norm.",
    explain: "How did h change the relationship between local direction and useful progress?"
  },
  "simulated-annealing": {
    title: "Simulated annealing",
    predict: "Why might accepting a worse point be useful at high temperature?",
    observe: "Record at least one accepted uphill move, one rejected proposal, and the best value found.",
    explain: "How did temperature and cooling rate control exploration?"
  }
};

const params = new URLSearchParams(location.search);
const id = params.get("lab") || "bisection";
const data = worksheets[id] || worksheets.bisection;

document.querySelector("[data-worksheet-title]").textContent = data.title;
document.querySelector("[data-predict-prompt]").textContent = data.predict;
document.querySelector("[data-observe-prompt]").textContent = data.observe;
document.querySelector("[data-explain-prompt]").textContent = data.explain;

document.querySelector("[data-print]").addEventListener("click", () => window.print());
