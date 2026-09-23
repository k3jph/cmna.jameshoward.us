## CMNA browser workbench core
## Source adapted from the cmna R package by James P. Howard, II.
## BSD 2-Clause licensed; canonical source:
## https://github.com/k3jph/cmna-pkg

bisection <- function(f, a, b, tol = 1e-3, m = 100) {
    iter <- 0
    f.a <- f(a)
    f.b <- f(b)

    while (abs(b - a) > tol) {
        iter <- iter + 1
        if (iter > m) {
            warning("iterations maximum exceeded")
            break
        }
        xmid <- (a + b) / 2
        ymid <- f(xmid)
        if (f.a * ymid > 0) {
            a <- xmid
            f.a <- ymid
        } else {
            b <- xmid
            f.b <- ymid
        }
    }

    root <- (a + b) / 2
    return(root)
}

newton <- function(f, fp, x, tol = 1e-3, m = 100) {
    iter <- 0
    oldx <- x
    x <- oldx + 10 * tol

    while(abs(x - oldx) > tol) {
        iter <- iter + 1
        if(iter > m)
            stop("No solution found")
        oldx <- x
        x <- x - f(x) / fp(x)
    }

    return(x)
}

secant <- function(f, x, tol = 1e-3, m = 100) {
    i <- 0
    oldx <- x
    oldfx <- f(x)
    x <- oldx + 10 * tol

    while(abs(x - oldx) > tol) {
        i <- i + 1
        if (i > m)
            stop("No solution found")

        fx <- f(x)
        newx <- x - fx * ((x - oldx) / (fx - oldfx))
        oldx <- x
        oldfx <- fx
        x <- newx
    }

    return(x)
}

himmelblau <- function(x) {
  (x[1]^2 + x[2] - 11)^2 + (x[1] + x[2]^2 - 7)^2
}

wilkinson <- function(x, w = 20) {
    if(w == 1)
        return(x - 1)
    return((x - w) * wilkinson(x, w - 1))
}


## Teaching instrumentation for the bisection laboratory.
## This keeps the canonical bisection() function above unchanged while returning
## the intermediate state needed to explain the algorithm step by step.
.cmna_bisection_trace <- function(f, a, b, tol = 1e-3, m = 100, samples = 181) {
    if (!is.function(f))
        stop("Define f as an R function before running the laboratory.")
    if (length(a) != 1 || length(b) != 1 || !is.finite(a) || !is.finite(b))
        stop("a and b must be finite scalar numbers.")
    if (a >= b)
        stop("The interval must satisfy a < b.")
    if (length(tol) != 1 || !is.finite(tol) || tol <= 0)
        stop("tol must be a positive finite number.")
    if (length(m) != 1 || !is.finite(m) || m < 1)
        stop("m must be a positive iteration limit.")

    f.a <- as.numeric(f(a))[1]
    f.b <- as.numeric(f(b))[1]

    if (!is.finite(f.a) || !is.finite(f.b))
        stop("f(a) and f(b) must both be finite.")
    if (f.a == 0) {
        return(list(
            root = a, iterations = 0, width = 0,
            initial.a = a, initial.b = b, initial.fa = f.a, initial.fb = f.b,
            rows = data.frame(),
            sample.x = numeric(), sample.y = numeric(),
            endpoint = "a"
        ))
    }
    if (f.b == 0) {
        return(list(
            root = b, iterations = 0, width = 0,
            initial.a = a, initial.b = b, initial.fa = f.a, initial.fb = f.b,
            rows = data.frame(),
            sample.x = numeric(), sample.y = numeric(),
            endpoint = "b"
        ))
    }
    if (f.a * f.b > 0)
        stop(sprintf(
            "Bisection needs a sign change on [a,b]. Here f(a)=%.12g and f(b)=%.12g, so the endpoint signs agree.",
            f.a, f.b
        ))

    initial.a <- a
    initial.b <- b
    initial.fa <- f.a
    initial.fb <- f.b
    trace <- list()
    iter <- 0

    while (abs(b - a) > tol) {
        iter <- iter + 1
        if (iter > m)
            stop(sprintf("Iteration limit m=%d was reached before the bracket met tol.", m))

        xmid <- (a + b) / 2
        ymid <- as.numeric(f(xmid))[1]
        if (!is.finite(ymid))
            stop(sprintf("f(midpoint) became non-finite at x=%.12g.", xmid))

        old.a <- a
        old.b <- b
        old.fa <- f.a

        if (old.fa * ymid > 0) {
            a <- xmid
            f.a <- ymid
            kept <- "right"
        } else {
            b <- xmid
            f.b <- ymid
            kept <- "left"
        }

        trace[[iter]] <- data.frame(
            i = iter,
            a = old.a,
            b = old.b,
            m = xmid,
            fm = ymid,
            width = abs(old.b - old.a),
            kept = kept,
            next_a = a,
            next_b = b,
            stringsAsFactors = FALSE
        )
    }

    rows <- do.call(rbind, trace)
    xs <- seq(initial.a, initial.b, length.out = samples)
    ys <- vapply(xs, function(xx) {
        yy <- tryCatch(as.numeric(f(xx))[1], error = function(e) NA_real_)
        if (is.finite(yy)) yy else NA_real_
    }, numeric(1))

    list(
        root = (a + b) / 2,
        iterations = iter,
        width = abs(b - a),
        initial.a = initial.a,
        initial.b = initial.b,
        initial.fa = initial.fa,
        initial.fb = initial.fb,
        rows = rows,
        sample.x = xs,
        sample.y = ys,
        endpoint = ""
    )
}

