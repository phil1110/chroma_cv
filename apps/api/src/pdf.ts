import { chromium } from "playwright";
import type { CvDocument, Theme } from "./model.js";

const esc = (s = "") =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function renderPdf(
  cv: CvDocument,
  t: Theme,
  origin: string,
): Promise<Buffer> {
  const sections = cv.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order)
    .map(
      (s) =>
        `<section><h2>${esc(s.title)}</h2>${s.entries.map((e) => `<article><div class="row"><div><h3>${esc(e.title)}</h3><strong>${esc(e.subtitle)}</strong></div><span>${esc(e.period)}</span></div>${e.location ? `<small>${esc(e.location)}</small>` : ""}${e.body ? `<p>${esc(e.body)}</p>` : ""}${e.tags?.length ? `<ul>${e.tags.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${e.url ? `<a href="${esc(e.url)}">${esc(e.url)}</a>` : ""}</article>`).join("")}</section>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm 15mm 15mm}*{box-sizing:border-box}body{margin:0;color:${t.text};background:${t.background};font:10pt Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}header{display:grid;grid-template-columns:1fr auto;gap:20px;padding:8mm 0 9mm;border-bottom:1px solid ${t.border}}h1{font-size:28pt;letter-spacing:-1.5px;margin:0 0 3mm}header p{margin:0;color:${t.muted};max-width:130mm;line-height:1.5}.contact{text-align:right;font-size:8.5pt}.contact a{display:block;color:${t.text};margin-bottom:2mm}main{columns:1}section{padding:7mm 0 2mm;border-bottom:1px solid ${t.border};break-inside:auto}h2{font-size:15pt;margin:0 0 4mm;color:${t.accent}}article{break-inside:avoid;padding:0 0 5mm}.row{display:flex;justify-content:space-between;gap:8mm}.row span,small{color:${t.muted};font-size:8.5pt;white-space:nowrap}h3{font-size:11pt;margin:0 0 1mm}strong{font-weight:normal;color:${t.muted}}article p{color:${t.muted};line-height:1.5;margin:2mm 0}ul{list-style:none;padding:0;margin:2mm 0;display:flex;flex-wrap:wrap;gap:1.5mm}li{border:1px solid ${t.border};border-radius:8mm;padding:1mm 2mm;font-size:7.5pt}a{color:${t.accent2};text-decoration:none}footer{padding-top:6mm;font-size:7.5pt;color:${t.muted};display:flex;justify-content:space-between}</style></head><body><header><div><h1>${esc(cv.name)}</h1><p>${esc(cv.role)} · ${esc(cv.tagline)}</p></div><div class="contact"><a href="mailto:${esc(cv.email)}">${esc(cv.email)}</a>${cv.phone ? `<a href="tel:${esc(cv.phone)}">${esc(cv.phone)}</a>` : ""}<span>${esc(cv.location)}</span></div></header><main><section><h2>Profile</h2><p>${esc(cv.about)}</p></section>${sections}</main><footer><span>${esc(cv.name)} · Curriculum Vitae</span><span>${esc(origin)}</span></footer></body></html>`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
    const continuousHtml = html.replace(
      "@page{size:A4;margin:14mm 15mm 15mm}",
      `@page{margin:0}html{margin:0;width:210mm;background:${t.background}}body{width:210mm;min-height:297mm;padding:14mm 15mm 15mm;background:${t.background}}`,
    );
    const enrichedHtml = continuousHtml.replace(
      "<style>",
      `<title>${esc(cv.name)} — Curriculum Vitae</title><meta name="author" content="${esc(cv.name)}"><meta name="subject" content="Curriculum Vitae"><style>`,
    );
    await page.setContent(enrichedHtml, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    const contentHeight = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        1123,
      ),
    );
    const bytes = await page.pdf({
      width: "210mm",
      height: `${contentHeight + 2}px`,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false,
      outline: true,
      tagged: true,
    });
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
}
