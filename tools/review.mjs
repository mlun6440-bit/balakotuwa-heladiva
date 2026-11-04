// Long-run review (docs/ITERATION-GUARDRAILS.md, "Reviewing a long autonomous run").
//   node tools/review.mjs
// Checks the things that quietly break after many rounds of additions:
//   1. save and continue: every level (and a skirmish) is played by the planner
//      bot, saved, wiped, continued, compared, then played on
//   2. tooltips: every building, troop and decree description is one sentence
//   3. the top bar stays one row at a narrow window, on every level
//   4. every building can still be placed, every decree proclaimed
//   5. sound: every effect renders offline and varies between takes, and the
//      music renders (headless browsers can't listen, so measure instead)
// Prints one line per problem and exits non-zero if there are any.
//   --selftest   break saving on purpose (the dam is left out of the save) and
//                switch sound variation off, and check that the review notices
//                both: a review that can't fail proves nothing.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require("playwright"); } catch { return require("/opt/node22/lib/node_modules/playwright"); } })();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const brain = JSON.parse(fs.readFileSync(path.join(root, "tools/playtest-brain.json"), "utf8"));
const browser = await chromium.launch();
const selftest = process.argv.includes("--selftest");
const problems = [];
const bad = s => { problems.push(s); console.log("✗ " + s); };

async function page(w = 1400, h = 860) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.errors = [];
  p.on("pageerror", e => p.errors.push(String(e.message)));
  await p.addInitScript(() => { try { localStorage.clear(); } catch (e) { } });
  await p.goto("file://" + path.join(root, "index.html"));
  await p.addScriptTag({ path: path.join(root, "tools/playtest-bot.js") });
  await p.waitForTimeout(500);
  return p;
}

// ---------- 1. save and continue ----------
{
  const p = await page();
  const ids = await p.evaluate(() => LEVELS.map(L => L.id));
  for (const [i, id] of [...ids.entries(), [-1, "skirmish"]]) {
    const P = brain.levels[id]?.P || {};
    const out = await p.evaluate(([i, P, selftest]) => {
      if (selftest) RUN_SKIP.add("dam");
      const play = secs => { const end = S.time + secs; for (let k = 0; S.mode === "play" && S.time < end; k++) { if (k % 40 === 0) BOT.think("planner", P); step(0.05); } };
      if (i < 0) startLevel(0, "brief", makeSkirmish(4242)); else startLevel(i);
      document.getElementById("beginBtn").click(); S.paused = true;
      play(150);
      if (S.mode !== "play") return { skip: `ended at ${Math.round(S.time)}s before the save` };
      // state the bots never create on their own: a soldier on hold, a veteran, a damaged dam
      const mine = S.units.filter(u => u.team === "p");
      if (mine[0]) mine[0].hold = true;
      if (mine[1]) { mine[1].rank = 1; mine[1].xp = 95; }
      if (S.dam) S.dam.hp -= 137;
      const snap = () => JSON.stringify({
        t: Math.round(S.time * 10), res: ["timber", "stone", "rice", "gold"].map(k => Math.round(S[k])), v: S.villagers, season: S.season, wave: S.nextWave,
        b: S.buildings.map(b => `${b.id}@${b.gx},${b.gy}:${Math.round(b.hp)}`).sort(),
        u: S.units.map(u => `${u.team}${u.type}r${u.rank || 0}${u.hold ? "h" : ""}`).sort(),
        dam: S.dam && Math.round(S.dam.hp), wild: S.nextWild ?? null, edicts: S.edictEnd
      });
      const before = snap();
      saveRun();
      startLevel(0, "idle"); // wipe the state
      if (!continueRun()) return { err: "continueRun() returned false" };
      const after = snap();
      play(150);
      return { same: before === after, before, after, mode: S.mode, t: Math.round(S.time) };
    }, [i, P, selftest]);
    const name = i < 0 ? "skirmish" : `L${i + 1} ${id}`;
    if (out.skip) console.log(`· ${name}: ${out.skip}`);
    else if (out.err) bad(`${name}: ${out.err}`);
    else if (!out.same) {
      const a = JSON.parse(out.before), b = JSON.parse(out.after);
      bad(`${name}: continue differs in ${Object.keys(a).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).join(", ")}`);
    } else console.log(`✓ ${name}: save and continue match; played on to ${out.t}s (${out.mode})`);
    if (p.errors.length) { bad(`${name}: page errors ${[...new Set(p.errors)].join("; ")}`); p.errors.length = 0; }
  }
  await p.close();
}

// ---------- 2. one-sentence tooltips ----------
{
  const p = await page();
  const descs = await p.evaluate(() => [
    ...Object.entries(BUILDINGS).map(([k, v]) => [`building ${k}`, v.desc]),
    ...Object.entries(TROOPS).map(([k, v]) => [`troop ${k}`, v.desc]),
    ...Object.entries(EDICTS).map(([k, v]) => [`decree ${k}`, v.desc])
  ]);
  let n = 0;
  for (const [who, d] of descs) {
    if (!d) { if (!who.startsWith("building citadel")) bad(`${who}: no tooltip`); continue; }
    const sentences = d.split(/[.!?](?:\s+|$)/).filter(s => s.trim()).length;
    if (sentences > 1) bad(`${who}: tooltip has ${sentences} sentences: "${d}"`); else n++;
  }
  console.log(`✓ ${n} tooltips are one sentence`);
  await p.close();
}