.cmna_bisection_trace_text <- function(f, a, b, tol = 1e-3, m = 100) {
    result <- .cmna_bisection_trace(f, a, b, tol, m)

    scalar <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    lines <- c(
        paste(
            "META",
            scalar(result$root),
            result$iterations,
            scalar(result$width),
            scalar(result$initial.a),
            scalar(result$initial.b),
            scalar(result$initial.fa),
            scalar(result$initial.fb),
            result$endpoint,
            sep = "\t"
        )
    )

    if (nrow(result$rows)) {
        for (j in seq_len(nrow(result$rows))) {
            row <- result$rows[j, ]
            lines <- c(lines, paste(
                "ROW",
                row$i,
                scalar(row$a),
                scalar(row$b),
                scalar(row$m),
                scalar(row$fm),
                scalar(row$width),
                row$kept,
                scalar(row$next_a),
                scalar(row$next_b),
                sep = "\t"
            ))
        }
    }

    if (length(result$sample.x)) {
        for (j in seq_along(result$sample.x)) {
            if (is.finite(result$sample.y[j])) {
                lines <- c(lines, paste(
                    "SAMPLE",
                    scalar(result$sample.x[j]),
                    scalar(result$sample.y[j]),
                    sep = "\t"
                ))
            }
        }
    }

    paste(lines, collapse = "\n")
}


## Additional canonical CMNA methods used by the browser laboratories.

vecnorm <- function(b) {
    return(sqrt(sum(b^2)))
}

simp <- function(f, a, b, m = 100) {
    x.ends = seq(a, b, length.out = m + 1)
    y.ends = f(x.ends)
    x.mids = (x.ends[2:(m + 1)] - x.ends[1:m]) / 2 +
        x.ends[1:m]
    y.mids = f(x.mids)

    p.area = sum(y.ends[2:(m+1)] + 4 * y.mids[1:m] +
                     y.ends[1:m])
    p.area = p.area * abs(b - a) / (6 * m)
    return(p.area)
}

jacobi <- function(A, b, tol = 10e-7, maxiter = 100) {
    n <- length(b)
    iter <- 0

    Dinv <- diag(1 / diag(A))
    R <- A - diag(diag(A))
    x <- rep(0, n)
    newx <- rep(tol, n)

    while(vecnorm(newx - x) > tol) {
        if(maxiter < iter) {
            warning("iterations maximum exceeded")
            break
        }
        x <- newx
        newx <- Dinv %*% (b - R %*% x)
        iter <- iter + 1
    }

    return(as.vector(newx))
}

gaussseidel <- function(A, b, tol = 10e-7, maxiter = 100) {
    n <- length(b)
    iter <- 0

    L <- U <- A
    L[upper.tri(A, diag = FALSE)] <- 0
    U[lower.tri(A, diag = TRUE)] <- 0
    Linv <- solve(L)

    x <- rep(0, n)
    newx <- rep(tol * 10, n)

    while(vecnorm(newx - x) > tol) {
        if(maxiter < iter) {
            warning("iterations maximum exceeded")
            break
        }
        x <- newx
        newx <- Linv %*% (b - U %*% x)
        iter <- iter + 1
    }

    return(as.vector(newx))
}

euler <- function(f, x0, y0, h, n) {
    x <- x0
    y <- y0

    for(i in 1:n) {
        y0 <- y0 + h * f(x0, y0)
        x0 <- x0 + h
        x <- c(x, x0)
        y <- c(y, y0)
    }

    return(data.frame(x = x, y = y))
}

midptivp <- function(f, x0, y0, h, n) {
    x <- x0
    y <- y0

    for(i in 1:n) {
        s1 <- h * f(x0, y0)
        s2 <- h * f(x0 + h / 2, y0 + s1 / 2)
        y0 <- y0 + s2

        x0 <- x0 + h
        x <- c(x, x0)
        y <- c(y, y0)
    }

    return(data.frame(x = x, y = y))
}

rungekutta4 <- function(f, x0, y0, h, n) {
    x <- x0
    y <- y0

    for(i in 1:n) {
        s1 <- h * f(x0, y0)
        s2 <- h * f(x0 + h / 2, y0 + s1 / 2)
        s3 <- h * f(x0 + h / 2, y0 + s2 / 2)
        s4 <- h * f(x0 + h, y0 + s3)
        y0 <- y0 + s1 / 6 + s2 / 3 + s3 / 3 + s4 / 6

        x0 <- x0 + h
        x <- c(x, x0)
        y <- c(y, y0)
    }

    return(data.frame(x = x, y = y))
}

## Instrumented teaching traces. Canonical methods above remain unchanged.

