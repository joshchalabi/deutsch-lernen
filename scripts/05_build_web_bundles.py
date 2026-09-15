#!/usr/bin/env python3
"""
Aşama 5 — Tarayıcının indireceği JSON paketlerini üretir.

TASARIM KARARI: neden parçalı paketler?
  Site GitHub Pages'te, yani statik. Sunucu tarafı sorgu yok; ne gerekiyorsa
  indirilmeli. 9.000 kelime + 148.000 cümleyi tek dosyada göndermek ilk açılışı
  onlarca megabayt yapar. Bunun yerine:
    - vocab/<seviye>.json  : yalnızca o seviyenin kelimeleri, tam kayıt
    - index.json           : tüm kelimeler, arama için minimal alan (sözlük kutusu)
    - sentences/<seviye>.json : o seviyenin cümleleri, ses ve çeviri önceliğiyle
  A1 öğrencisi ~1-2 MB indirir, C1'e kadar kademeli büyür.

CÜMLE SEÇİMİ
  Her seviyede kota var. Kotayı doldururken öncelik:
    1. insan ses kaydı + Türkçe + Rusça çeviri
    2. ses kaydı olanlar
    3. iki çevirisi de olanlar
    4. kalanlar
  Dinleme ve diktenin çalışabilmesi için sesli cümleler ayrıcalıklı.
"""
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
WEB = ROOT / "public" / "data"

BANDS = ["A1", "A2", "B1", "B2", "C1", "C2"]

WORD_RE = re.compile(r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]*")

# Örnek cümle seçiminde hedeflenen uzunluk. Kısa cümle bağlam vermiyor,
# uzun cümle alıştırmanın odağını kelimeden cümleye kaydırıyor.
IDEAL_LEN = 8


def norm(x):
    return unicodedata.normalize("NFC", x).lower()


def build_examples():
    """
    lemma anahtarı -> {"d": almanca, "tr":…, "ru":…, "az":…}

    NEDEN WIKTIONARY ÖRNEĞİ YETMİYOR?
      Sözlük kaydındaki örnek cümleler yalnızca Almanca; çevirisi yok ve
      açık veride de yok. Alıştırmada kelimenin altında duran cümlenin
      öğrenciye bir şey anlatması için karşılığının da görünmesi gerekiyor —
      yoksa yeni başlayan biri cümleyi okuyamadığı için atlıyor.

      Tatoeba cümleleri ise çevirileriyle birlikte geliyor (4. aşamada
      Türkçe/Rusça/Azerice eşlenmişti). Burada her lemmaya bu havuzdan
      bir cümle bağlanıyor: çekimli biçimler üzerinden eşleşme kuruluyor,
      çünkü cümlede "Haus" değil "Häuser" geçiyor olabilir.

    NEDEN İKİ ÖRNEK?
      Ölçüldü: Tatoeba'da Almanca cümlelerin %92'sinin Rusçası var ama
      yalnızca %35'inin Türkçesi, %2'sinin Azericesi. Tek bir cümle
      seçmek zorunda kalınca Türkçeyi kollamak Rusçayı düşürüyordu
      (A2'de Rusça %97 -> %75). Bu bir dili öbürüne feda etmek demek.

      Bunun yerine lemma başına en fazla İKİ cümle saklanıyor:
        xs  — Türkçesi olan en iyi cümle (yoksa genel en iyi)
        xs2 — yalnızca birincinin taşımadığı bir dili getiriyorsa
      Arayüz istenen dili taşıyan ilkini gösteriyor. Azerice her iki
      örnekte de yoksa Türkçeden köprüleniyor (rozetle belirtilerek).

    SEÇİM ÖLÇÜTÜ (sırayla)
      1. İstenen dil var mı
      2. Kaç dile çevrilmiş
      3. Uzunluğu 8 kelimeye ne kadar yakın
      4. Sözlük kapsaması yüksek olan (bilinmeyen kelime az)
      5. Kimlik — eşitlikte sonuç her derlemede aynı çıksın diye
    """
    # çekimli biçim -> o biçimi üreten lemma anahtarları
    forms = defaultdict(set)
    with open(SRC / "form2lemma.tsv", encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) == 3:
                forms[norm(parts[0])].add(f"{parts[1]}|{parts[2]}")

    # Her lemma için iki yarış birden: biri Türkçeli cümleler arasında,
    # biri Rusçalı cümleler arasında. Kazananlar sonra birleştiriliyor.
    best = {"tr": {}, "ru": {}}
    scores = {"tr": {}, "ru": {}}

    with open(SRC / "sentences.jsonl", encoding="utf-8") as fh:
        for line in fh:
            s = json.loads(line)
            langs = [k for k in ("tr", "ru", "az") if s.get(k)]
            if not langs:
                continue  # çevirisiz cümle bu iş için değersiz
            score = (-len(langs), abs(s["n"] - IDEAL_LEN), -s["cov"], int(s["id"]))
            rec = {"d": s["de"]}
            for lg in langs:
                rec[lg] = s[lg]
            tracks = [t for t in ("tr", "ru") if s.get(t)]
            seen = set()
            for tok in WORD_RE.findall(s["de"]):
                for key in forms.get(norm(tok), ()):
                    if key in seen:
                        continue
                    seen.add(key)
                    for tr_k in tracks:
                        if key not in scores[tr_k] or score < scores[tr_k][key]:
                            scores[tr_k][key] = score
                            best[tr_k][key] = rec

    out = {}
    for key in set(best["tr"]) | set(best["ru"]):
        primary = best["tr"].get(key) or best["ru"][key]
        entry = {"xs": primary}
        other = best["ru"].get(key)
        # İkinci örnek yalnızca birincinin taşımadığı bir dil getiriyorsa
        if other and other is not primary and "ru" not in primary:
            entry["xs2"] = other
        out[key] = entry

    n2 = sum(1 for v in out.values() if "xs2" in v)
    print(f"  örnek cümlesi bağlanan lemma: {len(out):,} ({n2:,} tanesinde ikinci örnek)")
    return out

