# Tutti i colori della pace — XXIV edizione (2026)

Sito statico (solo **HTML + CSS + JavaScript**, nessun framework, nessuna build) con il
**calendario del festival** di Vallelaghi / Valle dei Laghi (TN).

Dati e testi ricavati dall'opuscolo ufficiale del festival
(*Comune di Vallelaghi · Biblioteca Vallelaghi · Forum trentino per la Pace e i Diritti Umani*).

## Funzioni

- **Calendario** in due viste: **Elenco** (per giorno) e **Calendario** (griglia mensile settembre / ottobre 2026).
- **Filtri**: per **categoria** (chip multi-selezione), per **luogo/frazione**, per **mese**, e ricerca a testo libero (titolo, sede, ospiti…). Lo stato dei filtri finisce nell'URL, quindi i link sono condivisibili (es. `#/?cat=teatro,cineforum`).
- **Aggiungi al calendario**: su ogni evento il menù *«＋ Calendario»* offre **Google Calendar** e **Outlook.com** (si aprono con l'evento già compilato, senza download) e lo **scarica `.ics`** per Apple Calendar / Outlook desktop.
- **Esporta in `.ics`**: pulsante *«Esporta calendario (.ics)»* — genera al volo un file iCalendar con **gli eventi attualmente filtrati** (fuso `Europe/Rome`, con `VTIMEZONE`, mostre come eventi *all-day* multi-giorno).
- **Condividi**: sul singolo evento e sulla vista filtrata. Usa la condivisione nativa del dispositivo (`navigator.share`: WhatsApp, Telegram, Mail…) con testo e link pronti; se non disponibile, menù di ripiego WhatsApp / Telegram / E-mail / «copia testo». Link diretto a un evento: `#/?ev=<id-evento>` apre la sua scheda.
- **Esporta in PDF**: pulsante *«Stampa / Salva PDF»* → apre la finestra di stampa del browser con un foglio di stile dedicato (programma pulito, giorno per giorno). Da lì «Salva come PDF».
- **Immagini degli eventi**: le foto/locandine dei singoli appuntamenti sono estratte dall'opuscolo PDF (in `assets/eventi/`), mostrate come miniatura nella scheda e a piena larghezza nel dettaglio. 6 eventi senza foto nell'opuscolo restano solo testo.
- **Saluto dell'amministrazione**: il testo introduttivo dell'assessora (dall'opuscolo) è nella sezione richiudibile sotto la testata; il testo è in `TCDP.meta.intro` dentro `data.js`.
- **Mappa**: il pulsante *«Apri in Google Maps»* nel dettaglio evento apre `google.com/maps` sull'indirizzo (sede + frazione + Vallelaghi TN).
- **Opuscolo originale** in PDF scaricabile ([`assets/opuscolo-tutti-i-colori-della-pace-2026.pdf`](assets/opuscolo-tutti-i-colori-della-pace-2026.pdf)).
- **Calendario completo `.ics` statico** (`calendario-tutti-i-colori-della-pace-2026.ics`) — URL stabile, adatto anche all'abbonamento (`webcal://`).
- Colori e identità visiva ripresi dalla locandina (fondo crema, fascia arcobaleno, ottanio, accenti a mano). Responsive, accessibile da tastiera, `prefers-reduced-motion`.

## Struttura

```text
index.html                     pagina unica
assets/
  styles.css                   stile + regole @media print
  app.js                       calendario, filtri, export .ics, stampa, modale
  data.js                      IL PROGRAMMA (window.TCDP: meta, categorie, eventi)
  eventi/<id-evento>.png       foto/locandine estratte dall'opuscolo (21 eventi)
  locandina-cover.webp         immagine di copertina
  opuscolo-...-2026.pdf         opuscolo ufficiale (scaricabile dal sito)
  favicon.svg
calendario-...-2026.ics        calendario completo statico
scripts/gen-ics.js             rigenera il .ics statico da data.js
scripts/estrai-immagini.mjs    ri-estrae pagine e immagini dall'opuscolo (richiede `npm i mupdf`)
.nojekyll                      evita l'elaborazione Jekyll su GitHub Pages
```

I due file nella radice `5647e0e6f58efc36e5823910b2543e11.webp` e
`WEB_Opuscolo_tutti+i+colori+della+pace+2026.pdf` sono gli originali forniti: si possono
eliminare, le copie usate dal sito sono in `assets/`.

## Modificare il programma

Tutto il contenuto è in **`assets/data.js`**. Ogni evento:

```js
{
  id: "20261012-traduemondi",       // univoco
  title: "Tra due mondi",
  subtitle: "Cineforum",            // occhiello (facoltativo)
  category: "cineforum",            // una chiave di TCDP.categories
  start: "2026-10-12T20:30",        // "YYYY-MM-DDTHH:MM" oppure "YYYY-MM-DD"
  end: "2026-10-12T22:30",          // facoltativo, per la durata nel .ics
  dateEnd: "2026-10-11",            // solo mostre / eventi su più giorni
  allDay: true,                     // mostre / eventi senza orario
  venue: "Teatro di Padergnone",
  locality: "Padergnone",           // Vezzano | Padergnone | Terlago | Ranzo | ...
  free: true,                       // mostra il bollino "ingresso libero"
  image: "assets/eventi/20261012-traduemondi.png",  // facoltativo
  info: "…",                        // note pratiche (età, prenotazioni)
  credits: "…",                     // "a cura di"
  description: "…"
}
```

Le **categorie** (etichetta + colore) sono in `TCDP.categories` nello stesso file.
Il **saluto dell'assessora** è in `TCDP.meta.intro` (`by` + `paragraphs`).

Per **aggiungere/rifare le immagini**: `npm i mupdf` poi `node scripts/estrai-immagini.mjs`;
guarda `scripts/_estratte/pages/` per capire quale immagine va con quale evento,
rinomina il file scelto `<id-evento>.png`, mettilo in `assets/eventi/` e aggiungi
`image:` nell'evento in `data.js`.

Dopo aver modificato `data.js`, rigenera il `.ics` statico:

```
node scripts/gen-ics.js
```

(serve solo per il file scaricabile stabile; l'export dal pulsante è sempre aggiornato).

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub e caricaci il contenuto di questa cartella:
   ```
   git init
   git add .
   git commit -m "Sito calendario Tutti i colori della pace 2026"
   git branch -M main
   git remote add origin https://github.com/<utente>/<repo>.git
   git push -u origin main
   ```
2. Su GitHub: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
   branch **`main`**, cartella **`/ (root)`**. Salva.
3. Dopo un minuto il sito è online su `https://<utente>.github.io/<repo>/`.

Nessuna configurazione aggiuntiva: è tutto statico. Il file `.nojekyll` è già incluso.
Funziona anche aperto in locale con un semplice server statico
(`python -m http.server` oppure `npx serve`); aprendo `index.html` con `file://`
la pagina si vede ma alcuni browser bloccano il download di `.ics`/PDF.

## Nota

Programma suscettibile di variazioni — Info: **0461 340654** · **vezzano@biblio.tn.it**.
Sito informativo realizzato a partire dall'opuscolo; non è un sito ufficiale del Comune.
