// Optional: serves the CDN scripts and Google Fonts from unpacked npm tarballs, for machines that can't reach
// those hosts. Point REEL_VENDOR at a folder holding chart.js-4.4.1/, xlsx-0.18.5/ and fontsource-ibm-plex-*/ (each `npm pack` + untar).
const fs = require('fs'), path = require('path');
const V = process.env.REEL_VENDOR;
const fonts = [['IBM Plex Sans','ibm-plex-sans',[400,500,600]],['IBM Plex Mono','ibm-plex-mono',[400,500]],['IBM Plex Sans Condensed','ibm-plex-sans-condensed',[500,600]]];
const css = fonts.flatMap(([fam, id, ws]) => ws.map(w => `@font-face{font-family:"${fam}";font-weight:${w};font-style:normal;font-display:block;src:url(https://fonts.gstatic.com/local/${id}/${w}.woff2) format("woff2")}`)).join('\n');
module.exports = async (ctx) => {
  await ctx.route('https://cdnjs.cloudflare.com/**', r => {
    const u = r.request().url();
    const f = u.includes('Chart.js') ? 'chart.js-4.4.1/package/dist/chart.umd.js' : 'xlsx-0.18.5/package/dist/xlsx.full.min.js';
    r.fulfill({ body: fs.readFileSync(path.join(V, f)), contentType: 'application/javascript' });
  });
  await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: css, contentType: 'text/css' }));
  await ctx.route('https://fonts.gstatic.com/local/**', r => {
    const [, id, w] = r.request().url().match(/local\/([^/]+)\/(\d+)/);
    const dir = fs.readdirSync(V).find(d => d.startsWith('fontsource-' + id + '-5'));
    r.fulfill({ body: fs.readFileSync(path.join(V, dir, 'package/files', `${id}-latin-${w}-normal.woff2`)), contentType: 'font/woff2' });
  });
};