# İKİ FARKLI İHTİYAÇ, İKİ AYRI KOTA
#   Dinleme/dikte modülü SES olmadan çalışmıyor.
#   Okuma modülü ise kullanıcının diline ÇEVİRİ olmadan işe yaramıyor.
#   Tek bir "önce sesliler" sıralaması Türkçeyi dışarı itiyordu: Tatoeba'da
#   Almanca-Türkçe çift 22 bin, sesli Almanca cümle 86 bin, kesişimleri ise
#   çok dar. Rusça bol (227 bin çift) olduğu için zaten sorun yaşamıyor.
#   Bu yüzden her seviyede ses ve Türkçe için ayrı taban garanti ediliyor.
AUDIO_QUOTA = {"A1": 2200, "A2": 1800, "B1": 1300, "B2": 900, "C1": 600, "C2": 300}
TURKISH_QUOTA = {"A1": 2200, "A2": 2000, "B1": 1600, "B2": 1400, "C1": 900, "C2": 600}


def select_sentences(items, band):
    """
    Seviyedeki cümlelerden dengeli bir alt küme seçer.
    Sıra: ses+Türkçe (ikisine de yarar) → kalan ses → kalan Türkçe → doldurma.
    """
    chosen: dict[str, dict] = {}

    def take(pool, limit):
        for s in pool:
            if len(chosen) >= total_cap or limit <= 0:
                break
            if s["id"] in chosen:
                continue
            chosen[s["id"]] = s
            limit -= 1

    audio_cap = AUDIO_QUOTA[band]
    tr_cap = TURKISH_QUOTA[band]
    total_cap = audio_cap + tr_cap

    # Kolaydan zora: aynı bant içinde önce daha tanıdık kelimeli cümleler
    ordered = sorted(items, key=lambda s: s["hard"])

    both = [s for s in ordered if s.get("audio") and s.get("tr")]
    audio_only = [s for s in ordered if s.get("audio") and not s.get("tr")]
    tr_only = [s for s in ordered if s.get("tr") and not s.get("audio")]
    rest = [s for s in ordered if not s.get("audio") and not s.get("tr")]

    take(both, len(both))
    n_audio = sum(1 for s in chosen.values() if s.get("audio"))
    n_tr = sum(1 for s in chosen.values() if s.get("tr"))
    take(audio_only, max(0, audio_cap - n_audio))
    take(tr_only, max(0, tr_cap - n_tr))
    # Kalan yeri Rusça çevirisi olanlarla doldur
    take([s for s in rest if s.get("ru")], total_cap - len(chosen))

    return list(chosen.values())


