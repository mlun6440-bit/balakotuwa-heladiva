// Automated playtest with learning bots.
//
//   node tools/playtest.mjs                 evaluate: novice + learned bot on every level, write the report
//   node tools/playtest.mjs learn --gens 3  keep learning: evolve the bot's dials per level, then evaluate
//   options: --levels 1,3   --pages 4 (parallel games)   --out docs/playtest   --limit 1500 (sim seconds)
//
// Bots (tools/playtest-bot.js) use only player actions. What they learn is
// stored in tools/playtest-brain.json, so every run continues from the best
// dials found so far; the best is re-scored first, because the game changes.
// The report (docs/playtest/REPORT.md) turns the numbers into gameplay
// feedback: difficulty, stalls, unused systems and economy problems.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require("/opt/node22/lib/node_modules/playwright"); } })();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const mode = args[0] === "learn" ? "learn" : "evaluate";
const outDir = path.resolve(root, opt("--out", "docs/playtest"));
const levelsArg = opt("--levels", null);
const GENS = Number(opt("--gens", "3")), LAMBDA = Number(opt("--lambda", "6")), REPS = Number(opt("--reps", "2"));
const PAGES = Number(opt("--pages", "4")), LIMIT = Number(opt("--limit", "1500"));
const brainFile = path.join(root, "tools/playtest-brain.json");
fs.mkdirSync(outDir, { recursive: true });
const brain = fs.existsSync(brainFile) ? JSON.parse(fs.readFileSync(brainFile, "utf8")) : { version: 2, levels: {} };

// ---------- running games ----------
const browser = await chromium.launch();
const botSrc = path.join(root, "tools/playtest-bot.js");
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
  page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e.message)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
  await page.goto("file://" + path.join(root, "index.html"));
  await page.addScriptTag({ path: botSrc });
  await page.waitForTimeout(600);
  return page;
}
const pool = [];
for (let i = 0; i < PAGES; i++) pool.push(await newPage());
const DIALS = await pool[0].evaluate(() => BOT.DIALS);
// Learned dials are kept per level id, so inserting a level never shifts them.
const LEVEL_IDS = await pool[0].evaluate(() => LEVELS.map(L => L.id));
const levels = levelsArg ? levelsArg.split(",").map(Number) : LEVEL_IDS.map((_, i) => i + 1);
if ((brain.version || 1) < 2) { // version 1 was keyed 1..5 by the first campaign's order
  const old = ["anuradhapura", "dryzone", "lionrock", "parakrama", "senkadagala"];
  brain.levels = Object.fromEntries(Object.entries(brain.levels).map(([k, v]) => [old[Number(k) - 1] || k, v]));
  brain.version = 2;
}
const mind = lv => brain.levels[LEVEL_IDS[lv - 1]];
const DEFAULTS = await pool[0].evaluate(() => BOT.DEFAULTS);

