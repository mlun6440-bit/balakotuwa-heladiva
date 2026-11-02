// Screenshot + smoke-test harness (headless Chromium via Playwright).
//   node tools/shoot.mjs [outPrefix] [--smoke]
// Serves the repo on a random port, builds a sample late-game town on level 3
// (Lion Rock) and captures screenshots in both seasons. With --smoke, runs the
// CLAUDE.md smoke test across every level and prints the results.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require("/opt/node22/lib/node_modules/playwright"); } })();
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const prefix = args.find(a => !a.startsWith("--")) || "docs/screens/shot";
const smoke = args.includes("--smoke");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", e => errors.push(String(e.stack || e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(`http://localhost:${port}/index.html`);
await page.waitForTimeout(1500);

if (smoke) {
  const out = await page.evaluate(() => {
    const lines = [];
    for (const lv of LEVELS.keys()) {
      startLevel(lv); document.getElementById("beginBtn").click(); S.paused = true;
      const errs = []; try { for (let i = 0; i < 18000 && S.mode === "play"; i++) { step(0.05); if (i % 40 === 0) render(performance.now()); } }
      catch (e) { errs.push(e.stack); } lines.push(`${lv + 1} ${S.mode} ${Math.round(S.time)} ${JSON.stringify(errs)}`);
    }
    return lines;
  });
  console.log(out.join("\n"));
}

// A sample town for screenshots.
await page.evaluate(() => {
  startLevel(2); document.getElementById("beginBtn").click(); S.paused = true;
  const [cx, cy] = S.L.citadel;
  const put = (id, x, y) => { if (!canPlace(BUILDINGS[id], x, y)) addBuilding(id, x, y); };
  put("dagoba", 9, 9); put("market", 15, 11); put("barracks", 15, 14); put("storehouse", 9, 15);
  for (const [x, y] of [[11, 15], [12, 15], [13, 15], [14, 10], [13, 10], [11, 10], [17, 13], [18, 13], [17, 10], [12, 17], [13, 17]]) put("house", x, y);
  put("bissa", 10, 11); put("bissa", 14, 16);
  put("wewa", 1, 13); put("sluice", 3, 14);
  for (let x = 4; x <= 9; x++) put("canal", x, 14);
  put("paddy", 4, 12); put("paddy", 6, 12); put("paddy", 3, 15);
  for (let y = 8; y <= 18; y++) put("rampart", 20, y);
  put("gate", 20, 19); put("tower", 20, 7); put("tower", 20, 20);
  for (let x = 4; x <= 14; x++) put("palisade", x, 6);
  put("woodcutter", 7, 9); put("quarry", 14, 8);
  refreshWorld();
  S.villagers = 24; staff();
  S.buildings.filter(b => b.id === "paddy").forEach((b, i) => b.growth = [20, 60, 100][i % 3]);
  S.buildings.filter(b => b.id === "wewa").forEach(b => b.water = 80);
  for (let i = 0; i < 4; i++) spawnSoldier(["archer", "spearman", "angampora", "elephant"][i], cx + 5 + i * 0.7, cy + 4.5);
  for (let i = 0; i < 4; i++) spawnFoe(["raider", "bowman", "brute", "raider"][i], "east");
  for (let i = 0; i < 300; i++) step(0.05);
  centerCamera(cx + 1, cy + 1);
  document.getElementById("advisor").classList.add("hidden");
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${prefix}-maha.png` });
await page.evaluate(() => { S.season = "yala"; for (let i = 0; i < 40; i++) step(0.05); });
await page.waitForTimeout(400);
await page.screenshot({ path: `${prefix}-yala.png` });
await page.evaluate(() => { view.zoom = 2; centerCamera(S.citadel.gx + 1, S.citadel.gy + 1); });
await page.waitForTimeout(300);
await page.screenshot({ path: `${prefix}-zoom.png` });
const fps = await page.evaluate(() => new Promise(r => {
  view.zoom = 1; centerCamera(); let n = 0; const t0 = performance.now();
  const f = () => { render(performance.now()); n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n * 1000 / (performance.now() - t0))); };
  requestAnimationFrame(f);
}));
const cost = await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 60; i++) render(performance.now()); return ((performance.now() - t0) / 60).toFixed(2); });
console.log("render ms/frame:", cost, "rAF fps (headless):", fps);
console.log("errors:", JSON.stringify(errors));
await browser.close();
server.close();
