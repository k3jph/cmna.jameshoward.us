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
