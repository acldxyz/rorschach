// Records a looping, muted sizzle reel of lp-analytics for use as a background video (e.g. behind a signup form).
//
//   node reel/record.js [--theme light|dark] [--out reel/out] [--fps 30]
//
// It drives the real app (index.html, sample data) in headless Chromium. The page's clock is virtual: each frame
// advances requestAnimationFrame / performance.now / Date.now by exactly 1/fps, so Chart.js animations come out
// smooth however slow the screenshots are. A "camera" (a CSS transform on <body>) frames one panel per scene;
// scenes are joined with crossfades and the last fades back into the first, so the file loops without a seam.
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT) and ffmpeg on PATH.
const { spawn, execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d };
const THEME = arg("theme", "light"), FPS = +arg("fps", 30), OUT = path.resolve(arg("out", path.join(__dirname, "out")));
const W = 1920, H = 1080, FADE = 0.7;  // seconds of crossfade between scenes
const APP = "file://" + path.resolve(__dirname, "..", "index.html");
const TMP = fs.mkdtempSync(path.join(require("os").tmpdir(), "reel-"));
const SUFFIX = THEME === "dark" ? "-dark" : "";

// Virtual clock, installed before any page script runs (Chart.js captures requestAnimationFrame at load).
const CLOCK = () => {
  let t = 0, id = 0, q = new Map();
  const D0 = Date.now();
  performance.now = () => t;
  Date.now = () => D0 + t;
  window.requestAnimationFrame = cb => (q.set(++id, cb), id);
  window.cancelAnimationFrame = i => q.delete(i);
  window.__advance = ms => { t += ms; const run = [...q.values()]; q = new Map(); run.forEach(cb => cb(t)) };
  // Chart canvases at 3x so they stay sharp when the camera zooms in.
  Object.defineProperty(window, "devicePixelRatio", { get: () => 3 });
};

// Helpers the scenes call inside the page.
const HELPERS = () => {
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  window.__ease = ease;
  // Document-space rect of the panel whose h2 reads `title` (or of a selector), measured with the camera off.
  window.__rect = (q, up = 0) => {
    const b = document.body, tf = b.style.transform; b.style.transform = "none";
    let el = q.startsWith("#") || q.startsWith(".") ? document.querySelector(q) : [...document.querySelectorAll("h2")].find(h => h.textContent.trim().startsWith(q))?.closest("section");
    for (let i = 0; i < up; i++) el = el.parentElement;
    const r = el.getBoundingClientRect(); b.style.transform = tf;
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  };
  window.__camera = (cx, cy, s, W, H) => { document.body.style.transform = `translate(${W / 2 - s * cx}px, ${H / 2 - s * cy}px) scale(${s})` };
  // Replay a chart's entry animation, bars staggered by index.
  window.__replay = (ids, dur = 1400, stagger = 45) => ids.forEach(id => {
    const ch = Chart.getChart(id); if (!ch) return;
    ch.options.animation.duration = dur; ch.options.animation.easing = "easeOutQuart";
    ch.options.animation.delay = c => c.type === "data" && c.mode === "default" ? c.dataIndex * stagger + c.datasetIndex * stagger * 2 : 0;
    ch.reset(); ch.update();
  });
  // Count figures up from zero: p in [0, 1]. Remembers each element's real text.
  window.__count = (sel, p) => document.querySelectorAll(sel).forEach(el => {
    if (el.__orig == null) el.__orig = el.textContent;
    const m = el.__orig.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/); if (!m) return;
    const raw = m[2].replace(/,/g, ""), dec = (raw.split(".")[1] || "").length, v = parseFloat(raw) * ease(Math.min(1, Math.max(0, p)));
    const s = m[2].includes(",") ? v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v.toFixed(dec);
    el.textContent = m[1] + s + m[3];
  });
  // Left-to-right wipe on a chart, for line charts that should "draw".
  window.__wipe = (id, p) => { const el = document.getElementById(id).parentElement; el.style.clipPath = p >= 1 ? "" : `inset(-20px ${100 - 100 * ease(p)}% -20px -20px)` };
  window.__canvasBox = id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } };
};

const clamp01 = x => Math.min(1, Math.max(0, x));
const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
// Fit a document rect into the frame with a margin, then scale by `zoom` around its centre (or a focus point).
const fit = (r, { zoom = 1, pad = 48, fx = .5, fy = .5 } = {}) => {
  const s = Math.min(W / (r.w + 2 * pad), H / (r.h + 2 * pad)) * zoom;
  return { cx: r.x + r.w * fx, cy: r.y + r.h * fy, s };
};
const lerpCam = (a, b, p) => ({ cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * p) });

