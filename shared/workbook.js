// ---------- workbook ----------
// Shared by both products: build.py inlines this file (with workbook.css) into each page.
// Firms often keep everything in one Excel file, a tab each for cash flows, portfolio, KPIs and staff.
// When an upload has two or more non-empty sheets, every sheet is scored against every data kind the
// page takes, each kind gets at most one sheet, and a proposal panel lets the viewer confirm or change
// the guesses before anything loads. Confirmed sheets then go through the page's own loading path one
// after another; a step that needs the viewer (the column matcher) pauses the queue.
// Page interface: initWorkbook({ box, kinds, fields, match, headerRow, names, extra, load, abort }), where
//   box        the (hidden) element the panel draws into, inside the Data panel;
//   kinds      { kind: "Label" } in load order;
//   fields(k)  { need: [[key, alt...], ...] (each group is met by any one of its keys), all: [keys], label(key) };
//   match(k, headers) the field key (or "") each header maps to, from the page's synonym list;
//   headerRow(aoa)    the page's header-row guess;
//   names      { kind: RegExp } sheet-name telltales; extra(k, aoa, h) true for a content telltale;
//   load(k, sheet, info) loads one sheet (info: { fileName, sheets, label, step, total }); returns true
//              when done, false when it waits on the viewer (the page then calls wbook.next() or
//              wbook.stop()), and throws to report the sheet as not loaded;
//   abort(k)   closes whatever step the page left open for kind k;
//   done(Q)    (optional) runs once the queue ends, with Q.done the sheets that loaded.
// The page calls wbook.offer(fileName, sheets, kind) on an upload: false means "not a workbook", carry on as before.
// wbook.offer(fileName, sheets, "", true) proposes even a single sheet, so a file of unknown kind is recognised first.
const wbook = { opts: null, P: null, Q: null };
function initWorkbook(opts) {
  wbook.opts = opts;
  opts.box.addEventListener("change", e => { const s = e.target.closest("select[data-wb]"); if (s) wbPick(+s.dataset.wb, s.value) });
  opts.box.addEventListener("click", e => { const id = e.target.id;
    if (id === "wbLoad") wbStart(); else if (id === "wbCancel") wbCancel(); else if (id === "wbSkip") wbSkip(); else if (id === "wbStop") wbook.stop(); else if (id === "wbClose") wbook.close() });
  return wbook;
}
const wbEsc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// How well one sheet fits one kind, 0 to ~1.15: mostly the share of required column groups found, then
// optional columns (four are plenty), then the tab name and a content telltale as tie-breakers.
function wbScore(kind, name, aoa) {
  const o = wbook.opts, h = o.headerRow(aoa), headers = (aoa[h] || []).map(x => String(x ?? "").trim());
  const F = o.fields(kind), got = new Set(o.match(kind, headers).filter(Boolean));
  const met = F.need.filter(g => g.some(k => got.has(k))), needKeys = new Set(F.need.flat());
  const opt = F.all.filter(k => !needKeys.has(k) && got.has(k)).length, optOf = Math.min(4, F.all.filter(k => !needKeys.has(k)).length) || 1;
  const req = F.need.length ? met.length / F.need.length : 0, named = !!o.names[kind]?.test(name), tell = !!o.extra?.(kind, aoa, h);
  const s = 0.6 * req + 0.2 * Math.min(1, opt / optOf) + (named ? 0.2 : 0) + (tell ? 0.15 : 0);
  return { s: got.size ? s : 0, req, missing: F.need.filter(g => !g.some(k => got.has(k))).map(g => F.label(g[0])) };
}
const WB_PLAUSIBLE = 0.45, WB_STRONG = 0.7;
// Greedy: the strongest sheet/kind pair first, each sheet and kind used once. The kind the viewer
// dropped onto goes first, so it gets its best sheet whenever one is plausible at all.
function wbAssign(rows, kinds, prefer) {
  const take = new Map(), used = new Set();
  const pairs = rows.flatMap((r, i) => kinds.map(k => ({ i, k, s: r.score[k].s }))).filter(p => p.s >= WB_PLAUSIBLE)
    .sort((a, b) => (b.k === prefer) - (a.k === prefer) || b.s - a.s);
  pairs.forEach(p => { if (!take.has(p.i) && !used.has(p.k)) { take.set(p.i, p.k); used.add(p.k) } });
  rows.forEach((r, i) => r.kind = take.get(i) || "");
}
wbook.offer = (fileName, sheets, prefer, any) => {
  const names = Object.keys(sheets); if (names.length < (any ? 1 : 2)) return false;
  const o = wbook.opts, kinds = Object.keys(o.kinds);
  wbook.close();
  const rows = names.map(name => { const aoa = sheets[name], h = o.headerRow(aoa);
    return { name, headers: (aoa[h] || []).map(x => String(x ?? "").trim()).filter(Boolean), score: Object.fromEntries(kinds.map(k => [k, wbScore(k, name, aoa)])) } });
  wbAssign(rows, kinds, prefer);
  // Clear the zone's file input, or picking the same workbook again after Cancel would fire no change event.
  const input = document.querySelector(`.drop[data-kind="${prefer}"] input`); if (input) input.value = "";
  wbook.P = { fileName, sheets, rows, prefer, note: "" };
  wbDraw();
  o.box.scrollIntoView({ block: "nearest" }); o.box.querySelector("#wbH")?.focus({ preventScroll: true });
  return true;
};
// A short word on the guess, only where it needs checking.
function wbHint(r) {
  if (!r.kind) { const best = Math.max(...Object.values(r.score).map(x => x.s)); return best < WB_PLAUSIBLE ? "Doesn't look like any of these." : "" }
  const x = r.score[r.kind];
  if (x.req < 1) return `Check this one: no ${x.missing.slice(0, 2).join(", no ")} column found.`;
  return x.s < WB_STRONG ? "Possible match; check the columns when it loads." : "";
}
function wbDraw() {
  const o = wbook.opts, P = wbook.P, kinds = Object.entries(o.kinds), n = P.rows.length, picked = P.rows.filter(r => r.kind).length;
  o.box.hidden = false;
  o.box.innerHTML = `<div class="panel-head"><h3 id="wbH" tabindex="-1">${n > 1 ? "Workbook" : "File"}: ${wbEsc(P.fileName)}</h3></div>
    <p class="note">${n > 1 ? `This workbook has ${n} sheets. Here's what each one looks like:` : "Here's what this file looks like. Check the kind of data before it loads:"}</p>
    <ul class="wb-list">${P.rows.map((r, i) => { const hint = wbHint(r), more = r.headers.length - 4;
      return `<li class="wb-row"><div class="wb-sheet"><label for="wbSel${i}">${wbEsc(r.name)}</label>
        <span class="wb-cols" id="wbCols${i}">${r.headers.length ? wbEsc(r.headers.slice(0, 4).join(", ")) + (more > 0 ? `, +${more} more` : "") : "No column headers"}</span></div>
        <div class="wb-pick"><select id="wbSel${i}" data-wb="${i}" aria-describedby="wbCols${i}${hint ? ` wbHint${i}` : ""}">${kinds.map(([k, l]) => `<option value="${k}"${r.kind === k ? " selected" : ""}>${wbEsc(l)}</option>`).join("")}<option value=""${r.kind ? "" : " selected"}>Not used</option></select>
        ${hint ? `<span class="wb-hint${r.kind ? " warn" : ""}" id="wbHint${i}">${wbEsc(hint)}</span>` : ""}</div></li>` }).join("")}</ul>
    <p class="note" id="wbNote" role="status">${wbEsc(P.note || (n === 1 ? (picked ? "It will load as the kind picked." : "Pick the kind of data to load it as.") : picked ? `${picked} of ${n} sheets will load. Each kind takes one sheet.` : "Pick at least one sheet to load."))}</p>
    <div class="row"><button type="button" class="primary" id="wbLoad"${picked ? "" : " disabled"}>Load these</button><button type="button" id="wbCancel">Cancel</button></div>`;
}
function wbPick(i, kind) {
  const P = wbook.P; if (!P) return;
  P.rows[i].kind = kind; P.note = "";
  // One sheet per kind, as in the column matcher: the earlier holder steps aside.
  P.rows.forEach((r, j) => { if (j !== i && kind && r.kind === kind) { r.kind = ""; P.note = `“${r.name}” is now Not used: each kind takes one sheet.` } });
  wbDraw(); wbook.opts.box.querySelector(`#wbSel${i}`)?.focus();
}
function wbCancel() { const k = wbook.P?.prefer; wbook.close(); document.querySelector(`.drop[data-kind="${k}"] input`)?.focus() }
function wbStart() {
  const o = wbook.opts, P = wbook.P, order = Object.keys(o.kinds);
  const items = P.rows.filter(r => r.kind).sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).map(r => ({ sheet: r.name, kind: r.kind }));
  wbook.P = null; if (!items.length) return;
  wbook.Q = { fileName: P.fileName, sheets: P.sheets, items, i: 0, done: [], failed: [], skipped: [] };
  wbRun();
}
// Load sheets until one needs the viewer; next() resumes after it.
function wbRun() {
  const o = wbook.opts, Q = wbook.Q;
  while (Q && wbook.Q === Q && Q.i < Q.items.length) {
    const it = Q.items[Q.i], info = { fileName: Q.fileName, sheets: Q.sheets, label: `${Q.fileName} › ${it.sheet}`, step: Q.i + 1, total: Q.items.length };
    wbProgress();
    let done;
    try { done = o.load(it.kind, it.sheet, info) } catch (e) { Q.failed.push(`${it.sheet}: ${e.message}`); done = true; it.failed = true }
    if (!done) return wbProgress();
    if (!it.failed) Q.done.push(it);
    Q.i++;
  }
  if (Q && wbook.Q === Q) wbFinish();
}
function wbProgress() {
  const o = wbook.opts, Q = wbook.Q, it = Q.items[Q.i];
  o.box.hidden = false;
  o.box.innerHTML = `<p class="note wb-step" id="wbStep" role="status" tabindex="-1">Sheet ${Q.i + 1} of ${Q.items.length}: ${wbEsc(it.sheet)} → ${wbEsc(o.kinds[it.kind])}. Check the columns below, then load.</p>
    <div class="row"><button type="button" id="wbSkip">Skip this sheet</button><button type="button" id="wbStop">Stop</button></div>`;
}
wbook.next = () => { const Q = wbook.Q; if (!Q) return; Q.done.push(Q.items[Q.i]); Q.i++; wbRun() };
function wbSkip() { const Q = wbook.Q; if (!Q) return; const it = Q.items[Q.i]; wbook.opts.abort(it.kind); Q.skipped.push(it.sheet); Q.i++; wbRun() }
// Stop keeps whatever already loaded; the open step is closed.
wbook.stop = () => { const Q = wbook.Q; if (!Q) return; const it = Q.items[Q.i]; if (it) wbook.opts.abort(it.kind); Q.stopped = true; wbFinish() };
function wbFinish() {
  const o = wbook.opts, Q = wbook.Q, had = o.box.contains(document.activeElement) || document.activeElement === document.body;
  wbook.Q = null;
  const n = Q.done.length, msgs = [];
  msgs.push(n ? `Loaded ${n} of ${Q.items.length} sheet${Q.items.length > 1 ? "s" : ""} from ${Q.fileName}: ${Q.done.map(it => `${it.sheet} → ${o.kinds[it.kind]}`).join(", ")}.` : `Nothing loaded from ${Q.fileName}.`);
  if (Q.stopped) msgs.push("Stopped before the rest.");
  if (Q.skipped.length) msgs.push(`Skipped ${Q.skipped.join(", ")}.`);
  o.box.hidden = false;
  o.box.innerHTML = `<p class="note wb-step" id="wbStep" role="status" tabindex="-1">${wbEsc(msgs.join(" "))}</p>
    ${Q.failed.map(f => `<p class="wb-hint warn wb-fail">${wbEsc(f)}</p>`).join("")}
    <div class="row"><button type="button" id="wbClose">Close</button></div>`;
  if (had) o.box.querySelector("#wbStep").focus({ preventScroll: true });
  o.done?.(Q);
}
// Hides the panel; a queue that is still running is dropped (its open step closed) without loading more.
wbook.close = () => { const Q = wbook.Q; wbook.Q = null; wbook.P = null; if (Q && Q.items[Q.i]) wbook.opts.abort(Q.items[Q.i].kind);
  const b = wbook.opts.box; b.hidden = true; b.innerHTML = "" };
