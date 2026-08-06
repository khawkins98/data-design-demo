/**
 * Measures what antd's documented global reset would do to the host canaries.
 * Canary ids and watched properties are parsed out of the harness source rather
 * than imported, because node cannot resolve the harness's .js-suffixed TS imports.
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const src = readFileSync("packages/test-harness/src/canaries.ts", "utf8");
const listOf = (name) => {
  const body = new RegExp(`${name}[^=]*=\\s*Object\\.freeze\\(\\[(.*?)\\]`, "s").exec(src)[1];
  return [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
};
const ids = listOf("CANARY_IDS");
const props = listOf("WATCHED_PROPERTIES");

const resetPath = execSync(
  "find node_modules/.pnpm -path '*antd@6.5.3*/node_modules/antd/dist/reset.css' | head -1",
  { encoding: "utf8" },
).trim();
if (!resetPath) { console.log(JSON.stringify({ error: "reset.css not present in the antd tarball" })); process.exit(0); }
const resetCss = readFileSync(resetPath, "utf8");

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(process.argv[2] + "/?candidate=on");
await p.waitForTimeout(500);

const snap = () => p.evaluate((a) => {
  const out = {};
  for (const id of a.ids) {
    const el = document.querySelector(`[data-canary="${id}"]`);
    if (!el) continue;
    const cs = getComputedStyle(el);
    out[id] = Object.fromEntries(a.props.map((k) => [k, cs.getPropertyValue(k)]));
  }
  return out;
}, { ids, props });

const before = await snap();
await p.addStyleTag({ content: resetCss });
await p.waitForTimeout(300);
const after = await snap();

const differences = [];
for (const id of Object.keys(before)) {
  for (const k of props) {
    if (before[id][k] !== after[id][k]) {
      differences.push({ canary: id, property: k, before: before[id][k], after: after[id][k] });
    }
  }
}
console.log(JSON.stringify({
  resetCssBytes: resetCss.length,
  canariesChecked: Object.keys(before).length,
  watchedProperties: props.length,
  differenceCount: differences.length,
  canariesAffected: new Set(differences.map((d) => d.canary)).size,
  sample: differences.slice(0, 8),
}, null, 1));
await b.close();