.cmna_simpson_trace_text <- function(f, a, b, m = 8, samples = 241) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(a) || !is.finite(b) || a == b) stop("Use distinct finite bounds.")
    if (!is.finite(m) || m < 1 || m != as.integer(m)) stop("m must be a positive integer.")

    x.ends <- seq(a, b, length.out = m + 1)
    y.ends <- as.numeric(f(x.ends))
    x.mids <- (x.ends[2:(m + 1)] - x.ends[1:m]) / 2 + x.ends[1:m]
    y.mids <- as.numeric(f(x.mids))
    if (length(y.ends) != length(x.ends) || length(y.mids) != length(x.mids))
        stop("f must return one numeric value for each numeric input.")
    if (any(!is.finite(c(y.ends, y.mids)))) stop("f produced non-finite values in the interval.")

    h <- abs(b - a) / m
    panel.area <- h / 6 * (y.ends[1:m] + 4 * y.mids + y.ends[2:(m + 1)])
    total <- sum(panel.area)

    scalar <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    lines <- c(paste("META", scalar(total), m, scalar(h), sep = "\t"))
    for (i in seq_len(m)) {
        lines <- c(lines, paste(
            "PANEL", i,
            scalar(x.ends[i]), scalar(x.mids[i]), scalar(x.ends[i + 1]),
            scalar(y.ends[i]), scalar(y.mids[i]), scalar(y.ends[i + 1]),
            scalar(panel.area[i]), sep = "\t"
        ))
    }

    xs <- seq(a, b, length.out = samples)
    ys <- as.numeric(f(xs))
    for (i in seq_along(xs)) {
        if (is.finite(ys[i])) {
            lines <- c(lines, paste("SAMPLE", scalar(xs[i]), scalar(ys[i]), sep = "\t"))
        }
    }
    paste(lines, collapse = "\n")
}

.cmna_iterative_trace_text <- function(A, b, tol = 1e-6, maxiter = 100) {
    A <- as.matrix(A)
    b <- as.numeric(b)
    if (nrow(A) != ncol(A)) stop("A must be square.")
    if (length(b) != nrow(A)) stop("length(b) must match nrow(A).")
    if (any(!is.finite(A)) || any(!is.finite(b))) stop("A and b must contain finite numbers.")
    if (any(diag(A) == 0)) stop("The diagonal of A must be nonzero.")

    scalar <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    vector_text <- function(x) paste(vapply(as.numeric(x), scalar, character(1)), collapse = ",")

    jacobi_rows <- list()
    n <- length(b)
    Dinv <- diag(1 / diag(A))
    R <- A - diag(diag(A))
    x <- rep(0, n)
    newx <- rep(tol, n)
    iter <- 0
    while(vecnorm(newx - x) > tol && iter <= maxiter) {
        x <- newx
        nextx <- as.vector(Dinv %*% (b - R %*% x))
        iter <- iter + 1
        jacobi_rows[[iter]] <- c(
            method = "Jacobi", iter = iter, vector = vector_text(nextx),
            residual = scalar(vecnorm(A %*% nextx - b)),
            delta = scalar(vecnorm(nextx - x))
        )
        newx <- nextx
    }

    gs_rows <- list()
    L <- U <- A
    L[upper.tri(A, diag = FALSE)] <- 0
    U[lower.tri(A, diag = TRUE)] <- 0
    Linv <- solve(L)
    x <- rep(0, n)
    newx <- rep(tol * 10, n)
    iter <- 0
    while(vecnorm(newx - x) > tol && iter <= maxiter) {
        x <- newx
        nextx <- as.vector(Linv %*% (b - U %*% x))
        iter <- iter + 1
        gs_rows[[iter]] <- c(
            method = "Gauss-Seidel", iter = iter, vector = vector_text(nextx),
            residual = scalar(vecnorm(A %*% nextx - b)),
            delta = scalar(vecnorm(nextx - x))
        )
        newx <- nextx
    }

    direct <- solve(A, b)
    lines <- c(paste("META", nrow(A), vector_text(direct), sep = "\t"))
    for (row in c(jacobi_rows, gs_rows)) {
        lines <- c(lines, paste("ROW", row["method"], row["iter"], row["vector"],
                               row["residual"], row["delta"], sep = "\t"))
    }
    paste(lines, collapse = "\n")
}

.cmna_ivp_trace_text <- function(f, x0, y0, h, n) {
    if (!is.function(f)) stop("Define f as function(x, y).")
    if (any(!is.finite(c(x0, y0, h, n)))) stop("Use finite numeric inputs.")
    if (h == 0) stop("h must be nonzero.")
    if (n < 1 || n != as.integer(n) || n > 500) stop("n must be an integer from 1 to 500.")

    scalar <- function(x) format(x, digits = 17, scientific = TRUE, trim = TRUE)
    e <- euler(f, x0, y0, h, n)
    mp <- midptivp(f, x0, y0, h, n)

    rk_x <- x0
    rk_y <- y0
    rk_rows <- list()
    x <- x0
    y <- y0
    for (i in 1:n) {
        s1 <- h * f(x, y)
        s2 <- h * f(x + h / 2, y + s1 / 2)
        s3 <- h * f(x + h / 2, y + s2 / 2)
        s4 <- h * f(x + h, y + s3)
        yn <- y + s1 / 6 + s2 / 3 + s3 / 3 + s4 / 6
        xn <- x + h
        rk_rows[[i]] <- c(i=i, x=x, y=y, s1=s1, s2=s2, s3=s3, s4=s4, xn=xn, yn=yn)
        x <- xn
        y <- yn
        rk_x <- c(rk_x, x)
        rk_y <- c(rk_y, y)
    }

    lines <- c(paste("META", n, scalar(h), sep = "\t"))
    for (i in seq_len(nrow(e))) lines <- c(lines, paste("SERIES","Euler",scalar(e$x[i]),scalar(e$y[i]),sep="\t"))
    for (i in seq_len(nrow(mp))) lines <- c(lines, paste("SERIES","Midpoint",scalar(mp$x[i]),scalar(mp$y[i]),sep="\t"))
    for (i in seq_along(rk_x)) lines <- c(lines, paste("SERIES","RK4",scalar(rk_x[i]),scalar(rk_y[i]),sep="\t"))
    for (row in rk_rows) {
        lines <- c(lines, paste(
            "STEP", row["i"], scalar(row["x"]), scalar(row["y"]),
            scalar(row["s1"]), scalar(row["s2"]), scalar(row["s3"]), scalar(row["s4"]),
            scalar(row["xn"]), scalar(row["yn"]), sep="\t"
        ))
    }
    paste(lines, collapse = "\n")
}


