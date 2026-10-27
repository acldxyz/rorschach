// ---------- brand ----------
// Shared by both modules: build.py inlines this file (with brand.css and the brand.html row) into each page.
// The user's own colours and font. The first colour becomes the accent, the second the base of the
// performance page's quartile scale (kept apart so the fund marker stands out against its benchmark
// bands), and the list in order becomes the chart series (topped up to eight with tints and shades).
// Everything is written as CSS custom properties, so the page, the charts (which read them through
// css()) and the HTML report all follow. Kept in this browser under one key, so both modules served
// from the same place share it.
// Page interface: call initBrand({ onChange, second }) once the page's render code exists. onChange()
// runs after every change (re-render the charts, which bake colours in when drawn); second describes
// the second colour's extra role in the note. The page reads brand.cur (for its workspace file) and
// brand.fontHref (a Google Fonts stylesheet to link from its HTML report), and may call applyBrand/showBrand.
const brand = { cur: {}, fontHref: null, opts: {} };
const brandStore = { load() { try { return JSON.parse(localStorage.getItem("brand")) || {} } catch { return {} } }, save(v) { try { localStorage.setItem("brand", JSON.stringify(v)) } catch {} } };
const LIGHT = { panel: "#ffffff", ink: "#16201e" }, DARK = { panel: "#192120", ink: "#eef2f0" };
// Any CSS colour (hex with or without #, rgb(), hsl(), a name) to #rrggbb, or null.
function toHex(s) {
  const t = /^[0-9a-f]{6}$|^[0-9a-f]{3}$/i.test(s) ? "#" + s : s, x = document.createElement("canvas").getContext("2d");
  x.fillStyle = "#000001"; x.fillStyle = t; const a = x.fillStyle; x.fillStyle = "#000002"; x.fillStyle = t;
  return a === x.fillStyle && a.startsWith("#") ? a : null;
}
const rgbOf = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => "#" + rgbOf(a).map((v, i) => Math.round(v + (rgbOf(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
const lum = h => { const [r, g, b] = rgbOf(h).map(v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05) };
// Text on a filled pill: whichever of panel or ink reads better.
const onFill = (c, T) => contrast(c, T.panel) >= contrast(c, T.ink) ? T.panel : T.ink;
// Nudge a colour toward the ink until it reads as text on the panel.
function readable(c, T) { let o = c; for (let t = .1; contrast(o, T.panel) < 3 && t <= 1; t += .1) o = mix(c, T.ink, t); return o }
function parseColors(text) {
  const bad = [], out = [];
  for (const tok of String(text).match(/rgba?\([^)]*\)|hsla?\([^)]*\)|#?[0-9a-f]{6}\b|#[0-9a-f]{3}\b|[a-z]+/gi) || []) { const h = toHex(tok.trim()); h ? out.push(h) : bad.push(tok) }
  return { colors: [...new Set(out)].slice(0, 8), bad };
}
// The --q quartile tokens only mean something on the performance page; elsewhere they go unused.
function brandVars(colors, T, dark) {
  const c = colors, a = c[0], qb = c[1] || c[0], v = {};
  const extra = [...c.map(x => mix(x, "#ffffff", .45)), ...c.map(x => mix(x, "#000000", .35))];
  [...c, ...extra].slice(0, 8).forEach((x, i) => v[`--s${i + 1}`] = x);
  v["--accent"] = readable(a, T); v["--accent-soft"] = mix(a, T.panel, dark ? .8 : .88);
  // Quartiles run strongest to faintest against the panel, as the default scale does in each theme.
  const q = dark ? [mix(qb, "#ffffff", .45), qb, mix(qb, T.panel, .45), mix(qb, T.panel, .72)] : [qb, mix(qb, "#ffffff", .35), mix(qb, "#ffffff", .62), mix(qb, "#ffffff", .85)];
  q.forEach((x, i) => { v[`--q${i + 1}`] = x; v[`--q${i + 1}-ink`] = onFill(x, T) });
  return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join("; ");
}
const fontStack = f => `"${f.replace(/["\\]/g, "")}", system-ui, "Segoe UI", sans-serif`;
// Tell whether a font can draw on this machine: its text measures differently from both fallbacks.
function fontAvailable(f) {
  const x = document.createElement("canvas").getContext("2d"), w = fam => { x.font = `72px ${fam}`; return x.measureText("mmmmmmmmmlli WQ@#0123").width };
  return ["monospace", "serif"].some(fb => w(`"${f.replace(/["\\]/g, "")}", ${fb}`) !== w(fb));
}
// Google Fonts answers a request for weights a family lacks with an error, so try the useful sets in
// turn. A stylesheet link (unlike fetch) reports that error and is allowed wherever the page's own fonts are.
async function googleFont(f) {
  const fam = encodeURIComponent(f).replace(/%20/g, "+");
  for (const w of [":wght@400;500;600", ":wght@400;600", ":wght@400;700", ""]) {
    const link = Object.assign(document.createElement("link"), { id: "brandFontLink", rel: "stylesheet", href: `https://fonts.googleapis.com/css2?family=${fam}${w}&display=swap` });
    const ok = await new Promise(r => { link.onload = () => r(true); link.onerror = () => r(false); setTimeout(() => r(false), 5000); document.head.append(link) });
    if (ok) return link; link.remove();
  }
  return null;
}
async function applyBrand(b, { save = true, lead } = {}) {
  const bad = b.bad || []; brand.cur = b = { colors: b.colors || [], font: (b.font || "").trim() };
  if (save) brandStore.save(b);
  const note = document.getElementById("brandNote"), msgs = [], warn = [];
  let el = document.getElementById("brandCss"); if (!el) { el = document.createElement("style"); el.id = "brandCss"; document.head.append(el) }
  let rules = "";
  if (b.colors.length) {
    const L = brandVars(b.colors, LIGHT, false), D = brandVars(b.colors, DARK, true);
    // Doubled :root outranks the theme rules above whichever way the theme was chosen.
    rules += `:root:root:root { ${L} }\n@media (prefers-color-scheme: dark) { :root:root:not([data-theme="light"]) { ${D} } }\n:root:root[data-theme="dark"] { ${D} }\n`;
  }
  document.getElementById("brandSwatches").innerHTML = b.colors.map(c => `<span style="background:${c}" title="${c}"></span>`).join("");
  document.getElementById("brandFontLink")?.remove(); brand.fontHref = null;
  if (b.font) {
    rules += `:root:root:root:root { --display: ${fontStack(b.font)}; --body: ${fontStack(b.font)}; --mono: ${fontStack(b.font)} }\n`;
    if (fontAvailable(b.font)) msgs.push(`${b.font} is installed on this computer.`);
    else {
      const link = await googleFont(b.font);
      if (link) try { await document.fonts.load(`16px ${fontStack(b.font)}`) } catch {}
      if (brand.cur !== b) { link?.remove(); return }  // superseded while loading
      if (link && fontAvailable(b.font)) { brand.fontHref = link.href; msgs.push(`${b.font} loaded from Google Fonts.`) }
      else { document.getElementById("brandFontLink")?.remove(); warn.push(`${b.font} is not installed on this computer and is not on Google Fonts, so text shows in the fallback font. Check the spelling, or install the font.`) }
    }
  }
  el.textContent = rules;
  const n = b.colors.length, second = brand.opts.second;
  if (n) msgs.push(`${n} colour${n > 1 ? "s" : ""}: the first is the accent${n > 1 && second ? `, the second ${second}` : ""}${n < 8 ? "; charts with more series than colours use tints and shades of these" : ""}.`);
  if (lead) msgs.unshift(lead);
  if (bad.length) warn.push(`Could not read ${bad.map(t => `"${t}"`).join(", ")} as a colour.`);
  note.textContent = [...warn, ...msgs].join(" "); note.className = "note" + (warn.length ? " warn" : "");
  brand.opts.onChange?.();
}
function brandFromInputs() {
  const { colors, bad } = parseColors(document.getElementById("brandColors").value);
  applyBrand({ colors, bad, font: document.getElementById("brandFont").value });
}
function showBrand(b) {
  document.getElementById("brandColors").value = (b.colors || []).join(", ");
  document.getElementById("brandFont").value = b.font || "";
}
// ---------- colour template files ----------
// Firms keep their palette in an Office theme: a .potx/.pptx, .dotx/.docx, .xltx/.xlsx or .thmx is a ZIP
// holding DrawingML theme XML. Its accent1-6 are the colours Office itself gives chart series, in order, so
// they map straight onto ours. dk1/lt1 are text and background, and dk2/lt2 are usually a near-black and a
// near-white for text, so they are left out; a firm whose main colour sits in dk2 can type it first.
const DML = "http://schemas.openxmlformats.org/drawingml/2006/main";
const xmlDoc = s => { const d = new DOMParser().parseFromString(s, "application/xml"); return d.getElementsByTagName("parsererror").length ? null : d };
const utf8 = b => new TextDecoder().decode(b instanceof Uint8Array ? b : new Uint8Array(b));
// SheetJS, already on both pages for spreadsheets, reads (and inflates) ZIPs through its CFB module.
function unzip(bytes) {
  const c = XLSX.CFB.read(bytes, { type: "array" }), files = {};
  c.FileIndex.forEach((e, i) => { if (e.type === 2 && e.content) files[c.FullPaths[i].replace(/^[^/]*\//, "")] = e.content });
  return files;
}
function pickTheme(files) {
  // PowerPoint also keeps themes for the notes and handout masters; the slide master's is the deck's.
  const rels = files["ppt/slideMasters/_rels/slideMaster1.xml.rels"], d = rels && xmlDoc(utf8(rels));
  for (const r of d ? d.getElementsByTagName("Relationship") : []) {
    if (!/\/theme$/.test(r.getAttribute("Type") || "")) continue;
    const p = decodeURI(new URL(r.getAttribute("Target"), "http://x/ppt/slideMasters/").pathname.slice(1));
    if (files[p]) return p;
  }
  const num = p => +p.match(/(\d+)\.xml$/)[1];
  return Object.keys(files).filter(p => /^(ppt|word|xl|theme)\/theme\/theme\d+\.xml$/.test(p)).sort((a, b) => num(a) - num(b))[0];
}
function readTheme(xml) {
  const d = xmlDoc(xml), one = (el, tag) => el?.getElementsByTagNameNS(DML, tag)[0], colors = [];
  for (let i = 1; i <= 6; i++) {
    const c = one(one(d, "clrScheme"), `accent${i}`)?.firstElementChild;
    const v = c && (c.localName === "srgbClr" ? c.getAttribute("val") : c.localName === "sysClr" ? c.getAttribute("lastClr") : null);
    if (/^[0-9a-f]{6}$/i.test(v || "")) colors.push("#" + v.toLowerCase());
  }
  // "+mn-lt" and the like point back into the theme, so they name no font of their own.
  const face = tag => { const t = one(one(one(d, "fontScheme"), tag), "latin")?.getAttribute("typeface")?.trim(); return t && !t.startsWith("+") ? t : "" };
  return { colors: [...new Set(colors)], font: face("minorFont"), heading: face("majorFont") };
}
// A brand guide exported as text, CSV or JSON. Where it has colour codes, words are ignored, as
// "Navy #0B3D91" would otherwise add CSS navy too. A line like "font: Inter" (or a JSON "font" key) fills the font.
function readColorText(text) {
  const fm = /(?:^|[{,])\s*["']?(?:font|typeface|font[-_ ]?family)["']?\s*[:=]\s*["']?([^"',;\n}]+)/im.exec(text);
  if (fm) text = text.replace(fm[0], "");
  const codes = text.match(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b[0-9a-f]{6}\b/gi);
  return { colors: parseColors(codes ? codes.join(" ") : text).colors, font: fm ? fm[1].trim() : "" };
}
async function readTemplate(file) {
  if (file.size > 20e6) throw `${file.name} is over 20 MB, too big for a colour template.`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {  // no "PK": not a ZIP
    if (/\.(potx|pptx|thmx|dotx|docx|xltx|xlsx)$/i.test(file.name)) throw `${file.name} is not a ZIP package, so it can't be read as an Office file. Open it in PowerPoint, Word or Excel and save it again.`;
    // Binary (an old .ppt, an image) would throw up stray hex-like runs, so only text is read for codes.
    if (bytes.subarray(0, 4096).includes(0)) throw `${file.name} is neither an Office template nor a text list of colours.`;
    const r = readColorText(utf8(bytes));
    if (!r.colors.length) throw `Found no colours in ${file.name}. Use an Office template or theme, or a list of colour codes such as #0B3D91.`;
    return r;
  }
  let files; try { files = unzip(bytes) } catch { throw `Could not open ${file.name}: the file is damaged or encrypted.` }
  const p = pickTheme(files);
  if (!p) throw `${file.name} has no Office theme inside. Use a PowerPoint, Word or Excel template or document, or a .thmx theme.`;
  const r = readTheme(utf8(files[p]));
  if (!r.colors.length) throw `The theme in ${file.name} has no accent colours.`;
  if (!r.font) r.font = r.heading;
  return r;
}
// Same as typing the values and pressing Enter, with what was read leading the note.
async function brandFromFile(file) {
  const note = document.getElementById("brandNote");
  let r; try { r = await readTemplate(file) } catch (e) { note.textContent = typeof e === "string" ? e : `Could not read ${file.name}.`; note.className = "note warn"; return }
  const n = r.colors.length, font = r.font || document.getElementById("brandFont").value.trim();  // a bare colour list keeps the font
  const lead = `Read ${n} colour${n > 1 ? "s" : ""}${r.font ? ` and the font ${r.font}${r.heading && r.heading !== r.font ? ` (headings: ${r.heading})` : ""}` : ""} from ${file.name}.`;
  showBrand({ colors: r.colors, font }); note.textContent = lead; note.className = "note";
  await applyBrand({ colors: r.colors, font }, { lead });
}
function initBrand(opts = {}) {
  brand.opts = opts;
  ["brandColors", "brandFont"].forEach(id => { const i = document.getElementById(id); i.addEventListener("change", brandFromInputs); i.addEventListener("keydown", e => { if (e.key === "Enter") brandFromInputs() }) });
  const fi = document.getElementById("brandFile");
  document.getElementById("brandFileBtn").addEventListener("click", () => fi.click());
  // Cleared after each read so choosing the same file again still fires change.
  fi.addEventListener("change", async () => { const f = fi.files[0]; fi.value = ""; if (f) await brandFromFile(f) });
  document.getElementById("brandReset").addEventListener("click", () => { showBrand({}); applyBrand({}) });
  brand.cur = brandStore.load(); showBrand(brand.cur); if (brand.cur.colors?.length || brand.cur.font) applyBrand(brand.cur, { save: false });
}