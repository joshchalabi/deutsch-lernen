#!/usr/bin/env python3
"""
Aşama 1 — Almanca Wiktionary (dewiktionary, wiktextract/kaikki) ham dökümünden
çok dilli sözlük omurgasını çıkarır.

Kaynak : https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz
Lisans : Wiktionary içeriği CC BY-SA 3.0 / GFDL. Türetilmiş veri de CC BY-SA 3.0.

Çıktı  : data-src/lemmas.jsonl    — birleştirilmiş lemma kayıtları
         data-src/form2lemma.tsv  — biçim/lemma/pos, satır başına bir eşleşme.
                                    Büyük-küçük harf KORUNUR: Almanca'da isimler
                                    büyük harfle başlar ve bu, sonraki aşamada
                                    "Ich"(isim) ile "ich"(zamir) ayrımını yapan
                                    tek kanıt.

Kullanım: python3 scripts/01_extract_wiktionary.py <raw-dewikt.jsonl.gz>
"""
import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data-src"
OUT.mkdir(exist_ok=True)

KEEP_POS = {
    "noun", "verb", "adj", "adv", "pron", "prep",
    "conj", "num", "intj", "particle", "det", "phrase",
}

TARGET_LANGS = {"tr", "ru", "az", "en"}
GENDER_TAGS = {"masculine": "m", "feminine": "f", "neuter": "n"}

# Yalnızca gerçek çekim etiketleri taşıyan biçimler frekans toplamına girer.
# Bu beyaz liste olmadan Wiktionary'nin `forms` dizisindeki kısaltmalar
# ("Zuluft" kaydındaki 'ZU' gibi) edat frekansını yutuyordu.
INFLECTION_TAGS = {
    "nominative", "genitive", "dative", "accusative",
    "singular", "plural",
    "present", "past", "subjunctive-i", "subjunctive-ii",
    "imperative", "participle-2", "participle",
    "comparative", "superlative", "positive",
    "masculine", "feminine", "neuter",
}
# Bu etiketleri taşıyan biçimler ASLA alınmaz.
FORM_TAG_BLOCKLIST = {"abbreviation", "symbol", "obsolete", "rare"}

PAREN_NOTE = re.compile(r"\s*[\(\[][^)\]]*[\)\]]\s*$")
IPA_CLEAN = re.compile(r"^[\[/]|[\]/]$")


def is_form_of(rec):
    """Çekimli biçim girdisi mi? ('arme' -> 'arm', 'Dokumente' -> 'Dokument')"""
    return "form-of" in (rec.get("tags") or [])


def base_lemma_of(rec):
    """form-of girdisinin işaret ettiği sözlük biçimi."""
    for s in rec.get("senses") or []:
        for fo in s.get("form_of") or []:
            w = (fo.get("word") or "").strip()
            if w:
                return w
    return None


def pick_gender(rec):
    tags = rec.get("tags") or []
    found = [GENDER_TAGS[t] for t in tags if t in GENDER_TAGS]
    if not found:
        for f in rec.get("forms") or []:
            ft = set(f.get("tags") or [])
            if {"nominative", "singular"} <= ft and f.get("article"):
                art = {"der": "m", "die": "f", "das": "n"}.get(f["article"])
                if art:
                    found.append(art)
                    break
    return list(dict.fromkeys(found))


def pick_plural(rec):
    for f in rec.get("forms") or []:
        ft = set(f.get("tags") or [])
        if {"nominative", "plural"} <= ft:
            val = (f.get("form") or "").strip()
            if val and val not in ("—", "-", "–"):
                return val
    return None


def pick_verb_forms(rec):
    """Fiillerin Stammformen'i — gramer alıştırmalarının çekirdeği."""
    out = {}
    for f in rec.get("forms") or []:
        ft = set(f.get("tags") or [])
        form = (f.get("form") or "").strip()
        if not form or form in ("—", "-", "–"):
            continue
        pron = f.get("pronouns") or []
        if "present" in ft and ("er" in pron or "sie" in pron):
            out.setdefault("praesens_3sg", form)
        elif "past" in ft and ("ich" in pron or "er" in pron):
            out.setdefault("praeteritum", form)
        elif "participle-2" in ft:
            out.setdefault("partizip2", form)
        elif "auxiliary" in ft and "perfect" in ft and form in ("haben", "sein"):
            out.setdefault("hilfsverb", form)
    return out


def pick_noun_cases(rec):
    table = {}
    for f in rec.get("forms") or []:
        ft = set(f.get("tags") or [])
        form = (f.get("form") or "").strip()
        if not form or form in ("—", "-", "–"):
            continue
        for case in ("nominative", "genitive", "dative", "accusative"):
            for num in ("singular", "plural"):
                if {case, num} <= ft:
                    key = f"{case[:3]}_{num[:2]}"
                    if key not in table:
                        table[key] = {"form": form, "art": f.get("article")}
    return table


def pick_sounds(rec):
    ipa, audio = None, None
    for s in rec.get("sounds") or []:
        if not ipa and s.get("ipa"):
            ipa = IPA_CLEAN.sub("", s["ipa"].strip())
        if not audio and s.get("mp3_url"):
            audio = s["mp3_url"]
    return ipa, audio


def pick_translations(rec):
    out = {}
    for t in rec.get("translations") or []:
        lc = t.get("lang_code")
        if lc not in TARGET_LANGS:
            continue
        w = PAREN_NOTE.sub("", (t.get("word") or "").strip()).strip(" ,;·")
        if not w or len(w) > 60:
            continue
        bucket = out.setdefault(lc, [])
        if not any(e["w"] == w for e in bucket):
            bucket.append({"w": w, "si": t.get("sense_index") or ""})
    return {k: v[:6] for k, v in out.items()}


