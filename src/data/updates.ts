export interface UpdateEntry {
  date: string;
  kind: "Book errata" | "Software" | "Website" | "Teaching";
  title: string;
  summary: string;
  href?: string;
  linkLabel?: string;
}

export const updates: UpdateEntry[] = [
  {
    date: "2026-09-23",
    kind: "Website",
    title: "A new web companion",
    summary:
      "The CMNA companion site was rebuilt around the book, package source, a searchable method atlas, browser-side R laboratories, the Numerical Zoo, and maintained teaching material.",
  },
  {
    date: "2026-09-23",
    kind: "Teaching",
    title: "Teaching resources added",
    summary:
      "The companion now includes a fourteen-week course map, chapter learning objectives, instructor notes for the laboratories, failure-driven Break It exercises, adoption guidance, and printable prediction worksheets.",
    href: "/teaching/",
    linkLabel: "Open Teaching",
  },
  {
    date: "2026-09-23",
    kind: "Website",
    title: "Browser laboratories and R Workbench",
    summary:
      "Selected CMNA methods now run through webR in the browser. Guided laboratories expose intermediate numerical state while the Workbench provides a general R session with the companion methods loaded.",
    href: "/laboratory/",
    linkLabel: "Open the Laboratory",
  },
  {
    date: "2021-07-14",
    kind: "Software",
    title: "cmna 1.0.5",
    summary:
      "Version 1.0.5 is the current released companion package. The package repository remains the canonical source for code, documentation, tests, and development history.",
    href: "https://github.com/k3jph/cmna-pkg/tree/9d57edec65c929a18aa5258e84f619649a93f269",
    linkLabel: "View the 1.0.5 source",
  },
  {
    date: "2019-04-03",
    kind: "Book errata",
    title: "Published errata",
    summary:
      "The previous CMNA book page records an errata document dated April 3, 2019. It remains the canonical published correction document while individual corrections are consolidated into this companion.",
    href: "https://jameshoward.us/assets/docs/CMNA-Errata-20190403.pdf",
    linkLabel: "Open the 2019 errata PDF",
  },
];
