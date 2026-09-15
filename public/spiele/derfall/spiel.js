/* DER FALL — Ermittlung, Stufen und Tonspur */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sanft = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PAPIER = "#C9C4B1";
  const RANG = { a2: 0, b1: 1, b2: 2 };

  const S = {
    stufe: "b1",
    zeit: AKTE.beginn,
    indizien: {}, erledigt: {}, besucht: {}, nachgehakt: {},
    aktiv: null, jagd: false,
    tr: false, ton: true, hoeren: false, tempo: 1,
    vorbei: false
  };

  const T = (x) => (typeof x === "string" ? x : (x[S.stufe] || x.b1 || x.a2));
  const tellAktiv = (a) => !!a.tell && RANG[a.abStufe || "a2"] <= RANG[S.stufe];
  const person = (id) => VERDAECHTIGE.find((v) => v.id === id);
  const wahl = (liste) => liste[Math.floor(Math.random() * liste.length)];

  /* =================== Tonspur =================== */

  let MANIFEST = null;
  const vorgeladen = {};

  fetch("ton/manifest.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => { MANIFEST = m; kennzeichne(); })
    .catch(() => { MANIFEST = null; kennzeichne(); });

  function kennzeichne() {
    const k = $("tonwarnung");
    if (!k) return;
    k.hidden = !!MANIFEST;
  }

  /* Ein einziges Audio-Element für alles: Es wird bei der ersten echten
     Geste freigeschaltet und danach nur noch mit neuen Quellen bestückt.
     Kein Springen in einer Sammeldatei, keine Stoppuhr — ein Schnipsel
     endet, wenn der Browser „ended" meldet. */
  let spieler = null, abbruch = null, laufNr = 0, kette = [];

  function tonElement() {
    if (!spieler) {
      spieler = new Audio();
      spieler.preload = "auto";
    }
    spieler.playbackRate = S.tempo;
    return spieler;
  }

  function vorladen(ids) {
    if (!MANIFEST) return;
    ids.forEach((id) => {
      const d = MANIFEST[id];
      if (d && !vorgeladen[d]) {
        vorgeladen[d] = true;
        fetch("ton/" + d + ".mp3").catch(() => {});
      }
    });
  }

  function stoppe() {
    laufNr++;
    kette = [];
    if (abbruch) { abbruch(); abbruch = null; }
    if (spieler) { try { spieler.pause(); } catch (e) { /* egal */ } }
  }

  function sagen(rolle, id, text) { sagenFolge([{ rolle: rolle, id: id, text: text }]); }

  function sagenFolge(liste) {
    if (!S.ton) return;
    stoppe();
    const nr = laufNr;
    kette = liste.filter((x) => x && x.text);
    vorladen(kette.map((x) => x.id));
    weiter(nr);
  }

  function weiter(nr) {
    if (nr !== laufNr) return;
    const n = kette.shift();
    if (!n) return;
    const datei = MANIFEST && n.id && MANIFEST[n.id];
    if (datei) return schnipsel(datei, () => weiter(nr));
    weiter(nr);                       // keine Aufnahme: still überspringen
  }

  function schnipsel(datei, danach) {
    const a = tonElement();
    const quelle = "ton/" + datei + ".mp3";
    let erledigt = false;
    const fertig = () => {
      if (erledigt) return;
      erledigt = true;
      a.removeEventListener("ended", fertig);
      a.removeEventListener("error", fertig);
      if (abbruch === still) abbruch = null;
      danach();
    };
    const still = () => {
      erledigt = true;
      a.removeEventListener("ended", fertig);
      a.removeEventListener("error", fertig);
    };
    if (abbruch) abbruch();
    abbruch = still;

    a.addEventListener("ended", fertig);
    a.addEventListener("error", fertig);
    if (a.src.indexOf(quelle) < 0) a.src = quelle;
    else a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) p.catch(fertig);
  }

  /* =================== Geräusche =================== */

  let AC = null;
  function klang(art) {
    if (!S.ton) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
    } catch (e) { return; }
    const tief = art === "stempel";
    const buf = AC.createBuffer(1, Math.ceil(AC.sampleRate * (tief ? 0.22 : 0.03)), AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, tief ? 2.2 : 4.5);
    const src = AC.createBufferSource(); src.buffer = buf;
    const f = AC.createBiquadFilter();
    f.type = tief ? "lowpass" : "bandpass";
    f.frequency.value = tief ? 250 : 2100;
    const g = AC.createGain(); g.gain.value = tief ? 0.5 : 0.08;
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start();
  }

  /* =================== Bausteine =================== */

  function trBlock(html) {
    const s = document.createElement("span");
    s.className = "tr";
    s.innerHTML = html;
    s.hidden = !S.tr;
    return s;
  }

  /* Im Hörmodus wird alles Gesprochene unscharf, bis man es anklickt.
     Gilt für den Aktenbericht, den Vorspann, die Eingangsworte und die
     Aussagen — überall dort, wo zuerst das Ohr entscheiden soll. */
  function verdecken(traeger, satzEl) {
    if (!S.hoeren) return traeger;
    traeger.classList.add("verdeckt");
    satzEl.addEventListener("click", (e) => {
      if (!traeger.classList.contains("verdeckt")) return;
      e.stopPropagation();
      traeger.classList.remove("verdeckt");
    });
    return traeger;
  }

  function tonKnopf(rolle, id, text, beschriftung) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "knopf mini";
    b.textContent = beschriftung || "▶ anhören";
    b.addEventListener("click", (e) => { e.stopPropagation(); sagen(rolle, id, text); });
    return b;
  }

  function portraet(typ) {
    const schulter = '<path d="M17 100c2-26 16-36 33-36s31 10 33 36z"/>';
    const kopf = '<ellipse cx="50" cy="42" rx="16" ry="19"/>';
    const merkmal = {
      saengerin:
        '<path d="M28 46c-6-24 7-34 22-34s28 10 22 34c-1-12-5-17-5-17-6 5-22 6-31 3 0 0-6 5-8 14z"/>' +
        '<circle cx="74" cy="23" r="3.6"/><path d="M75 21c7-8 16-10 23-7-7 7-15 10-23 7z"/>' +
        '<path d="M31 31c11-7 27-7 38 0l-1.6 4.4c-10-6-25-6-35 0z" fill="' + PAPIER + '"/>',
      pianist:
        '<path d="M32 34c3-15 33-15 36 0 3-8-2-21-18-21s-21 13-18 21z"/>' +
        '<g fill="none" stroke="' + PAPIER + '" stroke-width="2.6">' +
        '<circle cx="41" cy="43" r="7.5"/><circle cx="59" cy="43" r="7.5"/>' +
        '<path d="M48.5 43h3"/><path d="M33.5 41l-5-2M66.5 41l5-2"/></g>',
      garderobiere:
        '<circle cx="50" cy="13" r="9.5"/>' +
        '<path d="M31 46c-2-18 7-26 19-26s21 8 19 26c-3-12-9-16-19-16s-16 4-19 16z"/>' +
        '<path d="M26 86h48" stroke="' + PAPIER + '" stroke-width="3" fill="none"/>',
      kellner:
        '<path d="M32 33c4-14 32-14 36 0 2-10-4-19-18-19s-20 9-18 19z"/>' +
        '<path d="M41 65l9 17 9-17z" fill="' + PAPIER + '"/>' +
        '<path d="M50 72l-11-5v10zM50 72l11-5v10z"/><rect x="46.5" y="69" width="7" height="6" rx="1.5"/>'
    };
    return '<svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">' +
      schulter + kopf + (merkmal[typ] || "") + "</svg>";
  }

  /* =================== Uhr & Stand =================== */

  const noetig = () => STUFEN[S.stufe].noetig;

  function renderUhr() {
    const h = Math.floor(S.zeit / 60) % 24, m = S.zeit % 60;
    $("uhrzeit").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    const rest = AKTE.schluss - S.zeit;
    $("uhrtext").textContent = rest > 0 ? "noch " + rest + " Minuten" : "Morgengrauen";
    $("uhr").classList.toggle("knapp", rest <= 60);
  }

  function kosten(min) {
    if (S.vorbei) return;
    S.zeit += min;
    if (S.zeit >= AKTE.schluss) { S.zeit = AKTE.schluss; renderUhr(); return ende("zeit"); }
    renderUhr();
  }

  function aktiveIndizien() {
    const set = {};
    VERDAECHTIGE.forEach((v) => v.aussagen.forEach((a) => { if (tellAktiv(a)) set[a.tell] = true; }));
    return Object.keys(set);
  }

  function stand() {
    const n = Object.keys(S.indizien).length;
    $("notizzahl").textContent = n;
    $("fussstand").textContent = "Stufe " + STUFEN[S.stufe].code + " · Indizien " + n +
      " / " + aktiveIndizien().length + " · für die Anklage nötig: " + noetig();
    return n;
  }

  /* =================== Szenen =================== */

  function zeige(name) {
    stoppe();
    beendeJagd();
    document.querySelectorAll(".szene").forEach((s) => { s.hidden = s.id !== "szene-" + name; });
    const bezug = { verhoer: "kartei", schluss: "anklage" };
    const a = name in bezug ? bezug[name] : name;
    document.querySelectorAll("#reiter button").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.szene === a));
    });
    if (name === "kartei") renderKartei();
    if (name === "notizbuch") renderNotizbuch();
    if (name === "anklage") renderAnklage();
    window.scrollTo({ top: 0, behavior: sanft ? "auto" : "smooth" });
  }

  function renderBericht() {
    const box = $("bericht");
    box.textContent = "";
    const absaetze = [{ de: AKTE.prolog.de, tr: AKTE.prolog.tr,
                        id: "erz-prolog@" + S.stufe, kursiv: true }]
      .concat(AKTE.bericht.map((b, i) => ({ de: b.de, tr: b.tr,
                                            id: "erz-b" + i + "@" + S.stufe })));
    absaetze.forEach((abs) => {
      const p = document.createElement("p");
      p.className = "berichtsatz" + (abs.kursiv ? " kursiv" : "");
      const satz = document.createElement("span");
      satz.className = "satz";
      satz.textContent = T(abs.de);
      p.appendChild(satz);
      p.appendChild(trBlock(abs.tr));
      p.appendChild(tonKnopf("erzaehler", abs.id, T(abs.de), "▶"));
      verdecken(p, satz);
      box.appendChild(p);
    });
  }

  function lesAkte() {
    sagenFolge([{ rolle: "erzaehler", id: "erz-prolog@" + S.stufe, text: T(AKTE.prolog.de) }]
      .concat(AKTE.bericht.map((b, i) => ({ rolle: "erzaehler", id: "erz-b" + i + "@" + S.stufe, text: T(b.de) }))));
  }

  /* =================== Kartei =================== */

  function renderKartei() {
    const box = $("kartei");
    box.textContent = "";
    VERDAECHTIGE.forEach((v) => {
      const gesamt = v.aussagen.filter(tellAktiv).length;
      const hat = v.aussagen.filter((a, i) => tellAktiv(a) && S.erledigt[v.id + ":" + i]).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "karte" + (S.besucht[v.id] ? " befragt" : "");
      b.innerHTML = portraet(v.typ) + "<h3>" + v.name + "</h3>" +
        '<p class="rolle">' + v.alter + " Jahre · " + v.rolle + "</p>" +
        "<blockquote>„" + T(v.eingang) + "“</blockquote>";
      b.querySelector("blockquote").appendChild(trBlock(v.eingangTr));
      const f = document.createElement("div");
      f.className = "fortschritt";
      f.innerHTML = "<span>Widersprüche " + hat + "/" + gesamt + "</span>" +
        (gesamt && hat === gesamt ? "<b>fertig</b>" : "<span>verhören</span>");
      b.appendChild(f);
      b.addEventListener("click", () => oeffneVerhoer(v.id));
      box.appendChild(b);
    });
    stand();
  }

  /* =================== Verhör =================== */

  function oeffneVerhoer(id) {
    S.aktiv = id;
    const neu = !S.besucht[id];
    S.besucht[id] = true;
    beendeJagd();
    renderVerhoer();
    zeige("verhoer");
    const v = person(id);
    vorladen([].concat(
      [id + "-ein@" + S.stufe, id + "-zus@" + S.stufe, "erz-vor-" + id + "@" + S.stufe],
      v.aussagen.map((a, i) => id + "-a" + i + "@" + S.stufe),
      v.aussagen.map((a, i) => id + "-n" + i + "@" + S.stufe)));
    const folge = [];
    if (neu) folge.push({ rolle: "erzaehler", id: "erz-vor-" + id + "@" + S.stufe, text: T(v.vorspann) });
    folge.push({ rolle: id, id: id + "-ein@" + S.stufe, text: T(v.eingang) });
    sagenFolge(folge);
  }

  function renderVerhoer(beweisFuer) {
    const v = person(S.aktiv);
    const sz = $("szene-verhoer");
    sz.textContent = "";

    const gesamt = v.aussagen.filter(tellAktiv).length;
    const hat = v.aussagen.filter((a, i) => tellAktiv(a) && S.erledigt[v.id + ":" + i]).length;

    const kopf = document.createElement("div");
    kopf.className = "verhoerkopf";
    kopf.innerHTML = portraet(v.typ) +
      "<div><h2>" + v.name + "</h2><p>" + v.alter + " Jahre · " + v.rolle + "</p>" +
      '<div class="druck">Widersprüche <span>' +
      Array.from({ length: gesamt }, (_, i) => '<i class="' + (i < hat ? "voll" : "") + '"></i>').join("") +
      "</span> " + hat + " / " + gesamt + "</div></div>";
    sz.appendChild(kopf);

    const vs = document.createElement("p");
    vs.className = "vorspann";
    const vsSatz = document.createElement("span");
    vsSatz.className = "satz";
    vsSatz.textContent = T(v.vorspann);
    vs.appendChild(vsSatz);
    vs.appendChild(trBlock(v.vorspannTr));
    vs.appendChild(tonKnopf("erzaehler", "erz-vor-" + v.id + "@" + S.stufe, T(v.vorspann), "▶"));
    verdecken(vs, vsSatz);
    sz.appendChild(vs);

    const ein = document.createElement("p");
    ein.className = "eingang";
    const einT = document.createElement("span");
    einT.className = "satz";
    einT.textContent = "„" + T(v.eingang) + "“";
    einT.appendChild(trBlock(v.eingangTr));
    ein.appendChild(einT);
    verdecken(ein, einT);
    ein.appendChild(tonKnopf(v.id, v.id + "-ein@" + S.stufe, T(v.eingang), "▶ nochmal"));
    sz.appendChild(ein);

    if (S.jagd) {
      const ban = document.createElement("div");
      ban.className = "jagdbanner";
      ban.innerHTML = "<span>Welche Aussage verrät ihn? Klicken Sie sie an.</span>";
      const ab = document.createElement("button");
      ab.type = "button"; ab.textContent = "Abbrechen";
      ab.addEventListener("click", () => { beendeJagd(); renderVerhoer(); });
      ban.appendChild(ab);
      sz.appendChild(ban);
    }

    const liste = document.createElement("div");
    liste.className = "aussagen";
    v.aussagen.forEach((a, i) => {
      liste.appendChild(aussageKarte(v, a, i));
      if (beweisFuer === i) liste.appendChild(beweisKarte(v, i));
    });
    sz.appendChild(liste);

    if (gesamt > 0 && hat === gesamt) {
      const z = document.createElement("p");
      z.className = "eingang";
      const t = document.createElement("span");
      t.innerHTML = "<strong>„" + v.zusammenbruch + "“</strong>";
      t.appendChild(trBlock(v.zusammenbruchTr));
      z.appendChild(t);
      z.appendChild(tonKnopf(v.id, v.id + "-zus@" + S.stufe, v.zusammenbruch, "▶ nochmal"));
      sz.appendChild(z);
    }

    const w = document.createElement("div");
    w.className = "werkzeug";
    if (!S.jagd && beweisFuer == null) {
      const j = document.createElement("button");
      j.type = "button"; j.className = "knopf rot"; j.textContent = "Widerspruch!";
      j.addEventListener("click", starteJagd);
      w.appendChild(j);

      const vor = document.createElement("button");
      vor.type = "button"; vor.className = "knopf"; vor.textContent = "Ganze Aussage vorlesen";
      vor.addEventListener("click", () => sagenFolge(v.aussagen.map((a, i) =>
        ({ rolle: v.id, id: v.id + "-a" + i + "@" + S.stufe, text: T(a.de) }))));
      w.appendChild(vor);

      const h = document.createElement("button");
      h.type = "button"; h.className = "knopf"; h.textContent = "Hinweis −20";
      h.addEventListener("click", () => hinweis(v));
      w.appendChild(h);
    }
    const zur = document.createElement("button");
    zur.type = "button"; zur.className = "knopf"; zur.textContent = "Zur Kartei";
    zur.addEventListener("click", () => zeige("kartei"));
    w.appendChild(zur);
    sz.appendChild(w);

    if (beweisFuer != null) {
      const k = sz.querySelector(".beweisfrage");
      if (k) k.scrollIntoView({ block: "center", behavior: sanft ? "auto" : "smooth" });
    }
  }

  function aussageKarte(v, a, i) {
    const key = v.id + ":" + i;
    const fertig = !!S.erledigt[key];
    const el = document.createElement("div");
    el.className = "aussage" + (fertig ? " erledigt" : "");

    const kopf = document.createElement("div");
    kopf.className = "kopfzeile";
    kopf.innerHTML = "<span>Aussage " + (i + 1) + "</span>" + (fertig ? "<b>Widerspruch belegt</b>" : "");
    el.appendChild(kopf);

    const satz = document.createElement("div");
    satz.className = "satz";
    satz.textContent = "„" + T(a.de) + "“";
    satz.appendChild(trBlock(a.tr));
    el.appendChild(satz);
    if (!fertig) verdecken(el, satz);

    if (S.nachgehakt[key] && a.nach) {
      const n = document.createElement("div");
      n.className = "nachtext";
      n.textContent = "„" + T(a.nach.de) + "“";
      n.appendChild(trBlock(a.nach.tr));
      el.appendChild(n);
    }

    const wz = document.createElement("div");
    wz.className = "werkzeuge";
    wz.appendChild(tonKnopf(v.id, v.id + "-a" + i + "@" + S.stufe, T(a.de)));
    if (a.nach && !S.nachgehakt[key]) {
      const nb = document.createElement("button");
      nb.type = "button"; nb.className = "knopf mini"; nb.textContent = "nachhaken −5";
      nb.addEventListener("click", (e) => {
        e.stopPropagation();
        S.nachgehakt[key] = true;
        kosten(5);
        renderVerhoer();
        sagen(v.id, v.id + "-n" + i + "@" + S.stufe, T(a.nach.de));
      });
      wz.appendChild(nb);
    } else if (S.nachgehakt[key] && a.nach) {
      wz.appendChild(tonKnopf(v.id, v.id + "-n" + i + "@" + S.stufe, T(a.nach.de), "▶ nachfrage"));
    }
    el.appendChild(wz);

    if (S.jagd && !fertig) {
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.addEventListener("click", () => pruefeAussage(v, a, i));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") pruefeAussage(v, a, i); });
    }
    return el;
  }

  function starteJagd() {
    S.jagd = true;
    document.body.classList.add("jagd");
    const k = Math.floor(Math.random() * AKTE.jagdrufe.length);
    sagen("kommissar", "komm-jagd" + k + "@" + S.stufe, AKTE.jagdrufe[k]);
    renderVerhoer();
  }
  function beendeJagd() { S.jagd = false; document.body.classList.remove("jagd"); }

  function pruefeAussage(v, a, i) {
    if (!S.jagd || S.vorbei) return;
    beendeJagd();

    if (tellAktiv(a) && a.braucht && !S.besucht[a.braucht]) {
      renderVerhoer();
      meldung("Womit soll das im Widerspruch stehen? Befragen Sie zuerst " + person(a.braucht).name + ".", "");
      return;
    }

    if (!tellAktiv(a)) {
      klang("taste");
      renderVerhoer();
      meldung(a.falsch ? a.falsch.de : "Daran ist nichts auszusetzen.", a.falsch ? a.falsch.tr : "");
      const k = Math.floor(Math.random() * v.abwehr.length);
      sagen(v.id, v.id + "-abw" + k + "@" + S.stufe, v.abwehr[k]);
      kosten(15);
      return;
    }

    klang("stempel");
    blitz("Widerspruch!");
    S.erledigt[v.id + ":" + i] = true;
    setTimeout(() => {
      renderVerhoer(i);
      sagen("kommissar", "komm-frage-" + a.tell + "@" + S.stufe, INDIZIEN[a.tell].frage);
    }, sanft ? 0 : 700);
  }

  function beweisKarte(v, i) {
    const a = v.aussagen[i];
    const ind = INDIZIEN[a.tell];
    const karte = document.createElement("div");
    karte.className = "beweisfrage";
    karte.innerHTML = "<h4>Widerspruch belegen</h4><p class=\"frage\">" + ind.frage + "</p>";

    const reihen = ind.optionen.map((o, k) => ({ text: o, tr: ind.optionenTr[k], richtig: k === 0 }));
    for (let x = reihen.length - 1; x > 0; x--) {
      const y = Math.floor(Math.random() * (x + 1));
      const h = reihen[x]; reihen[x] = reihen[y]; reihen[y] = h;
    }

    reihen.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "option";
      b.textContent = r.text;
      b.appendChild(trBlock(r.tr));
      b.addEventListener("click", () => {
        const alle = karte.querySelectorAll(".option");
        alle.forEach((o, idx) => { o.disabled = true; if (reihen[idx].richtig) o.classList.add("richtig"); });
        if (!r.richtig) { b.classList.add("falsch"); kosten(5); }
        S.indizien[a.tell] = true;
        klang(r.richtig ? "stempel" : "taste");
        stand();

        const erg = document.createElement("div");
        erg.className = "ergebnis";
        const p = document.createElement("p");
        p.innerHTML = '<strong class="' + (r.richtig ? "gut" : "schlecht") + '">' +
          (r.richtig ? "Richtig. " : "Nicht ganz. ") + "</strong>" + ind.kurz +
          " — <em>„" + ind.zitat + "“</em> steht jetzt im Notizbuch.";
        p.appendChild(trBlock(ind.tr));
        erg.appendChild(p);
        const w = document.createElement("button");
        w.type = "button"; w.className = "knopf voll"; w.textContent = "Weiter";
        w.addEventListener("click", () => renderVerhoer());
        erg.appendChild(w);
        karte.appendChild(erg);
      });
      karte.appendChild(b);
    });
    return karte;
  }

  function hinweis(v) {
    const offen = v.aussagen.findIndex((a, i) => tellAktiv(a) && !S.erledigt[v.id + ":" + i]);
    kosten(20);
    if (offen < 0) return meldung("Hier ist nichts mehr zu holen.", "");
    const ind = INDIZIEN[v.aussagen[offen].tell];
    meldung("Sehen Sie sich Aussage " + (offen + 1) + " genau an. Achten Sie auf: " + ind.marke + ".",
      "Dikkat et: " + ind.marke + " — " + ind.kurz);
  }

  function meldung(text, tr) {
    const sz = $("szene-verhoer");
    const el = document.createElement("div");
    el.className = "jagdbanner ruhig";
    const s = document.createElement("span");
    s.className = "fliess";
    s.innerHTML = text;
    if (tr) s.appendChild(trBlock(tr));
    el.appendChild(s);
    sz.insertBefore(el, sz.querySelector(".aussagen"));
  }

  function blitz(text) {
    if (sanft) return;
    const el = document.createElement("div");
    el.className = "blitz";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  /* =================== Notizbuch =================== */

  function renderNotizbuch() {
    const box = $("notizen");
    box.textContent = "";
    const ids = Object.keys(S.indizien);
    if (!ids.length) {
      box.innerHTML = '<p class="hinweisblatt">Noch nichts gesichert. Hören Sie den Zeugen zu und rufen Sie „Widerspruch!“, sobald ein Satz zu viel verrät.</p>';
      return;
    }
    const liste = document.createElement("div");
    liste.className = "notizen";
    ids.forEach((id) => {
      const i = INDIZIEN[id];
      const n = document.createElement("article");
      n.className = "notiz";
      n.innerHTML = "<header><h4>" + i.marke + '</h4><span class="quelle">' + i.quelle + "</span></header>" +
        '<span class="zitat">„' + i.zitat + "“</span><p class=\"erklaerung\">" + i.kurz + "</p>";
      n.querySelector(".erklaerung").appendChild(trBlock(i.tr));
      liste.appendChild(n);
    });
    box.appendChild(liste);
  }

  /* =================== Anklage =================== */

  function renderAnklage() {
    const n = Object.keys(S.indizien).length;
    const sz = $("szene-anklage");
    let gewaehlt = null;
    sz.innerHTML =
      '<div class="blattkopf"><h2>Anklage erheben</h2><p>Stufe ' + STUFEN[S.stufe].code + " · " +
      n + " Indizien gesichert · nötig: " + noetig() + "</p></div>" +
      '<p class="einstieg" id="anklagevorspann"></p>' +
      (n < noetig() ? '<p class="hinweisblatt">Mit ' + n + " Indizien steht die Anklage auf dünnem Eis.</p>" : "") +
      '<div class="anklagewahl" id="wahl"></div>' +
      '<div class="werkzeug"><button type="button" class="knopf rot" id="k-anklage" disabled>Haftbefehl ausstellen</button>' +
      '<button type="button" class="knopf" id="k-zurueck">Weiter ermitteln</button></div>';

    const vs = $("anklagevorspann");
    vs.textContent = T(AKTE.anklageVorspann.de);
    vs.appendChild(trBlock(AKTE.anklageVorspann.tr));

    const box = $("wahl");
    VERDAECHTIGE.forEach((v) => {
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.innerHTML = portraet(v.typ) + "<strong>" + v.name + "</strong><span>" + v.rolle + "</span>";
      b.addEventListener("click", () => {
        gewaehlt = v.id;
        box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        $("k-anklage").disabled = false;
      });
      box.appendChild(b);
    });
    $("k-anklage").addEventListener("click", () => {
      if (gewaehlt) ende(gewaehlt === AKTE.taeter ? "richtig" : "falsch", gewaehlt);
    });
    $("k-zurueck").addEventListener("click", () => zeige("kartei"));
    sagen("erzaehler", "erz-anklage@" + S.stufe, T(AKTE.anklageVorspann.de));
  }

  /* =================== Schluss =================== */

  function ende(art, gewaehlt) {
    if (S.vorbei) return;
    S.vorbei = true;
    klang("stempel");
    const stempel = art === "richtig" ? "Fall gelöst" : art === "zeit" ? "Morgengrauen" : "Akte geschlossen";
    const epi = AKTE.epilog[art === "richtig" ? "richtig" : art === "zeit" ? "zeit" : "falsch"];
    const aktiv = aktiveIndizien();
    const n = Object.keys(S.indizien).length;

    $("szene-schluss").innerHTML =
      '<div class="blattkopf"><h2>Abschlussbericht</h2><p>Akte ' + AKTE.nummer + " · Stufe " +
      STUFEN[S.stufe].code + " · " + (art === "richtig" ? "Otto Reinhardt" : gewaehlt ? person(gewaehlt).name : "ohne Anklage") + "</p></div>" +
      '<div class="schluss"><span class="stempel gross aufschlag">' + stempel + "</span>" +
      '<p class="einstieg" id="epi"></p>' +
      '<h3 class="bilanzkopf">Grammatik-Bilanz — ' + n + " / " + aktiv.length + "</h3>" +
      '<ul class="bilanz" id="bilanz"></ul>' +
      '<div class="werkzeug"><button type="button" class="knopf voll" id="k-neu">Neue Ermittlung</button></div></div>';

    const p = $("epi");
    p.textContent = T(epi.de);
    p.appendChild(trBlock(epi.tr));

    const bil = $("bilanz");
    aktiv.forEach((id) => {
      const i = INDIZIEN[id];
      const li = document.createElement("li");
      if (!S.indizien[id]) li.className = "fehlt";
      li.innerHTML = "<b>" + i.marke + "</b> — „" + i.zitat + "“";
      if (S.indizien[id]) li.appendChild(trBlock(i.tr));
      bil.appendChild(li);
    });

    $("k-neu").addEventListener("click", () => location.reload());
    zeige("schluss");
    sagen("erzaehler", "erz-epi-" + (art === "richtig" ? "richtig" : art === "zeit" ? "zeit" : "falsch") + "@" + S.stufe, T(epi.de));
    stand();
  }

  /* =================== Bedienung =================== */

  document.querySelectorAll("#stufenwahl button").forEach((b) => {
    b.addEventListener("click", () => {
      S.stufe = b.dataset.stufe;
      S.tempo = STUFEN[S.stufe].tempo;
      $("tempo").value = String(S.tempo);
      document.querySelectorAll("#stufenwahl button").forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)));
      $("stufeninfo").textContent = STUFEN[S.stufe].code + " · " + STUFEN[S.stufe].name +
        " · " + aktiveIndizien().length + " Indizien im Spiel, " + noetig() + " nötig";
    });
  });

  $("k-start").addEventListener("click", () => {
    $("reiter").hidden = false;
    $("regie").hidden = false;
    klang("stempel");
    renderBericht();
    zeige("akte");
    lesAkte();          // direkt in der Klick-Geste: schaltet die Tonspur frei
  });

  $("k-vorlesen").addEventListener("click", lesAkte);
  $("k-stopp").addEventListener("click", stoppe);

  $("k-tr").addEventListener("click", function () {
    S.tr = !S.tr;
    this.setAttribute("aria-pressed", String(S.tr));
    document.querySelectorAll(".tr").forEach((e) => { e.hidden = !S.tr; });
  });

  $("k-ton").addEventListener("click", function () {
    S.ton = !S.ton;
    this.setAttribute("aria-pressed", String(S.ton));
    this.textContent = S.ton ? "Ton an" : "Ton aus";
    if (!S.ton) stoppe();
  });

  $("k-hoeren").addEventListener("click", function () {
    S.hoeren = !S.hoeren;
    this.setAttribute("aria-pressed", String(S.hoeren));
    if ($("bericht").children.length) renderBericht();
    if (S.aktiv && !$("szene-verhoer").hidden) renderVerhoer();
  });

  $("tempo").addEventListener("change", function () {
    S.tempo = parseFloat(this.value);
    if (spieler) spieler.playbackRate = S.tempo;
  });

  document.querySelectorAll("[data-gehe]").forEach((b) =>
    b.addEventListener("click", () => zeige(b.dataset.gehe)));
  document.querySelectorAll("#reiter button").forEach((b) =>
    b.addEventListener("click", () => zeige(b.dataset.szene)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { stoppe(); if (S.jagd) { beendeJagd(); renderVerhoer(); } }
  });

  $("stufeninfo").textContent = STUFEN[S.stufe].code + " · " + STUFEN[S.stufe].name +
    " · " + aktiveIndizien().length + " Indizien im Spiel, " + noetig() + " nötig";
  renderUhr();
  stand();
})();
