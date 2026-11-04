// Automated playtest with learning bots.
//
//   node tools/playtest.mjs                 evaluate: novice + learned bot on every level, write the report
//   node tools/playtest.mjs learn --gens 3  keep learning: evolve the bot's dials per level, then evaluate
//   node tools/playtest.mjs ab <git-ref>    A/B: the same bots on this checkout and on
//                                           <git-ref> (e.g. HEAD~1), --reps runs each,
//                                           averages side by side. Use before shipping.
//   node tools/playtest.mjs detectors       feed the report fake games with each known
//                                           problem and check every detector fires
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
const mode = ["learn", "detectors", "ab"].includes(args[0]) ? args[0] : "evaluate";
const outDir = path.resolve(root, opt("--out", "docs/playtest"));
const levelsArg = opt("--levels", null);
const GENS = Number(opt("--gens", "3")), LAMBDA = Number(opt("--lambda", "6")), REPS = Number(opt("--reps", "2"));
const PAGES = Number(opt("--pages", "4")), LIMIT = Number(opt("--limit", "1500"));
const brainFile = path.join(root, "tools/playtest-brain.json");
fs.mkdirSync(outDir, { recursive: true });
const brain = fs.existsSync(brainFile) ? JSON.parse(fs.readFileSync(brainFile, "utf8")) : { version: 2, levels: {} };

