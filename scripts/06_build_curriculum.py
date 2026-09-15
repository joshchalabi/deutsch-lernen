#!/usr/bin/env python3
"""
Aşama 6 — Elle yazılmış müfredatı doğrular ve web paketine dönüştürür.

NEDEN AYRI BİR DOĞRULAMA AŞAMASI?
  Müfredattaki kelimeler (curated/curriculum/*.json) elle yazılıyor. Bir ünite
  "Wohnung, Zimmer, Küche…" diyorsa bunların sözlük verisinde gerçekten karşılığı
  olmalı — yoksa ders açıldığında boş kart çıkar. Burada her kelime gerçek bir
  lemmaya bağlanıyor, bağlanamayan RAPOR EDİLİYOR ve derleme sesli şekilde
  uyarıyor. Sessizce eksik ünite üretmektense gürültü çıkarmak daha iyi.

KELİME ÇÖZÜMLEME SIRASI
  1. Birebir eşleşme (büyük-küçük harf dahil)   "Haus"      -> Haus|noun
  2. Harf duyarsız eşleşme                       "haus"      -> Haus|noun
  3. Çekimli biçim üzerinden                     "war"       -> sein|verb
  Birden çok aday varsa en sık olanı (en düşük rank) seçilir.

Çıktı: public/data/curriculum.json
"""
import json
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"
CUR = ROOT / "curated" / "curriculum"
WEB = ROOT / "public" / "data"

LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]


def norm(s):
    return unicodedata.normalize("NFC", s).lower()


def load_lemmas():
    """kelime -> [(rank, anahtar, pos, cefr)] — en sık olan başta"""
    exact = defaultdict(list)
    lower = defaultdict(list)
    with open(SRC / "enriched.jsonl", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            entry = (r["rank"], f"{r['w']}|{r['pos']}", r["pos"], r["cefr"])
            exact[r["w"]].append(entry)
            lower[norm(r["w"])].append(entry)
    for d in (exact, lower):
        for v in d.values():
            v.sort()
    return exact, lower


def load_form_index(exact):
    """çekimli biçim -> [(rank, anahtar, ...)]"""
    known = {k for v in exact.values() for (_, k, _, _) in v}
    by_key = {}
    for entries in exact.values():
        for e in entries:
            by_key[e[1]] = e
    forms = defaultdict(list)
    with open(SRC / "form2lemma.tsv", encoding="utf-8") as fh:
        for line in fh:
            p = line.rstrip("\n").split("\t")
            if len(p) != 3:
                continue
            key = f"{p[1]}|{p[2]}"
            if key in known:
                forms[norm(p[0])].append(by_key[key])
    for v in forms.values():
        v.sort()
    return forms


def resolve(word, exact, lower, forms):
    for table, probe in ((exact, word), (lower, norm(word)), (forms, norm(word))):
        hits = table.get(probe)
        if hits:
            return hits[0]
    return None


def main():
    exact, lower = load_lemmas()
    print(f"sözlük yüklendi: {sum(len(v) for v in exact.values()):,} lemma", flush=True)
    forms = load_form_index(exact)
    print(f"çekim indeksi: {len(forms):,} biçim", flush=True)

    out = {}
    total_words = 0
    unresolved = []

    for level in LEVELS:
        path = CUR / f"{level}.json"
        if not path.exists():
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"\n{level}: {len(data['units'])} ünite")

        for unit in data["units"]:
            resolved = []
            missing = []
            for w in unit["words"]:
                hit = resolve(w, exact, lower, forms)
                total_words += 1
                if hit:
                    _, key, pos, cefr = hit
                    resolved.append({"k": key, "w": w, "p": pos, "c": cefr})
                else:
                    missing.append(w)
                    unresolved.append(f"{unit['id']}:{w}")
            unit["words"] = resolved
            flag = f"  ⚠ {len(missing)} çözümlenemedi: {', '.join(missing)}" if missing else ""
            print(f"  {unit['id']:<8} {len(resolved):>2}/{len(resolved) + len(missing):>2} kelime"
                  f"  ·  {len(unit.get('grammar', []))} gramer"
                  f"  ·  {len(unit.get('writing', []))} yazma{flag}")

        out[level] = data

    WEB.mkdir(parents=True, exist_ok=True)
    p = WEB / "curriculum.json"
    p.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    ok = total_words - len(unresolved)
    print(f"\n✓ {sum(len(d['units']) for d in out.values())} ünite -> {p}"
          f"  ({p.stat().st_size / 1024:.0f} KB)")
    print(f"  kelime çözümleme: {ok:,}/{total_words:,} = {ok / total_words * 100:.1f}%")

    if unresolved:
        print(f"\n⚠ ÇÖZÜMLENEMEYEN {len(unresolved)} KELİME:")
        for u in unresolved:
            print(f"    {u}")
        print("\n  Bunlar derste görünmez. curated/curriculum/*.json içinde")
        print("  düzeltin ya da sözlükte karşılığı olan bir eşanlamlıyla değiştirin.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
