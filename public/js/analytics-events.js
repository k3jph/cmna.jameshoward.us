(function (window, document) {
  "use strict";

  function analyticsAllowed() {
    if (typeof window.cookieStatus !== "function") return false;
    try {
      const status = window.cookieStatus();
      return status.decision === "accepted" && status.analyticsLoaded === true;
    } catch (_) {
      return false;
    }
  }

  function send(action, parameters) {
    if (!analyticsAllowed() || typeof window.gtag !== "function") return;
    window.gtag("event", action, parameters || {});
  }

  function labName(target) {
    const root = target.closest(
      "[data-bisection-r-lab], [data-root-geometry-lab], [data-diff-lab], " +
      "[data-interp-lab], [data-simpson-lab], [data-gauss-lab], [data-mc-lab], " +
      "[data-iterative-lab], [data-ivp-lab], [data-heat-lab], [data-wave-lab], " +
      "[data-golden-lab], [data-gradient-lab], [data-sa-lab], [data-root-compare], " +
      "[data-r-workbench]"
    );

    if (!root) return null;

    const method = root.getAttribute("data-method");
    if (method) return method;

    const attrs = [...root.attributes]
      .map((attribute) => attribute.name)
      .find((name) => name.startsWith("data-") && name.endsWith("-lab"));

    return attrs ? attrs.slice(5, -4) : (root.hasAttribute("data-r-workbench") ? "r-workbench" : "root-compare");
  }

  document.addEventListener("click", function (event) {
    const target = event.target.closest("button, a");
    if (!target) return;

    const lab = labName(target);

    if (target.matches("[data-run], [data-r-bisect], [data-r-run]")) {
      send("cmna_lab_run", { lab: lab || "unknown" });
      return;
    }

    if (target.matches("[data-play], [data-r-play]")) {
      send("cmna_lab_play", { lab: lab || "unknown" });
      return;
    }

    if (target.matches("[data-share]")) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "share_state" });
      return;
    }

    if (target.matches("[data-export]")) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "export_r" });
      return;
    }

    if (target.matches("[data-workbench]")) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "open_workbench" });
      return;
    }

    if (target.matches("[data-source]")) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "show_source" });
      return;
    }

    if (target.matches("[data-source-workbench]")) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "source_to_workbench" });
      return;
    }

    if (target.matches('a[href^="/teaching/worksheet/"]')) {
      send("cmna_lab_action", { lab: lab || "unknown", action: "prediction_worksheet" });
    }
  });
})(window, document);