// ---------- running games ----------
const browser = await chromium.launch();
async function newPage(dir = root) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 680 } });
  page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e.message)));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
  await page.goto("file://" + path.join(dir, "index.html"));
  await page.addScriptTag({ path: path.join(dir, "tools/playtest-bot.js") });
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
      riceSold: S.stats.riceSold || 0, eaten: S.stats.eaten || 0, scared: S.stats.scared || 0, damBroken: S.stats.damBroken || 0, damBrokenAt: S.stats.damBrokenAt ?? null,
      lastWaveAt: S.L.waves.length ? S.L.waves[S.L.waves.length - 1].t : null, foesAtEnd: S.units.filter(u => u.team === "e").length,
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
async function runAll(jobs, pages = pool) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(pages.map(async page => {
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
// A/B: the same bots and dials on this checkout (A) and on an earlier commit
// (B, checked out into a temporary worktree), REPS runs each, averaged. One run
// is a sample, not a verdict: batch 10 nearly cut a feature over noise.
if (mode === "ab") {
  const ref = args[1];
  if (!ref || ref.startsWith("--")) { console.log("usage: node tools/playtest.mjs ab <git-ref> [--levels 3,4] [--reps 3]"); process.exit(1); }
  const { execFileSync } = await import("node:child_process");
  const os = await import("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "balakotuwa-ab-"));
  execFileSync("git", ["worktree", "add", "--detach", dir, ref], { cwd: root, stdio: "ignore" });
  try {
    const poolB = [];
    for (let i = 0; i < PAGES; i++) poolB.push(await newPage(dir));
    const reps = Math.max(1, Number(opt("--reps", "3")));
    const jobsFor = () => levels.flatMap(lv => Array.from({ length: reps }, () => [
      { lv, style: "novice", P: DEFAULTS }, { lv, style: "planner", P: { ...DEFAULTS, ...(mind(lv)?.P || {}) } }]).flat());
    const [A, B] = [await runAll(jobsFor()), await runAll(jobsFor(), poolB)];
    const stat = (R, lv, st) => {
      const g = R.filter(r => r.level === lv && r.style === st);
      const idle = g.map(r => { const s = r.samples.filter(x => x.villagers > 0); return s.length ? mean(s.map(x => x.idle / x.villagers)) : 0; });
      return { won: g.filter(r => r.outcome === "won").length, n: g.length, citadel: mean(g.map(r => r.citadel)), stars: mean(g.map(r => r.stars)), lost: mean(g.map(r => r.starved)), idle: mean(idle) * 100 };
    };
    const f = s => `${s.won}/${s.n} won, citadel ${s.citadel.toFixed(0)}%, ★${s.stars.toFixed(1)}, lost ${s.lost.toFixed(1)}, idle ${s.idle.toFixed(0)}%`;
    console.log(`A = this checkout, B = ${ref}; ${reps} run(s) each\n`);
    for (const lv of levels) for (const st of ["novice", "planner"]) {
      const a = stat(A, lv, st), b = stat(B, lv, st);
      const d = a.citadel - b.citadel;
      console.log(`L${lv} ${st.padEnd(7)} A: ${f(a)}\n${" ".repeat(11)}B: ${f(b)}${Math.abs(d) >= 10 ? `   ← citadel ${d > 0 ? "+" : ""}${d.toFixed(0)}` : ""}`);
    }
    const errs = [...A, ...B].flatMap(r => r.errors);
    if (errs.length) console.log("page errors:", [...new Set(errs)].join("; "));
  } finally {
    execFileSync("git", ["worktree", "remove", "--force", dir], { cwd: root, stdio: "ignore" });
    await browser.close();
  }
  process.exit(0);
}

// A detector that has never fired proves nothing: replay each problem found by
// hand in an earlier batch as a fake result and check the report names it.
if (mode === "detectors") {
  const lv = LEVEL_IDS.indexOf("dakkhina") + 1;
  const game = (style, extra) => ({ level: lv, name: "Detector check", style, outcome: "won", time: 500, citadel: 80, stars: 3, raidsDone: 4, raids: 4,
    starved: 0, hungry: 0, burned: 0, trained: 0, tributes: 0, trampled: 0, looted: 0, rainKept: 100, objectives: [], causes: [], buildings: {},
    samples: [], said: [], bot: [], errors: [], shots: [], riceSold: 0, eaten: 0, scared: 0, damBroken: 0, damBrokenAt: null, lastWaveAt: 530, foesAtEnd: 0, ...extra });
  const cases = [
    ["stall", { outcome: "unfinished", time: 1500, foesAtEnd: 3 }, "**stall:**"],
    ["market sold food in a famine", { riceSold: 140, starved: 8 }, "the market sold"],
    ["elephants ate the fields", { eaten: 4 }, "wild elephants ate"],
    ["the dam broken for free", { damBroken: 1, damBrokenAt: 17, citadel: 100 }, "broke the disawa's dam"],
    ["raids that bite nowhere", { citadel: 100, trampled: 0 }, "Raids may be too weak"],
    ["raids that bite the fields instead", { citadel: 100, trampled: 15 }, "the pressure lands on the fields"]
  ];
  levels.length = 0; levels.push(lv);
  let ok = 0;
  for (const [what, extra, needle] of cases) {
    const md = report([game("novice", extra), game("planner", extra)]);
    const hit = md.includes(needle);
    console.log(`${hit ? "✓" : "✗"} ${what}`);
    if (hit) ok++;
  }
  const clean = report([game("novice", {}), game("planner", {})]);
  const quiet = !cases.some(([, , needle]) => clean.includes(needle));
  console.log(`${quiet ? "✓" : "✗"} a clean game raises none of them`);
  await browser.close();
  process.exit(ok === cases.length && quiet ? 0 : 1);
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
    // batch 11: raids can bite without touching the citadel (Lion Rock's rampart goal
    // walls everyone in; the raiders trample the fields instead), so count field damage too
    if (p.outcome === "won" && n.outcome === "won" && p.citadel >= 95 && n.citadel >= 95) {
      const fields = (n.trampled || 0) + (n.looted || 0) / 20;
      if (fields < 10) F.push(`${tag} both bots won with the citadel almost untouched (${n.citadel}% / ${p.citadel}%) and the novice lost little in the fields (${n.trampled || 0} paddies trampled). Raids may be too weak to create tension here.`);
      else F.push(`${tag} raids never reached the citadel (${n.citadel}% / ${p.citadel}%) but cost the novice ${n.trampled || 0} trampled paddies: the pressure lands on the fields here.`);
    }
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
    // Detectors added after hand investigations in earlier batches (docs/LOOP-LOG.md):
    for (const r of [n, p]) {
      // batch 5: stone throwers ground on forever and the level never ended
      if (r.outcome === "unfinished" && r.raidsDone >= r.raids && r.foesAtEnd > 0)
        F.push(`${tag} **stall:** every raid launched but ${r.foesAtEnd} raider(s) still stood at the time limit for the ${r.style} (${r.time - (r.lastWaveAt ?? 0)}s after the last raid). Something can't end: a siege engine nobody can reach, or a raider stuck.`);
      // batch 5: the market sold the harvest while families starved
      if (r.riceSold >= 40 && r.starved >= 2) F.push(`${tag} the market sold ${r.riceSold} rice while ${r.starved} families starved (${r.style}). Check the trader's floor.`);
      // batch 6: wild elephants
      if (r.eaten >= 3) F.push(`${tag} wild elephants ate ${r.eaten} paddies for the ${r.style} (${r.scared} scared off). Is the pela easy enough to find and use?`);
      // batch 6: a choice that can be taken for free early on (the dam broken in the first 20s)
      if (r.damBrokenAt !== null && r.damBrokenAt < 60 && r.outcome === "won" && r.citadel >= 95) F.push(`${tag} the ${r.style} broke the disawa's dam at ${r.damBrokenAt}s and still won with the citadel at ${r.citadel}%: breaking may be free.`);
    }
    const errs = [...n.errors, ...p.errors];
    if (errs.length) F.push(`${tag} **page errors:** ${[...new Set(errs)].join("; ")}`);
  }
  // what the learner chose tells us which systems matter
  const learned = levels.map(lv => mind(lv)?.P).filter(Boolean);
  if (learned.length) {
    const avg = k => mean(learned.map(P => P[k] ?? DEFAULTS[k]));
    if (avg("tribute") < 0.3) F.push(`**Tribute:** the learner almost never pays it (dial ${avg("tribute").toFixed(2)}). Either it is priced too high or fighting is too easy.`);
    else F.push(`**Tribute:** the learner pays it (dial ${avg("tribute").toFixed(2)}), so it is a real option.`);
    // batch 6: a two-way choice the learner always settles the same way may have a dominant side
    for (const [dial, what, lo, hi] of [["breakDam", "the disawa's dam", "always pays the gift", "always breaks it"]]) {
      const vals = levels.filter(lv => LEVEL_IDS[lv - 1] === "dakkhina").map(lv => mind(lv)?.P?.[dial]).filter(v => v !== undefined);
      if (vals.length && mind(levels.find(lv => LEVEL_IDS[lv - 1] === "dakkhina"))?.history?.length >= 6 && (vals[0] <= 0.1 || vals[0] >= 0.9))
        F.push(`**Choice check (${what}):** after training the learner ${vals[0] <= 0.1 ? lo : hi} (dial ${vals[0]}). One side may dominate.`);
    }
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