gd <- function(fp, x, h = 1e2, tol = 1e-4, m = 1e3) {
    iter <- 0

    oldx <- x
    x = x - h * fp(x)

    while(vecnorm(x - oldx) > tol) {
        iter <- iter + 1
        if(iter > m)
            return(x)
        oldx <- x
        x = x - h * fp(x)
    }

    return(x)
}

.cmna_gradient_trace_text <- function(f, fp, x, h = 0.05, tol = 1e-4, m = 250, grid = 35) {
    if (!is.function(f) || !is.function(fp))
        stop("Define both f(x) and fp(x).")
    x <- as.numeric(x)
    if (length(x) != 2 || any(!is.finite(x)))
        stop("This laboratory visualizes two-dimensional starting points only.")
    if (!is.finite(h) || h <= 0) stop("h must be a positive finite step size.")
    if (!is.finite(tol) || tol <= 0) stop("tol must be positive.")
    if (!is.finite(m) || m < 1) stop("m must be positive.")

    scalar <- function(v) format(v, digits = 17, scientific = TRUE, trim = TRUE)
    rows <- list()

    current <- x
    value <- as.numeric(f(current))[1]
    grad <- as.numeric(fp(current))
    if (length(grad) != 2 || any(!is.finite(c(value, grad))))
        stop("f must return one finite value and fp must return a finite vector of length two.")

    rows[[1]] <- c(i=0, x1=current[1], x2=current[2], value=value, gradnorm=vecnorm(grad))
    iter <- 0

    repeat {
        nextx <- current - h * grad
        delta <- vecnorm(nextx - current)
        iter <- iter + 1

        value <- as.numeric(f(nextx))[1]
        grad <- as.numeric(fp(nextx))
        if (length(grad) != 2 || any(!is.finite(c(nextx, value, grad))))
            stop("The descent path became non-finite. Try a smaller step size.")

        rows[[length(rows)+1]] <- c(
            i=iter, x1=nextx[1], x2=nextx[2],
            value=value, gradnorm=vecnorm(grad)
        )
        current <- nextx

        if (delta <= tol || iter >= m) break
    }

    mat <- do.call(rbind, rows)
    xmin <- min(mat[, "x1"]); xmax <- max(mat[, "x1"])
    ymin <- min(mat[, "x2"]); ymax <- max(mat[, "x2"])
    xspan <- max(xmax - xmin, 1)
    yspan <- max(ymax - ymin, 1)
    xmin <- xmin - 0.35 * xspan; xmax <- xmax + 0.35 * xspan
    ymin <- ymin - 0.35 * yspan; ymax <- ymax + 0.35 * yspan

    gx <- seq(xmin, xmax, length.out = grid)
    gy <- seq(ymin, ymax, length.out = grid)

    lines <- c(paste(
        "META", iter, scalar(current[1]), scalar(current[2]),
        scalar(value), scalar(xmin), scalar(xmax), scalar(ymin), scalar(ymax),
        sep = "\t"
    ))
    for (r in rows) {
        lines <- c(lines, paste(
            "ROW", r["i"], scalar(r["x1"]), scalar(r["x2"]),
            scalar(r["value"]), scalar(r["gradnorm"]), sep="\t"
        ))
    }
    for (yy in gy) {
        for (xx in gx) {
            z <- tryCatch(as.numeric(f(c(xx, yy)))[1], error=function(e) NA_real_)
            if (is.finite(z)) {
                lines <- c(lines, paste("GRID", scalar(xx), scalar(yy), scalar(z), sep="\t"))
            }
        }
    }
    paste(lines, collapse = "\n")
}


.cmna_newton_trace_text <- function(f, fp, x, tol = 1e-6, m = 100, samples = 241) {
    if (!is.function(f) || !is.function(fp)) stop("Define f and fp as R functions.")
    if (!is.finite(x) || !is.finite(tol) || tol <= 0) stop("Use a finite starting value and positive tolerance.")

    scalar <- function(v) format(v, digits = 17, scientific = TRUE, trim = TRUE)
    iter <- 0
    oldx <- x
    current <- oldx + 10 * tol
    rows <- list()
    path <- c(x, current)

    while(abs(current - oldx) > tol) {
        iter <- iter + 1
        if(iter > m) stop("No solution found before the iteration limit.")
        oldx <- current
        fx <- as.numeric(f(current))[1]
        fpx <- as.numeric(fp(current))[1]
        if (!is.finite(fx) || !is.finite(fpx)) stop("f or fp became non-finite.")
        if (abs(fpx) < .Machine$double.eps) stop("The derivative became too small for a Newton step.")
        nextx <- current - fx / fpx
        if (!is.finite(nextx)) stop("Newton's method left the finite number line.")
        rows[[iter]] <- c(i=iter, x=current, fx=fx, fpx=fpx, nextx=nextx)
        current <- nextx
        path <- c(path, current)
    }

    xmin <- min(path); xmax <- max(path)
    span <- max(xmax - xmin, 1)
    xmin <- xmin - 0.35 * span; xmax <- xmax + 0.35 * span
    xs <- seq(xmin, xmax, length.out=samples)
    ys <- vapply(xs, function(xx) {
        yy <- tryCatch(as.numeric(f(xx))[1], error=function(e) NA_real_)
        if (is.finite(yy)) yy else NA_real_
    }, numeric(1))

    lines <- c(paste("META", scalar(current), iter, scalar(xmin), scalar(xmax), sep="\t"))
    for (r in rows) {
        lines <- c(lines, paste("ROW", r["i"], scalar(r["x"]), scalar(r["fx"]),
                               scalar(r["fpx"]), scalar(r["nextx"]), sep="\t"))
    }
    for (j in seq_along(xs)) {
        if (is.finite(ys[j])) lines <- c(lines, paste("SAMPLE", scalar(xs[j]), scalar(ys[j]), sep="\t"))
    }
    paste(lines, collapse="\n")
}

