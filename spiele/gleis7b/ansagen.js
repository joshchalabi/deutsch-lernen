/* GLEIS 7B — Ansagesprache
   Jede Durchsage wird aus Bausteinen zusammengesetzt. Die Audiodateien
   heißen wie die IDs hier; aus wenigen Schnipseln entstehen tausende Ansagen.
   Zahlen sind ausgeschrieben, damit die Aussprache eindeutig ist. */

const GLEISE = [
  { id: "1",  wort: "Gleis eins" },
  { id: "2",  wort: "Gleis zwei" },
  { id: "3",  wort: "Gleis drei" },
  { id: "4",  wort: "Gleis vier" },
  { id: "5",  wort: "Gleis fünf" },
  { id: "6",  wort: "Gleis sechs" },
  { id: "7a", wort: "Gleis sieben a" },
  { id: "7b", wort: "Gleis sieben b" },
  { id: "8",  wort: "Gleis acht" },
  { id: "9",  wort: "Gleis neun" },
  { id: "10", wort: "Gleis zehn" },
  { id: "11", wort: "Gleis elf" },
  { id: "12", wort: "Gleis zwölf" }
];

const ZUEGE = [
  { id: "ice574",  kurz: "ICE 574",  wort: "Der I C E fünfhundertvierundsiebzig" },
  { id: "ice692",  kurz: "ICE 692",  wort: "Der I C E sechshundertzweiundneunzig" },
  { id: "ice1093", kurz: "ICE 1093", wort: "Der I C E tausenddreiundneunzig" },
  { id: "ice271",  kurz: "ICE 271",  wort: "Der I C E zweihunderteinundsiebzig" },
  { id: "ice842",  kurz: "ICE 842",  wort: "Der I C E achthundertzweiundvierzig" },
  { id: "ice1587", kurz: "ICE 1587", wort: "Der I C E tausendfünfhundertsiebenundachtzig" },
  { id: "ic2045",  kurz: "IC 2045",  wort: "Der I C zweitausendfünfundvierzig" },
  { id: "ic118",   kurz: "IC 118",   wort: "Der I C einhundertachtzehn" },
  { id: "ic2310",  kurz: "IC 2310",  wort: "Der I C zweitausenddreihundertzehn" },
  { id: "ic609",   kurz: "IC 609",   wort: "Der I C sechshundertneun" },
  { id: "ic1925",  kurz: "IC 1925",  wort: "Der I C tausendneunhundertfünfundzwanzig" },
  { id: "ec113",   kurz: "EC 113",   wort: "Der E C einhundertdreizehn" },
  { id: "ec216",   kurz: "EC 216",   wort: "Der E C zweihundertsechzehn" },
  { id: "re4",     kurz: "RE 4",     wort: "Der R E vier" },
  { id: "re8",     kurz: "RE 8",     wort: "Der R E acht" },
  { id: "re12",    kurz: "RE 12",    wort: "Der R E zwölf" },
  { id: "re60",    kurz: "RE 60",    wort: "Der R E sechzig" },
  { id: "re33",    kurz: "RE 33",    wort: "Der R E dreiunddreißig" },
  { id: "re41",    kurz: "RE 41",    wort: "Der R E einundvierzig" },
  { id: "re77",    kurz: "RE 77",    wort: "Der R E siebenundsiebzig" }
];

const ZIELE = [
  { id: "muenchen",  kurz: "München",          wort: "nach München Hauptbahnhof" },
  { id: "hamburg",   kurz: "Hamburg-Altona",   wort: "nach Hamburg-Altona" },
  { id: "berlin",    kurz: "Berlin Hbf",       wort: "nach Berlin Hauptbahnhof" },
  { id: "koeln",     kurz: "Köln",             wort: "nach Köln Hauptbahnhof" },
  { id: "frankfurt", kurz: "Frankfurt (Main)", wort: "nach Frankfurt am Main" },
  { id: "stuttgart", kurz: "Stuttgart",        wort: "nach Stuttgart Hauptbahnhof" },
  { id: "leipzig",   kurz: "Leipzig",          wort: "nach Leipzig Hauptbahnhof" },
  { id: "dresden",   kurz: "Dresden",          wort: "nach Dresden Hauptbahnhof" },
  { id: "bremen",    kurz: "Bremen",           wort: "nach Bremen Hauptbahnhof" },
  { id: "hannover",  kurz: "Hannover",         wort: "nach Hannover Hauptbahnhof" },
  { id: "nuernberg", kurz: "Nürnberg",         wort: "nach Nürnberg Hauptbahnhof" },
  { id: "duesseldorf", kurz: "Düsseldorf",     wort: "nach Düsseldorf Hauptbahnhof" },
  { id: "dortmund",  kurz: "Dortmund",         wort: "nach Dortmund Hauptbahnhof" },
  { id: "basel",     kurz: "Basel SBB",        wort: "nach Basel S B B" },
  { id: "wien",      kurz: "Wien Hbf",         wort: "nach Wien Hauptbahnhof" },
  { id: "amsterdam", kurz: "Amsterdam C.",     wort: "nach Amsterdam Centraal" }
];

