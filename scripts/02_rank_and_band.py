#!/usr/bin/env python3
"""
Aşama 2 — Lemmaları frekansa göre sıralar ve CEFR bandlarına ayırır.

NEDEN FREKANS?
  Nation (2006), Laufer (1989), Schmitt vd. (2011): bir metni anlamak için
  gereken sözcük kapsamı okumada %98, dinlemede %95. Nation'a göre %98 kapsam
  ~8.000-9.000 kelime ailesi gerektiriyor — bu bizim C1 tavanımız. Frekans,
  bir kelimenin CEFR seviyesinin tek başına en güçlü yordayıcısıdır.

FREKANS KAYNAKLARI (ikisi de açık lisanslı, harmanlanıyor):
  1. OpenSubtitles 2018 DE (hermitdave/FrequencyWords, CC BY-SA 4.0)
     — 156M token, konuşma dili ağırlıklı; A1-B1 için isabetli.
     KISIT: küçük harfe indirgenmiş, yani isim/fiil ayrımı yapamıyor.
  2. Tatoeba Almanca derlemi (CC BY 2.0 FR)
     — 6M token, dengeli cümleler; film diyaloğu sapmasını düzeltir.
     AVANTAJ: ham metin, büyük-küçük harf korunmuş.

BÜYÜK-KÜÇÜK HARF SORUNU VE ÇÖZÜMÜ
  Almanca'da isimler büyük harfle başlar. OpenSubtitles listesi küçük harfe
  indirgendiği için "ich"(zamir) ile "Ich"(isim) aynı kovaya düşüyor ve
  frekans eşit bölündüğünde nadir isim, sık zamirin frekansını yutuyordu.
  ÇÖZÜM: Tatoeba'dan her biçim için büyük/küçük harf oranı ölçülüyor
  (cümle başındaki ilk kelime SAYILMIYOR — orada büyük harf zorunlu, kanıt
  değeri yok). Bu oran, OpenSubtitles frekansını aday lemmalara paylaştırırken
  ağırlık olarak kullanılıyor: isimler büyük-harf payını, diğerleri küçük-harf
  payını alıyor.

Çıktı: data-src/ranked.jsonl
"""
import json
import math
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"

# CEFR band sınırları (kümülatif lemma rankı).
# A1/A2/B1 tavanları Goethe sınav sözcük listelerinin yayımlanmış BOYUT
# mertebesiyle hizalı (A1 ~650, A2 ~1.300, B1 ~2.400). Listelerin İÇERİĞİ
# kullanılmadı — o materyal telifli. Yalnızca büyüklük referans alındı.
# B2/C1 tavanları Nation'ın %98 kapsam eşiğinden türetildi.
BANDS = [("A1", 650), ("A2", 1_600), ("B1", 3_000), ("B2", 5_500), ("C1", 9_000)]
CEILING = BANDS[-1][1]

# Dilbilgisi iskeleti: seyrek olsalar da erken öğretilmeli.
FUNCTION_POS = {"pron", "prep", "conj", "det", "particle", "num"}

WORD_RE = re.compile(r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]*")
SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def norm(s):
    return unicodedata.normalize("NFC", s).lower()


def load_opensubtitles(path):
    freq = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            parts = line.split()
            if len(parts) == 2:
                freq[norm(parts[0])] = int(parts[1])
    return freq


def load_tatoeba(path):
    """
    Tatoeba'dan iki şey döner:
      exact  — büyük-küçük harfi KORUNMUŞ biçim sayımı
      case   — küçük harf biçim -> (büyük_harfli_sayım, küçük_harfli_sayım)
               cümle başı atlanır, çünkü orada büyük harf zorunludur.
    """
    exact = defaultdict(int)
    case = defaultdict(lambda: [0, 0])
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 3:
                continue
            for sent in SENT_SPLIT.split(cols[2]):
                toks = WORD_RE.findall(sent)
                for idx, tok in enumerate(toks):
                    exact[tok] += 1
                    if idx == 0:
                        continue  # cümle başı: büyük harf kanıt değil
                    case[norm(tok)][0 if tok[:1].isupper() else 1] += 1
    return exact, case


def case_weight(lower_form, pos, case_ev):
    """
    Bir yüzey biçiminin bu sözcük türüne ait olma olasılığı için ağırlık.
    Kanıt yoksa 1.0 (nötr) döner ve paylaşım eşit olur.
    """
    cap, low = case_ev.get(lower_form, (0, 0))
    total = cap + low
    if total < 3:
        return 1.0  # kanıt zayıf, tarafsız kal
    p_cap = cap / total
    # Laplace yumuşatması: hiçbir aday tamamen sıfırlanmasın
    p_cap = min(max(p_cap, 0.02), 0.98)
    return p_cap if pos == "noun" else (1.0 - p_cap)


