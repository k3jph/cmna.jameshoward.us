const input = document.querySelector("[data-site-search]");
const form = document.querySelector("[data-site-search-form]");
const status = document.querySelector("[data-site-search-status]");
const results = [...document.querySelectorAll("[data-search-result]")];

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function words(value) {
  return normalize(value).split(" ").filter(Boolean);
}

function applySearch(rawQuery, updateUrl = false) {
  const query = normalize(rawQuery);
  const terms = words(query);
  let count = 0;

  for (const result of results) {
    const haystack = result.dataset.search || "";
    const visible = !terms.length || terms.every((term) => haystack.includes(term));
    result.hidden = !visible;
    if (visible) count += 1;
  }

  if (!query) {
    status.textContent = `${results.length} indexed entries. Start typing to narrow the list.`;
  } else if (count === 1) {
    status.textContent = `1 result for “${rawQuery.trim()}”.`;
  } else {
    status.textContent = `${count} results for “${rawQuery.trim()}”.`;
  }

  if (updateUrl) {
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", rawQuery.trim());
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }
}

input.addEventListener("input", () => applySearch(input.value, true));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  applySearch(input.value, true);
});

const initial = new URLSearchParams(location.search).get("q") || "";
input.value = initial;
applySearch(initial, false);
if (initial) input.focus();
