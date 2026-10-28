// ---------- data view ----------
// Shared by both modules: build.py inlines this file (with dataview.css) into each page.
// The Data view lists what each upload was identified as, and lets the viewer audit any field: which
// file, sheet, column and header it came from, how it was matched, what the app did to it, and the
// source cells next to the values the app uses. Provenance is captured when a sheet loads:
//   P = { file, sheet, via, headerRow, fields: [{ key, i, col, header, how, conf, value }], ignored: [{ col, header }],
//         rows: [{ r, v: { key: raw }, out: [[n, f]], skip }], grid: { r0, c0, rows, cut }, ws: { file, savedAt }, noSource }
// where r is the sheet row (1-based, as Excel shows it), out lists the normalised rows (state[kind][n])
// the source row became (f: the field that made it, where one row makes several), and skip says why a
// row was dropped. via is upload, workbook, sample or workspace. grid is the whole sheet as read (title,
// blank and ignored cells too), so the pane can draw it: rows[0] is sheet row r0, cell [0] is column c0.
// Page interface: initDataView({ box, kinds, fields, prov, count, used, transforms, derived }), where
//   kinds          { kind: { label, off } }: off says what loading an optional kind adds (required kinds say so too);
//   fields(k)      [{ key, label }] the kind accepts;  prov(k) its P, or null when nothing is loaded;
//   count(k)       rows loaded;  used(k, key, out) the value the app uses for that row, as text;
//   transforms(k, key, P) [plain sentences];  derived(k, P) [{ label, text }] for values the app works out;
//   cats(k, P)     (optional) row categories: { list: [[id, label, mark]], of(row) id or null } for a P row.
// The page calls dv.render() from its own render(), dv.summary() for the HTML report and dv.sources() for the Excel sheet.
const dv = { o: null, open: null };
// A1 column letters: 0 -> A, 25 -> Z, 26 -> AA.
const dvCol = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s };
const dvEsc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dvIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Raw cells kept JSON-safe (they travel in the workspace): Excel dates as YYYY-MM-DD.
const dvRaw = v => v instanceof Date ? (isNaN(v) ? "" : dvIso(v)) : v ?? "";
// Drop blank rows but keep each kept row's sheet row number and the sheet's first column, so cells can be named later.
// The unfiltered rows ride along (full, from sheet row r0) for the source grid.
function dvRows(all, rowNo, col0 = 0) {
  const n = [], out = all.filter((r, i) => r.some(x => String(x ?? "").trim() !== "") && n.push(rowNo(i)));
  out.rowNo = n; out.col0 = col0; out.full = all; out.r0 = rowNo(0); return out;
}
// The sheet as kept for the pane: raw cells JSON-safe, fully empty trailing rows and cells trimmed, capped
// so a huge export doesn't bloat the workspace (cut then gives the sheet's real size and what was kept).
// Mapped columns (up to need) are always kept, however far right they sit.
const DV_KEEP = { rows: 5000, cols: 60 };
function dvGrid(aoa, need = 0) {
  const all = aoa.full; if (!all) return null;
  const wid = r => { let w = r.length; while (w && String(r[w - 1] ?? "").trim() === "") w--; return w };
  let n = all.length; while (n && !wid(all[n - 1])) n--;
  const nc = all.slice(0, n).reduce((m, r) => Math.max(m, wid(r)), 0), kr = Math.min(n, DV_KEEP.rows), kc = Math.min(nc, Math.max(DV_KEEP.cols, need));
  const rows = all.slice(0, kr).map(r => r.slice(0, Math.min(wid(r), kc)).map(dvRaw));
  return { r0: aoa.r0 ?? 1, c0: aoa.col0 || 0, rows, ...(kr < n || kc < nc ? { cut: { rows: n, cols: nc, kept: [kr, kc] } } : {}) };
}
// Filter that remembers which input rows survived (idx) and why the rest did not (drop), for the audit.
function dvKeep(rows, pred, why) {
  const idx = [], drop = [], out = rows.filter((r, i) => pred(r) ? idx.push(i) : (drop.push([i, why(r)]), false));
  out.idx = idx; out.drop = drop; return out;
}
// Provenance of one sheet as matched: cols[i] = { field, how, conf } for each column of the header row.
function dvCapture({ file, sheet, via, aoa, h, cols }) {
  const rn = j => aoa.rowNo?.[j] ?? j + 1, c0 = aoa.col0 || 0, head = aoa[h] || [], data = aoa.slice(h + 1);
  const width = data.reduce((w, r) => Math.max(w, r.length), Math.max(head.length, cols.length)), fields = [], ignored = [];
  for (let i = 0; i < width; i++) { const c = cols[i] || {}, hdr = String(head[i] ?? "").trim();
    if (c.field) fields.push({ key: c.field, i, col: dvCol(c0 + i), header: hdr, how: c.how || "", conf: c.conf || "", dates: data.some(r => r[i] instanceof Date) });
    else if (hdr || data.some(r => String(r[i] ?? "").trim())) ignored.push({ col: dvCol(c0 + i), header: hdr }) }
  const rows = data.map((r, j) => ({ r: rn(h + 1 + j), v: Object.fromEntries(fields.map(f => [f.key, dvRaw(r[f.i])])), out: [], skip: null }));
  return { file, sheet: sheet || null, via, headerRow: rn(h), fields, ignored, rows, grid: dvGrid(aoa, fields.reduce((m, f) => Math.max(m, f.i + 1), 0)) };
}
// Rows that arrive already in the app's own columns, with no sheet behind them (an old workspace).
function dvFromRows({ file, savedAt, rows, keys }) {
  const have = keys.filter(k => rows.some(r => k in r));
  return { file: null, sheet: null, via: "workspace", ws: { file, savedAt }, noSource: true, headerRow: null, ignored: [],
    fields: have.map(k => ({ key: k, i: -1, col: null, header: k, how: "workspace" })), rows: rows.map((o, j) => ({ r: j + 1, v: Object.fromEntries(have.map(k => [k, dvRaw(o[k])])), out: [], skip: null })) };
}
// After a normaliser ran (its output from dvKeep): src[i] = { j, f } names the source row of input row i (identity when absent).
function dvFill(P, src, norm) {
  P.rows.forEach(r => { r.out = []; if (!r.pre) r.skip = null });
  norm.idx.forEach((i, n) => { const s = src ? src[i] : { j: i }; P.rows[s.j]?.out.push([n, s.f || null]) });
  norm.drop.forEach(([i, why]) => { const s = src ? src[i] : { j: i }, r = P.rows[s.j]; if (r && !r.out.length) r.skip = why });
  return P;
}
function initDataView(opts) {
  dv.o = opts;
  opts.box.addEventListener("click", e => { const td = e.target.closest("#dvGrid td[data-r]"); if (td) return dvAct(+td.dataset.r, +td.dataset.c);
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dvk) dvOpen(b.dataset.dvk, b.dataset.dvf);
    else if (b.dataset.dvkf) dvSwitch(b.dataset.dvkf);
    else if (b.id === "dvClose") dvClose();
    else if (b.id === "dvUp" || b.id === "dvDown") dvMore(b.id === "dvUp");
    else if (b.id === "dvAll") { dv.open.all = !dv.open.all; dvPane(); opts.box.querySelector("#dvAll")?.focus() } });
  opts.box.addEventListener("submit", e => { if (e.target.id === "dvGoF") { e.preventDefault(); dvGoRow() } });
  opts.box.addEventListener("keydown", e => { if (e.target.id === "dvGrid") dvKey(e); if (e.key === "Escape" && dv.open && e.target.closest("#dvPane")) dvClose() });
  return dv;
}
const dvRef = (P, r) => P.noSource ? `saved row ${r.r}` : P.sheet ? `${P.sheet}!${r.col}${r.r}` : `${P.file} row ${r.r}`;
const dvShow = v => v === "" || v == null ? "(blank)" : String(v);
const dvLabel = (k, key) => dv.o.fields(k).find(f => f.key === key)?.label || key;
const dvFieldTxt = (k, f) => f.col ? `${f.col} · ${f.header || "(no header)"}` : f.how === "typed" ? `typed “${f.value}”` : `${f.header} (saved)`;
function dvHow(k, f) {
  const lab = dvLabel(k, f.key);
  return { exact: `Exact name: the header “${f.header}” is the field's own name.`, synonym: `Recognised the header “${f.header}” as ${lab.toLowerCase()}.`,
    saved: "Remembered mapping, from an earlier file with these columns.", you: "Chosen by you in the column matcher.",
    claude: `Suggested by Claude${f.conf ? ` (${f.conf} confidence)` : ""}, then confirmed by you.`, typed: `Typed into the column matcher: every row is “${f.value}”.`,
    workspace: "From a saved workspace; the original column wasn't recorded." }[f.how] || "Matched when the file loaded.";
}
function dvStats(P) {
  const rows = P.rows, used = rows.filter(r => r.out.length).length, why = {};
  rows.forEach(r => { if (!r.out.length && r.skip) why[r.skip] = (why[r.skip] || 0) + 1 });
  return { read: rows.length, used, skipped: rows.length - used, why };
}
const dvWhy = why => Object.entries(why).map(([w, n]) => `${n} ${w.charAt(0).toLowerCase() + w.slice(1)}`).join(", ");
function dvSrcText(P) {
  if (!P) return "";
  if (P.noSource) return `Saved workspace (${P.ws.file}, saved ${P.ws.savedAt || "date unknown"})`;
  if (P.via === "sample") return `Sample data (${P.file})`;
  return `${P.file}${P.sheet ? ` › ${P.sheet}` : ""}, header row ${P.headerRow}`;
}
// One card per kind. live: buttons that open the audit pane; otherwise plain text for the report.
function dvCard(k, live) {
  const o = dv.o, K = o.kinds[k], P = o.prov(k), n = o.count(k);
  if (P === null || n == null) return `<article class="dv-card dv-off"><h3>${dvEsc(K.label)}</h3><p class="note">Not loaded. ${dvEsc(K.off)}</p></article>`;
  const S = P ? dvStats(P) : null, acc = o.fields(k), have = new Set((P?.fields || []).map(f => f.key)), D = P ? o.derived(k, P) : [];
  const fld = f => { const lab = dvEsc(dvLabel(k, f.key)), src = dvEsc(dvFieldTxt(k, f)), open = dv.open?.k === k && dv.open?.key === f.key;
    return `<li>${live ? `<button type="button" class="dv-f" data-dvk="${k}" data-dvf="${f.key}" aria-expanded="${open}" aria-controls="dvPane"${open ? ' aria-current="true"' : ""}><span class="dv-fl">${lab}</span> <span aria-hidden="true">←</span><span class="sr"> from </span> <span class="dv-fs">${src}</span></button>`
      : `<span class="dv-fl">${lab}</span> ← <span class="dv-fs">${src}</span>`}</li>` };
  const miss = acc.filter(f => !have.has(f.key));
  return `<article class="dv-card" aria-labelledby="dvH-${k}">
    <div class="dv-head"><h3 id="dvH-${k}">${dvEsc(K.label)}</h3><span class="dv-n">${n.toLocaleString("en-US")} rows</span></div>
    <p class="dv-src">${dvEsc(dvSrcText(P))}${P?.ws && !P.noSource ? `<span class="note"> · opened from ${dvEsc(P.ws.file)}, saved ${dvEsc(P.ws.savedAt || "")}</span>` : ""}</p>
    ${!P ? `<p class="note">The source details weren't saved, so fields can't be traced.</p>` : P.noSource ? `<p class="note warn-text">The source details weren't saved with this workspace, so columns and cells can't be traced. Fields below are the saved rows' own columns.</p>` : ""}
    ${S ? `<p class="dv-q">${S.read.toLocaleString("en-US")} rows read · ${S.used.toLocaleString("en-US")} used${S.skipped ? ` · <span class="warn-text">${S.skipped} skipped: ${dvEsc(dvWhy(S.why))}</span>` : ""}</p>` : ""}
    ${P?.fields.length ? `<h4>Identified fields</h4><ul class="dv-fields">${P.fields.map(fld).join("")}</ul>` : ""}
    ${D.length ? `<h4>Worked out by the app</h4><ul class="dv-der">${D.map(d => `<li><b>${dvEsc(d.label)}</b>: ${dvEsc(d.text)}</li>`).join("")}</ul>` : ""}
    ${P && miss.length ? `<p class="note"><b>Not in this file:</b> ${dvEsc(miss.map(f => f.label).join(", "))}</p>` : ""}
    ${P?.ignored.length ? `<p class="note"><b>Ignored columns:</b> ${dvEsc(P.ignored.map(c => `${c.col} · ${c.header || "(no header)"}`).join(", "))}</p>` : ""}
  </article>`;
}
dv.render = () => {
  const o = dv.o, ks = Object.keys(o.kinds), any = ks.some(k => o.prov(k) !== null && o.count(k) != null);
  dv.keep = dvKeepScroll();
  if (dv.open && !(o.prov(dv.open.k)?.fields.some(f => f.key === dv.open.key))) dv.open = null;
  // With nothing loaded the uploads come first: there is nothing to identify yet.
  o.box.hidden = !any;
  o.box.innerHTML = `<div class="panel-head"><h2 id="dvH" tabindex="-1">Identified data</h2>${any ? `<p class="note">Pick a field to see where it came from.</p>` : ""}</div>
    ${any ? `<div class="dv-grid${dv.open ? " open" : ""}"><div class="dv-cards">${ks.map(k => dvCard(k, true)).join("")}</div>
      <aside class="dv-pane" id="dvPane" tabindex="-1" aria-labelledby="dvPaneH"${dv.open ? "" : " hidden"}></aside></div>`
      : `<p class="note">Nothing loaded yet. Add files below, or load the sample data.</p>`}`;
  if (dv.open) dvPane();
};
dv.summary = () => { const o = dv.o; return `<section class="panel dv"><div class="panel-head"><h2>Identified data</h2></div><div class="dv-cards">${Object.keys(o.kinds).map(k => dvCard(k, false)).join("")}</div></section>` };
// One row per kind and field, for the Excel "Sources" sheet.
dv.sources = () => {
  const o = dv.o, rows = [["Data", "Field", "Source file", "Sheet", "Column", "Header", "Header row", "How matched", "Transform", "Rows read", "Rows used", "Rows skipped", "Why skipped"]];
  Object.keys(o.kinds).forEach(k => { const P = o.prov(k); if (!P || o.count(k) == null) return; const S = dvStats(P), tail = [S.read, S.used, S.skipped, dvWhy(S.why)];
    const file = P.noSource ? `Saved workspace (${P.ws.file})` : P.file;
    P.fields.forEach(f => rows.push([o.kinds[k].label, dvLabel(k, f.key), file, P.sheet || "", f.col || "", f.how === "typed" ? f.value : f.header, P.headerRow ?? "", dvHow(k, f), o.transforms(k, f.key, P).join(" "), ...tail]));
    o.derived(k, P).forEach(d => rows.push([o.kinds[k].label, d.label, file, P.sheet || "", "", "", "", "Worked out by the app", d.text, ...tail])) });
  return rows;
};
function dvOpen(k, key) { dv.open = dv.open?.k === k && dv.open?.key === key ? null : { k, key, all: false }; dv.render();
  if (dv.open) { const p = dv.o.box.querySelector("#dvPane"); p.scrollIntoView({ block: "nearest" }); p.focus({ preventScroll: true }) }
  else dv.o.box.querySelector(`[data-dvk="${k}"][data-dvf="${key}"]`)?.focus() }
function dvClose() { const x = dv.open; dv.open = null; dv.render(); if (x) dv.o.box.querySelector(`[data-dvk="${x.k}"][data-dvf="${x.key}"]`)?.focus() }
const DV_CAP = 500;
function dvPane() {
  const o = dv.o, S = dv.open, { k, key, all } = S, P = o.prov(k), f = P.fields.find(x => x.key === key), pane = o.box.querySelector("#dvPane"), lab = dvLabel(k, key);
  const keep = dv.keep || dvKeepScroll(); dv.keep = null;
  const rows = P.rows, used = rows.filter(r => r.out.length);
  // A sample: the first rows, plus the first skipped row for each reason and the first blank cell in this column, so odd rows show up.
  let pick = all ? rows.slice(0, DV_CAP) : used.slice(0, 8);
  if (!all) { const why = new Set(), odd = rows.filter(r => !r.out.length && !why.has(r.skip) && why.add(r.skip)).slice(0, 3);
    odd.push(rows.find(r => r.out.length && dvShow(r.v[key]) === "(blank)" && !pick.includes(r)));
    pick = [...new Set([...pick, ...odd.filter(Boolean)])].sort((a, b) => a.r - b.r) }
  const nSkip = pick.filter(r => !r.out.length).length, T = o.transforms(k, key, P), ref = r => dvRef(P, { col: f.col, r: r.r });
  const raw = r => f.how === "typed" ? `(typed) ${f.value}` : dvShow(r.v[key]);
  const M = dv.m = P.noSource ? null : dvModel(k, P);
  if (M) dvStart(M, S);
  pane.innerHTML = `<div class="panel-head"><h3 id="dvPaneH">${dvEsc(o.kinds[k].label)} · ${dvEsc(lab)}</h3><button type="button" id="dvClose" aria-label="Close the audit of ${dvEsc(lab)}">Close</button></div>
    ${dvSource(M, S, P)}
    <h4>Mapped from</h4>
    <dl class="dv-dl">${P.noSource ? `<dt>Source</dt><dd>${dvEsc(dvSrcText(P))}. The original file, sheet and column weren't saved.</dd>` : `<dt>File</dt><dd>${dvEsc(P.file)}</dd>${P.sheet ? `<dt>Sheet</dt><dd>${dvEsc(P.sheet)}</dd>` : ""}
      <dt>Column</dt><dd>${f.col ? `${f.col} · ${dvEsc(f.header || "(no header)")}` : "None: typed in"}</dd><dt>Header row</dt><dd>${P.headerRow}</dd>`}
      <dt>How matched</dt><dd>${dvEsc(dvHow(k, f))}</dd>${P.ws && !P.noSource ? `<dt>Opened from</dt><dd>${dvEsc(P.ws.file)}, saved ${dvEsc(P.ws.savedAt || "")}</dd>` : ""}</dl>
    <h4>Transform</h4>${T.length ? `<ul class="dv-tr">${T.map(t => `<li>${dvEsc(t)}</li>`).join("")}</ul>` : `<p class="note">Used as written.</p>`}
    <h4>${all ? "All rows" : "Sample"}</h4>
    <p class="note">${all ? (rows.length > DV_CAP ? `The first ${DV_CAP} of ${rows.length.toLocaleString("en-US")} rows.` : `All ${rows.length.toLocaleString("en-US")} rows.`) : `${pick.length} of ${rows.length.toLocaleString("en-US")} rows${nSkip ? `, including ${nSkip > 1 ? nSkip + " skipped rows" : "a skipped row"}` : ""}.`}</p>
    <div class="dv-tbl"><table class="dv-tab"><thead><tr><th scope="col">Cell</th><th scope="col">In the file</th><th scope="col">Used as</th></tr></thead><tbody>
    ${pick.map(r => `<tr${r.out.length ? "" : ' class="dv-skip"'}><td>${dvEsc(ref(r))}</td><td>${dvEsc(raw(r))}</td><td>${r.out.length ? dvEsc(o.used(k, key, r.out)) : `Skipped: ${dvEsc((r.skip || "not used").toLowerCase())}`}</td></tr>`).join("")}</tbody></table></div>
    ${rows.length > pick.length || all ? `<button type="button" id="dvAll" aria-expanded="${!!all}">${all ? "Show a sample" : `Show all ${Math.min(rows.length, DV_CAP).toLocaleString("en-US")} rows`}</button>` : ""}`;
  const gw = pane.querySelector("#dvGW"); if (!gw) return;
  // A fresh field, a moved window or a key pick shows the active cell; any other redraw keeps the scroll it had.
  if (S.jump) { S.jump = false; dvSee(pane.querySelector(".dv-act"), gw) }
  else if (keep) { [gw.scrollLeft, gw.scrollTop] = keep; if (keep[2]) pane.querySelector("#dvGrid").focus({ preventScroll: true }) }
}

// ---------- source grid ----------
// The pane draws the source sheet itself: column letters and sheet row numbers as Excel shows them, each
// mapped column tinted by the field it feeds and labelled (so colour is never the only cue), the header row,
// title rows above it, skipped rows and the page's row categories marked, and a key to all of it. Only a
// window of rows is drawn (DV_WIN, growing to DV_MAX with "Show earlier/later rows"), so a 5,000-row sheet stays quick.
// Tints: the first eight mapped columns take --s1..--s8 (the chart series, which a brand palette overrides),
// mixed into the panel at a low share (dataview.css), so --ink text keeps its contrast whatever the colours.
const DV_WIN = 60, DV_MAX = 240;
const dvColNo = s => [...s].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const dvTxt = v => v === true ? "TRUE" : v === false ? "FALSE" : String(v ?? "");
// A provenance saved before the sheet was kept: rebuild what it can from the mapped values, from the
// header row down; every other cell is a gap.
function dvReduced(P) {
  const fs = P.fields.filter(f => f.col); if (!fs.length || P.headerRow == null) return null;
  const c0 = dvColNo(fs[0].col) - fs[0].i, last = P.rows.reduce((m, x) => Math.max(m, x.r), P.headerRow);
  const rows = Array.from({ length: last - P.headerRow + 1 }, () => []), at = (r, col, v) => rows[r - P.headerRow][dvColNo(col) - c0] = v;
  fs.forEach(f => at(P.headerRow, f.col, f.header)); P.ignored.forEach(x => at(P.headerRow, x.col, x.header));
  P.rows.forEach(x => fs.forEach(f => at(x.r, f.col, x.v[f.key])));
  return { r0: P.headerRow, c0, rows, reduced: true };
}
// What the grid, key and readout need: col[c] = { f, t } for a mapped column (t: tint 1-8, 0 neutral) or { ig };
// by: P rows by sheet row; cats with their row counts; r0..r1 the sheet rows kept, c0 and nc the columns.
function dvModel(k, P) {
  const G = P.grid || dvReduced(P); if (!G) return null;
  const col = {}, by = new Map(P.rows.map(x => [x.r, x])), C = dv.o.cats?.(k, P), cat = new Map(), n = {};
  let t = 0;
  P.fields.filter(f => f.col).sort((a, b) => dvColNo(a.col) - dvColNo(b.col)).forEach(f => col[dvColNo(f.col)] = { f, t: ++t > 8 ? 0 : t });
  P.ignored.forEach(x => col[dvColNo(x.col)] ??= { ig: x });
  if (C) P.rows.forEach(x => { const id = x.out.length ? C.of(x) : null; if (id != null) { cat.set(x.r, id); n[id] = (n[id] || 0) + 1 } });
  const nc = Math.max(1, G.rows.reduce((m, r) => Math.max(m, r.length), 0), ...Object.entries(col).filter(([, x]) => x.f).map(([c]) => c - G.c0 + 1));
  return { k, P, G, col, by, cat, cats: C ? C.list.filter(([id]) => n[id]).map(([id, label, mark]) => ({ id, label, mark, n: n[id] })) : [],
    r0: G.r0, r1: G.r0 + Math.max(G.rows.length, 1) - 1, c0: G.c0, nc, cell: (r, c) => G.rows[r - G.r0]?.[c - G.c0] ?? "" };
}
const dvBlankRow = (M, r) => !(M.G.rows[r - M.r0] || []).some(v => dvTxt(v).trim() !== "");
function dvRowKind(M, r) {
  const h = M.P.headerRow, x = M.by.get(r);
  return r < h ? (dvBlankRow(M, r) ? "blank" : "title") : r === h ? "hdr" : !x ? "blank" : x.out.length ? "used" : "skip";
}
const dvSelCol = (M, key) => { const f = M.P.fields.find(x => x.key === key); return f?.col ? dvColNo(f.col) : null };
const dvClamp = (v, a, b) => Math.max(a, Math.min(b, v));
// First draw of a field: the window starts at the sheet's top when the title block is short, else just above
// the header row; the active cell is this field's first used value.
function dvStart(M, S) {
  if (S.s == null) { const h = M.P.headerRow ?? M.r0; S.s = dvClamp(h - M.r0 <= 10 ? M.r0 : h - 3, M.r0, M.r1); S.e = Math.min(M.r1, S.s + DV_WIN - 1) }
  if (!S.act) { S.act = [M.P.rows.find(x => x.out.length && x.r <= S.e)?.r ?? M.P.headerRow ?? M.r0, dvSelCol(M, S.key) ?? M.c0]; S.jump = true }
  S.act = [dvClamp(S.act[0], S.s, S.e), dvClamp(S.act[1], M.c0, M.c0 + M.nc - 1)];
}
const dvWhere = P => P.sheet ? `${P.sheet} sheet` : P.file;
function dvSource(M, S, P) {
  if (!M) return `<h4>Source</h4><p class="note">The original sheet wasn't saved with this workspace, so it can't be shown.</p>`;
  const { G } = M, sc = dvSelCol(M, S.key), cols = Array.from({ length: M.nc }, (_, j) => M.c0 + j), lab = f => dvLabel(M.k, f.key);
  const head = cols.map(c => { const x = M.col[c] || {}, L = dvCol(c);
    if (x.f) return `<th scope="col" role="columnheader" class="dv-ch dv-t${x.t}${c === sc ? " dv-sel" : ""}" title="${L}: ${dvEsc(lab(x.f))}"><span class="dv-chip dv-chm">${dvEsc(lab(x.f))}</span>${L}</th>`;
    return `<th scope="col" role="columnheader" class="dv-ch${x.ig ? " dv-igh" : ""}"${x.ig ? ` title="${L}: ignored"` : ""}><span class="dv-chip">${x.ig ? "Ignored" : ""}</span>${L}</th>` }).join("");
  const body = [];
  for (let r = S.s; r <= S.e; r++) {
    const kind = dvRowKind(M, r), x = M.by.get(r), cat = kind === "used" && M.cats.find(q => q.id === M.cat.get(r));
    const why = kind === "skip" ? `Skipped: ${(x.skip || "not used").toLowerCase()}` : kind === "title" ? "Title / notes, not read" : kind === "hdr" ? "Header row" : cat ? cat.label : "";
    const mark = kind === "skip" ? "!" : kind === "hdr" ? "H" : kind === "title" ? "T" : cat ? cat.mark : "";
    const cells = cols.map(c => { const cc = M.col[c] || {}, t = dvTxt(M.cell(r, c)), gap = G.reduced && kind !== "blank" && !cc.f && !(kind === "hdr" && cc.ig);
      const cls = [gap ? "dv-gap" : kind === "title" ? "" : cc.f ? `dv-m dv-t${cc.t}${c === sc ? " dv-sel" : ""}` : cc.ig ? "dv-ig" : "", r === S.act[0] && c === S.act[1] ? "dv-act" : ""].filter(Boolean).join(" ");
      return `<td role="gridcell" id="dvc-${r}-${c}" data-r="${r}" data-c="${c}"${cls ? ` class="${cls}"` : ""}${t.trim() ? ` title="${dvEsc(t)}"` : ""}>${dvEsc(t)}</td>` }).join("");
    body.push(`<tr role="row" aria-rowindex="${r - M.r0 + 2}" class="dv-${kind}"><th scope="row" role="rowheader" class="dv-rn"${why ? ` title="${dvEsc(why)}" aria-label="Row ${r}, ${dvEsc(why.charAt(0).toLowerCase() + why.slice(1))}"` : ""}>${r}${mark ? `<span class="dv-b${kind === "skip" ? " dv-bw" : ""}" aria-hidden="true">${dvEsc(mark)}</span>` : ""}</th>${cells}</tr>`);
  }
  const fit = M.r1 - M.r0 < DV_WIN, n = M.r1 - M.r0 + 1;
  return `<h4 id="dvSrcH">Source</h4>
    ${G.reduced ? `<p class="note warn-text">This workspace was saved before the full sheet was kept. Only the mapped columns are shown, from the header row down.</p>` : ""}
    ${G.cut ? `<p class="note">Only the first ${G.cut.kept[0].toLocaleString("en-US")} rows and ${G.cut.kept[1]} columns were kept; the sheet has ${G.cut.rows.toLocaleString("en-US")} rows and ${G.cut.cols} columns.</p>` : ""}
    <p class="note" id="dvGCap">${dvEsc(dvWhere(M.P))}: rows ${S.s}–${S.e}${S.s === M.r0 && S.e === M.r1 ? "" : ` of ${M.r0 === 1 ? "" : `${M.r0}–`}${M.r1.toLocaleString("en-US")}`}, columns ${dvCol(M.c0)}–${dvCol(M.c0 + M.nc - 1)}. Pick a cell, or use the arrow keys.</p>
    <div class="dv-gw" id="dvGW"><table class="dv-sheet" id="dvGrid" role="grid" tabindex="0" aria-labelledby="dvSrcH dvGCap" aria-rowcount="${n + 1}" aria-colcount="${M.nc + 1}" aria-activedescendant="dvc-${S.act[0]}-${S.act[1]}">
      <thead><tr role="row" aria-rowindex="1"><th scope="col" role="columnheader" class="dv-ch dv-corner"><span class="sr">Row</span></th>${head}</tr></thead><tbody>${body.join("")}</tbody></table></div>
    ${fit ? "" : `<div class="dv-gnav"><button type="button" id="dvUp"${S.s <= M.r0 ? " disabled" : ""}>Show earlier rows</button><button type="button" id="dvDown"${S.e >= M.r1 ? " disabled" : ""}>Show later rows</button>
      <form id="dvGoF" class="dv-go" novalidate><label for="dvGo">Go to row</label><input id="dvGo" type="number" inputmode="numeric" min="${M.r0}" max="${M.r1}" required><button type="submit">Go</button><span class="note" id="dvGoMsg" role="status"></span></form></div>`}
    <p class="dv-read" id="dvRead" role="status">${dvRead(M, ...S.act)}</p>
    ${dvKeyHtml(M, S)}`;
}
// The readout for one cell: where it is, what the file holds, and what the app did with it.
function dvRead(M, r, c) {
  const { P, k } = M, x = M.by.get(r), kind = dvRowKind(M, r), cc = M.col[c] || {}, L = dvCol(c), v = dvTxt(M.cell(r, c)), lab = cc.f && dvLabel(k, cc.f.key);
  const what = M.G.reduced && kind !== "blank" && !cc.f && !(kind === "hdr" && cc.ig) ? "Not saved with this workspace"
    : kind === "title" ? "Title / notes, not read" : kind === "hdr" ? (cc.f ? `Header of ${lab}` : cc.ig ? "Header (ignored column)" : "Header")
    : kind === "blank" ? "Blank row" : cc.ig ? "Not used (ignored column)" : !cc.f ? "Not used"
    : kind === "skip" ? `Feeds ${lab} · Skipped: ${(x.skip || "not used").toLowerCase()}` : `Feeds ${lab} · Used as ${dv.o.used(k, cc.f.key, x.out)}`;
  return `<b>${dvEsc(P.sheet ? `${P.sheet}!${L}${r}` : `${L}${r}`)}</b> · In the file: <span class="dv-rv">${dvEsc(v.trim() === "" ? "(blank)" : v)}</span> · ${dvEsc(what)}`;
}
const dvRange = a => !a.length ? "" : a.length === 1 ? `row ${a[0]}` : a[a.length - 1] - a[0] === a.length - 1 ? `rows ${a[0]}–${a[a.length - 1]}` : `rows ${a.join(", ")}`;
const dvRowsN = n => `${n.toLocaleString("en-US")} row${n === 1 ? "" : "s"}`;
function dvKeyHtml(M, S) {
  const { P, k } = M, li = [], D = dv.o.derived(k, P);
  P.fields.filter(f => f.col).sort((a, b) => dvColNo(a.col) - dvColNo(b.col)).forEach(f => { const on = f.key === S.key;
    li.push(`<li><button type="button" class="dv-kf dv-t${M.col[dvColNo(f.col)].t}" data-dvkf="${f.key}" aria-pressed="${on}"><span class="dv-sw" aria-hidden="true"></span> <b>${f.col}</b> ${dvEsc(dvLabel(k, f.key))}${f.header ? ` <span class="dv-kh">${dvEsc(f.header)}</span>` : ""}</button></li>`) });
  P.fields.filter(f => !f.col && f.how === "typed").forEach(f => li.push(`<li class="dv-kn">${dvEsc(dvLabel(k, f.key))}: typed “${dvEsc(f.value)}”, not a column</li>`));
  const title = []; for (let r = M.r0; r < (P.headerRow ?? M.r0); r++) if (!dvBlankRow(M, r)) title.push(r);
  const skip = P.rows.filter(x => !x.out.length).length;
  li.push(`<li><span class="dv-b" aria-hidden="true">H</span> Header row · row ${P.headerRow}</li>`);
  if (title.length) li.push(`<li><span class="dv-b" aria-hidden="true">T</span> Title / notes, not read · ${dvRange(title)}</li>`);
  if (skip) li.push(`<li><span class="dv-b dv-bw" aria-hidden="true">!</span> Skipped · ${dvRowsN(skip)}</li>`);
  if (P.ignored.length) li.push(`<li><span class="dv-sw dv-swig" aria-hidden="true"></span> Ignored column${P.ignored.length > 1 ? "s" : ""} · ${P.ignored.map(x => x.col).join(", ")}</li>`);
  M.cats.forEach(q => li.push(`<li><span class="dv-b" aria-hidden="true">${dvEsc(q.mark)}</span> ${dvEsc(q.label)} · ${dvRowsN(q.n)}</li>`));
  return `<h4 id="dvKeyH">Key</h4><ul class="dv-key" aria-labelledby="dvKeyH">${li.join("")}</ul>
    ${D.length ? `<p class="note dv-kd"><b>Worked out by the app, not columns:</b> ${D.map(d => `${dvEsc(d.label)}: ${dvEsc(d.text)}`).join(" ")}</p>` : ""}`;
}
// Scroll a cell into view inside the grid only (never the page), clear of the sticky letters and row numbers.
function dvSee(el, gw) {
  if (!el || !gw) return;
  const w = gw.getBoundingClientRect(), e = el.getBoundingClientRect(), top = w.top + gw.clientTop + (gw.querySelector("thead")?.offsetHeight || 0),
    left = w.left + gw.clientLeft + (gw.querySelector(".dv-rn")?.offsetWidth || 0), right = w.left + gw.clientLeft + gw.clientWidth, bottom = w.top + gw.clientTop + gw.clientHeight;
  if (e.left < left) gw.scrollLeft -= left - e.left + 16; else if (e.right > right) gw.scrollLeft += Math.min(e.right - right + 16, e.left - left);
  if (e.top < top) gw.scrollTop -= top - e.top; else if (e.bottom > bottom) gw.scrollTop += e.bottom - bottom;
}
function dvKeepScroll() { const gw = dv.o.box.querySelector("#dvGW"); return gw && [gw.scrollLeft, gw.scrollTop, document.activeElement?.id === "dvGrid"] }
// Move the active cell; outside the drawn window, the window moves with it.
function dvAct(r, c) {
  const S = dv.open, M = dv.m, box = dv.o.box; if (!M) return;
  r = dvClamp(r, M.r0, M.r1); c = dvClamp(c, M.c0, M.c0 + M.nc - 1); S.act = [r, c];
  if (r < S.s || r > S.e) { S.s = dvClamp(r - 10, M.r0, Math.max(M.r0, M.r1 - DV_WIN + 1)); S.e = Math.min(M.r1, S.s + DV_WIN - 1); S.jump = true; dvPane(); box.querySelector("#dvGrid").focus({ preventScroll: true }); return }
  box.querySelector("#dvGrid .dv-act")?.classList.remove("dv-act");
  const td = box.querySelector(`#dvc-${r}-${c}`); td.classList.add("dv-act");
  box.querySelector("#dvGrid").setAttribute("aria-activedescendant", td.id); box.querySelector("#dvRead").innerHTML = dvRead(M, r, c);
  dvSee(td, box.querySelector("#dvGW"));
}
function dvKey(e) {
  const S = dv.open, M = dv.m; if (!M) return;
  let [r, c] = S.act; const step = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], PageUp: [-20, 0], PageDown: [20, 0] }[e.key];
  if (step) { r += step[0]; c += step[1] }
  else if (e.key === "Home") { c = M.c0; if (e.ctrlKey) r = M.r0 } else if (e.key === "End") { c = M.c0 + M.nc - 1; if (e.ctrlKey) r = M.r1 } else return;
  e.preventDefault(); dvAct(r, c);
}
// Show earlier / later rows: the window grows by DV_WIN, up to DV_MAX, then slides.
function dvMore(up) {
  const S = dv.open, M = dv.m, box = dv.o.box, was = S.e;
  if (up) { S.s = Math.max(M.r0, S.s - DV_WIN); S.e = Math.min(S.e, S.s + DV_MAX - 1) } else { S.e = Math.min(M.r1, S.e + DV_WIN); S.s = Math.max(S.s, S.e - DV_MAX + 1) }
  S.act = [dvClamp(S.act[0], S.s, S.e), S.act[1]]; dvPane();
  const gw = box.querySelector("#dvGW"), b = box.querySelector(up ? "#dvUp" : "#dvDown");
  // Earlier rows appear at the top; later ones show from the first new row.
  if (up) gw.scrollTop = 0; else { const tr = box.querySelector(`#dvc-${was + 1}-${S.act[1]}`)?.parentElement; if (tr) gw.scrollTop = tr.offsetTop - (gw.querySelector("thead")?.offsetHeight || 0) }
  (b && !b.disabled ? b : box.querySelector("#dvGrid")).focus({ preventScroll: true });
}
function dvGoRow() {
  const M = dv.m, S = dv.open, box = dv.o.box, n = Math.round(+box.querySelector("#dvGo").value);
  if (!(n >= M.r0 && n <= M.r1)) { box.querySelector("#dvGoMsg").textContent = `Rows run from ${M.r0} to ${M.r1}.`; return }
  S.s = dvClamp(n - 10, M.r0, Math.max(M.r0, M.r1 - DV_WIN + 1)); S.e = Math.min(M.r1, S.s + DV_WIN - 1); S.act = [n, S.act[1]]; S.jump = true;
  dvPane(); box.querySelector("#dvGrid").focus({ preventScroll: true });
}
// A key entry makes its field the one audited: the pane's text follows, the grid keeps its rows and moves to the column.
function dvSwitch(key) {
  const S = dv.open, M = dv.m, c = M && dvSelCol(M, key); if (!S || S.key === key) return;
  S.key = key; S.all = false; if (c != null) { S.act = [S.act[0], c]; S.jump = true }
  dv.render(); dv.o.box.querySelector(`[data-dvkf="${key}"]`)?.focus({ preventScroll: true });
}

