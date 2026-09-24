---
import { updates } from "../../data/updates";

export const prerender = true;

const base = "https://cmna.jameshoward.us";

function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function GET() {
  const items = updates.map((entry) => {
    const href = entry.href
      ? (entry.href.startsWith("http") ? entry.href : new URL(entry.href, base).href)
      : new URL("/updates/", base).href;

    return `<item>
      <title>${esc(entry.title)}</title>
      <link>${esc(href)}</link>
      <guid isPermaLink="false">${esc(entry.date + ":" + entry.kind + ":" + entry.title)}</guid>
      <pubDate>${new Date(entry.date + "T12:00:00Z").toUTCString()}</pubDate>
      <category>${esc(entry.kind)}</category>
      <description>${esc(entry.summary)}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>CMNA Updates</title>
    <link>${base}/updates/</link>
    <description>Corrections, software changes, teaching additions, and continuing work around Computational Methods for Numerical Analysis with R.</description>
    <language>en-us</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8"
    }
  });
}
---