.cmna_secant_trace_text <- function(f, x, tol = 1e-6, m = 100, samples = 241) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(x) || !is.finite(tol) || tol <= 0) stop("Use a finite starting value and positive tolerance.")

    scalar <- function(v) format(v, digits = 17, scientific = TRUE, trim = TRUE)
    i <- 0
    oldx <- x
    oldfx <- as.numeric(f(x))[1]
    current <- oldx + 10 * tol
    rows <- list()
    path <- c(oldx, current)

    while(abs(current - oldx) > tol) {
        i <- i + 1
        if (i > m) stop("No solution found before the iteration limit.")

        fx <- as.numeric(f(current))[1]
        if (!is.finite(fx) || !is.finite(oldfx)) stop("f became non-finite.")
        denom <- fx - oldfx
        if (abs(denom) < .Machine$double.eps) stop("The secant slope collapsed.")
        newx <- current - fx * ((current - oldx) / denom)
        if (!is.finite(newx)) stop("The secant method left the finite number line.")

        rows[[i]] <- c(i=i, oldx=oldx, oldfx=oldfx, x=current, fx=fx, nextx=newx)
        oldx <- current
        oldfx <- fx
        current <- newx
        path <- c(path, current)
    }

    xmin <- min(path); xmax <- max(path)
    span <- max(xmax - xmin, 1)
    xmin <- xmin - 0.35 * span; xmax <- xmax + 0.35 * span
    xs <- seq(xmin, xmax, length.out=samples)
    ys <- vapply(xs, function(xx) {
        yy <- tryCatch(as.numeric(f(xx))[1], error=function(e) NA_real_)
        if (is.finite(yy)) yy else NA_real_
    }, numeric(1))

    lines <- c(paste("META", scalar(current), i, scalar(xmin), scalar(xmax), sep="\t"))
    for (r in rows) {
        lines <- c(lines, paste("ROW", r["i"], scalar(r["oldx"]), scalar(r["oldfx"]),
                               scalar(r["x"]), scalar(r["fx"]), scalar(r["nextx"]), sep="\t"))
    }
    for (j in seq_along(xs)) {
        if (is.finite(ys[j])) lines <- c(lines, paste("SAMPLE", scalar(xs[j]), scalar(ys[j]), sep="\t"))
    }
    paste(lines, collapse="\n")
}


findiff <- function(f, x, h = x * sqrt(.Machine$double.eps)) {
    return((f(x + h) - f(x)) / h)
}

symdiff <- function(f, x, h = x * .Machine$double.eps^(1/3)) {
    return((f(x + h) - f(x - h)) / (2 * h))
}

findiff2 <- function(f, x, h) {
    return((f(x + h) - 2 * f(x) + f(x - h)) / h^2)
}

rdiff <- function(f, x, n = 10, h = 1e-4) {
    if(n == 1)
        return(symdiff(f, x, h = h))

    dx <- (4 * rdiff(f, x, n = n - 1, h = h / 2) -
               symdiff(f, x, h = h)) / 3
    return(dx)
}

.cmna_diff_trace_text <- function(f, x, h = 0.1, levels = 7, fp = NULL, samples = 241) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(x) || !is.finite(h) || h <= 0) stop("Use a finite x and positive h.")
    if (levels < 1 || levels > 12) stop("levels must be between 1 and 12.")

    scalar <- function(v) format(v, digits = 17, scientific = TRUE, trim = TRUE)
    exact <- NA_real_
    if (is.function(fp)) {
        exact <- as.numeric(fp(x))[1]
        if (!is.finite(exact)) exact <- NA_real_
    }

    rows <- list()
    for (i in 0:(levels - 1)) {
        hi <- h / (2^i)
        fd <- as.numeric(findiff(f, x, hi))[1]
        sd <- as.numeric(symdiff(f, x, hi))[1]
        rd <- as.numeric(rdiff(f, x, n = min(5, i + 1), h = hi))[1]
        rows[[i + 1]] <- c(i=i, h=hi, fd=fd, sd=sd, rd=rd)
    }

    span <- max(h * 4, 1)
    xmin <- x - span; xmax <- x + span
    xs <- seq(xmin, xmax, length.out=samples)
    ys <- as.numeric(f(xs))
    if (length(ys) != length(xs)) stop("f must return one numeric value for each numeric input.")

    lines <- c(paste("META", scalar(x), scalar(h), scalar(exact), scalar(xmin), scalar(xmax), sep="\t"))
    for (r in rows) {
        lines <- c(lines, paste("ROW", r["i"], scalar(r["h"]), scalar(r["fd"]), scalar(r["sd"]), scalar(r["rd"]), sep="\t"))
    }
    for (j in seq_along(xs)) {
        if (is.finite(ys[j])) lines <- c(lines, paste("SAMPLE", scalar(xs[j]), scalar(ys[j]), sep="\t"))
    }
    paste(lines, collapse="\n")
}