const ZEITEN = [
  { id: "0612", uhr: "06:12", wort: "planmäßige Abfahrt sechs Uhr zwölf" },
  { id: "0705", uhr: "07:05", wort: "planmäßige Abfahrt sieben Uhr fünf" },
  { id: "0834", uhr: "08:34", wort: "planmäßige Abfahrt acht Uhr vierunddreißig" },
  { id: "0947", uhr: "09:47", wort: "planmäßige Abfahrt neun Uhr siebenundvierzig" },
  { id: "1019", uhr: "10:19", wort: "planmäßige Abfahrt zehn Uhr neunzehn" },
  { id: "1123", uhr: "11:23", wort: "planmäßige Abfahrt elf Uhr dreiundzwanzig" },
  { id: "1208", uhr: "12:08", wort: "planmäßige Abfahrt zwölf Uhr acht" },
  { id: "1341", uhr: "13:41", wort: "planmäßige Abfahrt dreizehn Uhr einundvierzig" },
  { id: "1422", uhr: "14:22", wort: "planmäßige Abfahrt vierzehn Uhr zweiundzwanzig" },
  { id: "1556", uhr: "15:56", wort: "planmäßige Abfahrt fünfzehn Uhr sechsundfünfzig" },
  { id: "1610", uhr: "16:10", wort: "planmäßige Abfahrt sechzehn Uhr zehn" },
  { id: "1752", uhr: "17:52", wort: "planmäßige Abfahrt siebzehn Uhr zweiundfünfzig" },
  { id: "1837", uhr: "18:37", wort: "planmäßige Abfahrt achtzehn Uhr siebenunddreißig" },
  { id: "1904", uhr: "19:04", wort: "planmäßige Abfahrt neunzehn Uhr vier" },
  { id: "2029", uhr: "20:29", wort: "planmäßige Abfahrt zwanzig Uhr neunundzwanzig" },
  { id: "2148", uhr: "21:48", wort: "planmäßige Abfahrt einundzwanzig Uhr achtundvierzig" }
];

const MINUTEN = [
  { id: "5",  zahl: 5,  wort: "fünf" },
  { id: "10", zahl: 10, wort: "zehn" },
  { id: "15", zahl: 15, wort: "fünfzehn" },
  { id: "20", zahl: 20, wort: "zwanzig" },
  { id: "25", zahl: 25, wort: "fünfundzwanzig" },
  { id: "30", zahl: 30, wort: "dreißig" }
];

const WAGEN = [
  { id: "3",  nr: 3,  wort: "Wagen drei" },
  { id: "5",  nr: 5,  wort: "Wagen fünf" },
  { id: "7",  nr: 7,  wort: "Wagen sieben" },
  { id: "9",  nr: 9,  wort: "Wagen neun" },
  { id: "11", nr: 11, wort: "Wagen elf" },
  { id: "12", nr: 12, wort: "Wagen zwölf" },
  { id: "14", nr: 14, wort: "Wagen vierzehn" }
];

const ABSCHNITTE = [
  { id: "A", wort: "Abschnitt A" },
  { id: "B", wort: "Abschnitt B" },
  { id: "C", wort: "Abschnitt C" },
  { id: "D", wort: "Abschnitt D" },
  { id: "E", wort: "Abschnitt E" }
];

const BAUSTEINE = {
  eroeffnung: [
    { id: "e1", wort: "Information für unsere Reisenden." },
    { id: "e2", wort: "Wir bitten um Ihre Aufmerksamkeit." },
    { id: "e3", wort: "Achtung auf dem Bahnsteig." },
    { id: "e4", wort: "Eine Durchsage der Deutschen Bahn." },
    { id: "e5", wort: "Hinweis für alle Reisenden." }
  ],
  kern: [
    { id: "k-von",     wort: "fährt heute von" },
    { id: "k-statt",   wort: "statt" },
    { id: "k-verspaet",wort: "hat voraussichtlich" },
    { id: "k-minuten", wort: "Minuten Verspätung." },
    { id: "k-ausfall", wort: "fällt heute leider aus." },
    { id: "k-ersatz",  wort: "Als Ersatz verkehrt" },
    { id: "k-wagen",   wort: "hat heute eine geänderte Wagenreihung." },
    { id: "k-durch",   wort: "fährt heute ohne Halt durch." },
    { id: "k-reihung", wort: "fährt heute mit geänderter Wagenreihung." },
    { id: "k-haelt",   wort: "hält heute in" }
  ],
  grund: [
    { id: "g1", wort: "Grund dafür ist eine Verzögerung im Betriebsablauf." },
    { id: "g2", wort: "Grund dafür ist eine vorangegangene Betriebsstörung." },
    { id: "g3", wort: "Grund dafür ist die verspätete Bereitstellung des Zuges." },
    { id: "g4", wort: "Grund dafür ist eine Stellwerksstörung." },
    { id: "g5", wort: "Grund dafür sind Personen im Gleis." },
    { id: "g6", wort: "Grund dafür ist ein ärztlicher Notfall in einem vorausfahrenden Zug." }
  ],
  schluss: [
    { id: "s1", wort: "Wir bitten um Verständnis." },
    { id: "s2", wort: "Wir bitten um Beachtung." },
    { id: "s3", wort: "Wir bitten um Entschuldigung." },
    { id: "s4", wort: "Vorsicht bei der Einfahrt." }
  ],
  atmo: [
    { id: "a1", wort: "Zurückbleiben, bitte." },
    { id: "a2", wort: "Bitte beachten Sie die Lücke zwischen Zug und Bahnsteigkante." },
    { id: "a3", wort: "Vorsicht am Gleis, ein Zug fährt durch." },
    { id: "a4", wort: "Der Zug endet hier. Bitte alle aussteigen." }
  ]
};

const BAHNHOF = {
  name: "Hannover Hauptbahnhof",
  gleise: GLEISE.map((g) => g.id)
};
