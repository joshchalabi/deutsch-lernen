/* GLEIS 7B — Ansagemotor und Spiellauf */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sanft = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zufall = (a) => a[Math.floor(Math.random() * a.length)];
  const wuerfel = (p) => Math.random() < p;
  const mische = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const NOCHMAL_KOSTEN = 3000;

  const S = {
    etappe: 1, anschluss: 0, punkte: 0, combo: 0, reserve: 3,
    laeuft: false, pausiert: false,
    transkript: false, tr: false, ton: true,
    reise: null, standort: null, abschnitt: null,
    gehtNach: null, gehenBis: 0, gehenDauer: 0, stehtSeit: 0,
    abfahrt: 0, letzteAnsage: null, protokoll: [], zeitgeber: []
  };

  /* =================== Klang =================== */

  let ctx = null, eingang = null, trocken = null, nass = null, laermGain = null;
  const puffer = {};
  let laufende = [];

  function impuls(dauer, abfall) {
    const n = Math.floor(ctx.sampleRate * dauer);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, abfall);
    }
    return b;
  }

  /* Die Halle klingt, wie sie klingt: schmales Lautsprecherband, langer
     Nachhall, darunter das Rauschen der Menge. Daran wird die Schwierigkeit
     gedreht — nicht an der Stimme. */
  function klangAufbau() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    eingang = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";  lp.frequency.value = 4000;
    const praesenz = ctx.createBiquadFilter();
    praesenz.type = "peaking"; praesenz.frequency.value = 2400;
    praesenz.Q.value = 1.1; praesenz.gain.value = 5;

    const hall = ctx.createConvolver();
    hall.buffer = impuls(2.2, 2.4);
    trocken = ctx.createGain(); trocken.gain.value = 0.82;
    nass    = ctx.createGain(); nass.gain.value = 0.18;
    const summe = ctx.createGain();

    eingang.connect(hp); hp.connect(lp); lp.connect(praesenz);
    praesenz.connect(trocken); trocken.connect(summe);
    praesenz.connect(hall); hall.connect(nass); nass.connect(summe);
    summe.connect(ctx.destination);

    const n = Math.floor(ctx.sampleRate * 4);
    const rb = ctx.createBuffer(1, n, ctx.sampleRate);
    const rd = rb.getChannelData(0);
    let letzt = 0;
    for (let i = 0; i < n; i++) {
      const w = (Math.random() * 2 - 1) * 0.5;
      letzt = (letzt + 0.02 * w) / 1.02;
      rd[i] = letzt * 3.4;
    }
    const q = ctx.createBufferSource(); q.buffer = rb; q.loop = true;
    const rlp = ctx.createBiquadFilter(); rlp.type = "lowpass"; rlp.frequency.value = 750;
    laermGain = ctx.createGain(); laermGain.gain.value = 0;
    q.connect(rlp); rlp.connect(laermGain); laermGain.connect(ctx.destination);
    q.start();
    return ctx;
  }

  function halle(hallAnteil, laerm) {
    if (!ctx) return;
    nass.gain.value = hallAnteil;
    trocken.gain.value = 1 - hallAnteil * 0.55;
    laermGain.gain.linearRampToValueAtTime(S.ton ? laerm : 0, ctx.currentTime + 0.8);
  }

  async function ladePuffer(ids) {
    klangAufbau();
    await Promise.all(ids.map(async (id) => {
      if (puffer[id] !== undefined) return;
      try {
        const r = await fetch("ton/" + id + ".mp3");
        puffer[id] = await ctx.decodeAudioData(await r.arrayBuffer());
      } catch (e) { puffer[id] = null; }
    }));
  }

  const LUECKE_IM_SATZ = 0.07;

  function dauerVon(ids, tempo) {
    let d = 0.28;
    ids.forEach((id) => {
      const b = puffer[id];
      if (b) d += b.duration / tempo + LUECKE_IM_SATZ;
    });
    return d * 1000;
  }

  function stoppeKlang() {
    laufende.forEach((s) => { try { s.stop(); } catch (e) { /* schon aus */ } });
    laufende = [];
  }

  function spieleAnsage(ids, tempo, stoppen) {
    if (!S.ton || !ctx) return;
    if (stoppen !== false) stoppeKlang();
    let t = ctx.currentTime + 0.1;
    ids.forEach((id, i) => {
      const b = puffer[id];
      if (!b) return;
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.playbackRate.value = tempo;
      s.connect(eingang);
      s.start(t);
      laufende.push(s);
      t += b.duration / tempo + (i === 0 ? 0.24 : LUECKE_IM_SATZ);
    });
    lampe(true);
    setTimeout(() => lampe(false), Math.max(0, (t - ctx.currentTime) * 1000));
  }

  function lampe(an) {
    $("ls-lampe").classList.toggle("an", an);
    if (!S.pausiert) $("ls-status").textContent = an ? "Durchsage läuft" : "Bahnsteig ruhig";
  }

  /* =================== Ansagen bauen =================== */

  const zugVon   = (id) => ZUEGE.find((z) => z.id === id);
  const zielVon  = (id) => ZIELE.find((z) => z.id === id);
  const gleisVon = (id) => GLEISE.find((g) => g.id === id);
  const teil     = (gruppe, id) => BAUSTEINE[gruppe].find((x) => x.id === id);
  const satz = (st) => st.join(" ").replace(/\s+([.,])/g, "$1").replace(/\s{2,}/g, " ").trim();

  /* Baut aus Bausteinen eine Durchsage: Datei-IDs für den Ton, deutscher
     Wortlaut fürs Transkript, türkische Fassung aus den Daten — nicht aus den
     Wörtern, sonst stimmt die Satzstellung nicht. */
  function baueAnsage(art, d, kurz) {
    const er = zufall(BAUSTEINE.eroeffnung);
    const zug = zugVon(d.zug), ziel = zielVon(d.ziel);
    const ids = ["eroeffnung-" + er.id, "zug-" + zug.id, "ziel-" + ziel.id];
    const wort = [er.wort, zug.wort, ziel.wort];
    const fertig = (tr) => ({ ids, de: satz(wort), tr, art, daten: d });

    if (art === "gleis") {
      if (!kurz && d.zeit && wuerfel(0.4)) {
        const z = ZEITEN.find((x) => x.id === d.zeit);
        ids.push("zeit-" + z.id); wort.push(z.wort + ",");
      }
      const g = gleisVon(d.gleis);
      ids.push("kern-k-von", "gleis-" + g.id);
      wort.push(teil("kern", "k-von").wort, g.wort + ".");
      return fertig(`${zug.kurz} ${ziel.kurz} bugün ${g.id} numaralı perondan kalkacak.`);
    }

    if (art === "wechsel") {
      const neu = gleisVon(d.gleis), alt = gleisVon(d.altGleis);
      ids.push("kern-k-von", "gleis-" + neu.id, "kern-k-statt", "gleis-" + alt.id);
      wort.push(teil("kern", "k-von").wort, neu.wort, teil("kern", "k-statt").wort, alt.wort + ".");
      if (!kurz) {
        const gr = zufall(BAUSTEINE.grund);
        ids.push("grund-" + gr.id); wort.push(gr.wort);
      }
      return fertig(`${zug.kurz} ${ziel.kurz} bugün ${alt.id} yerine ${neu.id} peronundan kalkacak.`);
    }

    if (art === "reihung") {
      const w = WAGEN.find((x) => x.id === d.wagen), a = ABSCHNITTE.find((x) => x.id === d.abschnitt);
      ids.push("kern-k-reihung", "wagen-" + w.id, "kern-k-haelt", "abschnitt-" + a.id);
      wort.push(teil("kern", "k-reihung").wort, w.wort, teil("kern", "k-haelt").wort, a.wort + ".");
      return fertig(`${zug.kurz}: vagon sıralaması değişti — ${w.nr}. vagon ${a.id} bölümünde duracak.`);
    }

    if (art === "verspaetung") {
      const m = MINUTEN.find((x) => x.id === String(d.minuten));
      ids.push("kern-k-verspaet", "min-" + m.id, "kern-k-minuten");
      wort.push(teil("kern", "k-verspaet").wort, m.wort, teil("kern", "k-minuten").wort);
      return fertig(`${zug.kurz} ${ziel.kurz} tahminen ${m.zahl} dakika gecikmeli.`);
    }

    if (art === "ausfall") {
      const ersatz = zugVon(d.ersatzZug), g = gleisVon(d.gleis);
      ids.push("kern-k-ausfall", "kern-k-ersatz", "zug-" + ersatz.id, "kern-k-von", "gleis-" + g.id);
      wort.push(teil("kern", "k-ausfall").wort, teil("kern", "k-ersatz").wort,
                ersatz.wort, teil("kern", "k-von").wort, g.wort + ".");
      return fertig(`${zug.kurz} iptal. Yerine ${ersatz.kurz} ${g.id} peronundan kalkacak.`);
    }

    ids.push("kern-k-wagen");
    wort.push(teil("kern", "k-wagen").wort);
    return fertig(`${zug.kurz} ${ziel.kurz}: vagon sıralaması bugün değişti.`);
  }

  /* =================== Reise planen =================== */

  function schwierigkeit(n) {
    return {
      ablenker:  n < 2 ? 0 : n < 4 ? 1 : n < 8 ? 2 : 3,
      wechsel:   n >= 3,
      abschnitt: n >= 3,
      verspaet:  n >= 6,
      ausfall:   n >= 9,
      tempo:  Math.min(1.18, 0.92 + n * 0.02),
      hall:   Math.min(0.40, 0.12 + n * 0.026),
      laerm:  Math.min(0.30, Math.max(0, (n - 3) * 0.045)),
      luecke: Math.max(-1300, 800 - n * 160),     // ab Stufe 6 reden sie durcheinander
      fenster: Math.max(4200, 7000 - n * 220),    // Bedenkzeit nach der letzten Ansage
      tafelLag: n >= 8 ? 999999 : 2200 + n * 1500
    };
  }

  function planeReise(n) {
    const sw = schwierigkeit(n);
    const zug = zufall(ZUEGE), ziel = zufall(ZIELE), zeit = zufall(ZEITEN);
    const gleisPlan = zufall(GLEISE).id;
    const r = { n, sw, zug: zug.id, ziel: ziel.id, zeit: zeit.id,
                gleisPlan, gleisWahr: gleisPlan, ansagen: [] };

    if (sw.abschnitt) {
      r.wagen = zufall(WAGEN).id;
      r.abschnittPlan = zufall(ABSCHNITTE).id;
      r.abschnittWahr = r.abschnittPlan;
    }

    // Die eine Ansage, auf die es ankommt
    let haupt;
    if (sw.wechsel && wuerfel(0.6)) {
      let neu = zufall(GLEISE).id;
      while (neu === gleisPlan) neu = zufall(GLEISE).id;
      r.gleisWahr = neu;
      haupt = baueAnsage("wechsel", { zug: zug.id, ziel: ziel.id, gleis: neu, altGleis: gleisPlan });
    } else {
      haupt = baueAnsage("gleis", { zug: zug.id, ziel: ziel.id, gleis: gleisPlan, zeit: zeit.id });
    }

    const vorne = [{ meins: true, ansage: haupt }];
    for (let i = 0; i < sw.ablenker; i++) {
      let az = zufall(ZUEGE).id;
      while (az === zug.id) az = zufall(ZUEGE).id;
      const art = zufall(["gleis", "wechsel", "verspaetung", "wagen"]);
      vorne.push({ meins: false, ansage: baueAnsage(art, {
        zug: az, ziel: zufall(ZIELE).id, gleis: zufall(GLEISE).id,
        altGleis: zufall(GLEISE).id, minuten: zufall(MINUTEN).id
      }, true) });
    }
    mische(vorne);

    // Was danach kommt, verändert die Lage noch einmal
    const nach = [];
    if (sw.abschnitt && wuerfel(0.6)) {
      let neu = zufall(ABSCHNITTE).id;
      while (neu === r.abschnittWahr) neu = zufall(ABSCHNITTE).id;
      r.abschnittWahr = neu;
      nach.push({ meins: true, wirkung: { abschnitt: neu },
        ansage: baueAnsage("reihung", { zug: zug.id, ziel: ziel.id, wagen: r.wagen, abschnitt: neu }) });
    }
    if (sw.verspaet && wuerfel(0.45)) {
      const m = zufall(MINUTEN);
      nach.push({ meins: true, wirkung: { verspaetung: m.zahl },
        ansage: baueAnsage("verspaetung", { zug: zug.id, ziel: ziel.id, minuten: m.id }) });
    }
    if (sw.ausfall && wuerfel(0.32)) {
      let ersatz = zufall(ZUEGE).id;
      while (ersatz === zug.id) ersatz = zufall(ZUEGE).id;
      let neu = zufall(GLEISE).id;
      while (neu === r.gleisWahr) neu = zufall(GLEISE).id;
      r.gleisWahr = neu;
      nach.push({ meins: true, wirkung: { gleis: neu, verspaetung: 10, ersatz: true },
        ansage: baueAnsage("ausfall", { zug: zug.id, ziel: ziel.id, ersatzZug: ersatz, gleis: neu }) });
    }
    mische(nach);

    r.ansagen = vorne.concat(nach);
    return r;
  }

  function baueTafel(r) {
    const zeilen = [{ zug: r.zug, ziel: r.ziel, zeit: r.zeit, gleis: r.gleisPlan, meins: true }];
    const benutzt = new Set([r.zug]);
    while (zeilen.length < 6) {
      const z = zufall(ZUEGE);
      if (benutzt.has(z.id)) continue;
      benutzt.add(z.id);
      zeilen.push({ zug: z.id, ziel: zufall(ZIELE).id, zeit: zufall(ZEITEN).id,
                    gleis: zufall(GLEISE).id, meins: false });
    }
    return zeilen.sort((a, b) => ZEITEN.find((x) => x.id === a.zeit).uhr
                                 .localeCompare(ZEITEN.find((x) => x.id === b.zeit).uhr));
  }

  /* =================== Darstellung =================== */

  function zeichneFahrkarte(r) {
    $("fk-nr").textContent = "Etappe " + r.n;
    $("fk-zug").textContent = zugVon(r.zug).kurz;
    $("fk-ziel").textContent = zielVon(r.ziel).kurz;
    $("fk-zeit").textContent = ZEITEN.find((z) => z.id === r.zeit).uhr;
    $("fk-gleis").textContent = r.gleisPlan;
    const zeile = $("fk-wagenzeile");
    zeile.hidden = !r.wagen;
    if (r.wagen) {
      $("fk-wagen").textContent = WAGEN.find((w) => w.id === r.wagen).nr;
      $("fk-abschnitt").textContent = r.abschnittPlan;
    }
  }

  function zeichneTafel(r) {
    const box = $("tafel");
    box.textContent = "";
    r.tafel.forEach((z) => {
      const el = document.createElement("div");
      el.className = "tafel-zeile" + (z.meins ? " meins" : "") + (z.blinkt ? " blinkt" : "");
      el.innerHTML =
        '<span class="zeit">' + ZEITEN.find((x) => x.id === z.zeit).uhr + "</span>" +
        '<span class="zug">' + zugVon(z.zug).kurz + "</span>" +
        '<span class="ziel">' + zielVon(z.ziel).kurz +
        (z.hinweis ? ' <span class="hinweis">' + z.hinweis + "</span>" : "") + "</span>" +
        '<span class="gleisnr">' + z.gleis + "</span>";
      box.appendChild(el);
    });
    $("tafel-hinweis").textContent = r.sw.tafelLag > 100000
      ? "Anzeige gestört · Durchsagen beachten" : "Angaben ohne Gewähr";
  }

  function zeichneBahnsteige() {
    const box = $("bahnsteige");
    box.textContent = "";
    GLEISE.forEach((g) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gleis" + (S.standort === g.id ? " hier" : "");
      b.dataset.gleis = g.id;
      b.innerHTML = "<small>Gleis</small>" + g.id;
      b.addEventListener("click", () => gehe(g.id));
      box.appendChild(b);
    });
  }

  function zeichneAbschnitte() {
    const leiste = $("abschnittsleiste");
    const r = S.reise;
    leiste.hidden = !r || !r.abschnittWahr;
    if (leiste.hidden) return;
    const box = $("abschnitte");
    box.textContent = "";
    ABSCHNITTE.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "abschnitt" + (S.abschnitt === a.id ? " hier" : "");
      b.dataset.abschnitt = a.id;
      b.textContent = a.id;
      b.disabled = !S.standort;
      b.addEventListener("click", () => {
        if (!S.standort || !S.laeuft) return;
        S.abschnitt = a.id;
        zeichneAbschnitte();
      });
      box.appendChild(b);
    });
  }

  function zeichneStandort() {
    const el = $("standort");
    if (S.gehtNach) {
      el.innerHTML = "Sie gehen zu <b>Gleis " + S.gehtNach + "</b> …" +
        '<span class="gehbalken"><i id="gehbalken"></i></span>';
    } else if (S.standort) {
      el.innerHTML = "Sie stehen an <b>Gleis " + S.standort + "</b>" +
        (S.abschnitt ? ", Abschnitt <b>" + S.abschnitt + "</b>." : ".");
    } else {
      el.textContent = "Sie stehen in der Bahnhofshalle.";
    }
  }

  function zeichneStand() {
    $("p-punkte").textContent = S.punkte;
    $("p-combo").textContent = "×" + multiplikator().toFixed(2).replace(/\.?0+$/, "");
    $("p-combo-box").classList.toggle("heiss", S.combo >= 3);
    $("p-reserve").textContent = "●".repeat(Math.max(0, S.reserve)) + "○".repeat(3 - Math.max(0, S.reserve));
    $("stand").textContent = "Etappe " + S.etappe + " · Anschlüsse " + S.anschluss;
  }

  function zeigeTranskript(a) {
    $("transkript").textContent = a ? a.de : "";
    $("transkript-tr").textContent = a ? a.tr : "";
    $("transkript").hidden = !S.transkript || !a;
    $("transkript-tr").hidden = !S.tr || !a;
  }

  /* =================== Rückmeldung =================== */

  function blitz(text, gut) {
    const el = $("blitz");
    el.className = "blitz " + (gut ? "gut" : "weg");
    $("blitz-text").textContent = text;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 1000);
    if (!gut && !sanft) {
      document.body.classList.remove("beben");
      void document.body.offsetWidth;
      document.body.classList.add("beben");
      setTimeout(() => document.body.classList.remove("beben"), 500);
    }
  }

  function punktePop(text) {
    const el = $("punktepop");
    el.textContent = text;
    el.hidden = false;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    setTimeout(() => { el.hidden = true; }, 1300);
  }

  function zugEinfahrt(gleisId) {
    const feld = $("zugeinfahrt");
    feld.hidden = false;
    feld.innerHTML = "<i></i>";
    setTimeout(() => { feld.hidden = true; feld.innerHTML = ""; }, 1200);
    const t = document.querySelector('#bahnsteige .gleis[data-gleis="' + gleisId + '"]');
    if (t) { t.classList.add("zug-hier"); setTimeout(() => t.classList.remove("zug-hier"), 1000); }
  }

  /* =================== Ablauf =================== */

  const gleisIdx = (g) => GLEISE.findIndex((x) => x.id === g);

  function gehDauer(von, nach) {
    const a = von ? gleisIdx(von) : 0;
    return 320 + Math.abs(gleisIdx(nach) - a) * 110;
  }

  function gehe(gleisId) {
    if (!S.laeuft || S.pausiert || S.gehtNach === gleisId || S.standort === gleisId) return;
    S.gehenDauer = gehDauer(S.standort, gleisId);
    S.gehtNach = gleisId;
    S.gehenBis = performance.now() + S.gehenDauer;
    S.stehtSeit = 0;
    zeichneStandort();
  }

  function planeZeitgeber(r) {
    S.zeitgeber.forEach(clearTimeout);
    S.zeitgeber = [];
    const jetzt = performance.now();
    r.ansagen.forEach((ev) => {
      if (ev.erledigt || ev.faellig == null) return;
      S.zeitgeber.push(setTimeout(() => {
        if (!S.laeuft || S.pausiert) return;
        ev.erledigt = true;
        if (ev.meins) { S.letzteAnsage = ev.ansage; zeigeTranskript(ev.ansage); }
        spieleAnsage(ev.ansage.ids, r.sw.tempo, r.sw.luecke >= 0);

        const w = ev.wirkung;
        if (!w) return;
        if (w.gleis) {
          r.gleisWahr = w.gleis;
          if (S.standort !== w.gleis) S.stehtSeit = 0;
          tafelSpaeter(r, { gleis: w.gleis, hinweis: w.ersatz ? "Ersatzzug" : null });
        }
        if (w.abschnitt) r.abschnittWahr = w.abschnitt;
        if (w.verspaetung) {
          S.abfahrt += (w.verspaetung / 5) * 3000;
          tafelSpaeter(r, { hinweis: "+" + w.verspaetung + " Min" });
        }
      }, Math.max(0, ev.faellig - jetzt)));
    });
  }

  /* Die Tafel hinkt den Durchsagen hinterher — später bleibt sie ganz stehen.
     Wer nur liest, steigt am falschen Gleis ein. */
  function tafelSpaeter(r, aenderung) {
    if (r.sw.tafelLag > 100000) return;
    S.zeitgeber.push(setTimeout(() => {
      const zeile = r.tafel.find((z) => z.meins);
      if (!zeile) return;
      if (aenderung.gleis) zeile.gleis = aenderung.gleis;
      if (aenderung.hinweis) zeile.hinweis = aenderung.hinweis;
      zeile.blinkt = true;
      zeichneTafel(r);
    }, r.sw.tafelLag));
  }

  async function starteEtappe() {
    S.laeuft = false;                 // erst starten, wenn die Ansagen stehen
    const r = planeReise(S.etappe);
    r.tafel = baueTafel(r);
    S.reise = r;
    S.standort = null; S.gehtNach = null; S.abschnitt = null; S.stehtSeit = 0;
    S.letzteAnsage = null;

    zeichneFahrkarte(r);
    zeichneTafel(r);
    zeichneBahnsteige();
    zeichneAbschnitte();
    zeichneStandort();
    zeichneStand();
    zeigeTranskript(null);
    halle(r.sw.hall, r.sw.laerm);

    const ids = [];
    r.ansagen.forEach((e) => ids.push.apply(ids, e.ansage.ids));
    await ladePuffer(ids);

    // Ansagen dicht hintereinander legen; die Rundenlänge folgt daraus
    let t = 400;
    r.ansagen.forEach((ev) => {
      ev.dauer = dauerVon(ev.ansage.ids, r.sw.tempo);
      ev.bei = t;
      ev.faellig = performance.now() + t;
      t += Math.max(900, ev.dauer + r.sw.luecke);
    });
    S.abfahrt = performance.now() + t + r.sw.fenster;
    planeZeitgeber(r);
    S.laeuft = true;
  }

  const multiplikator = () => 1 + Math.min(S.combo, 12) * 0.25;

  function pruefeAbfahrt() {
    const r = S.reise;
    S.laeuft = false;
    S.zeitgeber.forEach(clearTimeout);
    S.zeitgeber = [];
    stoppeKlang();
    lampe(false);

    const gleisOk = S.standort === r.gleisWahr;
    const abschnittAktiv = !!r.abschnittWahr;
    const abschnittOk = !abschnittAktiv || S.abschnitt === r.abschnittWahr;
    const zug = zugVon(r.zug), ziel = zielVon(r.ziel);

    document.querySelectorAll("#bahnsteige .gleis").forEach((b) => {
      b.disabled = true;
      if (b.dataset.gleis === r.gleisWahr) b.classList.add("ziel-richtig");
      else if (b.dataset.gleis === S.standort) b.classList.add("ziel-falsch");
    });
    document.querySelectorAll("#abschnitte .abschnitt").forEach((b) => {
      b.disabled = true;
      if (b.dataset.abschnitt === r.abschnittWahr) b.classList.add("richtig");
      else if (b.dataset.abschnitt === S.abschnitt) b.classList.add("falsch");
    });

    if (gleisOk) {
      zugEinfahrt(r.gleisWahr);
      S.anschluss++;
      const frueh = S.stehtSeit ? Math.min(90, Math.round((performance.now() - S.stehtSeit) / 120)) : 0;
      const basis = 100 + frueh + (abschnittOk && abschnittAktiv ? 60 : 0);
      const mult = multiplikator();
      const gewinn = Math.round(basis * mult);
      S.punkte += gewinn;
      if (abschnittOk) S.combo++; else S.combo = 0;
      punktePop("+" + gewinn + (mult > 1 ? "  ×" + mult.toFixed(2).replace(/\.?0+$/, "") : ""));
      blitz(abschnittOk ? "Eingestiegen" : "Falscher Wagen", true);
      $("standort").innerHTML = abschnittOk
        ? "<b>Eingestiegen.</b> " + zug.kurz + " nach " + ziel.kurz + "."
        : "<b>Eingestiegen</b> — aber Abschnitt " + r.abschnittWahr + " war richtig. Serie weg.";
    } else {
      S.reserve--;
      S.combo = 0;
      blitz("Verpasst", false);
      $("standort").innerHTML = "<b>Verpasst.</b> Der " + zug.kurz + " fuhr von Gleis " + r.gleisWahr + ".";
    }

    S.protokoll.push({ gut: gleisOk, abschnittOk, zug: zug.kurz, ziel: ziel.kurz,
                       gleis: r.gleisWahr, war: S.standort || "Halle" });
    zeichneStand();

    setTimeout(() => {
      if (S.reserve <= 0) return ende();
      S.etappe++;
      starteEtappe();
    }, 2200);
  }

  /* Wer den Tab wechselt, soll keinen Zug verpassen. */
  function pausiere() {
    if (!S.laeuft || S.pausiert) return;
    S.pausiert = true;
    const jetzt = performance.now();
    S.restAbfahrt = S.abfahrt - jetzt;
    S.restGehen = S.gehtNach ? S.gehenBis - jetzt : 0;
    S.reise.ansagen.forEach((ev) => {
      if (!ev.erledigt && ev.faellig != null) ev.rest = Math.max(0, ev.faellig - jetzt);
    });
    S.zeitgeber.forEach(clearTimeout);
    S.zeitgeber = [];
    stoppeKlang(); lampe(false);
    $("ls-status").textContent = "Angehalten";
  }

  function fortsetzen() {
    if (!S.pausiert) return;
    S.pausiert = false;
    const jetzt = performance.now();
    S.abfahrt = jetzt + S.restAbfahrt;
    if (S.gehtNach) S.gehenBis = jetzt + S.restGehen;
    S.reise.ansagen.forEach((ev) => {
      if (!ev.erledigt && ev.rest != null) ev.faellig = jetzt + ev.rest;
    });
    planeZeitgeber(S.reise);
    $("ls-status").textContent = "Bahnsteig ruhig";
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pausiere(); else fortsetzen();
  });

  let raf = 0, takt = 0;
  function schleife() {
    if (!S.laeuft || S.pausiert) return;
    const jetzt = performance.now();

    if (S.gehtNach) {
      const rest = S.gehenBis - jetzt;
      const bal = $("gehbalken");
      if (bal) bal.style.width = Math.min(100, (1 - rest / S.gehenDauer) * 100) + "%";
      if (rest <= 0) {
        S.standort = S.gehtNach;
        S.gehtNach = null;
        S.stehtSeit = S.standort === S.reise.gleisWahr ? jetzt : 0;
        zeichneStandort(); zeichneBahnsteige(); zeichneAbschnitte();
      }
    }

    const rest = Math.max(0, S.abfahrt - jetzt);
    const m = Math.floor(rest / 60000), s = Math.floor((rest % 60000) / 1000);
    $("uhr").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    $("uhr").parentNode.classList.toggle("knapp", rest < 6000);
    if (rest <= 0) pruefeAbfahrt();
  }

  function antrieb() {
    if (!raf) {
      const rahmen = () => { schleife(); raf = requestAnimationFrame(rahmen); };
      raf = requestAnimationFrame(rahmen);
    }
    if (!takt) takt = setInterval(schleife, 250);
  }

  /* =================== Ende =================== */

  function ende() {
    S.laeuft = false;
    halle(0.12, 0);
    let best = S.punkte;
    try {
      best = Math.max(+(localStorage.getItem("gleis7b.best") || 0), S.punkte);
      localStorage.setItem("gleis7b.best", String(best));
    } catch (e) { /* kein Speicher */ }

    $("szene-spiel").hidden = true;
    const sz = $("szene-ende");
    sz.hidden = false;
    sz.innerHTML =
      '<div class="ergebnis"><h2 class="' + (S.anschluss >= 8 ? "gut" : "schlecht") + '">' +
      (S.anschluss === 0 ? "Nie losgefahren."
        : S.anschluss >= 8 ? "Angekommen." : "Gestrandet.") + "</h2>" +
      '<p class="fliess"><b>' + S.punkte + " Punkte</b> · " + S.anschluss +
      " Anschlüsse · Bestwert " + best + "</p>" +
      '<ul class="protokoll" id="protokoll"></ul>' +
      '<div class="knopfreihe"><button type="button" class="knopf gross" id="k-nochmal2">Neue Reise</button></div></div>';

    const liste = $("protokoll");
    S.protokoll.slice(-12).forEach((p) => {
      const li = document.createElement("li");
      if (!p.gut) li.className = "weg";
      li.innerHTML = p.zug + " → " + p.ziel + "<span>" +
        (p.gut ? "Gleis " + p.gleis + (p.abschnittOk ? "" : " · falscher Abschnitt")
               : "Gleis " + p.gleis + " statt " + p.war) + "</span>";
      liste.appendChild(li);
    });
    $("k-nochmal2").addEventListener("click", neustart);
  }

  function neustart() {
    S.etappe = 1; S.anschluss = 0; S.punkte = 0; S.combo = 0; S.reserve = 3; S.protokoll = [];
    $("szene-ende").hidden = true;
    $("szene-spiel").hidden = false;
    starteEtappe();
    antrieb();
  }

  /* =================== Bedienung =================== */

  $("k-start").addEventListener("click", async () => {
    $("k-start").disabled = true;
    $("k-start").textContent = "Ansagen werden geladen …";
    klangAufbau();
    // resume() nicht abwarten: ohne Nutzergeste bleibt das Versprechen offen
    // und das Spiel startet nie. Der Klick selbst gibt den Ton ohnehin frei.
    try { ctx.resume(); } catch (e) { /* egal */ }
    await ladePuffer(ALLE_IDS);
    $("szene-start").hidden = true;
    $("szene-spiel").hidden = false;
    $("leiste").hidden = false;
    neustart();
  });

  $("k-transkript").addEventListener("click", function () {
    S.transkript = !S.transkript;
    this.setAttribute("aria-pressed", String(S.transkript));
    zeigeTranskript(S.letzteAnsage);
  });
  $("k-tr").addEventListener("click", function () {
    S.tr = !S.tr;
    this.setAttribute("aria-pressed", String(S.tr));
    zeigeTranskript(S.letzteAnsage);
  });
  $("k-ton").addEventListener("click", function () {
    S.ton = !S.ton;
    this.setAttribute("aria-pressed", String(S.ton));
    this.textContent = S.ton ? "Ton an" : "Ton aus";
    if (!S.ton) { stoppeKlang(); lampe(false); }
    if (S.reise) halle(S.reise.sw.hall, S.reise.sw.laerm);
  });
  $("k-nochmal").addEventListener("click", () => {
    if (!S.laeuft || !S.letzteAnsage) return;
    S.abfahrt -= NOCHMAL_KOSTEN;
    zeigeTranskript(S.letzteAnsage);
    spieleAnsage(S.letzteAnsage.ids, S.reise.sw.tempo);
  });

  const ALLE_IDS = [].concat(
    GLEISE.map((x) => "gleis-" + x.id),
    ZUEGE.map((x) => "zug-" + x.id),
    ZIELE.map((x) => "ziel-" + x.id),
    ZEITEN.map((x) => "zeit-" + x.id),
    MINUTEN.map((x) => "min-" + x.id),
    WAGEN.map((x) => "wagen-" + x.id),
    ABSCHNITTE.map((x) => "abschnitt-" + x.id),
    Object.keys(BAUSTEINE).reduce((a, k) => a.concat(BAUSTEINE[k].map((x) => k + "-" + x.id)), [])
  );

  try {
    const b = localStorage.getItem("gleis7b.best");
    if (b) $("bestwert").textContent = "Bestwert " + b + " Punkte";
  } catch (e) { /* kein Speicher */ }
})();