## Interpolation methods.

linterp <- function(x1, y1, x2, y2) {
    m <- (y2 - y1) / (x2 - x1)
    b <- y2 - m * x2
    return(c(b, m))
}

polyinterp <- function(x, y) {
    if(length(x) != length(y))
        stop("Length of x and y vectors must be the same")

    n <- length(x) - 1
    vandermonde <- rep(1, length(x))
    for(i in 1:n) {
        xi <- x^i
        vandermonde <- cbind(vandermonde, xi)
    }
    beta <- solve(vandermonde, y)
    names(beta) <- NULL
    return(beta)
}

pwiselinterp <- function(x, y) {
    n <- length(x) - 1
    y <- y[order(x)]
    x <- x[order(x)]
    mvec <- bvec <- c()

    for(i in 1:n) {
        p <- linterp(x[i], y[i], x[i + 1], y[i + 1])
        mvec <- c(mvec, p[2])
        bvec <- c(bvec, p[1])
    }
    return(list(m = mvec, b = bvec))
}

tridiagmatrix <- function(L, D, U, b) {
    n <- length(D)
    L <- c(NA, L)
    U[1] <- U[1] / D[1]
    b[1] <- b[1] / D[1]
    for(i in 2:(n - 1)) {
        U[i] <- U[i] / (D[i] - L[i] * U[i - 1])
        b[i] <- (b[i] - L[i] * b[i - 1]) /
            (D[i] - L[i] * U[i - 1])
    }
    b[n] <- (b[n] - L[n] * b[n - 1]) /
        (D[n] - L[n] * U[n - 1])

    x <- rep.int(0, n)
    x[n] <- b[n]
    for(i in (n - 1):1)
        x[i] <- b[i] - U[i] * x[i + 1]
    return(x)
}

cubicspline <- function(x, y) {
    n <- length(x)
    dvec <- bvec <- avec <- rep(0, n - 1)
    vec <- rep(0, n)
    deltax <- deltay <- rep(0, n - 1)

    for(i in 1:(n - 1)) {
        avec[i] <- y[i]
        deltax[i] = x[i + 1] - x[i]
        deltay[i] = y[i + 1] - y[i]
    }

    Au <- c(0, deltax[2:(n-1)])
    Ad <- c(1, 2 * (deltax[1:(n-2)] + deltax[2:(n-1)]), 1)
    Al <- c(deltax[1:(n-2)], 0)

    vec[0] <- vec[n] <- 0
    for(i in 2:(n - 1))
        vec[i] <- 3 * (deltay[i] / deltax[i] -
                           deltay[i-1] / deltax[i-1])

    cvec <- tridiagmatrix(Al, Ad, Au, vec)

    for(i in 1:(n-1)) {
        bvec[i] <- (deltay[i] / deltax[i]) -
            (deltax[i] / 3) * (2 * cvec[i] + cvec[i + 1])
        dvec[i] <- (cvec[i+1] - cvec[i]) / (3 * deltax[i])
    }

    return(list(a = avec, b = bvec,
                c = cvec[1:(n - 1)], d = dvec))
}

.cmna_interp_trace_text <- function(x, y, samples = 301) {
    x <- as.numeric(x); y <- as.numeric(y)
    if (length(x) != length(y) || length(x) < 2)
        stop("x and y must have equal length with at least two points.")
    if (any(!is.finite(c(x, y)))) stop("x and y must be finite.")
    ord <- order(x); x <- x[ord]; y <- y[ord]
    if (any(diff(x) <= 0)) stop("x values must be distinct.")

    beta <- polyinterp(x, y)
    pw <- pwiselinterp(x, y)
    spline <- if(length(x) >= 3) cubicspline(x, y) else NULL

    evalpoly <- function(xx) {
        powers <- vapply(0:(length(beta)-1), function(k) xx^k, numeric(length(xx)))
        as.numeric(powers %*% beta)
    }
    evalpw <- function(xx) {
        vapply(xx, function(t) {
            i <- min(max(findInterval(t, x), 1), length(x)-1)
            pw$m[i] * t + pw$b[i]
        }, numeric(1))
    }
    evalspline <- function(xx) {
        if (is.null(spline)) return(evalpw(xx))
        vapply(xx, function(t) {
            i <- min(max(findInterval(t, x), 1), length(x)-1)
            dx <- t - x[i]
            spline$a[i] + spline$b[i]*dx + spline$c[i]*dx^2 + spline$d[i]*dx^3
        }, numeric(1))
    }

    xs <- seq(min(x), max(x), length.out=samples)
    yp <- evalpoly(xs)
    yl <- evalpw(xs)
    ys <- evalspline(xs)

    scalar <- function(v) format(v, digits=17, scientific=TRUE, trim=TRUE)
    lines <- c(paste("META", length(x), sep="\t"))
    for(i in seq_along(x)) lines <- c(lines, paste("POINT", i, scalar(x[i]), scalar(y[i]), sep="\t"))
    for(i in seq_along(xs)) {
        lines <- c(lines, paste("SAMPLE", scalar(xs[i]), scalar(yp[i]), scalar(yl[i]), scalar(ys[i]), sep="\t"))
    }
    paste(lines, collapse="\n")
}

## Monte Carlo integration.

mcint <- function(f, a, b, m = 1000) {
    x <- runif(m, min = a, max = b)
    y.hat <- f(x)
    area <- (b - a) * sum(y.hat) / m
    return(area)
}