def trim_lemma(r, examples):
    """Web kaydı: gereksiz alanları at, adları kısalt."""
    out = {
        "w": r["w"], "p": r["pos"], "r": r["rank"], "c": r["cefr"],
        "s": [{"g": s["gloss"], "x": s["ex"][:1]} for s in r["senses"][:3]],
        "t": {},
    }
    for lang in ("tr", "ru", "az"):
        vals = r.get("tr", {}).get(lang) or []
        if vals:
            out["t"][lang] = [v["w"] for v in vals[:4]]
    if r.get("az_src"):
        out["azs"] = r["az_src"]
    for k_src, k_dst in (("ipa", "ipa"), ("audio", "a"), ("g", "g"),
                         ("pl", "pl"), ("vf", "vf"), ("cases", "k"),
                         ("syn", "syn"), ("ant", "ant")):
        if r.get(k_src):
            out[k_dst] = r[k_src]
    # Çevirili örnek cümle (varsa). Arayüz bunu Almancasıyla birlikte
    # öğrencinin seçtiği dilde gösteriyor.
    ex = examples.get(f"{r['w']}|{r['pos']}")
    if ex:
        out.update(ex)
    return out


def main():
    WEB.mkdir(parents=True, exist_ok=True)
    (WEB / "vocab").mkdir(exist_ok=True)
    (WEB / "sentences").mkdir(exist_ok=True)

    print("örnek cümleler eşleniyor...", flush=True)
    examples = build_examples()

    # ---- kelimeler ----
    by_band = defaultdict(list)
    index = []
    with open(SRC / "enriched.jsonl", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            trimmed = trim_lemma(r, examples)
            by_band[r["cefr"]].append(trimmed)
            # Arama indeksi: ilk karşılıklar + seviye. Sözlük kutusu bunu kullanır.
            index.append({
                "w": r["w"], "p": r["pos"], "r": r["rank"], "c": r["cefr"],
                "g": (r["senses"][0]["gloss"][:60] if r["senses"] else ""),
                "t": trimmed["t"].get("tr", [])[:2],
                "u": trimmed["t"].get("ru", [])[:2],
                "z": trimmed["t"].get("az", [])[:2],
            })

    for band in BANDS:
        p = WEB / "vocab" / f"{band}.json"
        p.write_text(json.dumps(by_band[band], ensure_ascii=False,
                                separators=(",", ":")), encoding="utf-8")
        print(f"  vocab/{band}.json : {len(by_band[band]):>5,} kelime  "
              f"{p.stat().st_size / 1024:>7,.0f} KB")

    p = WEB / "index.json"
    p.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")),
                 encoding="utf-8")
    print(f"  index.json        : {len(index):>5,} kayıt   "
          f"{p.stat().st_size / 1024:>7,.0f} KB")

    # ---- cümleler ----
    buckets = defaultdict(list)
    with open(SRC / "sentences.jsonl", encoding="utf-8") as fh:
        for line in fh:
            s = json.loads(line)
            if s["cefr"] in BANDS:
                buckets[s["cefr"]].append(s)

    print()
    total_audio = 0
    for band in BANDS:
        items = select_sentences(buckets[band], band)
        slim = []
        for s in items:
            o = {"i": s["id"], "d": s["de"], "n": s["n"], "h": s["hard"]}
            for k in ("tr", "ru", "az"):
                if s.get(k):
                    o[k] = s[k]
            if s.get("audio"):
                o["a"] = {"id": s["audio"]["aid"], "by": s["audio"]["by"],
                          "l": s["audio"]["lic"], "f": s["audio"]["free"]}
                total_audio += 1
            slim.append(o)
        p = WEB / "sentences" / f"{band}.json"
        p.write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")),
                     encoding="utf-8")
        n_aud = sum(1 for s in slim if "a" in s)
        n_tr = sum(1 for s in slim if s.get("tr"))
        n_ru = sum(1 for s in slim if s.get("ru"))
        print(f"  sentences/{band}.json : {len(slim):>5,} cümle · "
              f"ses {n_aud:>4,} · TR {n_tr:>4,} · RU {n_ru:>4,}  "
              f"{p.stat().st_size / 1024:>6,.0f} KB")

    total = sum(f.stat().st_size for f in WEB.rglob("*.json"))
    print(f"\n✓ toplam paket boyutu: {total / 1024 / 1024:.1f} MB "
          f"({total_audio:,} sesli cümle)")


if __name__ == "__main__":
    main()