// ---------- 3. the top bar stays one row ----------
{
  const p = await page(1024, 700);
  const n = await p.evaluate(() => LEVELS.length);
  for (let i = 0; i < n; i++) {
    const rows = await p.evaluate(i => {
      startLevel(i); document.getElementById("beginBtn").click(); S.paused = true; syncHud();
      const tops = [...document.querySelectorAll("#objectives > *")].map(e => Math.round(e.getBoundingClientRect().top));
      return new Set(tops).size;
    }, i);
    if (rows > 1) bad(`L${i + 1}: top bar objectives wrap onto ${rows} rows at 1024px`);
  }
  console.log(`✓ top bar checked on ${n} levels at 1024px`);
  await p.close();
}

// ---------- 4. every building places, every decree proclaims ----------
{
  const p = await page();
  const out = await p.evaluate(() => {
    const res = [];
    startLevel(0, "brief", makeSkirmish(777, true)); document.getElementById("beginBtn").click(); S.paused = true;
    Object.assign(S, { timber: 9999, stone: 9999, rice: 9999, gold: 9999 });
    const c = S.citadel;
    for (const [id, def] of Object.entries(BUILDINGS)) {
      if (!def.cat) continue; // citadel, upgrades only
      if (!S.unlocked.buildings.has(id)) { res.push(`building ${id} is never unlocked in skirmish`); continue; }
      let ok = false;
      S.tool = id;
      for (let r = 2; r < 14 && !ok; r++) for (let y = c.gy - r; y <= c.gy + r && !ok; y++) for (let x = c.gx - r; x <= c.gx + r && !ok; x++) ok = tryBuild(x, y, true);
      S.tool = null;
      if (!ok) res.push(`building ${id} could not be placed anywhere near the citadel`);
    }
    refreshWorld();
    for (const [id, e] of Object.entries(EDICTS)) {
      S.season = e.once === "yala" ? "yala" : "maha";
      S.edictUsed = {}; S.edictEnd = {};
      const why = edictBlocked(id);
      if (why) { res.push(`decree ${id} blocked: ${why}`); continue; }
      proclaim(id);
      if (!edictOn(id)) res.push(`decree ${id} did not take effect`);
    }
    return res;
  });
  for (const r of out) bad(r);
  if (!out.length) console.log("✓ every building placed and every decree proclaimed");
  if (p.errors.length) bad(`placement: page errors ${[...new Set(p.errors)].join("; ")}`);
  await p.close();
}

// ---------- 5. sound ----------
{
  const p = await page();
  let src = fs.readFileSync(path.join(root, "audio.js"), "utf8").replace("return { init, play, update, kinds", "return { init, play, update, phrase, kinds");
  if (selftest) src = src.replace("vary = { pitch:", "vary = SAME; void { pitch:");
  const out = await p.evaluate(async src => {
    const res = [], take = async (fn, secs = 1) => {
      const ctx = new OfflineAudioContext(1, 22050 * secs, 22050), SND = new Function("audio", src + "\nreturn SOUND;")({ on: true, ctx });
      SND.init(); fn(SND);
      const d = (await ctx.startRendering()).getChannelData(0);
      let e = 0, z = 0; for (let i = 1; i < d.length; i++) { e += d[i] * d[i]; if ((d[i] > 0) !== (d[i - 1] > 0)) z++; }
      return `${Math.sqrt(e / d.length).toFixed(5)}/${z}`;
    };
    const kinds = new Function("audio", src + "\nreturn SOUND;")({ on: false }).kinds;
    for (const k of kinds) {
      const a = await take(S => S.play(k)), b = await take(S => S.play(k)), c = await take(S => S.play(k));
      if (a.startsWith("0.00000")) res.push(`sound ${k} renders silence`);
      else if (a === b && b === c) res.push(`sound ${k} is identical every time it plays`);
    }
    const m = await take(S => S.phrase(0.1, true), 8);
    if (m.startsWith("0.00000")) res.push("the music phrase renders silence");
    return { res, n: kinds.length };
  }, src);
  for (const r of out.res) bad(r);
  if (!out.res.length) console.log(`✓ ${out.n} sound effects render and vary; the music renders`);
  if (p.errors.length) bad(`sound: page errors ${[...new Set(p.errors)].join("; ")}`);
  await p.close();
}

await browser.close();
if (selftest) {
  const caught = problems.some(p => p.includes("dakkhina") && p.includes("dam")) && problems.some(p => p.includes("identical every time"));
  console.log(caught ? "\nselftest passed: the broken save and the unvaried sounds were caught" : "\nselftest FAILED: a planted fault went unnoticed");
  process.exit(caught ? 0 : 1);
}
console.log(problems.length ? `\n${problems.length} problem(s)` : "\nreview clean");
process.exit(problems.length ? 1 : 0);
