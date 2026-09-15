#!/usr/bin/env python3
"""
Aşama 3 — Çeviri kapsamasını birden çok açık kaynağı harmanlayarak yükseltir.

SORUN
  Almanca Wiktionary tek başına yetmiyor: Türkçe %56, Rusça %79, Azerice %6.
  Özellikle işlev sözcüklerinde (können, müssen, von, ihr) çeviri yok —
  oysa bunlar en sık kullanılan kelimeler.

KAYNAKLAR VE ÖNCELİK SIRASI
  1. dewiktionary çevirileri  — anlam indeksiyle hizalı, en güvenilir (CC BY-SA 3.0)
  2. Türkçe Wiktionary        — Almanca girdilerin Türkçe tanımları (CC BY-SA 3.0)
  3. FreeDict deu-tur         — 36.219 başlık (GPL-2.0-or-later)
     FreeDict deu-rus         — 26.809 başlık (CC BY-SA 3.0)
  4. curated/core_translations.json — en sık ~300 işlev sözcüğü için elle
     doğrulanmış 4 dilli çeviriler. Otomatik kaynaklar tam da bu kelimelerde
     zayıf ve bunlar dilin iskeleti; elle yapılması değer.

AZERİCE
  Açık veride Azerice neredeyse yok (Tatoeba'da DE-AZ yalnızca 272 cümle,
  kaikki'de azwiktionary yok). Kullanıcı onayıyla KÖPRÜ yaklaşımı:
  Azerice çeviri yoksa Türkçe çeviri gösterilir ve kayıt `az_src: "tr"`
  ile işaretlenir. Arayüz bunu açıkça "Türkçeden" rozetiyle belirtir —
  sessizce Türkçeyi Azerice diye sunmak dürüst olmaz.

Çıktı: data-src/enriched.jsonl
"""
import gzip
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
CURATED = ROOT / "curated"

TEI_NS = {"t": "http://www.tei-c.org/ns/1.0"}
PAREN = re.compile(r"\s*[\(\[][^)\]]*[\)\]]")
# FreeDict'te sık görülen dilbilgisi kısaltmaları çeviri sayılmamalı
NOISE = {"pl", "sg", "m", "f", "n", "v", "adj", "adv", "etw.", "jdn.", "jdm."}


def norm(s):
    return unicodedata.normalize("NFC", s).strip()


def clean(w):
    w = PAREN.sub("", w or "").strip(" ,;:.·-")
    return w if 1 < len(w) <= 50 and w.lower() not in NOISE else ""


def parse_freedict(path):
    """TEI P5 sözlüğünü {almanca_lemma: [çeviri, ...]} sözlüğüne çevirir."""
    out = defaultdict(list)
    if not path.exists():
        print(f"  ! bulunamadı: {path}")
        return out
    for _, entry in ET.iterparse(str(path), events=("end",)):
        if not entry.tag.endswith("}entry"):
            continue
        orth = entry.find(".//t:form/t:orth", TEI_NS)
        if orth is None or not orth.text:
            entry.clear()
            continue
        head = norm(orth.text)
        for quote in entry.findall(".//t:cit[@type='trans']/t:quote", TEI_NS):
            w = clean(quote.text)
            if w and w not in out[head]:
                out[head].append(w)
        entry.clear()
    return out


def parse_tr_wiktionary(path):
    """
    Türkçe Wiktionary'den Almanca girdileri toplar.
    Burada 'gloss' doğrudan Türkçe tanımdır, ayrı bir çeviri alanı yok.
    """
    out = defaultdict(list)
    if not path.exists():
        print(f"  ! bulunamadı: {path}")
        return out
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("lang_code") != "de":
                continue
            if "form-of" in (rec.get("tags") or []):
                continue
            head = norm(rec.get("word") or "")
            if not head:
                continue
            for s in (rec.get("senses") or [])[:3]:
                for g in (s.get("glosses") or [])[:1]:
                    # Tanım cümle değil, kısa karşılık olmalı
                    w = clean(g.split(",")[0].split(";")[0])
                    if w and " " not in w.strip() or (w and len(w.split()) <= 3):
                        if w and w not in out[head]:
                            out[head].append(w)
    return out


