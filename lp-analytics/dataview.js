// ---------- data view ----------
// Shared by both modules: build.py inlines this file (with dataview.css) into each page.
// The Data view lists what each upload was identified as, and lets the viewer audit any field: which
// file, sheet, column and header it came from, how it was matched, what the app did to it, and the
// source cells next to the values the app uses. Provenance is captured when a sheet loads:
//   P = { file, sheet, via, headerRow, fields: [{ key, i, col, header, how, conf, value }], ignored: [{ col, header }],
//         rows: [{ r, v: { key: raw }, out: [[n, f]], skip }], ws: { file, savedAt }, noSource }
// where r is the sheet row (1-based, as Excel shows it), out lists the normalised rows (state[kind][n])
// the source row became (f: the field that made it, where one row makes several), and skip says why a
// row was dropped. via is upload, workbook, sample or workspace.
// Page interface: initDataView({ box, kinds, fields, prov, count, used, transforms, derived }), where
//   kinds          { kind: { label, off } }: off says what loading an optional kind adds (required kinds say so too);
//   fields(k)      [{ key, label }] the kind accepts;  prov(k) its P, or null when nothing is loaded;
//   count(k)       rows loaded;  used(k, key, out) the value the app uses for that row, as text;
//   transforms(k, key, P) [plain sentences];  derived(k, P) [{ label, text }] for values the app works out.
// The page calls dv.render() from its own render(), dv.summary() for the HTML report and dv.sources() for the Excel sheet.
const dv = { o: null, open: null };
// A1 column letters: 0 -> A, 25 -> Z, 26 -> AA.
const dvCol = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s };
const dvEsc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const dvIso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Raw cells kept JSON-safe (they travel in the workspace): Excel dates as YYYY-MM-DD.
const dvRaw = v => v instanceof Date ? (isNaN(v) ? "" : dvIso(v)) : v ?? "";
// Drop blank rows but keep each kept row's sheet row number and the sheet's first column, so cells can be named later.
function dvRows(all, rowNo, col0 = 0) {
  const n = [], out = all.filter((r, i) => r.some(x => String(x ?? "").trim() !== "") && n.push(rowNo(i)));
  out.rowNo = n; out.col0 = col0; return out;
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
  return { file, sheet: sheet || null, via, headerRow: rn(h), fields, ignored, rows };
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
  opts.box.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.dvk) dvOpen(b.dataset.dvk, b.dataset.dvf);
    else if (b.id === "dvClose") dvClose();
    else if (b.id === "dvAll") { dv.open.all = !dv.open.all; dvPane(); opts.box.querySelector("#dvAll")?.focus() } });
  opts.box.addEventListener("keydown", e => { if (e.key === "Escape" && dv.open && e.target.closest("#dvPane")) dvClose() });
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
  const o = dv.o, { k, key, all } = dv.open, P = o.prov(k), f = P.fields.find(x => x.key === key), pane = o.box.querySelector("#dvPane"), lab = dvLabel(k, key);
  const rows = P.rows, used = rows.filter(r => r.out.length);
  // A sample: the first rows, plus the first skipped row for each reason and the first blank cell in this column, so odd rows show up.
  let pick = all ? rows.slice(0, DV_CAP) : used.slice(0, 8);
  if (!all) { const why = new Set(), odd = rows.filter(r => !r.out.length && !why.has(r.skip) && why.add(r.skip)).slice(0, 3);
    odd.push(rows.find(r => r.out.length && dvShow(r.v[key]) === "(blank)" && !pick.includes(r)));
    pick = [...new Set([...pick, ...odd.filter(Boolean)])].sort((a, b) => a.r - b.r) }
  const nSkip = pick.filter(r => !r.out.length).length, T = o.transforms(k, key, P), ref = r => dvRef(P, { col: f.col, r: r.r });
  const raw = r => f.how === "typed" ? `(typed) ${f.value}` : dvShow(r.v[key]);
  pane.innerHTML = `<div class="panel-head"><h3 id="dvPaneH">${dvEsc(o.kinds[k].label)} · ${dvEsc(lab)}</h3><button type="button" id="dvClose" aria-label="Close the audit of ${dvEsc(lab)}">Close</button></div>
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
}