def blended(subs_rate, tato_rate):
    """İki derlemin milyon-başına oranlarının geometrik ortalaması."""
    return math.exp((math.log(subs_rate) + math.log(tato_rate)) / 2)


def main():
    subs_path, tato_path = Path(sys.argv[1]), Path(sys.argv[2])

    print("frekans kaynakları yükleniyor...", flush=True)
    subs = load_opensubtitles(subs_path)
    exact, case_ev = load_tatoeba(tato_path)
    subs_total = sum(subs.values())
    tato_total = sum(exact.values())
    print(f"  OpenSubtitles: {len(subs):,} tip / {subs_total:,} token")
    print(f"  Tatoeba      : {len(exact):,} tip / {tato_total:,} token", flush=True)

    print("biçim eşlemesi yükleniyor...", flush=True)
    form2lemma = defaultdict(list)
    with open(SRC / "form2lemma.tsv", encoding="utf-8") as fh:
        for line in fh:
            p = line.rstrip("\n").split("\t")
            if len(p) == 3:
                form2lemma[p[0]].append((p[1], p[2]))

    # Aynı küçük-harfli biçimi paylaşan tüm (biçim, lemma) adaylarını grupla ki
    # OpenSubtitles frekansını harf kanıtına göre paylaştırabilelim.
    print("lemma frekansları toplanıyor (harf kanıtıyla)...", flush=True)
    by_lower = defaultdict(list)
    for form, keys in form2lemma.items():
        for key in keys:
            by_lower[norm(form)].append((form, key))

    lemma_subs = defaultdict(float)
    lemma_tato = defaultdict(float)
    for lower, cands in by_lower.items():
        s_total = subs.get(lower, 0)
        if s_total:
            weights = [case_weight(lower, key[1], case_ev) for _, key in cands]
            wsum = sum(weights) or 1.0
            for (form, key), w in zip(cands, weights):
                lemma_subs[key] += s_total * w / wsum
        # Tatoeba tarafında harf bilgisi zaten var: doğrudan eşleştir.
        for form, key in cands:
            c = exact.get(form, 0)
            if c:
                same = sum(1 for f2, k2 in cands if f2 == form)
                lemma_tato[key] += c / same

    print("lemmalar puanlanıyor...", flush=True)
    all_recs = [json.loads(l) for l in open(SRC / "lemmas.jsonl", encoding="utf-8")]

    # HAYALET İSİM DÜZELTMESİ
    # Wiktionary "das Ich", "die Sie", "das Nein" gibi işlev sözcüklerinden
    # türemiş isimleri de içeriyor. Bunlar gerçek sözcükler ama A1 kelimesi
    # değiller; sıklıkları tamamen homograf oldukları zamir/parçacıktan
    # sızıyor. Böyle bir isim varsa ağır şekilde geri çekiliyor.
    function_words = {
        r["w"].lower() for r in all_recs if r["pos"] in FUNCTION_POS
    }

    scored = []
    for rec in all_recs:
            key = (rec["w"], rec["pos"])
            s, t = lemma_subs.get(key, 0.0), lemma_tato.get(key, 0.0)
            if s < 2 and t < 2:
                continue
            s_rate = (s + 0.5) / subs_total * 1e6
            t_rate = (t + 0.5) / tato_total * 1e6
            score = blended(s_rate, t_rate)
            # Çevirisi olmayan kayıt sözlük olarak eksik; sıralamada geri düşsün.
            if not (rec.get("tr", {}).get("tr") or rec.get("tr", {}).get("ru")):
                score *= 0.35
            if rec["pos"] == "noun" and rec["w"].lower() in function_words:
                score *= 0.01
            scored.append((score, rec))

    scored.sort(key=lambda x: -x[0])
    print(f"  {len(scored):,} aday lemma puanlandı", flush=True)

    out_path = SRC / "ranked.jsonl"
    written = 0
    with open(out_path, "w", encoding="utf-8") as out:
        for rank, (score, rec) in enumerate(scored, start=1):
            if rank > CEILING:
                break
            band = next((b for b, ceil in BANDS if rank <= ceil), "C1")
            if rec["pos"] in FUNCTION_POS and band in ("B2", "C1"):
                band = "B1"
            rec.update(rank=rank, freq=round(score, 3), cefr=band)
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            written += 1

    print(f"\n✓ {written:,} lemma -> {out_path}")
    dist = defaultdict(int)
    with open(out_path, encoding="utf-8") as fh:
        for line in fh:
            dist[json.loads(line)["cefr"]] += 1
    for b, _ in BANDS:
        print(f"   {b}: {dist[b]:,}")


if __name__ == "__main__":
    main()