.cmna_mc_trace_text <- function(f, a, b, m = 2000, seed = 1, maxpoints = 500, checkpoints = 200) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(a) || !is.finite(b) || a == b) stop("Use distinct finite bounds.")
    if (!is.finite(m) || m < 10 || m > 200000 || m != as.integer(m))
        stop("m must be an integer from 10 to 200000.")
    if (!is.finite(seed)) stop("seed must be finite.")

    set.seed(as.integer(seed))
    x <- runif(m, min=a, max=b)
    y <- as.numeric(f(x))
    if (length(y) != m || any(!is.finite(y))) stop("f must return finite values for sampled x.")
    running <- (b-a) * cumsum(y) / seq_len(m)
    estimate <- running[m]

    scalar <- function(v) format(v, digits=17, scientific=TRUE, trim=TRUE)
    lines <- c(paste("META", scalar(estimate), m, seed, sep="\t"))

    ids <- unique(round(seq(1, m, length.out=min(checkpoints, m))))
    for(i in ids) lines <- c(lines, paste("RUN", i, scalar(running[i]), sep="\t"))

    pids <- unique(round(seq(1, m, length.out=min(maxpoints, m))))
    for(i in pids) lines <- c(lines, paste("POINT", scalar(x[i]), scalar(y[i]), sep="\t"))

    xs <- seq(a,b,length.out=241)
    ys <- as.numeric(f(xs))
    for(i in seq_along(xs)) {
        if (is.finite(ys[i])) lines <- c(lines, paste("CURVE", scalar(xs[i]), scalar(ys[i]), sep="\t"))
    }
    paste(lines, collapse="\n")
}

## One-dimensional heat equation.

heat <- function(u, alpha, xdelta, tdelta, n) {
    m <- length(u)
    uarray <- matrix(u, nrow = 1)
    newu <- u

    h <- alpha * tdelta / xdelta^2
    for(i in 1:n) {
        for(j in 2:(m - 1)) {
            ustep <- (u[j - 1] + u[j + 1] - 2 * u[j])
            newu[j] <- u[j] + h * ustep
        }
        u <- newu
        u[1] <- u[m]
        uarray <- rbind(uarray, u)
    }
    return(uarray)
}

.cmna_heat_trace_text <- function(u0, alpha = 1, xdelta = 0.05, tdelta = 0.001, n = 40) {
    if (!is.function(u0)) stop("Define u0 as an R function of x.")
    if (!is.finite(alpha) || alpha <= 0) stop("alpha must be positive.")
    if (!is.finite(xdelta) || xdelta <= 0) stop("xdelta must be positive.")
    if (!is.finite(tdelta) || tdelta <= 0) stop("tdelta must be positive.")
    if (!is.finite(n) || n < 1 || n > 250 || n != as.integer(n))
        stop("n must be an integer from 1 to 250.")

    x <- seq(0, 1, by=xdelta)
    if (tail(x,1) < 1) x <- c(x,1)
    u <- as.numeric(u0(x))
    if (length(u) != length(x) || any(!is.finite(u))) stop("u0 must return finite values for x.")
    z <- heat(u, alpha, xdelta, tdelta, n)

    scalar <- function(v) format(v, digits=17, scientific=TRUE, trim=TRUE)
    hcoef <- alpha * tdelta / xdelta^2
    lines <- c(paste("META", length(x), n, scalar(hcoef), scalar(xdelta), scalar(tdelta), sep="\t"))
    for(i in seq_along(x)) lines <- c(lines, paste("X", i, scalar(x[i]), sep="\t"))
    for(t in 0:n) {
        for(i in seq_along(x)) {
            lines <- c(lines, paste("U", t, i, scalar(z[t+1,i]), sep="\t"))
        }
    }
    paste(lines, collapse="\n")
}


goldsectmin <- function(f, a, b, tol = 1e-3, m = 100) {
    iter <- 0
    phi <- (sqrt(5) - 1) / 2
    a.star <- b - phi * abs(b - a)
    b.star <- a + phi * abs(b - a)

    while (abs(b - a) > tol) {
        iter <- iter + 1
        if (iter > m) {
            warning("iterations maximum exceeded")
            break
        }
        if(f(a.star) < f(b.star)) {
            b <- b.star
            b.star <- a.star
            a.star <- b - phi * abs(b - a)
        } else {
            a <- a.star
            a.star <- b.star
            b.star <- a + phi * abs(b - a)
        }
    }
    return((a + b) / 2)
}

goldsectmax <- function(f, a, b, tol = 1e-3, m = 100) {
    iter <- 0
    phi <- (sqrt(5) - 1) / 2
    a.star <- b - phi * abs(b - a)
    b.star <- a + phi * abs(b - a)

    while (abs(b - a) > tol) {
        iter <- iter + 1
        if (iter > m) {
            warning("iterations maximum exceeded")
            break
        }
        if(f(a.star) > f(b.star)) {
            b <- b.star
            b.star <- a.star
            a.star <- b - phi * abs(b - a)
        } else {
            a <- a.star
            a.star <- b.star
            b.star <- a + phi * abs(b - a)
        }
    }
    return((a + b) / 2)
}