async function play(page, lv, style, P, shotPrefix = null) {
  page.errors.length = 0;
  await page.evaluate(([lv, style, P]) => {
    startLevel(lv - 1); document.getElementById("beginBtn").click(); S.paused = true;
    BOT.log.length = 0;
    window.PT = { style, P, said: [], samples: [] };
    if (!window._origSay) window._origSay = say;
    window.say = (t, w) => { PT.said.push(`${Math.round(S.time)}s ${t}`); window._origSay(t, w); };
  }, [lv, style, P]);
  const shots = [];
  for (;;) {
    const done = await page.evaluate(limit => {
      for (let i = 0; i < 1000 && S.mode === "play" && S.time < limit; i++) {
        if (i % 40 === 0) BOT.think(PT.style, PT.P);
        step(0.05);
        if (i % 200 === 0) PT.samples.push({ t: Math.round(S.time), rice: Math.floor(S.rice), timber: Math.floor(S.timber), stone: Math.floor(S.stone), gold: Math.floor(S.gold),
          villagers: S.villagers, cap: S.cap, idle: Math.max(0, idleVillagers()), harmony: Math.round(S.harmony), army: S.units.filter(u => u.team === "p").length,
          foes: S.units.filter(u => u.team === "e").length, citadel: Math.round(100 * S.citadel.hp / S.citadel.maxHp) });
      }
      return S.mode !== "play" || S.time >= limit;
    }, LIMIT);
    const t = await page.evaluate(() => S.time);
    if (shotPrefix && ((shots.length === 0 && t >= 240) || done)) {
      await page.evaluate(() => { render(performance.now()); document.getElementById("advisor").classList.add("hidden"); });
      const file = `${shotPrefix}-${done ? "end" : "4min"}.jpg`;
      await page.screenshot({ path: path.join(outDir, file), type: "jpeg", quality: 70 });
      shots.push(file);
    }
    if (done) break;
  }
  const r = await page.evaluate(() => {
    const objs = S.L.objectives.map(o => { const r = objective(o); return { label: r.label, cur: Math.min(r.cur, r.n), n: r.n }; });
    const won = S.mode === "end" && S.citadel.hp > 0 && objs.every(o => o.cur >= o.n);
    return {
      level: S.idx + 1, name: S.L.name, style: PT.style, outcome: S.mode !== "end" ? "unfinished" : won ? "won" : "lost",
      time: Math.round(S.time), citadel: Math.round(100 * Math.max(0, S.citadel.hp) / S.citadel.maxHp), stars: won ? (S.starsEarned || 0) : 0,
      raidsDone: S.nextWave, raids: S.L.waves.length, starved: S.stats.starved, hungry: S.stats.hungry, burned: S.stats.burned,
      trained: S.stats.trained, tributes: S.stats.tributes, trampled: S.stats.trampled || 0, looted: S.stats.looted || 0, rainKept: rainKept(), objectives: objs, causes: S.causes || [],
      buildings: S.buildings.reduce((m, b) => (m[b.id] = (m[b.id] || 0) + 1, m), {}),
      samples: PT.samples, said: PT.said.slice(0, 80), bot: BOT.log.slice(0, 120)
    };
  });
  r.errors = [...page.errors];
  r.shots = shots;
  return r;
}
function score(r) {
  const frac = r.objectives.reduce((a, o) => a + (o.n === Infinity ? 0 : Math.min(1, o.cur / o.n)), 0) / r.objectives.length;
  if (r.outcome === "won") return 1000 + 100 * r.stars + r.citadel - r.time / 20;
  return (r.outcome === "lost" ? 300 : 400) * frac + 60 * r.raidsDone + (r.outcome === "lost" ? 0 : r.citadel);
}
// run a list of jobs across the page pool
async function runAll(jobs) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(pool.map(async page => {
    while (next < jobs.length) { const i = next++; const j = jobs[i]; out[i] = await play(page, j.lv, j.style, j.P, j.shot); }
  }));
  return out;
}
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

// ---------- learning: (1+λ) evolution strategy per level ----------
function mutate(P, sigma) {
  const Q = { ...P };
  for (const [k, [, lo, hi]] of Object.entries(DIALS)) {
    if (Math.random() < 0.45) {
      const g = Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
      Q[k] = Math.min(hi, Math.max(lo, (Q[k] ?? DEFAULTS[k]) + g * sigma * (hi - lo)));
    }
  }
  return Q;
}
if (mode === "learn") {
  for (const lv of levels) {
    const mem = mind(lv) || (brain.levels[LEVEL_IDS[lv - 1]] = { P: { ...DEFAULTS }, sigma: 0.25, history: [] });
    mem.P = { ...DEFAULTS, ...mem.P }; // new dials get their defaults
    // the game may have changed since the last run: score the incumbent again
    let best = mem.P, bestScore = mean((await runAll(Array.from({ length: REPS }, () => ({ lv, style: "planner", P: best })))).map(score));
    console.log(`L${lv} start: score ${bestScore.toFixed(0)} sigma ${mem.sigma.toFixed(2)}`);
    for (let gen = 0; gen < GENS; gen++) {
      const cands = Array.from({ length: LAMBDA }, () => mutate(best, mem.sigma));
      const jobs = cands.flatMap(P => Array.from({ length: REPS }, () => ({ lv, style: "planner", P })));
      const res = await runAll(jobs);
      const scores = cands.map((_, i) => mean(res.slice(i * REPS, i * REPS + REPS).map(score)));
      const i = scores.indexOf(Math.max(...scores));
      const improved = scores[i] > bestScore;
      if (improved) { best = cands[i]; bestScore = scores[i]; }
      mem.sigma = Math.min(0.5, Math.max(0.03, mem.sigma * (improved ? 1.25 : 0.82)));
      mem.history.push({ at: new Date().toISOString().slice(0, 16), gen: mem.history.length + 1, score: Math.round(bestScore) });
      console.log(`L${lv} gen ${gen + 1}: best ${bestScore.toFixed(0)}${improved ? " (improved)" : ""} sigma ${mem.sigma.toFixed(2)}`);
    }
    mem.P = Object.fromEntries(Object.entries(best).map(([k, v]) => [k, Math.round(v * 100) / 100]));
    mem.score = Math.round(bestScore);
    fs.writeFileSync(brainFile, JSON.stringify(brain, null, 1));
  }
}

