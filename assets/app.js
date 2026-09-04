/* =========================================================================
   Tutti i colori della pace — XXIV edizione (2026)
   Calendario filtrabile · export .ics · export/stampa PDF
   Vanilla JS, nessuna dipendenza. Pensato per GitHub Pages.
   ========================================================================= */
(function () {
  "use strict";

  var DATA = window.TCDP;
  if (!DATA) { console.error("Dati del programma non trovati (data.js)."); return; }

  var CATS = DATA.categories;
  var EVENTS = DATA.events.slice();
  var META = DATA.meta;

  var MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
  var GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  var DOW_SHORT = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

  /* ---------- stato ---------- */
  var state = {
    q: "",
    locality: "",
    month: "",
    cats: new Set(),        // vuoto = tutte
    view: "list",           // "list" | "calendar"
    ev: null,               // id evento con la modale aperta (per i link condivisibili)
  };

  /* ---------- utilità date ---------- */
  function parts(str) {                       // "2026-09-13T17:30" o "2026-09-13"
    var d = str.split("T");
    var ymd = d[0].split("-").map(Number);
    var hm = d[1] ? d[1].split(":").map(Number) : [0, 0];
    return { y: ymd[0], m: ymd[1], d: ymd[2], hh: hm[0], mm: hm[1], hasTime: !!d[1] };
  }
  function iso(p) {
    return p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0");
  }
  function dateObj(str) {
    var p = parts(str);
    return new Date(p.y, p.m - 1, p.d, p.hh, p.mm, 0, 0);
  }
  function addDaysISO(isoStr, n) {
    var a = isoStr.split("-").map(Number);
    var dt = new Date(a[0], a[1] - 1, a[2] + n);
    return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
  }
  function itTime(hhmm) {                     // "17:30" -> "17.30" ; "09:45" -> "9.45"
    var a = hhmm.split(":");
    return parseInt(a[0], 10) + "." + a[1];
  }
  function itLongDate(isoStr) {
    var a = isoStr.split("-").map(Number);
    var dt = new Date(a[0], a[1] - 1, a[2]);
    return GIORNI[dt.getDay()] + " " + a[2] + " " + MESI[a[1] - 1];
  }
  function itShortDate(isoStr) {
    var a = isoStr.split("-").map(Number);
    return a[2] + " " + MESI[a[1] - 1].slice(0, 3);
  }
  function todayISO() {
    var n = new Date();
    return n.getFullYear() + "-" + String(n.getMonth() + 1).padStart(2, "0") + "-" + String(n.getDate()).padStart(2, "0");
  }

  /* ---------- normalizza gli eventi ---------- */
  EVENTS.forEach(function (ev) {
    var p = parts(ev.start);
    ev._startISO = iso(p);
    ev._endISO = ev.dateEnd || ev._startISO;
    ev._hasTime = p.hasTime && !ev.allDay;
    ev._sortKey = ev._startISO + (ev._hasTime ? "T" + String(p.hh).padStart(2, "0") + ":" + String(p.mm).padStart(2, "0") : "T00:00");
    ev._month = ev._startISO.slice(0, 7);
    ev._cat = CATS[ev.category] || { label: ev.category, color: "#3E7C8B", ink: "#fff" };
  });
  EVENTS.sort(function (a, b) { return a._sortKey < b._sortKey ? -1 : a._sortKey > b._sortKey ? 1 : 0; });

  /* ---------- filtro ---------- */
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  function matches(ev) {
    if (state.cats.size && !state.cats.has(ev.category)) return false;
    if (state.locality && ev.locality !== state.locality) return false;
    if (state.month) {
      // un evento multi-giorno appartiene al mese se lo tocca
      var a = ev._startISO.slice(0, 7), b = ev._endISO.slice(0, 7);
      if (state.month < a || state.month > b) return false;
    }
    if (state.q) {
      var hay = norm([ev.title, ev.subtitle, ev.description, ev.venue, ev.locality, ev.credits, ev.info, ev._cat.label].join(" "));
      var terms = norm(state.q).split(/\s+/).filter(Boolean);
      if (!terms.every(function (t) { return hay.indexOf(t) !== -1; })) return false;
    }
    return true;
  }
  function filtered() { return EVENTS.filter(matches); }

  /* =======================================================================
     RENDER — testata / piè di pagina statici
     ======================================================================= */
  function fillStatic() {
    document.getElementById("editionBadge").textContent = META.year + " · " + META.edition;
    document.getElementById("claim").textContent = META.claim;
    document.getElementById("daterange").textContent = META.rangeLabel;
    document.getElementById("introLead").textContent =
      "Dal 13 settembre al 28 ottobre 2026, in tutte le frazioni di Vallelaghi. " +
      "Filtra per categoria, luogo o parola chiave; esporta gli appuntamenti nel tuo " +
      "calendario (.ics) oppure salva il programma in PDF.";
    document.getElementById("disclaimer").textContent =
      META.disclaimer + " Info: " + META.contact.phone + " · " + META.contact.email + ".";

    document.getElementById("footerEdition").textContent = META.edition + " · " + META.rangeLabel;
    document.getElementById("footerDisclaimer").textContent = META.disclaimer;
    var ph = document.getElementById("footerPhone");
    ph.textContent = META.contact.phone; ph.href = "tel:" + META.contact.phone.replace(/\s/g, "");
    var em = document.getElementById("footerEmail");
    em.textContent = META.contact.email; em.href = "mailto:" + META.contact.email;
    var ul = document.getElementById("footerOrgs");
    META.organizers.forEach(function (o) {
      var li = document.createElement("li"); li.textContent = o; ul.appendChild(li);
    });

    // Saluto dell'amministrazione (dall'opuscolo)
    var sb = document.getElementById("salutoBody");
    if (sb && META.intro) {
      sb.innerHTML =
        META.intro.paragraphs.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
        '<p class="saluto-sign">' + esc(META.intro.by) + "</p>";
    }
  }

  /* ---------- chip categorie ---------- */
  function buildChips() {
    var box = document.getElementById("categoryChips");
    Object.keys(CATS).forEach(function (key) {
      var c = CATS[key];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", "false");
      b.dataset.cat = key;
      b.style.setProperty("--_c", c.color);
      b.style.setProperty("--_ink", c.ink);
      b.textContent = c.label;
      b.addEventListener("click", function () {
        if (state.cats.has(key)) state.cats.delete(key); else state.cats.add(key);
        b.setAttribute("aria-pressed", state.cats.has(key) ? "true" : "false");
        syncURL(); render();
      });
      box.appendChild(b);
    });
  }

  /* ---------- select luoghi ---------- */
  function buildLocalities() {
    var sel = document.getElementById("localitySelect");
    var set = {};
    EVENTS.forEach(function (e) { if (e.locality) set[e.locality] = true; });
    Object.keys(set).sort(function (a, b) { return a.localeCompare(b, "it"); }).forEach(function (loc) {
      var o = document.createElement("option"); o.value = loc; o.textContent = loc; sel.appendChild(o);
    });
  }

  /* =======================================================================
     RENDER — vista ELENCO
     ======================================================================= */
  function badgeFree(ev) { return ev.free ? '<span class="badge-free">ingresso libero</span>' : ""; }

  function eventCard(ev) {
    var art = document.createElement("article");
    art.className = "event-card";
    art.tabIndex = 0;
    art.setAttribute("role", "button");
    art.setAttribute("aria-label", "Dettagli: " + ev.title);
    art.style.setProperty("--cat", ev._cat.color);
    art.style.setProperty("--cat-ink", ev._cat.ink);

    var timeHTML = ev._hasTime
      ? itTime(ev.start.split("T")[1])
      : (ev.dateEnd ? "Mostra<small>fino al " + itShortDate(ev._endISO) + "</small>" : "—");

    var whenRange = ev.dateEnd
      ? '<span class="when">🗓 dal ' + itShortDate(ev._startISO) + " al " + itShortDate(ev._endISO) + "</span>"
      : "";

    art.innerHTML =
      '<div class="event-time">' + timeHTML + "</div>" +
      '<div class="event-main">' +
        '<span class="event-cat">' + esc(ev._cat.label) + "</span>" +
        '<h3 class="event-title">' + esc(ev.title) + badgeFree(ev) + "</h3>" +
        (ev.subtitle ? '<p class="event-sub">' + esc(ev.subtitle) + "</p>" : "") +
        '<div class="event-meta">' +
          '<span class="where">' + esc(ev.venue) + (ev.locality ? " · " + esc(ev.locality) : "") + "</span>" +
          whenRange +
        "</div>" +
        (ev.description ? '<p class="event-desc">' + esc(clip(ev.description, 200)) + "</p>" : "") +
        '<div class="event-actions">' +
          '<button type="button" class="mini-btn" data-act="cal">＋ Calendario</button>' +
          '<button type="button" class="mini-btn" data-act="share">Condividi</button>' +
          '<button type="button" class="mini-btn" data-act="open">Dettagli</button>' +
        "</div>" +
      "</div>" +
      (ev.image
        ? '<img class="event-thumb" src="' + esc(ev.image) + '" alt="" loading="lazy" decoding="async">'
        : "");

    art.addEventListener("click", function (e) {
      var act = e.target.closest("[data-act]");
      if (act) {
        e.stopPropagation();
        if (act.dataset.act === "cal") calendarMenu(ev, act);
        else if (act.dataset.act === "share") shareMenu(shareTextEvent(ev), act);
        else openDialog(ev);
        return;
      }
      openDialog(ev);
    });
    art.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDialog(ev); }
    });
    return art;
  }

  function renderList(list) {
    var host = document.getElementById("eventList");
    host.innerHTML = "";
    var empty = document.getElementById("emptyState");
    empty.hidden = list.length !== 0;

    var groups = {};
    list.forEach(function (ev) { (groups[ev._startISO] = groups[ev._startISO] || []).push(ev); });

    Object.keys(groups).sort().forEach(function (day) {
      var a = day.split("-").map(Number);
      var dt = new Date(a[0], a[1] - 1, a[2]);
      var sec = document.createElement("section");
      sec.className = "day-group";
      sec.id = "day-" + day;
      sec.innerHTML =
        '<h2 class="day-heading">' +
          '<span class="dow">' + GIORNI[dt.getDay()] + "</span>" +
          '<span class="dom">' + a[2] + "</span>" +
          '<span class="mon">' + MESI[a[1] - 1] + " " + a[0] + "</span>" +
        "</h2>";
      groups[day].forEach(function (ev) { sec.appendChild(eventCard(ev)); });
      host.appendChild(sec);
    });
  }

  /* =======================================================================
     RENDER — vista CALENDARIO
     ======================================================================= */
  function renderCalendar(list) {
    var host = document.getElementById("calendarMonths");
    host.innerHTML = "";
    var months = state.month ? [state.month] : ["2026-09", "2026-10"];
    var tISO = todayISO();

    months.forEach(function (ym) {
      var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
      var first = new Date(y, m - 1, 1);
      var lead = (first.getDay() + 6) % 7;                 // lunedì = 0
      var ndays = new Date(y, m, 0).getDate();

      var wrap = document.createElement("div");
      wrap.className = "cal-month";
      var grid = '<div class="cal-grid">';
      DOW_SHORT.forEach(function (d) { grid += '<div class="cal-dow">' + d + "</div>"; });
      for (var i = 0; i < lead; i++) grid += '<div class="cal-cell is-empty"></div>';

      for (var day = 1; day <= ndays; day++) {
        var dISO = y + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        var dayEv = list.filter(function (e) { return !e.dateEnd && e._startISO === dISO; });
        var ribbons = list.filter(function (e) { return e.dateEnd && e._startISO <= dISO && dISO <= e._endISO; });
        var inRangeOnly = ribbons.length && !ribbons.some(function (e) { return e._startISO === dISO; });

        var cls = "cal-cell";
        if (dayEv.length || ribbons.length) cls += " has-events";
        if (inRangeOnly) cls += " in-range";
        if (dISO === tISO) cls += " today";

        var cell = '<div class="' + cls + '"';
        if (inRangeOnly && ribbons[0]) cell += ' style="--cat:' + ribbons[0]._cat.color + '"';
        cell += ">";
        cell += '<button type="button" class="cal-daynum" data-day="' + dISO + '">' + day + "</button>";

        // ribbon delle mostre solo nel giorno d'avvio
        ribbons.forEach(function (e) {
          if (e._startISO === dISO) {
            cell += '<button type="button" class="cal-ribbon" data-ev="' + e.id + '" ' +
              'style="--cat:' + e._cat.color + ';--cat-ink:' + e._cat.ink + '">▸ ' + esc(clip(e.title, 30)) + "</button>";
          }
        });

        var shown = dayEv.slice(0, 3);
        shown.forEach(function (e) {
          cell += '<button type="button" class="cal-event" data-ev="' + e.id + '" ' +
            'style="--cat:' + e._cat.color + '">' +
            (e._hasTime ? '<span class="ce-time">' + itTime(e.start.split("T")[1]) + "</span> " : "") +
            '<span class="ce-title">' + esc(clip(e.title, 26)) + "</span></button>";
        });
        if (dayEv.length > 3) {
          cell += '<button type="button" class="cal-more" data-day="' + dISO + '">+' + (dayEv.length - 3) + " altri…</button>";
        }
        cell += "</div>";
        grid += cell;
      }
      grid += "</div>";
      wrap.innerHTML = '<h3 class="cal-month-name">' + MESI[m - 1] + " " + y + "</h3>" + grid;
      host.appendChild(wrap);
    });

    host.querySelectorAll("[data-ev]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ev = EVENTS.find(function (e) { return e.id === b.dataset.ev; });
        if (ev) openDialog(ev);
      });
    });
    host.querySelectorAll("[data-day]").forEach(function (b) {
      b.addEventListener("click", function () { goToDayInList(b.dataset.day); });
    });
  }

  function goToDayInList(dISO) {
    setView("list");
    var target = document.getElementById("day-" + dISO);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else document.getElementById("programma").scrollIntoView({ behavior: "smooth" });
  }

  /* =======================================================================
     MODALE dettaglio
     ======================================================================= */
  var dlg = document.getElementById("eventDialog");
  document.getElementById("dialogClose").addEventListener("click", closeDialog);
  dlg.addEventListener("click", function (e) {                // click sullo sfondo (::backdrop)
    if (e.target === dlg && !_pop) closeDialog();
  });
  dlg.addEventListener("cancel", function (e) {
    e.preventDefault();
    if (_pop) { closePopover(); return; }   // Esc chiude prima il menù, poi la scheda
    closeDialog();
  });

  function openDialog(ev) {
    if (state.ev !== ev.id) { state.ev = ev.id; syncURL(); }

    var when = ev.dateEnd
      ? "Da " + itLongDate(ev._startISO) + " a " + itLongDate(ev._endISO)
      : itLongDate(ev._startISO) + (ev._hasTime ? " · ore " + itTime(ev.start.split("T")[1]) : "");

    document.getElementById("dialogBody").innerHTML =
      '<div class="dialog-head" style="--cat:' + ev._cat.color + '">' +
        '<span class="event-cat" style="background:' + ev._cat.color + ';color:' + ev._cat.ink + '">' + esc(ev._cat.label) + "</span>" +
        "<h3>" + esc(ev.title) + "</h3>" +
        (ev.subtitle ? '<p class="d-sub">' + esc(ev.subtitle) + "</p>" : "") +
      "</div>" +
      (ev.image
        ? '<figure class="dialog-figure" style="--cat:' + ev._cat.color + '">' +
            '<img src="' + esc(ev.image) + '" alt="' + esc(ev.title) + '" decoding="async">' +
            '<figcaption>Immagine tratta dall\'opuscolo del festival</figcaption>' +
          "</figure>"
        : "") +
      '<div class="dialog-body">' +
        "<dl>" +
          "<dt>Quando</dt><dd>" + esc(when) + (ev.free ? ' <span class="badge-free">ingresso libero</span>' : "") + "</dd>" +
          "<dt>Dove</dt><dd>" + esc(ev.venue) + (ev.locality ? "<br>" + esc(ev.locality) + " (Vallelaghi, TN)" : "") + "</dd>" +
          (ev.credits ? "<dt>A cura di</dt><dd>" + esc(ev.credits) + "</dd>" : "") +
          (ev.info ? "<dt>Note</dt><dd>" + esc(ev.info) + "</dd>" : "") +
        "</dl>" +
        (ev.description ? '<p class="d-desc">' + esc(ev.description) + "</p>" : "") +
      "</div>" +
      '<div class="dialog-actions">' +
        '<button type="button" class="btn btn-solid" data-dlg="cal">＋ Aggiungi al calendario</button>' +
        '<button type="button" class="btn btn-ghost" data-dlg="share">Condividi</button>' +
        '<a class="btn btn-ghost" target="_blank" rel="noopener"' +
          ' href="https://www.google.com/maps/search/?api=1&query=' +
          encodeURIComponent(evLocation(ev)) +
          '">Apri in Google Maps</a>' +
      "</div>";

    var db = document.getElementById("dialogBody");
    db.querySelector('[data-dlg="cal"]').addEventListener("click", function () { calendarMenu(ev, this); });
    db.querySelector('[data-dlg="share"]').addEventListener("click", function () { shareMenu(shareTextEvent(ev), this); });

    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
  }
  function closeDialog() {
    closePopover();
    if (state.ev) { state.ev = null; syncURL(); }
    if (typeof dlg.close === "function" && dlg.open) dlg.close();
    else dlg.removeAttribute("open");
  }

  /* =======================================================================
     EXPORT .ics
     ======================================================================= */
  function icsEscape(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");
  }
  function fold(line) {
    // RFC 5545: piega a 75 ottetti. Conta i byte UTF-8 e non spezza mai un code point.
    var enc = new TextEncoder();
    var out = "", seg = "", segBytes = 0;
    var chars = Array.from(line);
    for (var i = 0; i < chars.length; i++) {
      var b = enc.encode(chars[i]).length;
      if (segBytes + b > 73) { out += (out === "" ? "" : "\r\n ") + seg; seg = chars[i]; segBytes = b; }
      else { seg += chars[i]; segBytes += b; }
    }
    return out + (out === "" ? "" : "\r\n ") + seg;
  }
  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, "0"); }
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "T" +
      p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + "Z";
  }
  var VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:Europe/Rome",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"
  ];

  function vevent(ev) {
    var p = parts(ev.start);
    function pad(n) { return String(n).padStart(2, "0"); }
    var lines = ["BEGIN:VEVENT",
      "UID:" + ev.id + "@tuttiicoloridellapace.vallelaghi",
      "DTSTAMP:" + stamp()];

    if (ev._hasTime) {
      var endP;
      if (ev.end) { endP = parts(ev.end); }
      else {
        var d2 = new Date(p.y, p.m - 1, p.d, p.hh + 2, p.mm);   // default: +2 ore, con rollover corretto
        endP = { y: d2.getFullYear(), m: d2.getMonth() + 1, d: d2.getDate(), hh: d2.getHours(), mm: d2.getMinutes() };
      }
      lines.push("DTSTART;TZID=Europe/Rome:" + p.y + pad(p.m) + pad(p.d) + "T" + pad(p.hh) + pad(p.mm) + "00");
      lines.push("DTEND;TZID=Europe/Rome:" + endP.y + pad(endP.m) + pad(endP.d) + "T" + pad(endP.hh) + pad(endP.mm) + "00");
    } else {
      var startD = ev._startISO.replace(/-/g, "");
      var endD = addDaysISO(ev._endISO, 1).replace(/-/g, "");
      lines.push("DTSTART;VALUE=DATE:" + startD);
      lines.push("DTEND;VALUE=DATE:" + endD);
    }

    var desc = [];
    if (ev.subtitle) desc.push(ev.subtitle);
    if (ev.description) desc.push(ev.description);
    if (ev.credits) desc.push("A cura di: " + ev.credits);
    if (ev.info) desc.push("Note: " + ev.info);
    if (ev.free) desc.push("Ingresso libero.");
    desc.push("— " + META.title + " · " + META.edition + " · " + META.disclaimer);

    lines.push("SUMMARY:" + icsEscape(ev.title));
    lines.push("DESCRIPTION:" + icsEscape(desc.join("\n\n")));
    lines.push("LOCATION:" + icsEscape(ev.venue + (ev.locality ? ", " + ev.locality : "") + ", Vallelaghi (TN), Italia"));
    lines.push("CATEGORIES:" + icsEscape(ev._cat.label));
    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
    return lines.map(fold).join("\r\n");
  }

  function buildICS(list) {
    var head = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//Tutti i colori della pace//XXIV edizione 2026//IT",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "X-WR-CALNAME:" + icsEscape(META.title + " " + META.year),
      "X-WR-TIMEZONE:Europe/Rome",
      "X-WR-CALDESC:" + icsEscape(META.claim)
    ].concat(VTIMEZONE);
    var body = list.map(vevent);
    return head.map(fold).join("\r\n") + "\r\n" + body.join("\r\n") + "\r\nEND:VCALENDAR\r\n";
  }

  function downloadICS(list, name) {
    if (!list.length) { alert("Nessun evento da esportare con i filtri attuali."); return; }
    var blob = new Blob([buildICS(list)], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (name || "tutti-i-colori-della-pace-2026") + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  /* =======================================================================
     STAMPA / PDF
     ======================================================================= */
  function filterSummary() {
    var bits = [];
    if (state.cats.size) bits.push("categorie: " + Array.from(state.cats).map(function (k) { return CATS[k].label; }).join(", "));
    else bits.push("tutte le categorie");
    if (state.locality) bits.push("luogo: " + state.locality);
    if (state.month) bits.push("mese: " + MESI[+state.month.slice(5) - 1] + " " + state.month.slice(0, 4));
    if (state.q) bits.push('ricerca: "' + state.q + '"');
    return bits.join(" · ");
  }

  function buildPrintSheet(list) {
    var host = document.getElementById("printSheet");
    var now = new Date();
    var gen = now.getDate() + " " + MESI[now.getMonth()] + " " + now.getFullYear();

    var html =
      '<div class="print-head">' +
        "<h1>" + esc(META.title) + "</h1>" +
        '<p class="p-edition">' + esc(META.edition + " · " + META.rangeLabel + " · Vallelaghi (TN)") + "</p>" +
        '<p class="p-filters">Selezione: ' + esc(filterSummary()) + " — " + list.length + " appuntamenti</p>" +
      "</div>";

    var groups = {};
    list.forEach(function (ev) { (groups[ev._startISO] = groups[ev._startISO] || []).push(ev); });
    Object.keys(groups).sort().forEach(function (day) {
      html += '<div class="print-day"><h2>' + esc(itLongDate(day)) + " " + day.slice(0, 4) + "</h2>";
      groups[day].forEach(function (ev) {
        var when = ev._hasTime ? "ore " + itTime(ev.start.split("T")[1])
          : (ev.dateEnd ? "mostra, fino al " + itShortDate(ev._endISO) : "");
        html += '<div class="print-ev">' +
          '<span class="p-when">' + esc(when) + '</span> · <span class="p-cat">' + esc(ev._cat.label) + "</span><br>" +
          '<span class="p-t">' + esc(ev.title) + "</span>" + (ev.free ? " (ingresso libero)" : "") +
          ' — <span class="p-where">' + esc(ev.venue + (ev.locality ? ", " + ev.locality : "")) + "</span>" +
          (ev.subtitle ? '<br><span class="p-desc">' + esc(ev.subtitle) + "</span>" : "") +
          "</div>";
      });
      html += "</div>";
    });

    html += '<div class="print-foot">' +
      esc(META.disclaimer + " Info: " + META.contact.phone + " · " + META.contact.email + ". ") +
      "Programma generato il " + esc(gen) + ". Opuscolo completo: " + esc(META.brochure) +
      "</div>";

    host.innerHTML = html;
  }

  /* =======================================================================
     VISTA + RENDER
     ======================================================================= */
  function setView(v) {
    state.view = v;
    var isList = v === "list";
    document.getElementById("listView").hidden = !isList;
    document.getElementById("calendarView").hidden = isList;
    var bl = document.getElementById("viewList"), bc = document.getElementById("viewCalendar");
    bl.classList.toggle("is-active", isList); bl.setAttribute("aria-pressed", String(isList));
    bc.classList.toggle("is-active", !isList); bc.setAttribute("aria-pressed", String(!isList));
    syncURL();
    render();
  }

  function render() {
    var list = filtered();

    var rc = document.getElementById("resultCount");
    var n = list.length, tot = EVENTS.length;
    rc.textContent = n === 0 ? "Nessun evento"
      : (n === tot ? n + " eventi in programma" : n + " eventi su " + tot);

    if (state.view === "list") renderList(list);
    else renderCalendar(list);

    buildPrintSheet(list);
  }

  /* =======================================================================
     URL (link condivisibili) — usa location.hash, compatibile con Pages
     ======================================================================= */
  function syncURL() {
    try {
      var q = new URLSearchParams();
      if (state.q) q.set("q", state.q);
      if (state.locality) q.set("luogo", state.locality);
      if (state.month) q.set("mese", state.month);
      if (state.cats.size) q.set("cat", Array.from(state.cats).join(","));
      if (state.view !== "list") q.set("vista", state.view);
      if (state.ev) q.set("ev", state.ev);
      var s = q.toString();
      history.replaceState(null, "", s ? "#/?" + s : location.pathname + location.search);
    } catch (e) { /* no-op */ }
  }
  function readURL() {
    try {
      var h = location.hash.replace(/^#\/?\??/, "");
      if (!h) return;
      var q = new URLSearchParams(h);
      if (q.get("q")) state.q = q.get("q");
      if (q.get("luogo")) state.locality = q.get("luogo");
      if (q.get("mese")) state.month = q.get("mese");
      if (q.get("cat")) q.get("cat").split(",").forEach(function (c) { if (CATS[c]) state.cats.add(c); });
      if (q.get("vista") === "calendar") state.view = "calendar";
      if (q.get("ev")) state.ev = q.get("ev");
    } catch (e) { /* no-op */ }
  }
  function applyStateToControls() {
    document.getElementById("searchInput").value = state.q;
    document.getElementById("localitySelect").value = state.locality;
    document.getElementById("monthSelect").value = state.month;
    document.querySelectorAll(".chip").forEach(function (b) {
      b.setAttribute("aria-pressed", state.cats.has(b.dataset.cat) ? "true" : "false");
    });
  }

  /* =======================================================================
     HELPERS
     ======================================================================= */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function clip(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }
  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  /* =======================================================================
     CONDIVIDI  +  APRI NEL CALENDARIO (Google / Outlook / .ics)
     ======================================================================= */
  function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function shortDow(isoStr) {
    var a = isoStr.split("-").map(Number);
    return GIORNI[new Date(a[0], a[1] - 1, a[2]).getDay()].slice(0, 3);
  }
  function baseURL() { return location.href.split("#")[0]; }
  function shareURL(ev) { return baseURL() + "#/?ev=" + encodeURIComponent(ev.id); }

  function whenShort(ev) {
    if (ev.dateEnd) return itShortDate(ev._startISO) + "–" + itShortDate(ev._endISO);
    return shortDow(ev._startISO) + " " + itShortDate(ev._startISO) +
      (ev._hasTime ? " ore " + itTime(ev.start.split("T")[1]) : "");
  }
  function shareTextEvent(ev) {
    return "🕊️ " + META.title + " · " + META.edition + "\n" +
      ev.title + (ev.subtitle ? " — " + ev.subtitle : "") + "\n" +
      capFirst(whenShort(ev)) + " · " + ev.venue + (ev.locality ? ", " + ev.locality : "") + "\n" +
      shareURL(ev);
  }
  function shareTextView() {
    var list = filtered();
    var filt = state.cats.size || state.q || state.locality || state.month;
    var lines = ["🕊️ " + META.title + " — " + META.edition];
    lines.push(filt
      ? "Programma · " + filterSummary() + " (" + list.length + " eventi)"
      : META.rangeLabel + " · Vallelaghi (TN)");
    list.slice(0, 8).forEach(function (ev) { lines.push("• " + whenShort(ev) + " — " + ev.title); });
    if (list.length > 8) lines.push("…e altri " + (list.length - 8) + " appuntamenti");
    lines.push(location.href);
    return lines.join("\n");
  }

  function endParts(ev) {
    var p = parts(ev.start);
    if (ev.end) return parts(ev.end);
    var d = new Date(p.y, p.m - 1, p.d, p.hh + 2, p.mm);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate(), hh: d.getHours(), mm: d.getMinutes() };
  }
  function evDetails(ev) {
    var d = [];
    if (ev.subtitle) d.push(ev.subtitle);
    if (ev.description) d.push(ev.description);
    if (ev.credits) d.push("A cura di: " + ev.credits);
    if (ev.info) d.push(ev.info);
    d.push(shareURL(ev));
    return d.join("\n\n");
  }
  function evLocation(ev) {
    return ev.venue + (ev.locality ? ", " + ev.locality : "") + ", Vallelaghi (TN), Italia";
  }
  function gcalUrl(ev) {
    var dates;
    if (ev._hasTime) {
      var p = parts(ev.start), e = endParts(ev);
      var f = function (x) { return x.y + pad2(x.m) + pad2(x.d) + "T" + pad2(x.hh) + pad2(x.mm) + "00"; };
      dates = f(p) + "/" + f(e);
    } else {
      dates = ev._startISO.replace(/-/g, "") + "/" + addDaysISO(ev._endISO, 1).replace(/-/g, "");
    }
    var u = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(ev.title) +
      "&dates=" + dates +
      "&details=" + encodeURIComponent(evDetails(ev)) +
      "&location=" + encodeURIComponent(evLocation(ev));
    if (ev._hasTime) u += "&ctz=Europe/Rome";
    return u;
  }
  function outlookUrl(ev) {
    var u = "https://outlook.live.com/calendar/0/action/compose?rru=addevent" +
      "&subject=" + encodeURIComponent(ev.title) +
      "&body=" + encodeURIComponent(evDetails(ev)) +
      "&location=" + encodeURIComponent(evLocation(ev));
    if (ev._hasTime) {
      var p = parts(ev.start), e = endParts(ev);
      var iso = function (x) { return x.y + "-" + pad2(x.m) + "-" + pad2(x.d) + "T" + pad2(x.hh) + ":" + pad2(x.mm) + ":00"; };
      u += "&startdt=" + iso(p) + "&enddt=" + iso(e);
    } else {
      u += "&allday=true&startdt=" + ev._startISO + "&enddt=" + addDaysISO(ev._endISO, 1);
    }
    return u;
  }

  /* ---- toast + copia negli appunti ---- */
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }
  function copyText(text) {
    var ok = function () { toast("Testo copiato negli appunti"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text, ok); });
    } else legacyCopy(text, ok);
  }
  function legacyCopy(text, ok) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); ok(); } catch (e) { toast("Copia non riuscita"); }
    ta.remove();
  }

  /* ---- popover (menù ancorato a un pulsante) ---- */
  var _pop = null;
  function closePopover() {
    if (!_pop) return;
    _pop.remove(); _pop = null;
    document.removeEventListener("click", _popOutside, true);
    document.removeEventListener("keydown", _popKey, true);
    window.removeEventListener("resize", closePopover);
  }
  function _popOutside(e) { if (_pop && !_pop.contains(e.target)) closePopover(); }
  function _popKey(e) { if (e.key === "Escape") { e.stopPropagation(); closePopover(); } }
  function openPopover(anchor, items) {
    closePopover();
    var pop = document.createElement("div");
    pop.className = "popover";
    items.forEach(function (it) {
      var el;
      if (it.href) {
        el = document.createElement("a");
        el.href = it.href; el.target = "_blank"; el.rel = "noopener";
        el.addEventListener("click", function () { setTimeout(closePopover, 0); });
      } else {
        el = document.createElement("button");
        el.type = "button";
        el.addEventListener("click", function () { closePopover(); it.onClick(); });
      }
      el.className = "popover-item";
      el.textContent = it.label;
      pop.appendChild(el);
    });
    (dlg.open ? dlg : document.body).appendChild(pop);
    var r = anchor.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var left = Math.max(8, Math.min(r.left, vw - pw - 8));
    var top = r.bottom + 6;
    if (top + ph > vh - 8) top = r.top - ph - 6;          // non ci sta sotto: apri sopra
    top = Math.max(8, Math.min(top, vh - ph - 8));         // comunque dentro lo schermo
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    _pop = pop;
    setTimeout(function () {
      document.addEventListener("click", _popOutside, true);
      document.addEventListener("keydown", _popKey, true);
      window.addEventListener("resize", closePopover);
    }, 0);
  }

  function calendarMenu(ev, anchor) {
    openPopover(anchor, [
      { label: "Google Calendar", href: gcalUrl(ev) },
      { label: "Outlook.com", href: outlookUrl(ev) },
      { label: "Scarica .ics (Apple, Outlook…)", onClick: function () { downloadICS([ev], "evento-" + ev.id); } },
    ]);
  }
  function shareMenu(text, anchor) {
    if (navigator.share) { navigator.share({ title: META.title, text: text }).catch(function () {}); return; }
    openPopover(anchor, [
      { label: "WhatsApp", href: "https://wa.me/?text=" + encodeURIComponent(text) },
      { label: "Telegram", href: "https://t.me/share/url?url=" + encodeURIComponent(location.href) + "&text=" + encodeURIComponent(text) },
      { label: "E-mail", href: "mailto:?subject=" + encodeURIComponent(META.title + " · " + META.edition) + "&body=" + encodeURIComponent(text) },
      { label: "Copia testo", onClick: function () { copyText(text); } },
    ]);
  }

  /* =======================================================================
     EVENTI UI
     ======================================================================= */
  function resetAll() {
    state.q = ""; state.locality = ""; state.month = ""; state.cats.clear();
    applyStateToControls(); syncURL(); render();
  }

  function wireEvents() {
    document.getElementById("searchInput").addEventListener("input", debounce(function (e) {
      state.q = e.target.value.trim(); syncURL(); render();
    }, 180));
    document.getElementById("localitySelect").addEventListener("change", function (e) {
      state.locality = e.target.value; syncURL(); render();
    });
    document.getElementById("monthSelect").addEventListener("change", function (e) {
      state.month = e.target.value; syncURL(); render();
    });
    document.getElementById("viewList").addEventListener("click", function () { setView("list"); });
    document.getElementById("viewCalendar").addEventListener("click", function () { setView("calendar"); });
    document.getElementById("resetBtn").addEventListener("click", resetAll);
    document.getElementById("emptyResetBtn").addEventListener("click", resetAll);
    document.getElementById("printBtn").addEventListener("click", function () {
      buildPrintSheet(filtered());
      window.print();
    });
    document.getElementById("icsBtn").addEventListener("click", function () {
      var list = filtered();
      var tag = state.cats.size === 1 ? "-" + Array.from(state.cats)[0] : (state.cats.size ? "-selezione" : "");
      downloadICS(list, "tutti-i-colori-della-pace-2026" + tag);
    });
    var sv = document.getElementById("shareViewBtn");
    sv.addEventListener("click", function () { shareMenu(shareTextView(), sv); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closePopover(); closeDialog(); } });
  }

  /* =======================================================================
     AVVIO
     ======================================================================= */
  fillStatic();
  buildChips();
  buildLocalities();
  readURL();
  applyStateToControls();
  wireEvents();
  setView(state.view);   // esegue render()

  // link condivisibile a un evento: #/?ev=<id> apre la scheda
  if (state.ev) {
    var _deep = EVENTS.find(function (e) { return e.id === state.ev; });
    if (_deep) openDialog(_deep); else { state.ev = null; syncURL(); }
  }
})();
