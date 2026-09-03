// Genera il file .ics statico completo da assets/data.js.
// Uso:  node scripts/gen-ics.js   (dalla cartella del progetto)
// Le funzioni sono le stesse di assets/app.js, con DTSTAMP fisso per diff Git puliti.
const fs = require("fs");
const path = require("path");
const PROJ = path.resolve(__dirname, "..");
global.window = {};
require(path.join(PROJ, "assets", "data.js"));
const DATA = window.TCDP, CATS = DATA.categories, META = DATA.meta;
const EVENTS = DATA.events.slice();
const DTSTAMP = "20260101T000000Z"; // fisso: il file cambia solo se cambiano i dati

function parts(s){var d=s.split("T");var y=d[0].split("-").map(Number);var h=d[1]?d[1].split(":").map(Number):[0,0];return{y:y[0],m:y[1],d:y[2],hh:h[0],mm:h[1],hasTime:!!d[1]};}
function iso(p){return p.y+"-"+String(p.m).padStart(2,"0")+"-"+String(p.d).padStart(2,"0");}
function addDaysISO(s,n){var a=s.split("-").map(Number);var d=new Date(a[0],a[1]-1,a[2]+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
EVENTS.forEach(function(e){var p=parts(e.start);e._startISO=iso(p);e._endISO=e.dateEnd||e._startISO;e._hasTime=p.hasTime&&!e.allDay;e._cat=CATS[e.category];});
EVENTS.sort(function(a,b){return a._startISO<b._startISO?-1:1;});

function icsEscape(s){return String(s==null?"":s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");}
function fold(line){var enc=new TextEncoder();var out="",seg="",b=0;var ch=Array.from(line);for(var i=0;i<ch.length;i++){var n=enc.encode(ch[i]).length;if(b+n>73){out+=(out===""?"":"\r\n ")+seg;seg=ch[i];b=n;}else{seg+=ch[i];b+=n;}}return out+(out===""?"":"\r\n ")+seg;}
var VTIMEZONE=["BEGIN:VTIMEZONE","TZID:Europe/Rome","BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT","BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"];
function vevent(ev){var p=parts(ev.start);function pad(n){return String(n).padStart(2,"0");}var L=["BEGIN:VEVENT","UID:"+ev.id+"@tuttiicoloridellapace.vallelaghi","DTSTAMP:"+DTSTAMP];
if(ev._hasTime){var eP;if(ev.end){eP=parts(ev.end);}else{var d2=new Date(p.y,p.m-1,p.d,p.hh+2,p.mm);eP={y:d2.getFullYear(),m:d2.getMonth()+1,d:d2.getDate(),hh:d2.getHours(),mm:d2.getMinutes()};}
L.push("DTSTART;TZID=Europe/Rome:"+p.y+pad(p.m)+pad(p.d)+"T"+pad(p.hh)+pad(p.mm)+"00");
L.push("DTEND;TZID=Europe/Rome:"+eP.y+pad(eP.m)+pad(eP.d)+"T"+pad(eP.hh)+pad(eP.mm)+"00");}
else{L.push("DTSTART;VALUE=DATE:"+ev._startISO.replace(/-/g,""));L.push("DTEND;VALUE=DATE:"+addDaysISO(ev._endISO,1).replace(/-/g,""));}
var d=[];if(ev.subtitle)d.push(ev.subtitle);if(ev.description)d.push(ev.description);if(ev.credits)d.push("A cura di: "+ev.credits);if(ev.info)d.push("Note: "+ev.info);if(ev.free)d.push("Ingresso libero.");d.push("\u2014 "+META.title+" \u00b7 "+META.edition+" \u00b7 "+META.disclaimer);
L.push("SUMMARY:"+icsEscape(ev.title));L.push("DESCRIPTION:"+icsEscape(d.join("\n\n")));L.push("LOCATION:"+icsEscape(ev.venue+(ev.locality?", "+ev.locality:"")+", Vallelaghi (TN), Italia"));L.push("CATEGORIES:"+icsEscape(ev._cat.label));L.push("STATUS:CONFIRMED");L.push("END:VEVENT");
return L.map(fold).join("\r\n");}
var head=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Tutti i colori della pace//XXIV edizione 2026//IT","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:"+icsEscape(META.title+" "+META.year),"X-WR-TIMEZONE:Europe/Rome","X-WR-CALDESC:"+icsEscape(META.claim)].concat(VTIMEZONE);
var ics=head.map(fold).join("\r\n")+"\r\n"+EVENTS.map(vevent).join("\r\n")+"\r\nEND:VCALENDAR\r\n";
var outFile=path.join(PROJ,"calendario-tutti-i-colori-della-pace-2026.ics");
fs.writeFileSync(outFile,ics);
console.log("Scritto "+outFile+" ("+EVENTS.length+" eventi, "+Buffer.byteLength(ics,"utf8")+" byte)");
