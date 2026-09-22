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