def load_curated():
    """
    İki elle yazılmış dosyayı birleştirir:
      core_translations.json — en sık işlev sözcükleri, dört dilde
      az_translations.json   — yalnızca Azerice, A1 ve müfredat kelimeleri

    Ayrı dosyalar çünkü kapsamları farklı: çekirdek dosya bir kelimenin
    TR/RU/AZ karşılığını birlikte sabitler, Azerice dosyası ise sadece
    'az' alanını doldurup TR/RU'yu otomatik kaynaklara bırakır.
    Aynı anahtar iki dosyada varsa diller birleştirilir; çakışan dilde
    çekirdek dosya kazanır.
    """
    merged: dict[str, dict] = {}
    for name in ("core_translations.json", "az_translations.json"):
        path = CURATED / name
        if not path.exists():
            print(f"  ! elle hazırlanmış dosya yok: {path}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        n = 0
        for key, langs in data.items():
            if key.startswith("_"):
                continue
            slot = merged.setdefault(key, {})
            for lang, vals in langs.items():
                slot.setdefault(lang, vals)
            n += 1
        print(f"    {name}: {n:,} kayıt")
    return merged


def add_translations(rec, lang, words, source):
    """Mevcut çevirilere yenilerini ekler, tekrarı önler, kaynağı işaretler."""
    bucket = rec.setdefault("tr", {}).setdefault(lang, [])
    existing = {e["w"].lower() for e in bucket}
    for w in words:
        if len(bucket) >= 6:
            break
        if w.lower() not in existing:
            bucket.append({"w": w, "si": "", "src": source})
            existing.add(w.lower())


def main():
    fd_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    trwikt = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    print("ek çeviri kaynakları yükleniyor...", flush=True)
    fd_tur = parse_freedict(fd_dir / "deu-tur" / "deu-tur.tei") if fd_dir else {}
    print(f"  FreeDict deu-tur: {len(fd_tur):,} başlık", flush=True)
    fd_rus = parse_freedict(fd_dir / "deu-rus" / "deu-rus.tei") if fd_dir else {}
    print(f"  FreeDict deu-rus: {len(fd_rus):,} başlık", flush=True)
    tw = parse_tr_wiktionary(trwikt) if trwikt else {}
    print(f"  Türkçe Wiktionary: {len(tw):,} Almanca başlık", flush=True)
    curated = load_curated()
    print(f"  Elle doğrulanmış: {len(curated):,} çekirdek kelime", flush=True)

    out_path = SRC / "enriched.jsonl"
    stats = defaultdict(int)
    total = 0

    with open(SRC / "ranked.jsonl", encoding="utf-8") as fh, \
         open(out_path, "w", encoding="utf-8") as out:
        for line in fh:
            rec = json.loads(line)
            total += 1
            w = rec["w"]

            # 2. öncelik: Türkçe Wiktionary
            if w in tw:
                add_translations(rec, "tr", tw[w], "trwikt")
            # 3. öncelik: FreeDict
            if w in fd_tur:
                add_translations(rec, "tr", fd_tur[w], "freedict")
            if w in fd_rus:
                add_translations(rec, "ru", fd_rus[w], "freedict")

            # 1./4. öncelik: elle doğrulanmış çekirdek — listenin BAŞINA geçer
            key = f"{w}|{rec['pos']}"
            cur = curated.get(key) or curated.get(w)
            if cur:
                # Elle doğrulanmış kayıt varsa o dilde SADECE o kullanılır.
                # Otomatik kaynaklar tam bu kelimelerde gürültülü:
                # "und" -> "vesaire", "ich" -> "alışılmış" gibi. Bu kelimeler
                # dilin iskeleti; yanlış bir karşılık burada en pahalıya patlar.
                for lang in ("tr", "ru", "az"):
                    if lang in cur:
                        vals = cur[lang] if isinstance(cur[lang], list) else [cur[lang]]
                        rec.setdefault("tr", {})[lang] = [
                            {"w": v, "si": "", "src": "curated"} for v in vals
                        ]
                stats["curated"] += 1

            # AZERİCE KÖPRÜSÜ
            az = rec.get("tr", {}).get("az") or []
            if az:
                rec["az_src"] = "native"
                stats["az_native"] += 1
            elif rec.get("tr", {}).get("tr"):
                rec["az_src"] = "tr"  # arayüz "Türkçeden" rozetini bundan çizer
                stats["az_bridged"] += 1
            else:
                rec["az_src"] = "none"

            for lang in ("tr", "ru", "az"):
                if rec.get("tr", {}).get(lang):
                    stats[f"has_{lang}"] += 1

            out.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"\n✓ {total:,} lemma -> {out_path}")
    print("\nKAPSAMA:")
    for lang in ("tr", "ru", "az"):
        c = stats[f"has_{lang}"]
        print(f"  {lang}: {c:>5,}/{total:,} = {c / total * 100:.1f}%")
    print(f"\n  Azerice kaynağı: {stats['az_native']:,} yerli, "
          f"{stats['az_bridged']:,} Türkçeden köprü, "
          f"{total - stats['az_native'] - stats['az_bridged']:,} yok")
    print(f"  Elle doğrulanmış kayıt uygulandı: {stats['curated']:,}")


if __name__ == "__main__":
    main()
