# cmna.jameshoward.us

Web companion to **Computational Methods for Numerical Analysis with R** by James P. Howard, II.

## Purpose

This is not a general numerical-analysis encyclopedia. It is the front door for the book, the `cmna` companion package, selected method explanations, teaching material, errata, and continuing project updates. The accumulated material may someday help make the case for a future edition, but no second edition is currently being presented or announced.

## Stack

- Astro
- static output
- no client-side framework by default
- GitHub Pages deployment from `main`

## Brand

The CMNA mark is heraldic: a square deep Azure field bearing a pile Or charged with three diminishing roundels Murrey, representing successive approximations converging toward a limit.

The footer uses the shared James Howard site grammar and the canonical James Howard badge, while the rest of the design is specific to CMNA.

## Development

```sh
npm install
npm run dev
npm run build
```

Production URL: <https://cmna.jameshoward.us>

The custom domain is declared in `public/CNAME`; deployment is handled by `.github/workflows/deploy-pages.yml`.


## CMNA Laboratory

Selected method pages include browser-side interactive demonstrations. These are teaching visualizations of the algorithms represented in the companion package. The first laboratory pages cover bisection and a convergence comparison among bisection, Newton's method, and the secant method.

The method atlas is structured from `src/data/methods.ts` and can be filtered in the browser by method name, domain, or R function.


## R Workbench

The site includes a client-side R workbench powered by webR v0.6.0, pinned for reproducible production behavior. Valid R is executed in the browser through WebAssembly rather than on a CMNA computation server. A small bundle of canonical CMNA functions is loaded into the session at startup; base R remains available for arbitrary user code and plotting.

Because GitHub Pages cannot provide the cross-origin-isolated headers required for webR's interruptible SharedArrayBuffer channel, the workbench uses the PostMessage channel. A pathological or infinite R computation is terminated by reloading the page and thereby destroying the browser session.


### Current laboratories

- Bisection with arbitrary R functions and playable interval convergence
- Newton's method with playable tangent geometry
- Secant method with playable chord geometry
- Root-finder comparison for bisection, Newton, and secant
- Simpson's rule with arbitrary R integrands and playable quadratic panels
- Jacobi and Gauss-Seidel with arbitrary R matrices and residual histories
- Euler, midpoint, and fourth-order Runge-Kutta with arbitrary R ODEs
- Gradient descent with arbitrary two-dimensional R objectives and gradients
- A general-purpose browser-side R workbench

The laboratory architecture keeps the numerical computation in R/webR and uses JavaScript for presentation, playback, and visualization.


### Expanded laboratory set

The browser laboratory now includes root finding, differentiation, interpolation, deterministic and stochastic integration, linear algebra, ordinary and partial differential equations, local optimization, global stochastic optimization, and the unrestricted R Workbench.

Newer laboratories include Gauss-Legendre quadrature, Monte Carlo integration, polynomial/piecewise/spline interpolation, golden-section search, the heat equation, the wave equation, and simulated annealing.


## Teaching resources

The Teaching section provides a fourteen-week course map, chapter learning objectives and crosswalks, instructor notes for the interactive laboratories, a failure-driven "Break It" exercise collection, and adoption/syllabus guidance.

The static teaching material follows the book's original instructional pattern: problem, method, implementation, example, failure mode, and practical consequence. It is intended to support the book rather than turn the site into a second textbook.


## Numerical Zoo and experiment portability

The Numerical Zoo provides worked canonical problems chosen for interesting numerical behavior rather than routine practice. Current entries include Wilkinson's polynomial, Hilbert matrices, Runge's function, cancellation in the quadratic formula, Himmelblau's function, oscillatory and narrow-peak integrals, and an Euler stability example.

Guided laboratories now share a common experiment toolbar. Current states can be encoded into a shareable URL, exported as an R script, opened directly in the browser R Workbench, inspected against canonical package source, and paired with a print-friendly prediction worksheet.


## Privacy and analytics

CMNA uses the same privacy-first consent pattern as jameshoward.us. Google Analytics does not load until the visitor affirmatively accepts optional analytics cookies. Rejecting analytics leaves the full site and browser R laboratories available.

The consent manager honors Global Privacy Control, stores a host-only `cookieConsent` choice for 365 days, disables advertising-related Google storage and signals, and exposes Cookie Settings from the footer. The site also records selected Laboratory interactions after consent, including runs, playback, R export, Workbench handoff, source inspection, and prediction-worksheet use.

CMNA uses the same GA4 measurement ID as jameshoward.us (`G-FSDET4HG4L`). Traffic remains distinguishable by hostname, and Analytics still does not load until the visitor affirmatively accepts optional analytics cookies.


## Search, citations, and provenance

The site includes a static search index spanning methods, R functions, teaching material, the Numerical Zoo, software, and reference pages. Citation guidance is available for the book, package, and website, including downloadable BibTeX and RIS files.

Interactive method pages also carry provenance blocks connecting the browser experiment back to the relevant section of the 2017 book, the pinned CMNA 1.0.5 package source, teaching material, and related Numerical Zoo problems.

## Reproducible production build

Production uses the committed npm lockfile with `npm ci` in both CI and GitHub Pages deployment. Browser R imports are pinned to webR v0.6.0 rather than the moving `latest` URL. Dependabot checks the npm toolchain weekly.
