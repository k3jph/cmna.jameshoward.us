# CMNA release checklist

This checklist is for the quiet publication of https://cmna.jameshoward.us.

## Before merge

- [ ] PR #1 is mergeable and the current head has a successful build workflow.
- [ ] npm ci succeeds from the committed package-lock.json.
- [ ] webR remains pinned to the tested production version in every browser laboratory.
- [ ] Search, sitemap, robots policy, structured data, manifest, and the Updates RSS feed build without errors.
- [x] CMNA is configured with GA4 measurement ID G-FSDET4HG4L.
- [ ] If Analytics is enabled, accept/reject/reopen behavior is tested and Google Analytics does not load before consent.
- [ ] The privacy notice matches the services actually enabled at release.

## Browser smoke test

Test at least Chrome/Chromium, Firefox, Safari, and one narrow/mobile viewport.

### General site

- [ ] Header and footer navigation work.
- [ ] /search/ filters methods, teaching material, and Numerical Zoo entries.
- [ ] Book, Software, Teaching, Laboratory, Zoo, Updates, Cite, Privacy, and 404 pages render cleanly.
- [ ] Citation downloads return plain BibTeX/RIS files.
- [ ] Prediction worksheet prints without site chrome.

### webR

For each browser, test at least one representative lab from each execution/visualization family rather than every page.

- [ ] Bisection: R starts, arbitrary function runs, playback works.
- [ ] Simpson: arbitrary integrand runs and panel playback works.
- [ ] Jacobi/Gauss-Seidel: matrix input runs and residual plot works.
- [ ] RK4: arbitrary ODE runs and stage playback works.
- [ ] Simulated annealing: stochastic run and objective plot work.
- [ ] Heat equation: time playback works.
- [ ] R Workbench: console output and captured R graphics work.

### Experiment portability

- [ ] Share state creates a URL that restores the experiment.
- [ ] Export R downloads a usable .R file.
- [ ] Open in Workbench carries the current experiment into the editor.
- [ ] Show CMNA source loads the pinned 1.0.5 package source.
- [ ] Modify in Workbench carries source into the editor.
- [ ] Prediction worksheet opens the appropriate prompts.

## Publish

- [ ] Merge PR #1 to main.
- [ ] Confirm both build and deploy-pages succeed on main.
- [ ] Confirm GitHub Pages is configured to deploy from GitHub Actions.
- [ ] Confirm cmna.jameshoward.us resolves to the Pages site.
- [ ] Confirm the TLS certificate is valid.
- [ ] Confirm HTTP redirects to HTTPS.
- [ ] Confirm https://cmna.jameshoward.us/robots.txt.
- [ ] Confirm https://cmna.jameshoward.us/sitemap.xml.
- [ ] Confirm https://cmna.jameshoward.us/updates/feed.xml.
- [ ] Confirm canonical URLs and Open Graph metadata use the production domain.

## After the site is live

- [ ] Change the old CMNA entry point on jameshoward.us to send readers to the new companion, or place an obvious companion-site link on the existing book page.
- [ ] Update the package URL in a future cmna release so CRAN points directly to the new companion.
- [ ] If Analytics is enabled, verify real-time page measurement and CMNA laboratory events.
- [ ] Submit or refresh the sitemap in the search-console tools actually used.
- [ ] Do not announce anything unless there is a reason to. Quiet publication is a feature.
