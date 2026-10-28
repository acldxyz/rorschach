// ---------- theme ----------
// Light/Dark toggle, shared by both products: build.py inlines this file (with theme.css and the theme.html
// buttons) in a script right after the buttons, so a stored choice is applied before the page paints.
// The choice lives in data-theme on <html> and in localStorage ("theme"). With no stored choice the
// attribute stays absent and the CSS follows the system setting, live. Pages re-render their charts when
// data-theme changes. Downloads that force light (asLight) put the attribute back as they found it, and
// the buttons follow this script's own record of the choice, not the attribute, so they never flicker.
(() => {
  const KEY = "theme", root = document.documentElement, sys = matchMedia("(prefers-color-scheme: dark)");
  let choice = null;
  try { const v = localStorage.getItem(KEY); if (v === "light" || v === "dark") choice = v } catch {}
  if (choice) root.setAttribute("data-theme", choice);
  const btns = [...document.querySelectorAll("[data-theme-set]")];
  const sync = () => { const eff = choice || (sys.matches ? "dark" : "light"); btns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.themeSet === eff))) };
  btns.forEach(b => b.addEventListener("click", () => {
    choice = b.dataset.themeSet; try { localStorage.setItem(KEY, choice) } catch {}
    root.setAttribute("data-theme", choice); sync();
  }));
  sys.addEventListener("change", sync);
  sync();
})();
