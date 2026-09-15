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
# Bantlar A1-B2 lehine genişletildi: kurs bu seviyelerde ve öğrenci orada
# daha çok malzemeye ihtiyaç duyuyor. Tavan 9.000 -> 14.000; fazlası sözlüğü
# ve ileri seviye okumayı besliyor.
#
# A1/A2/B1 tavanları hâlâ Goethe listelerinin yayımlanmış BÜYÜKLÜK
# mertebesiyle aynı düzlemde (A1 ~650-800, A2 ~1.300-2.000, B1 ~2.400-4.000);
# B2/C1 Nation'ın %98 kapsam eşiğinin üstüne çıkıyor.
BANDS = [("A1", 800), ("A2", 2_000), ("B1", 4_000), ("B2", 7_000), ("C1", 14_000)]
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
    Tatoeba'dan üç şey döner:
      exact    — cümle BAŞI OLMAYAN, büyük-küçük harfi korunmuş biçim sayımı
      initial  — cümle başındaki tokenların küçük harfli sayımı
      case     — küçük harf biçim -> (büyük_harfli, küçük_harfli) kanıt sayacı

    CÜMLE BAŞI NEDEN AYRI?
      Almanca cümle ilk harfini her zaman büyütür, yani "Ich bin 19." cümlesinde
      "Ich"in büyük olması zamir mi isim mi olduğuna dair HİÇBİR kanıt taşımaz.
      İlk sürümde bu tokenlar `exact` içine olduğu gibi yazılıyordu ve "das Ich"
      ismi, on binlerce "Ich bin…" cümlesinin frekansını yutup 760. sıraya
      çıkıyordu. Artık cümle başı tokenları ayrı tutuluyor ve tıpkı küçük harfe
      indirgenmiş OpenSubtitles sayımları gibi harf kanıtına göre paylaştırılıyor.
    """
    exact = defaultdict(int)
    initial = defaultdict(int)
    case = defaultdict(lambda: [0, 0])
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 3:
                continue
            for sent in SENT_SPLIT.split(cols[2]):
                toks = WORD_RE.findall(sent)
                for idx, tok in enumerate(toks):
                    if idx == 0:
                        initial[norm(tok)] += 1
                        continue
                    exact[tok] += 1
                    case[norm(tok)][0 if tok[:1].isupper() else 1] += 1
    return exact, initial, case


def case_weight(lower_form, pos, case_ev):
    """
    Bir yüzey biçiminin bu sözcük türüne ait olma olasılığı için ağırlık.
    Kanıt yoksa 1.0 (nötr) döner ve paylaşım eşit olur.

    TABAN NEDEN KALDIRILIYOR?
      Önce her ağırlık [0.02, 0.98] aralığına sıkıştırılıyordu ki hiçbir aday
      tamamen sıfırlanmasın. Ama "ich" 841.000 frekanslı: bunun %2'si bile
      17.000 eder ve "das Ich" ismini listenin 762. sırasına sokar. Kanıt güçlü
      olduğunda (≥50 gözlem) tabanı kaldırmak gerekiyor — o noktada "%2 belki
      isimdir" demek veriye değil, temkine dayanan bir varsayım.
    """
    cap, low = case_ev.get(lower_form, (0, 0))
    total = cap + low
    if total < 5:
        return 1.0  # kanıt zayıf, tarafsız kal
    p_cap = cap / total
    if total < 50:
        # Kanıt var ama az: yumuşat, kimseyi tamamen silme
        p_cap = min(max(p_cap, 0.05), 0.95)
    return p_cap if pos == "noun" else (1.0 - p_cap)


def blended(subs_rate, tato_rate):
    """İki derlemin milyon-başına oranlarının geometrik ortalaması."""
    return math.exp((math.log(subs_rate) + math.log(tato_rate)) / 2)


def main():
    subs_path, tato_path = Path(sys.argv[1]), Path(sys.argv[2])

    print("frekans kaynakları yükleniyor...", flush=True)
    subs = load_opensubtitles(subs_path)
    exact, initial, case_ev = load_tatoeba(tato_path)
    subs_total = sum(subs.values())
    tato_total = sum(exact.values()) + sum(initial.values())
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
        weights = [case_weight(lower, key[1], case_ev) for _, key in cands]
        wsum = sum(weights) or 1.0

        # OpenSubtitles küçük harfe indirgenmiş: harf kanıtıyla paylaştır.
        s_total = subs.get(lower, 0)
        if s_total:
            for (_, key), w in zip(cands, weights):
                lemma_subs[key] += s_total * w / wsum

        # Tatoeba cümle başı tokenları da harf bilgisi taşımıyor: aynı şekilde.
        i_total = initial.get(lower, 0)
        if i_total:
            for (_, key), w in zip(cands, weights):
                lemma_tato[key] += i_total * w / wsum

        # Cümle içi tokenlarda harf bilgisi gerçek: doğrudan eşleştir.
        for form, key in cands:
            c = exact.get(form, 0)
            if c:
                same = sum(1 for f2, _ in cands if f2 == form)
                lemma_tato[key] += c / same

    print("lemmalar puanlanıyor...", flush=True)
    all_recs = [json.loads(l) for l in open(SRC / "lemmas.jsonl", encoding="utf-8")]

    # HAYALET İSİM DÜZELTMESİ
    # Wiktionary "das Ich", "die Sie", "das Nein" gibi işlev sözcüklerinden
    # türemiş isimleri de içeriyor. Bunlar gerçek sözcükler ama A1 kelimesi
    # değiller; sıklıkları tamamen homograf oldukları zamir/parçacıktan sızıyor.
    #
    # DİKKAT — ilk sürümde bu ceza "işlev sözcüğü homografı olan her isim"e
    # uygulanıyordu ve masum kelimeleri öldürüyordu: Almanca'da "sommer" diye
    # nadir bir ağız parçacığı var ve bu yüzden "Sommer" (yaz) listeden tamamen
    # düşmüştü. Kör bir kara liste yerine artık HARF KANITI kullanılıyor:
    # Almanca'da isimler büyük harfle başlar. Bir yüzey biçimi derlemde ezici
    # çoğunlukla küçük harfle geçiyorsa, o frekans gerçekten küçük harfli işlev
    # sözcüğüne aittir ve isim hayalettir. "ich" küçük harf ağırlıklı → "Ich"
    # cezalandırılır; "Sommer" büyük harf ağırlıklı → dokunulmaz.
    function_words = {
        r["w"].lower() for r in all_recs if r["pos"] in FUNCTION_POS
    }

    # Harf kanıtının ÇALIŞAMADIĞI tek durum: Almanca nazik zamirleri cümle
    # ortasında da büyük harfle yazar ("Können Sie mir helfen?"). Bu yüzden
    # "Sie/Ihr/Ihnen" biçimlerinde büyük harf, ismin değil zamirin kanıtıdır
    # ve otomatik ayrım imkânsızdır. Küçük ve açık bir istisna listesi,
    # veriye yalan söyleyen genel bir kuraldan dürüsttür.
    POLITE_PRONOUN_FORMS = {"sie", "ihr", "ihnen", "ihre", "ihrem", "ihren"}

    def ghost_noun_factor(word):
        if norm(word) in POLITE_PRONOUN_FORMS:
            return 0.01
        cap, low = case_ev.get(norm(word), (0, 0))
        total = cap + low
        if total < 10:
            return 1.0  # kanıt yetersiz, dokunma
        return 0.05 if (cap / total) < 0.25 else 1.0

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
                score *= ghost_noun_factor(rec["w"])
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
