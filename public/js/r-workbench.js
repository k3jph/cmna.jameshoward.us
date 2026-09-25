import { WebR, ChannelType } from "https://webr.r-wasm.org/v0.6.0/webr.mjs";

const root = document.querySelector("[data-r-workbench]");
if (!root) throw new Error("R workbench root not found.");

const editor = root.querySelector("[data-r-editor]");
const runButton = root.querySelector("[data-r-run]");
const resetButton = root.querySelector("[data-r-reset]");
const status = root.querySelector("[data-r-status]");
const output = root.querySelector("[data-r-output]");
const plots = root.querySelector("[data-r-plots]");
const examples = root.querySelector("[data-r-examples]");
const timing = root.querySelector("[data-r-timing]");

let webR;
let shelter;
let ready = false;
let running = false;

function decodeSharedCode(text) {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

if (location.hash.startsWith("#code=")) {
  try {
    editor.value = decodeSharedCode(location.hash.slice(6));
  } catch (_) {
    // Leave the default example intact if a shared fragment is malformed.
  }
}

function appendOutput(type, data) {
  const line = document.createElement("div");
  line.className = "r-output-line " + (type === "stderr" ? "r-output-error" : "");
  line.textContent = String(data);
  output.append(line);
}

async function initialise() {
  status.textContent = "Starting R in this browser…";
  runButton.disabled = true;

  try {
    webR = new WebR({
      interactive: false,
      channelType: ChannelType.PostMessage,
    });
    await webR.init();
    shelter = await new webR.Shelter();

    const response = await fetch("/r/cmna-workbench.R");
    if (!response.ok) throw new Error("Could not load the bundled CMNA R source.");
    const cmnaSource = await response.text();
    await webR.evalRVoid(cmnaSource);

    const version = await webR.evalRString('paste(R.version$major, R.version$minor, sep=".")');
    status.textContent = "R " + version + " is ready · running locally in your browser";
    ready = true;
    runButton.disabled = false;
  } catch (error) {
    status.textContent = "R failed to start: " + error.message;
    appendOutput("stderr", error.stack || error.message);
  }
}

async function runCode() {
  if (!ready || running) return;
  running = true;
  runButton.disabled = true;
  runButton.textContent = "Running…";
  output.replaceChildren();
  plots.replaceChildren();
  timing.textContent = "";

  const started = performance.now();

  try {
    const capture = await shelter.captureR(editor.value, {
      withAutoprint: true,
      captureStreams: true,
      captureConditions: true,
      captureGraphics: {
        width: 900,
        height: 620,
        bg: "#fffdf8",
        capture: true,
      },
    });

    for (const message of capture.output) {
      appendOutput(message.type, message.data);
    }

    if (capture.images?.length) {
      for (const image of capture.images) {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.className = "r-plot-canvas";
        canvas.getContext("2d").drawImage(image, 0, 0, image.width, image.height);
        plots.append(canvas);
      }
    }

    if (!capture.output.length && !capture.images.length) {
      appendOutput("stdout", "(completed with no printed output)");
    }

    await shelter.purge();
  } catch (error) {
    appendOutput("stderr", error.message || String(error));
  } finally {
    const elapsed = performance.now() - started;
    timing.textContent = (elapsed / 1000).toFixed(2) + " s";
    running = false;
    runButton.disabled = false;
    runButton.textContent = "Run R";
  }
}

const exampleCode = {
  bisection: `f <- function(x) x^3 - x - 2

bisection(
  f,
  a = 1,
  b = 2,
  tol = 1e-8
)`,
  newton: `f  <- function(x) cos(x) - x
fp <- function(x) -sin(x) - 1

newton(
  f,
  fp,
  x = 0.5,
  tol = 1e-10
)`,
  matrix: `A <- matrix(c(
  10, -1,  2,
  -1, 11, -1,
   2, -1, 10
), nrow = 3, byrow = TRUE)

eigen(A)`,
  plot: `f <- function(x) exp(-x^2) * cos(7*x)

curve(
  f,
  from = -3,
  to = 3,
  n = 500,
  xlab = "x",
  ylab = "f(x)",
  main = "Arbitrary R plotting in CMNA"
)
abline(h = 0, lty = 3)`,
  wilkinson: `x <- seq(0.5, 20.5, length.out = 600)
y <- vapply(x, wilkinson, numeric(1))

plot(
  x, y,
  type = "l",
  xlab = "x",
  ylab = "W(x)",
  main = "Wilkinson's polynomial"
)
abline(h = 0, lty = 3)`,
  himmelblau: `starts <- list(
  c(3, 2),
  c(-2.8, 3.1),
  c(-3.8, -3.3),
  c(3.6, -1.8)
)

vapply(starts, himmelblau, numeric(1))`,
};

examples.addEventListener("change", () => {
  const code = exampleCode[examples.value];
  if (code) editor.value = code;
});

runButton.addEventListener("click", runCode);

editor.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    runCode();
  }
});

resetButton.addEventListener("click", () => {
  if (running) {
    if (!confirm("R is currently running. Reloading the page will terminate this browser session. Continue?")) return;
  }
  location.reload();
});

initialise();
