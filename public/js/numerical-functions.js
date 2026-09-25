export const presets = {
  cubic: {
    label: "x³ − x − 2",
    expression: "x^3 - x - 2",
    f: (x) => x ** 3 - x - 2,
    df: (x) => 3 * x ** 2 - 1,
    a: 1,
    b: 2,
    x0: 1.5,
  },
  fixed: {
    label: "cos(x) − x",
    expression: "cos(x) - x",
    f: (x) => Math.cos(x) - x,
    df: (x) => -Math.sin(x) - 1,
    a: 0,
    b: 1,
    x0: 0.5,
  },
  sqrt2: {
    label: "x² − 2",
    expression: "x^2 - 2",
    f: (x) => x ** 2 - 2,
    df: (x) => 2 * x,
    a: 1,
    b: 2,
    x0: 1.5,
  },
  book: {
    label: "CMNA cubic",
    expression: "x^3 - 2x^2 - 159x - 540",
    f: (x) => x ** 3 - 2 * x ** 2 - 159 * x - 540,
    df: (x) => 3 * x ** 2 - 4 * x - 159,
    a: 10,
    b: 20,
    x0: 14,
  },
};

export function formatNumber(value, digits = 8) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) > 0 && (Math.abs(value) < 1e-5 || Math.abs(value) >= 1e6)) {
    return value.toExponential(4);
  }
  return Number(value.toFixed(digits)).toString();
}

export function bisectionTrace(f, a, b, tol = 1e-3, max = 100) {
  let fa = f(a);
  let fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) {
    throw new Error("The initial interval must bracket a sign change.");
  }

  const rows = [];
  let i = 0;
  while (Math.abs(b - a) > tol && i < max) {
    i += 1;
    const m = (a + b) / 2;
    const fm = f(m);
    rows.push({ i, a, b, m, fm, width: Math.abs(b - a) });

    if (fa * fm > 0) {
      a = m;
      fa = fm;
    } else {
      b = m;
      fb = fm;
    }
  }

  return {
    rows,
    root: (a + b) / 2,
    width: Math.abs(b - a),
    iterations: rows.length,
  };
}

export function newtonTrace(f, df, x0, tol = 1e-3, max = 100) {
  let iter = 0;
  let oldx = x0;
  let x = oldx + 10 * tol;
  const rows = [{ i: 0, x: x0, residual: Math.abs(f(x0)) }];

  while (Math.abs(x - oldx) > tol && iter < max) {
    iter += 1;
    oldx = x;
    const derivative = df(x);
    if (!Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) {
      return { rows, root: x, iterations: iter, failed: "Derivative became too small." };
    }
    x = x - f(x) / derivative;
    if (!Number.isFinite(x)) {
      return { rows, root: x, iterations: iter, failed: "Iteration left the finite number line." };
    }
    rows.push({ i: iter, x, residual: Math.abs(f(x)) });
  }

  return { rows, root: x, iterations: iter, failed: iter >= max ? "Iteration limit reached." : null };
}

export function secantTrace(f, x0, tol = 1e-3, max = 100) {
  let i = 0;
  let oldx = x0;
  let oldfx = f(x0);
  let x = oldx + 10 * tol;
  const rows = [{ i: 0, x: x0, residual: Math.abs(oldfx) }];

  while (Math.abs(x - oldx) > tol && i < max) {
    i += 1;
    const fx = f(x);
    const denom = fx - oldfx;
    if (!Number.isFinite(denom) || Math.abs(denom) < 1e-14) {
      return { rows, root: x, iterations: i, failed: "Secant slope collapsed." };
    }
    const newx = x - fx * ((x - oldx) / denom);
    oldx = x;
    oldfx = fx;
    x = newx;
    if (!Number.isFinite(x)) {
      return { rows, root: x, iterations: i, failed: "Iteration left the finite number line." };
    }
    rows.push({ i, x, residual: Math.abs(f(x)) });
  }

  return { rows, root: x, iterations: i, failed: i >= max ? "Iteration limit reached." : null };
}