// ---------- evaluation and report ----------
const jobs = [];
for (const lv of levels) {
  jobs.push({ lv, style: "novice", P: DEFAULTS });
  jobs.push({ lv, style: "planner", P: { ...DEFAULTS, ...(mind(lv)?.P || {}) }, shot: `L${lv}` });
}
const results = await runAll(jobs);
for (const r of results) console.log(`L${r.level} ${r.style.padEnd(7)} ${r.outcome.padEnd(10)} t=${r.time}s citadel ${r.citadel}% stars ${r.stars} raids ${r.raidsDone}/${r.raids} starved ${r.starved} burned ${r.burned} trampled ${r.trampled} looted ${r.looted} tributes ${r.tributes} errors ${r.errors.length}`);
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 1));
fs.writeFileSync(path.join(outDir, "REPORT.md"), report(results));
console.log("wrote", path.relative(root, path.join(outDir, "REPORT.md")));
await browser.close();

// Turn numbers into gameplay feedback. Each finding names its evidence.
function report(results) {
  const by = (lv, st) => results.find(r => r.level === lv && r.style === st);
  const L = [];
  L.push("# Automated playtest report", "");
  L.push(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} by \`node tools/playtest.mjs${mode === "learn" ? " learn" : ""}\`. Two bots per level: a **novice** that follows the tutorial and advisor hints, and a **learned planner** whose dials have been tuned by trial and error (see \`tools/playtest-brain.json\`). Bots only use player actions. They show what is *possible* and where play *stalls*; they cannot judge fun or clarity — that still needs people.`, "");
  L.push("| Level | Novice | Learned planner | Planner time | Citadel | Stars | Families lost (novice / planner) | Burned |", "|---|---|---|---|---|---|---|---|");
  for (const lv of levels) {
    const n = by(lv, "novice"), p = by(lv, "planner");
    L.push(`| ${lv}. ${p.name} | ${n.outcome} | ${p.outcome} | ${p.time}s | ${p.citadel}% | ${"★".repeat(p.stars) || "–"} | ${n.starved} / ${p.starved} | ${p.burned} |`);
  }
  L.push("", "## Findings", "");
  const F = [];
  for (const lv of levels) {
    const n = by(lv, "novice"), p = by(lv, "planner");
    const tag = `**L${lv} ${p.name}:**`;
    if (p.outcome !== "won") F.push(`${tag} even the learned planner did not win (${p.outcome}). Unmet: ${p.objectives.filter(o => o.cur < o.n).map(o => `${o.label} ${o.cur}/${o.n}`).join(", ") || "none"}. ${p.causes.length ? "Causes: " + p.causes.join(" ") : ""} Either the level is too hard or the bot lacks a skill it needs (see bot limits).`);
    if (n.outcome !== "won") F.push(`${tag} a hint-following novice ${n.outcome === "lost" ? "lost" : "did not finish"}${n.causes.length ? ` — the defeat screen said: ${n.causes.join(" ")}` : ""}. Unmet: ${n.objectives.filter(o => o.cur < o.n).map(o => `${o.label} ${o.cur}/${o.n}`).join(", ") || "none"}. Consider a clearer hint or a gentler first raid here.`);
    if (p.outcome === "won" && n.outcome === "won" && p.citadel >= 95 && n.citadel >= 95) F.push(`${tag} both bots won with the citadel almost untouched (${n.citadel}% / ${p.citadel}%). Raids may be too weak to create tension here.`);
    if (p.outcome === "won" && p.time < 260) F.push(`${tag} the planner won in ${p.time}s; the level may end before its ideas get explored.`);
    const s = p.samples.filter(x => x.villagers > 0);
    const idle = s.length ? mean(s.map(x => x.idle / x.villagers)) : 0;
    if (idle > 0.45) F.push(`${tag} on average ${Math.round(idle * 100)}% of villagers were idle (no job). Idle people have nothing to do; consider jobs that use them (hauling, festival crowds, militia) or a cost to idleness.`);
    const maxGold = Math.max(...p.samples.map(x => x.gold));
    if (maxGold > 900) F.push(`${tag} gold piled up to ${maxGold} with nothing worth buying. Gold needs more sinks (upgrades, decrees, elite units) or slower income.`);
    const maxV = Math.max(...p.samples.map(x => x.villagers));
    if (maxV > 120) F.push(`${tag} population snowballed to ${maxV}. Growth has no natural brake besides rice; consider housing that costs upkeep or land.`);
    if (p.hungry > 60 || n.hungry > 60) F.push(`${tag} the granary sat empty for ${Math.max(p.hungry, n.hungry)}s in one run: food balance is still the main trap.`);
    if (p.burned >= 2) F.push(`${tag} fire destroyed ${p.burned} buildings even for the planner. Check that water carriers can keep up.`);
    const errs = [...n.errors, ...p.errors];
    if (errs.length) F.push(`${tag} **page errors:** ${[...new Set(errs)].join("; ")}`);
  }
  // what the learner chose tells us which systems matter
  const learned = levels.map(lv => mind(lv)?.P).filter(Boolean);
  if (learned.length) {
    const avg = k => mean(learned.map(P => P[k] ?? DEFAULTS[k]));
    if (avg("tribute") < 0.3) F.push(`**Tribute:** the learner almost never pays it (dial ${avg("tribute").toFixed(2)}). Either it is priced too high or fighting is too easy.`);
    else F.push(`**Tribute:** the learner pays it (dial ${avg("tribute").toFixed(2)}), so it is a real option.`);
    F.push(`**Defence the learner relies on:** ${avg("towersPerEdge").toFixed(1)} towers per raid edge, ${avg("walls").toFixed(1)} wall tiles, an army of ${avg("armyBase").toFixed(1)} + ${avg("armyPerRaid").toFixed(1)} per raid. ${avg("walls") < 1 ? "Walls are not worth building for it — raiders may be too easy to stop with soldiers alone." : ""}`);
    F.push(`**Economy the learner prefers:** ${avg("paddyPerHouse").toFixed(2)} paddies per house, at most ${avg("maxHouses").toFixed(0)} houses, ${avg("woodcutters").toFixed(1)} woodcutters.`);
  }
  L.push(...F.map(f => `- ${f}`), "");
  L.push("## Bot limits (so findings aren't over-read)", "",
    "- The bots never open sluices, never use forest ambush on purpose, never repair or upgrade except for harmony, and never call raids early. The planner does send its melee soldiers out against stone throwers.",
    "- They place buildings by simple rules (near the citadel, near water or forest), not by reading the map like a person.",
    "- Raids involve randomness; a single run per bot is a sample, not a verdict. Learning averages several runs per candidate.", "");
  L.push("## Learning history", "");
  for (const lv of levels) {
    const m = mind(lv);
    L.push(`- L${lv}: ${m ? `${m.history.length} generations, best score ${m.score ?? "?"}; recent ${m.history.slice(-5).map(h => h.score).join(" → ")}` : "not trained yet (default dials)"}`);
  }
  L.push("", "## Screens (learned planner)", "");
  for (const lv of levels) for (const f of by(lv, "planner").shots) L.push(`![L${lv}](${f})`);
  return L.join("\n") + "\n";
}