.cmna_golden_trace_text <- function(f, a, b, tol = 1e-4, mode = "min", m = 100, samples = 241) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(a) || !is.finite(b) || a >= b) stop("Use finite bounds with a < b.")
    if (!is.finite(tol) || tol <= 0) stop("tol must be positive.")
    if (!(mode %in% c("min","max"))) stop("mode must be min or max.")

    phi <- (sqrt(5) - 1) / 2
    astar <- b - phi * abs(b-a)
    bstar <- a + phi * abs(b-a)
    rows <- list()
    iter <- 0

    while(abs(b-a) > tol) {
        iter <- iter + 1
        if (iter > m) stop("Iteration limit reached.")
        fa <- as.numeric(f(astar))[1]
        fb <- as.numeric(f(bstar))[1]
        if (!is.finite(fa) || !is.finite(fb)) stop("f became non-finite.")

        olda <- a; oldb <- b; oldas <- astar; oldbs <- bstar
        keepLeft <- if(mode == "min") fa < fb else fa > fb
        if (keepLeft) {
            b <- bstar
            bstar <- astar
            astar <- b - phi * abs(b-a)
            kept <- "left"
        } else {
            a <- astar
            astar <- bstar
            bstar <- a + phi * abs(b-a)
            kept <- "right"
        }
        rows[[iter]] <- c(
            i=iter,a=olda,b=oldb,astar=oldas,bstar=oldbs,
            fa=fa,fb=fb,kept=kept,nexta=a,nextb=b
        )
    }

    optimum <- (a+b)/2
    scalar <- function(v) format(v,digits=17,scientific=TRUE,trim=TRUE)
    lines <- c(paste("META",scalar(optimum),iter,scalar(abs(b-a)),mode,sep="\t"))
    for(r in rows) {
        lines <- c(lines,paste(
            "ROW",r["i"],scalar(r["a"]),scalar(r["b"]),
            scalar(r["astar"]),scalar(r["bstar"]),scalar(r["fa"]),scalar(r["fb"]),
            r["kept"],scalar(r["nexta"]),scalar(r["nextb"]),sep="\t"
        ))
    }
    xs <- seq(rows[[1]]["a"], rows[[1]]["b"], length.out=samples)
    ys <- as.numeric(f(xs))
    for(i in seq_along(xs)) if(is.finite(ys[i])) lines <- c(lines,paste("SAMPLE",scalar(xs[i]),scalar(ys[i]),sep="\t"))
    paste(lines,collapse="\n")
}


gauss.legendre.5 <- list(
    x=c(0,0.538469310105683,0.906179845938664,-0.538469310105683,-0.906179845938664),
    w=c(0.568888888888889,0.478628670499366,0.236926885056189,0.478628670499366,0.236926885056189)
)
gauss.legendre.10 <- list(
    x=c(0.148874338981631211,0.433395394129247191,0.679409568299024406,0.865063366688984511,0.973906528517171720,
       -0.148874338981631211,-0.433395394129247191,-0.679409568299024406,-0.865063366688984511,-0.973906528517171720),
    w=c(0.295524224714752870,0.269266719309996355,0.219086362515982044,0.149451349150580593,0.066671344308688138,
       0.295524224714752870,0.269266719309996355,0.219086362515982044,0.149451349150580593,0.066671344308688138)
)
gauss.legendre.20 <- list(
    x=c(0.076526521133497334,0.227785851141645078,0.373706088715419561,0.510867001950827098,0.636053680726515025,
       0.746331906460150793,0.839116971822218823,0.912234428251325906,0.963971927277913791,0.993128599185094925,
       -0.076526521133497334,-0.227785851141645078,-0.373706088715419561,-0.510867001950827098,-0.636053680726515025,
       -0.746331906460150793,-0.839116971822218823,-0.912234428251325906,-0.963971927277913791,-0.993128599185094925),
    w=c(0.152753387130725851,0.149172986472603747,0.142096109318382051,0.131688638449176627,0.118194531961518417,
       0.101930119817240435,0.083276741576704749,0.062672048334109064,0.040601429800386942,0.017614007139152118,
       0.152753387130725851,0.149172986472603747,0.142096109318382051,0.131688638449176627,0.118194531961518417,
       0.101930119817240435,0.083276741576704749,0.062672048334109064,0.040601429800386942,0.017614007139152118)
)

.cmna_gauss_legendre_trace_text <- function(f, a, b, m = 5, samples = 241) {
    if (!is.function(f)) stop("Define f as an R function.")
    if (!is.finite(a) || !is.finite(b) || a == b) stop("Use distinct finite bounds.")
    if (!(m %in% c(5,10,20))) stop("This browser lab supports m = 5, 10, or 20.")

    params <- get(paste0("gauss.legendre.",m))
    t <- params$x
    w <- params$w
    x <- (a+b)/2 + (b-a)/2 * t
    y <- as.numeric(f(x))
    if (length(y) != length(x) || any(!is.finite(y))) stop("f must return finite values at the Gaussian nodes.")
    contrib <- (b-a)/2 * w * y
    total <- sum(contrib)

    scalar <- function(v) format(v,digits=17,scientific=TRUE,trim=TRUE)
    lines <- c(paste("META",scalar(total),m,sep="\t"))
    ord <- order(x)
    for(i in ord) lines <- c(lines,paste("NODE",i,scalar(x[i]),scalar(y[i]),scalar(w[i]),scalar(contrib[i]),sep="\t"))

    xs <- seq(a,b,length.out=samples)
    ys <- as.numeric(f(xs))
    for(i in seq_along(xs)) if(is.finite(ys[i])) lines <- c(lines,paste("CURVE",scalar(xs[i]),scalar(ys[i]),sep="\t"))
    paste(lines,collapse="\n")
}
