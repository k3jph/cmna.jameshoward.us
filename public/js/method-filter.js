const input = document.querySelector("[data-method-search]");
const status = document.querySelector("[data-method-status]");
const items = [...document.querySelectorAll("[data-method-item]")];
const groups = [...document.querySelectorAll("[data-method-group]")];

function filterMethods() {
  const query = (input?.value || "").trim().toLowerCase();
  let visible = 0;

  for (const item of items) {
    const matches = !query || item.dataset.search.includes(query);
    item.hidden = !matches;
    if (matches) visible += 1;
  }

  for (const group of groups) {
    const hasVisible = [...group.querySelectorAll("[data-method-item]")].some(
      (item) => !item.hidden,
    );
    group.hidden = !hasVisible;
  }

  if (status) {
    status.textContent = query
      ? `${visible} method${visible === 1 ? "" : "s"} match “${input.value.trim()}”`
      : `${items.length} methods in the atlas`;
  }
}

input?.addEventListener("input", filterMethods);
filterMethods();
