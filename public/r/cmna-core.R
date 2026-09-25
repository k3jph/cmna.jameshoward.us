# CMNA core functions for the browser workbench.
# These definitions follow the current cmna package source.

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

wilkinson <- function(x, w = 20) {
    if(w == 1)
        return(x - 1)
    return((x - w) * wilkinson(x, w - 1))
}

himmelblau <- function(x) {
    (x[1]^2 + x[2] - 11)^2 + (x[1] + x[2]^2 - 7)^2
}

.cmna_browser_functions <- c(
    "bisection", "newton", "secant", "wilkinson", "himmelblau"
)