// Each scene: setup(page) once, then frame(page, t) every frame; the camera eases from `from` to `to` over its length.
const SCENES = [
  { name: "summary", dur: 4.2, tab: "record",
    cam: async p => { const r = await p.evaluate(() => __rect("Net performance summary")); return [fit(r, { zoom: 1.15 }), fit(r, { zoom: 1.34, fx: .4 })] },
    // Figures only: not the fund name, vintage or quartile pills.
    frame: (p, t) => p.evaluate(t => __count("#out section:first-of-type td:not(:first-child):not(:nth-child(2)):not(:last-child)", (t - .2) / 1.6), t) },
  { name: "relative", dur: 4.4, tab: "record",
    cam: async p => { const r = await p.evaluate(() => __rect("Net relative performance")); return [fit(r, { zoom: 1.28, fx: .36 }), fit(r, { zoom: 1.12, fx: .6 })] },
    setup: p => p.evaluate(() => __replay(["cTvpi", "cIrr", "cDpi"], 1500, 60)) },
  { name: "cashflows", dur: 5.4, tab: "record",
    cam: async p => { const r = await p.evaluate(() => __rect("J-curve", 1)); return [fit(r, { zoom: 1.1 }), fit(r, { zoom: 1.32, fx: .4, fy: .5 })] },
    setup: p => p.evaluate(() => { __wipe("cJ", 0); __replay(["cAnnual"], 1300, 55) }),
    frame: async (p, t) => {
      await p.evaluate(t => __wipe("cJ", t / 2.2), t);
      if (t > 2.6 && t < 4.9) {  // sweep the pointer along the J-curve so its tooltip rides the lines
        const b = await p.evaluate(() => __canvasBox("cJ"));
        await p.mouse.move(b.x + b.w * (.12 + .78 * easeIO((t - 2.6) / 2.3)), b.y + b.h * .45);
      } else if (t >= 4.9) await p.mouse.move(5, 5);
    } },
  { name: "concentration", dur: 4.4, tab: "record",
    cam: async p => { const r = await p.evaluate(() => __rect("Return concentration")); return [fit(r, { zoom: 1.12, fy: .48 }), fit(r, { zoom: 1.28, fx: .58, fy: .56 })] },
    setup: p => p.evaluate(() => { __wipe("cConc", 0); __replay(["cBuckets", "cFollow"], 1400, 60) }),
    frame: (p, t) => p.evaluate(t => { __wipe("cConc", t / 2); __count("#concKpis b", (t - .1) / 1.4) }, t) },
  { name: "scenarios", dur: 5.2, tab: "scen",
    cam: async p => { const r = await p.evaluate(() => __rect("Scenarios")); return [fit(r, { zoom: 1.2 }), fit(r, { zoom: 1.38, fx: .4, fy: .58 })] },
    setup: p => p.evaluate(() => { __count("#out .kpis b", 0) }),
    // Count the Base figures up, then flip to Upside and Downside: each click re-renders with the real model.
    frame: async (p, t) => {
      const click = async (n, at) => { if (Math.abs(t - at) < .5 / FPS) await p.evaluate(n => document.querySelector(`[data-scen]:nth-of-type(${n})`).click(), n) };
      await click(3, 2.1); await click(2, 3.7);
      if (t < 2) await p.evaluate(t => __count("#out .kpis b", (t - .1) / 1.5), t);
    } },
  { name: "projection", dur: 4.8, tab: "scen",
    cam: async p => { const r = await p.evaluate(() => __rect("LP cash flows", 1)); return [fit(r, { zoom: 1.28, fx: .36 }), fit(r, { zoom: 1.1, fx: .5 })] },
    setup: p => p.evaluate(() => { document.querySelector("[data-scen]:nth-of-type(1)").click(); __replay(["cScFlows", "cScCo"], 1500, 50) }),
    frame: async (p, t) => { if (Math.abs(t - 2.6) < .5 / FPS) await p.evaluate(() => { window.__dur = 900; document.querySelector("[data-scen]:nth-of-type(3)").click() }) } },
  { name: "growth", dur: 4.6, tab: "record",
    cam: async p => { const r = await p.evaluate(() => __rect("Growth vs profitability")); return [fit(r, { zoom: 1.3, fx: .45, fy: .56 }), fit(r, { zoom: 1.08 })] },
    setup: p => p.evaluate(() => __replay(["cGp"], 1800, 8)) },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, colorScheme: THEME, reducedMotion: "no-preference" });
  if (process.env.REEL_VENDOR) await require("./vendor-route")(ctx);
  await ctx.addInitScript(CLOCK);
  const page = await ctx.newPage();
  page.on("pageerror", e => console.error("page error:", e.message));
  await page.goto(APP);
  await page.waitForFunction(() => window.Chart && document.querySelector("#cJ"));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(HELPERS);
  await page.evaluate(() => {
    // Slower chart entries than the app's 350ms, for re-renders the scenes trigger (scenario clicks).
    window.__dur = 1200;
    Object.defineProperty(Chart.defaults.animation, "duration", { get: () => window.__dur, set() {}, configurable: true });
    document.documentElement.style.overflow = "hidden";
    Object.assign(document.body.style, { transformOrigin: "0 0", willChange: "transform" });
  });
  await page.addStyleTag({ content: ".dl, .dl-row, .exports { visibility: hidden }" });  // download chrome is noise in a reel

  const files = [];
  for (const [i, sc] of SCENES.entries()) {
    await page.evaluate(v => { document.body.style.transform = "none"; scrollTo(0, 0); document.getElementById("tab-" + v).click() }, sc.tab);
    await page.evaluate(() => { window.__dur = 1200; __advance(16) });
    await page.mouse.move(5, 5);
    const [a, b] = await sc.cam(page);
    if (sc.setup) await sc.setup(page);
    const file = path.join(TMP, `s${i}.mp4`); files.push(file);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-crf", "12", "-preset", "veryfast", "-pix_fmt", "yuv420p", file], { stdio: ["pipe", "inherit", "inherit"] });
    const n = Math.round(sc.dur * FPS);
    for (let f = 0; f < n; f++) {
      const t = f / FPS, c = lerpCam(a, b, easeIO(clamp01(t / sc.dur)));
      await page.evaluate(([c, W, H]) => __camera(c.cx, c.cy, c.s, W, H), [c, W, H]);
      if (sc.frame) await sc.frame(page, t);
      const buf = await page.screenshot({ type: "jpeg", quality: 94, scale: "css" });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      await page.evaluate(ms => __advance(ms), 1000 / FPS);
    }
    ff.stdin.end(); await new Promise(r => ff.on("close", r));
    console.log(`scene ${sc.name}: ${n} frames`);
  }
  await browser.close();

  // Chain S0..Sn, S0 with crossfades, then keep [FADE, start of the closing S0 + FADE): its last frame runs into its first.
  const durs = SCENES.map(s => Math.round(s.dur * FPS) / FPS), inputs = [...files, files[0]], all = [...durs, durs[0]];
  let filt = "", prev = "[0:v]", acc = 0;
  for (let k = 1; k < inputs.length; k++) {
    acc += all[k - 1] - FADE;
    const lbl = k === inputs.length - 1 ? "[chain]" : `[x${k}]`;
    filt += `${prev}[${k}:v]xfade=transition=fade:duration=${FADE}:offset=${acc.toFixed(4)}${lbl};`;
    prev = lbl;
  }
  const len = durs.reduce((x, y) => x + y, 0) - durs.length * FADE;
  filt += `[chain]trim=start=${FADE}:duration=${len.toFixed(4)},setpts=PTS-STARTPTS[v]`;
  const master = path.join(TMP, "master.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs.flatMap(f => ["-i", f]), "-filter_complex", filt, "-map", "[v]", "-c:v", "libx264", "-crf", "10", "-preset", "veryfast", "-pix_fmt", "yuv420p", master], { stdio: "inherit" });

  // Delivery files: no audio track, faststart so playback begins before the download finishes, a keyframe a second.
  const o = n => path.join(OUT, n), ff = a => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", master, ...a], { stdio: "inherit" });
  const g = ["-g", String(FPS), "-an"];
  ff(["-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", ...g, o(`reel${SUFFIX}.mp4`)]);
  ff(["-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", ...g, o(`reel${SUFFIX}-720.mp4`)]);
  ff(["-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", ...g, o(`reel${SUFFIX}.webm`)]);
  ff(["-ss", "1.5", "-frames:v", "1", "-q:v", "3", o(`poster${SUFFIX}.jpg`)]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`${len.toFixed(1)}s loop → ${OUT}`);
}
main().catch(e => { console.error(e); process.exit(1) });
