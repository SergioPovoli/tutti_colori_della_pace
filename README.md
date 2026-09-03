# Tutti i colori della pace — XXIV edizione (2026)

Sito statico (solo **HTML + CSS + JavaScript**, nessun framework, nessuna build) con il
**calendario del festival** di Vallelaghi / Valle dei Laghi (TN).

Dati e testi ricavati dall'opuscolo ufficiale del festival
(*Comune di Vallelaghi · Biblioteca Vallelaghi · Forum trentino per la Pace e i Diritti Umani*).

## Funzioni

- **Calendario** in due viste: **Elenco** (per giorno) e **Calendario** (griglia mensile settembre / ottobre 2026).
- **Filtri**: per **categoria** (chip multi-selezione), per **luogo/frazione**, per **mese**, e ricerca a testo libero (titolo, sede, ospiti…). Lo stato dei filtri finisce nell'URL, quindi i link sono condivisibili (es. `#/?cat=teatro,cineforum`).
- **Esporta in `.ics`**: pulsante *«Esporta calendario (.ics)»* — genera al volo un file iCalendar con **gli eventi attualmente filtrati** (fuso `Europe/Rome`, con `VTIMEZONE`, mostre come eventi *all-day* multi-giorno). Ogni scheda evento ha anche il suo *«＋ Calendario»* per il singolo appuntamento.
- **Esporta in PDF**: pulsante *«Stampa / Salva PDF»* → apre la finestra di stampa del browser con un foglio di stile dedicato (programma pulito, giorno per giorno). Da lì «Salva come PDF».
- **Opuscolo originale** in PDF scaricabile ([`assets/opuscolo-tutti-i-colori-della-pace-2026.pdf`](assets/opuscolo-tutti-i-colori-della-pace-2026.pdf)).
- **Calendario completo `.ics` statico** (`calendario-tutti-i-colori-della-pace-2026.ics`) — URL stabile, adatto anche all'abbonamento (`webcal://`).
- Colori e identità visiva ripresi dalla locandina (fondo crema, fascia arcobaleno, ottanio, accenti a mano). Responsive, accessibile da tastiera, `prefers-reduced-motion`.

## Struttura

```
index.html                     pagina unica
assets/
  styles.css                   stile + regole @media print
  app.js                       calendario, filtri, export .ics, stampa
  data.js                      IL PROGRAMMA (window.TCDP: meta, categorie, eventi)
  locandina-cover.webp         immagine di copertina
  opuscolo-...-2026.pdf         opuscolo ufficiale (scaricabile dal sito)
  favicon.svg
calendario-...-2026.ics        calendario completo statico
scripts/gen-ics.js             rigenera il .ics statico da data.js
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
  info: "…",                        // note pratiche (età, prenotazioni)
  credits: "…",                     // "a cura di"
  description: "…"
}
```

Le **categorie** (etichetta + colore) sono in `TCDP.categories` nello stesso file.

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
