/*
 * Estrae le immagini dall'opuscolo PDF e rende ogni pagina come PNG.
 *
 * Uso (dalla cartella del progetto):
 *   npm install mupdf
 *   node scripts/estrai-immagini.mjs
 *
 * Output in  scripts/_estratte/
 *   pages/page-NN.png   ->  ogni pagina dell'opuscolo (~200 DPI), utile per capire
 *                           quale immagine appartiene a quale evento
 *   xobj/pNN_ImK_WxH.png ->  ogni immagine incorporata nel PDF
 *
 * Poi: si scelgono a mano le foto degli eventi, si rinominano <id-evento>.png
 * e si copiano in  assets/eventi/ , aggiungendo il campo  image:  in assets/data.js.
 */
import * as mupdf from "mupdf";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, "..");
const PDF = path.join(PROJ, "assets", "opuscolo-tutti-i-colori-della-pace-2026.pdf");
const OUT = path.join(HERE, "_estratte");

const doc = mupdf.Document.openDocument(new Uint8Array(fs.readFileSync(PDF)), "application/pdf");
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "pages"), { recursive: true });
fs.mkdirSync(path.join(OUT, "xobj"), { recursive: true });

// 1) render delle pagine
const SCALE = 200 / 72;
for (let i = 0; i < doc.countPages(); i++) {
  const pix = doc.loadPage(i).toPixmap(
    mupdf.Matrix.scale(SCALE, SCALE), mupdf.ColorSpace.DeviceRGB, false, true
  );
  fs.writeFileSync(path.join(OUT, "pages", `page-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(pix.asPNG()));
}
console.log(`Rese ${doc.countPages()} pagine in ${path.join(OUT, "pages")}`);

// 2) immagini incorporate (XObject) pagina per pagina
let count = 0;
for (let i = 0; i < doc.countPages(); i++) {
  let xo;
  try { xo = doc.loadPage(i).getObject().get("Resources").get("XObject"); }
  catch (e) { continue; }
  if (!xo || !xo.isDictionary || !xo.isDictionary()) continue;
  const keys = [];
  xo.forEach((v, k) => keys.push(k));
  for (const k of keys) {
    let e;
    try { e = xo.get(k); } catch (err) { continue; }
    let sub = null;
    try { sub = e.get("Subtype").asName(); } catch (err) { /* non e' un'immagine */ }
    if (sub !== "Image") continue;
    try {
      const img = doc.loadImage(e);
      const w = img.getWidth(), h = img.getHeight();
      const pix = img.toPixmap();
      let buf;
      try { buf = Buffer.from(pix.asPNG()); } catch (er) { buf = Buffer.from(pix.asJPEG(88)); }
      fs.writeFileSync(path.join(OUT, "xobj", `p${String(i + 1).padStart(2, "0")}_${k}_${w}x${h}.png`), buf);
      count++;
    } catch (err) { /* immagine non decodificabile: salto */ }
  }
}
console.log(`Estratte ${count} immagini incorporate in ${path.join(OUT, "xobj")}`);