def pick_senses(rec):
    senses = []
    for s in (rec.get("senses") or [])[:4]:
        glosses = [g.strip() for g in (s.get("glosses") or []) if g and g.strip()]
        if not glosses:
            continue
        examples = []
        for ex in (s.get("examples") or [])[:2]:
            txt = (ex.get("text") or "").strip().strip("„“\"»«").strip()
            if 12 <= len(txt) <= 180:
                examples.append(txt)
        senses.append({"gloss": glosses[0], "si": s.get("sense_index") or "", "ex": examples})
    return senses


def collect_forms(rec):
    """
    Frekans toplaması için gerçek çekim biçimleri.
    Orijinal büyük-küçük harf korunur.
    """
    forms = set()
    for f in rec.get("forms") or []:
        tags = set(f.get("tags") or [])
        if tags & FORM_TAG_BLOCKLIST:
            continue
        if not (tags & INFLECTION_TAGS):
            continue
        val = (f.get("form") or "").strip().rstrip("!")
        if val and " " not in val and val not in ("—", "-", "–") and 1 < len(val) < 40:
            forms.add(val)
    return forms


def merge_into(dst, src):
    """Aynı (kelime, tür) için birden çok Wiktionary girdisini birleştirir."""
    seen = {(s["gloss"], s["si"]) for s in dst["senses"]}
    for s in src["senses"]:
        if (s["gloss"], s["si"]) not in seen and len(dst["senses"]) < 6:
            dst["senses"].append(s)
            seen.add((s["gloss"], s["si"]))
    for lang, items in src.get("tr", {}).items():
        bucket = dst.setdefault("tr", {}).setdefault(lang, [])
        for it in items:
            if not any(e["w"] == it["w"] for e in bucket) and len(bucket) < 6:
                bucket.append(it)
    for k in ("ipa", "audio", "pl", "cases", "vf", "g", "syn", "ant"):
        if k not in dst and k in src:
            dst[k] = src[k]


def main():
    if len(sys.argv) < 2:
        sys.exit("kullanım: 01_extract_wiktionary.py <raw-dewikt.jsonl.gz>")
    src = Path(sys.argv[1])

    lemmas = {}            # (word, pos) -> kayıt
    form_map = {}          # biçim -> {(lemma, pos)}
    pending_forms = []     # (biçim, base_lemma) — lemma türü henüz bilinmiyor
    n_formof = 0

    with gzip.open(src, "rt", encoding="utf-8") as fh:
        for i, line in enumerate(fh):
            if i % 400_000 == 0 and i:
                print(f"  ...{i:,} satır, {len(lemmas):,} lemma", flush=True)
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if rec.get("lang_code") != "de":
                continue
            pos = rec.get("pos")
            if pos not in KEEP_POS:
                continue
            word = (rec.get("word") or "").strip()
            if not word or len(word) > 42:
                continue

            # Çekimli biçim girdisi: sözlüğe girmez, ama frekansı ait olduğu
            # lemmaya yönlendirilir.
            if is_form_of(rec):
                base = base_lemma_of(rec)
                if base:
                    pending_forms.append((word, base))
                    n_formof += 1
                continue

            if pos != "phrase" and (len(word) < 2 or any(c.isdigit() for c in word)):
                continue
            senses = pick_senses(rec)
            if not senses:
                continue

            ipa, audio = pick_sounds(rec)
            entry = {"w": word, "pos": pos, "senses": senses, "tr": pick_translations(rec)}
            if ipa:
                entry["ipa"] = ipa
            if audio:
                entry["audio"] = audio
            if pos == "noun":
                if (g := pick_gender(rec)):
                    entry["g"] = g
                if (pl := pick_plural(rec)):
                    entry["pl"] = pl
                if (cases := pick_noun_cases(rec)):
                    entry["cases"] = cases
            elif pos == "verb":
                if (vf := pick_verb_forms(rec)):
                    entry["vf"] = vf
            for rel in ("synonyms", "antonyms"):
                vals = [
                    (x.get("word") or "").strip()
                    for x in (rec.get(rel) or [])[:6]
                    if (x.get("word") or "").strip()
                ]
                if vals:
                    entry[rel[:3]] = vals

            key = (word, pos)
            if key in lemmas:
                merge_into(lemmas[key], entry)
            else:
                lemmas[key] = entry

            for form in collect_forms(rec) | {word}:
                form_map.setdefault(form, set()).add(key)

    # form-of girdilerini ilgili lemmalara bağla (türü bilinmediği için
    # o kelimeye ait bilinen tüm türlere yönlendiriyoruz)
    lemma_by_word = {}
    for (w, p) in lemmas:
        lemma_by_word.setdefault(w, []).append((w, p))
    for form, base in pending_forms:
        for key in lemma_by_word.get(base, ()):
            form_map.setdefault(form, set()).add(key)

    with open(OUT / "lemmas.jsonl", "w", encoding="utf-8") as fh:
        for entry in lemmas.values():
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")

    pairs = 0
    with open(OUT / "form2lemma.tsv", "w", encoding="utf-8") as fh:
        for form, keys in form_map.items():
            for word, pos in sorted(keys):
                fh.write(f"{form}\t{word}\t{pos}\n")
                pairs += 1

    print(f"\n✓ {len(lemmas):,} lemma (birleştirilmiş) -> data-src/lemmas.jsonl")
    print(f"✓ {n_formof:,} çekim girdisi sözlükten ayıklandı, frekansı lemmaya yönlendirildi")
    print(f"✓ {len(form_map):,} biçim / {pairs:,} eşleşme -> data-src/form2lemma.tsv")


if __name__ == "__main__":
    main()
