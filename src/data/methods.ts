export interface MethodEntry {
  name: string;
  functions: string[];
  href?: string;
  lab?: boolean;
}

export interface MethodGroup {
  slug: string;
  title: string;
  description: string;
  compareHref?: string;
  methods: MethodEntry[];
}

export const methodGroups: MethodGroup[] = [
  {
    slug: "fundamentals",
    title: "Error and elementary computation",
    description: "Small algorithms that expose evaluation order, accumulated error, and the difference between a formula and a numerically sensible implementation.",
    methods: [
      { name: "Naive polynomial evaluation", functions: ["naivepoly"] },
      { name: "Cached polynomial evaluation", functions: ["betterpoly"] },
      { name: "Horner's method", functions: ["horner", "rhorner"] },
      { name: "Naive summation", functions: ["naivesum"] },
      { name: "Kahan summation", functions: ["kahansum"] },
      { name: "Naive division", functions: ["naivediv"] },
      { name: "Long division", functions: ["longdiv"] },
      { name: "Primality test", functions: ["isPrime"] },
      { name: "Nth root", functions: ["nthroot"] },
      { name: "Quadratic formula", functions: ["quadratic", "quadratic2"] },
      { name: "Fibonacci sequence", functions: ["fibonacci"] },
      { name: "Wilkinson's polynomial", functions: ["wilkinson"] },
      { name: "Himmelblau function", functions: ["himmelblau"] },
    ],
  },
  {
    slug: "linear-algebra",
    title: "Linear algebra",
    description: "Row operations, matrix reduction, decompositions, and iterative methods implemented close enough to the mathematics to inspect.",
    methods: [
      { name: "Row replacement", functions: ["replacerow"] },
      { name: "Row scaling", functions: ["scalerow"] },
      { name: "Row swapping", functions: ["swaprows"] },
      { name: "Vector norm", functions: ["vecnorm"] },
      { name: "Determinant", functions: ["detmatrix"] },
      { name: "Matrix inverse", functions: ["invmatrix"] },
      { name: "Row-echelon form", functions: ["refmatrix"] },
      { name: "Reduced row-echelon form", functions: ["rrefmatrix"] },
      { name: "Solve by row reduction", functions: ["solvematrix"] },
      { name: "Cholesky decomposition", functions: ["choleskymatrix"] },
      { name: "LU decomposition", functions: ["lumatrix"] },
      { name: "Conjugate gradient", functions: ["cgmmatrix"] },
      { name: "Gauss-Seidel iteration", functions: ["gaussseidel"], href: "/methods/iterative-linear-algebra/", lab: true },
      { name: "Jacobi iteration", functions: ["jacobi"], href: "/methods/iterative-linear-algebra/", lab: true },
      { name: "Tridiagonal matrix solver", functions: ["tridiagmatrix"] },
    ],
  },
  {
    slug: "interpolation",
    title: "Interpolation and extrapolation",
    description: "Polynomial interpolation, splines, Bézier curves, multidimensional interpolators, and an image-resizing application.",
    methods: [
      { name: "Linear interpolation", functions: ["linterp"] },
      { name: "Polynomial interpolation", functions: ["polyinterp"], href: "/methods/interpolation/", lab: true },
      { name: "Piecewise linear interpolation", functions: ["pwiselinterp"], href: "/methods/interpolation/", lab: true },
      { name: "Cubic spline", functions: ["cubicspline"], href: "/methods/interpolation/", lab: true },
      { name: "Quadratic Bézier curve", functions: ["qbezier"] },
      { name: "Cubic Bézier curve", functions: ["cbezier"] },
      { name: "Bilinear interpolation", functions: ["bilinear"] },
      { name: "Nearest neighbor", functions: ["nn"] },
      { name: "Nearest-neighbor image resizing", functions: ["resizeImageNN"] },
      { name: "Bilinear image resizing", functions: ["resizeImageBL"] },
    ],
  },
  {
    slug: "differentiation",
    title: "Differentiation",
    description: "Finite-difference formulas for first and second derivatives.",
    methods: [
      { name: "Finite difference", functions: ["findiff"], href: "/methods/finite-differences/", lab: true },
      { name: "Symmetric difference", functions: ["symdiff"], href: "/methods/finite-differences/", lab: true },
      { name: "Right difference", functions: ["rdiff"], href: "/methods/finite-differences/", lab: true },
      { name: "Second derivative", functions: ["findiff2"] },
    ],
  },
  {
    slug: "integration",
    title: "Numerical integration",
    description: "Newton-Cotes rules, Gaussian quadrature, adaptive integration, Romberg integration, Monte Carlo methods, and applications.",
    methods: [
      { name: "Midpoint rule", functions: ["midpt"] },
      { name: "Trapezoid rule", functions: ["trap"] },
      { name: "Simpson's rule", functions: ["simp"], href: "/methods/simpson/", lab: true },
      { name: "Simpson's 3/8 rule", functions: ["simp38"] },
      { name: "Gaussian integration driver", functions: ["gaussint"], href: "/methods/gaussian-quadrature/", lab: true },
      { name: "Gauss-Hermite quadrature", functions: ["gauss.hermite"] },
      { name: "Gauss-Laguerre quadrature", functions: ["gauss.laguerre"] },
      { name: "Gauss-Legendre quadrature", functions: ["gauss.legendre"], href: "/methods/gaussian-quadrature/", lab: true },
      { name: "Recursive adaptive integration", functions: ["adaptint"] },
      { name: "Romberg integration", functions: ["romberg"] },
      { name: "Monte Carlo integration, 1D", functions: ["mcint"], href: "/methods/monte-carlo/", lab: true },
      { name: "Monte Carlo integration, 2D", functions: ["mcint2"] },
      { name: "Shell method for volume", functions: ["shellmethod"] },
      { name: "Disc method for volume", functions: ["discmethod"] },
      { name: "Gini coefficient", functions: ["giniquintile"] },
    ],
  },
  {
    slug: "root-finding",
    title: "Root finding",
    description: "Three classic approaches that make assumptions, robustness, and convergence behavior especially easy to compare.",
    compareHref: "/methods/root-finding/",
    methods: [
      { name: "Bisection method", functions: ["bisection"], href: "/methods/bisection/", lab: true },
      { name: "Newton's method", functions: ["newton"], href: "/methods/newton/", lab: true },
      { name: "Secant method", functions: ["secant"], href: "/methods/secant/", lab: true },
    ],
  },
  {
    slug: "optimization",
    title: "Optimization",
    description: "Continuous and discrete searches, from golden-section and gradient methods through simulated annealing.",
    methods: [
      { name: "Golden-section maximum", functions: ["goldsectmax"], href: "/methods/golden-section/", lab: true },
      { name: "Golden-section minimum", functions: ["goldsectmin"], href: "/methods/golden-section/", lab: true },
      { name: "Gradient descent", functions: ["gd", "gdls", "graddsc"], href: "/methods/gradient-descent/", lab: true },
      { name: "Gradient ascent", functions: ["gradasc"] },
      { name: "Hill climbing", functions: ["hillclimbing"] },
      { name: "Simulated annealing", functions: ["sa"] },
      { name: "Traveling salesperson by simulated annealing", functions: ["tspsa"] },
    ],
  },
  {
    slug: "differential-equations",
    title: "Differential equations",
    description: "Initial-value methods, systems, elementary PDE examples, and boundary-value applications.",
    methods: [
      { name: "Euler method", functions: ["euler"] },
      { name: "Midpoint method for IVPs", functions: ["midptivp"] },
      { name: "Fourth-order Runge-Kutta", functions: ["rungekutta4"], href: "/methods/runge-kutta/", lab: true },
      { name: "Adams-Bashforth", functions: ["adamsbashforth"] },
      { name: "Euler method for systems", functions: ["eulersys"] },
      { name: "Heat equation, 1D", functions: ["heat"], href: "/methods/heat-equation/", lab: true },
      { name: "Wave equation, 1D", functions: ["wave"] },
      { name: "Boundary-value examples", functions: ["bvpexample", "bvpexample10"] },
    ],
  },
];

export const methodCount = methodGroups.reduce(
  (total, group) => total + group.methods.length,
  0,
);

export const functionCount = methodGroups.reduce(
  (total, group) =>
    total + group.methods.reduce((subtotal, method) => subtotal + method.functions.length, 0),
  0,
);
