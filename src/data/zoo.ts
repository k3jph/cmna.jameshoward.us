export interface ZooLabLink {
  href: string;
  label: string;
  note: string;
}

export interface ZooEntry {
  slug: string;
  kind: string;
  title: string;
  subtitle: string;
  why: string[];
  code: string;
  hand: string[];
  watch: string[];
  labs: ZooLabLink[];
  next: string;
}

export const zooEntries: ZooEntry[] = [
  {
    slug: "wilkinson-polynomial",
    kind: "Polynomial",
    title: "Wilkinson's polynomial",
    subtitle: "Twenty perfectly ordinary integer roots and a frankly unreasonable sensitivity to small perturbations.",
    why: [
      "Wilkinson's polynomial is the product (x - 1)(x - 2)...(x - 20). Written that way, nothing seems mysterious. The roots are sitting in the definition, wearing name tags.",
      "The trouble appears when we stop treating the polynomial as a product and start treating it as a list of floating-point coefficients. Small changes to those coefficients can move some roots much more than intuition would suggest. This is why the example keeps showing up in numerical analysis: the mathematical object is well defined, but one representation of that object is badly conditioned for the question we want to ask.",
      "CMNA already includes wilkinson(), so this is an especially useful recurring character for the site. We can look at the function directly, hand it to root finders, plot it, and then use the R Workbench when we want to mistreat the coefficients."
    ],
    code: `# The factored form makes the roots obvious.
f <- function(x) wilkinson(x, 20)

f(1)
f(10)
f(20)

curve(f, from = 0.5, to = 20.5, n = 4000)
abline(h = 0, lty = 3)`,
    hand: [
      "At x = 1, one factor is zero, so the entire product is zero. The same argument works at every integer from 1 through 20.",
      "Between neighboring roots the sign changes, which gives bisection a legal bracket if we choose a sufficiently small interval around one root.",
      "The interesting problem is not finding the roots from the factored form. It is asking how much of that obvious structure survives after we encode the same polynomial differently."
    ],
    watch: [
      "Plotting the polynomial on an ordinary y-axis is already a lesson in scale. The values between roots can become enormous.",
      "Try bisection on a small bracket around an integer root, then try Newton from a starting value between two roots.",
      "In the Workbench, expand or perturb the coefficient representation and compare the resulting roots. The polynomial did not become vague. Our representation became fragile."
    ],
    labs: [
      { href: "/methods/bisection/", label: "Bisection", note: "Bracket one of the integer roots." },
      { href: "/methods/newton/", label: "Newton", note: "See how a local tangent behaves among many nearby roots." },
      { href: "/workbench/", label: "R Workbench", note: "Manipulate the polynomial representation directly." }
    ],
    next: "The useful distinction here is conditioning versus algorithmic error. A perfect root finder cannot recover information that was already damaged by the way the polynomial was represented."
  },
  {
    slug: "hilbert-matrix",
    kind: "Matrix",
    title: "Hilbert matrix",
    subtitle: "Every entry looks harmless. The linear system does not.",
    why: [
      "The Hilbert matrix has entries H[i,j] = 1 / (i + j - 1). That is about as innocent a matrix formula as we could ask for. It is also famously ill conditioned as the dimension grows.",
      "This makes it a useful antidote to the idea that difficult numerical problems have to look difficult. We can construct a right-hand side from a known solution, hand the resulting system to a solver, and then watch small perturbations in the data produce surprisingly large changes in the recovered coefficients.",
      "The point is not that R cannot solve a Hilbert system. The point is that the numerical problem itself becomes sensitive. Once that happens, extra digits in the input may matter more than another clever line in the solver."
    ],
    code: `n <- 8
H <- outer(1:n, 1:n, function(i, j) 1 / (i + j - 1))

x.true <- rep(1, n)
b <- as.vector(H %*% x.true)

x.hat <- solve(H, b)
cbind(x.true, x.hat, error = x.hat - x.true)`,
    hand: [
      "For n = 2, the matrix is [[1, 1/2], [1/2, 1/3]]. Nothing in those entries announces a catastrophe.",
      "Construct b = H * 1. In exact arithmetic, the solution is the vector of ones by definition.",
      "Now perturb one component of b by a tiny amount and solve again. The difference in x is the behavior we care about."
    ],
    watch: [
      "Increase n gradually instead of jumping straight to a large matrix. Conditioning is more instructive when we watch it deteriorate.",
      "Compare the residual ||Hx - b|| with the actual error ||x - x.true||. A tiny residual does not guarantee that the recovered x is close to the known solution.",
      "Try the iterative linear algebra lab if you want to see why 'the solver converged' and 'the problem was well conditioned' are separate statements."
    ],
    labs: [
      { href: "/methods/iterative-linear-algebra/", label: "Iterative linear algebra", note: "Compare residual behavior on a difficult system." },
      { href: "/workbench/", label: "R Workbench", note: "Construct and perturb Hilbert systems directly." }
    ],
    next: "This is a good place to insist on two different questions: did the algorithm solve the equations it was given, and were those equations numerically capable of telling us the answer we wanted?"
  },
  {
    slug: "runge-function",
    kind: "Interpolation",
    title: "Runge's function",
    subtitle: "A smooth function that teaches high-degree polynomial interpolation some humility.",
    why: [
      "Runge's function, f(x) = 1 / (1 + 25x^2), is smooth and completely well behaved on [-1,1]. Sample it at equally spaced points, however, and a high-degree polynomial interpolant can oscillate badly near the ends of the interval.",
      "That makes the example useful because the data are not noisy, the function is not discontinuous, and the polynomial really does pass through every sample. Nothing has gone wrong according to the interpolation condition. The unreasonable behavior appears between the points.",
      "The lesson is therefore not 'polynomials are bad.' It is that satisfying the data exactly does not settle the modeling question. Node placement and locality matter."
    ],
    code: `f <- function(x) 1 / (1 + 25*x^2)

x <- seq(-1, 1, length.out = 11)
y <- f(x)

plot(x, y)
curve(f, from = -1, to = 1, add = TRUE)`,
    hand: [
      "With two points, linear interpolation is forced to be a line. Add more points and the global polynomial gains degrees of freedom.",
      "Every new sample is another exact constraint on the same global polynomial. Near the interval endpoints, those constraints can produce large oscillations.",
      "A piecewise linear interpolant and a cubic spline use the same data but distribute the modeling freedom differently."
    ],
    watch: [
      "Begin with 5 or 7 equally spaced points, then increase the count.",
      "Compare the global polynomial with the piecewise linear and spline curves. All hit the points. They do not agree between them.",
      "Move the nodes away from equal spacing if you want to turn the example into a discussion about Chebyshev nodes."
    ],
    labs: [
      { href: "/methods/interpolation/", label: "Interpolation laboratory", note: "Compare polynomial, piecewise linear, and cubic spline fits." },
      { href: "/workbench/", label: "R Workbench", note: "Change node placement and point count." }
    ],
    next: "If an interpolant passes through every observation, that tells us exactly one thing: it passes through every observation."
  },
  {
    slug: "quadratic-cancellation",
    kind: "Floating point",
    title: "The cancellation-prone quadratic",
    subtitle: "The algebra is correct. One subtraction is still a terrible idea.",
    why: [
      "The ordinary quadratic formula contains a subtraction between quantities that can be nearly equal. In exact arithmetic that is fine. In floating-point arithmetic, subtracting two nearly equal large values can erase the digits we hoped would distinguish them.",
      "CMNA includes quadratic() and quadratic2() precisely because the two functions compute mathematically equivalent formulas with different numerical behavior. This is a clean example of a recurring theme in the book: an implementation is not merely a transcription of algebra.",
      "Nothing here requires an exotic function or a large data set. A tiny quadratic is enough to make numerical representation part of the answer."
    ],
    code: `# One root is large and the other is tiny.
b2 <- 1
b1 <- 1e8
b0 <- 1

quadratic(b2, b1, b0)
quadratic2(b2, b1, b0)`,
    hand: [
      "The discriminant is b1^2 - 4*b2*b0, which is extremely close to b1^2 when b1 is large.",
      "For one root, the ordinary formula subtracts sqrt(discriminant) from a number of almost the same size.",
      "The alternative form uses the product relationship among the roots to avoid asking floating point to preserve a tiny remainder after that subtraction."
    ],
    watch: [
      "Increase b1 by powers of ten and compare the small root from both implementations.",
      "Substitute each computed root back into the original polynomial. Residuals make the damage easier to see.",
      "This is a good example to pair with finite differences, where a different subtraction eventually creates the same class of problem."
    ],
    labs: [
      { href: "/workbench/", label: "R Workbench", note: "Compare both CMNA quadratic implementations." },
      { href: "/methods/finite-differences/", label: "Finite differences", note: "See cancellation reappear in a different disguise." }
    ],
    next: "Mathematical equivalence does not imply numerical equivalence. That sentence is worth earning more than once."
  },
  {
    slug: "himmelblau-function",
    kind: "Optimization",
    title: "Himmelblau's function",
    subtitle: "Four minima, one landscape, and several ways for a starting point to make the decision for us.",
    why: [
      "Himmelblau's function is a two-dimensional objective with several local minima. It is smooth, easy to evaluate, easy to plot, and complicated enough to make optimization methods reveal what information they are actually using.",
      "Gradient descent follows local slope. Simulated annealing is allowed to wander. A different starting point can send a local method to a different basin even though the objective has not changed at all.",
      "CMNA already includes himmelblau(), which makes this a natural house animal for the optimization chapters."
    ],
    code: `f <- function(x) himmelblau(x)

starts <- list(
  c(0, 0),
  c(-4, 4),
  c(-4, -4),
  c(4, -4)
)

vapply(starts, f, numeric(1))`,
    hand: [
      "At a starting point, gradient descent sees only the local gradient. It does not receive a map showing all four basins.",
      "A stochastic method can cross a locally unfavorable region because its acceptance rule sometimes permits a worse move.",
      "That means the starting point, step size, temperature, and random seed are part of the numerical experiment rather than administrative details."
    ],
    watch: [
      "Run gradient descent from several starting points with the same step size.",
      "Run simulated annealing several times with only the random seed changed.",
      "Compare the final objective values before deciding whether two different final coordinates represent success or failure."
    ],
    labs: [
      { href: "/methods/gradient-descent/", label: "Gradient descent", note: "Watch local slope pick a basin." },
      { href: "/methods/simulated-annealing/", label: "Simulated annealing", note: "Watch accepted bad moves change the search." },
      { href: "/workbench/", label: "R Workbench", note: "Evaluate the objective from arbitrary starting points." }
    ],
    next: "Optimization does not merely ask where the minimum is. It asks what information the search method can use to get there."
  },
  {
    slug: "oscillatory-integral",
    kind: "Integration",
    title: "The oscillatory integral",
    subtitle: "A lot can happen between two perfectly reasonable sample points.",
    why: [
      "An oscillatory integrand is a direct challenge to methods that sample too coarsely. If positive and negative lobes are missed or represented unevenly, the numerical integral can look confident while the geometry between the nodes was never really observed.",
      "This is a useful comparison problem because Simpson, Gauss-Legendre, and Monte Carlo spend evaluations differently. None of them gets to know the function between evaluations for free.",
      "The example also keeps the discussion honest about cost. A method can become accurate simply by throwing enough evaluations at the problem, but that is not the same as spending those evaluations well."
    ],
    code: `f <- function(x) {
  sin(50*x) / (1 + x^2)
}

curve(f, from = 0, to = pi, n = 3000)
abline(h = 0, lty = 3)`,
    hand: [
      "The sine term changes sign repeatedly over [0, pi]. Contributions from neighboring lobes partially cancel.",
      "A coarse regular partition can land at points that do a poor job representing what happened between them.",
      "A Gaussian rule moves the nodes, while Monte Carlo replaces deterministic coverage with random sampling."
    ],
    watch: [
      "Use the same function and interval in Simpson and Gauss-Legendre labs.",
      "Compare results at low evaluation counts before making either method generous.",
      "Run Monte Carlo with several seeds. Noise becomes particularly visible when the true integral is the result of substantial cancellation."
    ],
    labs: [
      { href: "/methods/simpson/", label: "Simpson's rule", note: "See what a regular panel misses." },
      { href: "/methods/gaussian-quadrature/", label: "Gauss-Legendre quadrature", note: "Move the evaluation nodes." },
      { href: "/methods/monte-carlo/", label: "Monte Carlo", note: "Replace coverage with random sampling." }
    ],
    next: "A function evaluation tells us what happened at one point. Numerical integration is largely the art of deciding how much we are willing to infer between those points."
  },
  {
    slug: "narrow-peak",
    kind: "Integration",
    title: "The narrow peak",
    subtitle: "A smooth integrand can still hide most of its area in a very small neighborhood.",
    why: [
      "The function exp(-400(x - 0.53)^2) is smooth everywhere, but almost all of its area sits near x = 0.53. A coarse integration scheme can therefore be formally appropriate and still spend most of its evaluations where almost nothing is happening.",
      "This is a useful counterexample to the lazy distinction between smooth functions and difficult functions. Smoothness helps, but scale matters too. A feature can be perfectly smooth and still be too narrow for the current discretization.",
      "The peak also makes adaptive thinking intuitive. Once we know where the function changes rapidly, we would rather spend evaluations there."
    ],
    code: `f <- function(x) {
  exp(-400 * (x - 0.53)^2)
}

curve(f, from = 0, to = 1, n = 2000)`,
    hand: [
      "At x = 0.53 the function is 1.",
      "Move only 0.1 away and the exponent is -4, so the value has already dropped to about 0.018.",
      "The interval is one unit wide, but the interesting part occupies only a small fraction of it."
    ],
    watch: [
      "Start Simpson with very few panels and inspect whether any panel resolves the peak.",
      "Compare 5-point and 20-point Gauss-Legendre rules.",
      "Use Monte Carlo with different seeds and note how much the estimate depends on actually landing enough samples near the peak."
    ],
    labs: [
      { href: "/methods/simpson/", label: "Simpson's rule", note: "Resolve the peak by refining panels." },
      { href: "/methods/gaussian-quadrature/", label: "Gauss-Legendre quadrature", note: "See whether strategic nodes find enough of the feature." },
      { href: "/methods/monte-carlo/", label: "Monte Carlo", note: "Watch random coverage of a small important region." }
    ],
    next: "The function is smooth. The problem is still hard at the scale we chose."
  },
  {
    slug: "euler-decay-trap",
    kind: "Differential equation",
    title: "Euler's decay trap",
    subtitle: "The differential equation decays peacefully. A bad step size does not have to.",
    why: [
      "Consider y' = -15y with y(0) = 1. The exact solution is exp(-15x), so the physical solution simply decays toward zero. Nothing oscillates and nothing grows.",
      "Euler's method updates y by multiplying by 1 - 15h at every step. That one factor tells us almost everything. If h is small enough, the numerical solution decays. If h is too large, the factor has magnitude greater than one and the numerical solution grows even though the differential equation is trying to kill it.",
      "This is a beautiful teaching example because the instability belongs entirely to the discretization. We do not need a complicated equation to make numerical stability visible."
    ],
    code: `f <- function(x, y) {
  -15 * y
}

# Stable-ish
euler(f, x0 = 0, y0 = 1, h = 0.05, n = 20)

# Unstable
euler(f, x0 = 0, y0 = 1, h = 0.2, n = 5)`,
    hand: [
      "Euler gives y[n+1] = y[n] + h(-15y[n]) = (1 - 15h)y[n].",
      "For h = 0.05, the multiplier is 0.25. Each step shrinks the magnitude.",
      "For h = 0.2, the multiplier is -2. The sign alternates and the magnitude doubles. The ODE is stable; our numerical scheme is not."
    ],
    watch: [
      "Run Euler, midpoint, and RK4 on the same equation.",
      "Keep the total time interval similar while changing h.",
      "The exact solution is easy to add in the Workbench, which makes visual smoothness a poor excuse for skipping an error calculation."
    ],
    labs: [
      { href: "/methods/runge-kutta/", label: "Euler, midpoint, and RK4", note: "Compare stepping rules on the same decay problem." },
      { href: "/workbench/", label: "R Workbench", note: "Overlay the exact solution exp(-15x)." }
    ],
    next: "The computer did not misunderstand the differential equation. It followed Euler's update perfectly. That is the problem."
  }
];

export const zooBySlug = Object.fromEntries(zooEntries.map((entry) => [entry.slug, entry]));
