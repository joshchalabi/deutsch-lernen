#!/usr/bin/env python3
"""
Aşama 4 — Dinleme/okuma derlemini kurar.

Tatoeba'dan Almanca cümleleri alır, Türkçe/Rusça çevirileriyle eşler, insan
ses kaydı olanları işaretler ve HER CÜMLEYE ZORLUK PUANI verir.

ZORLUK PUANI NEDEN ÖNEMLİ?
  Nation (2006) ve Laufer (1989): öğrenmenin gerçekleştiği bant, metnin
  %95-98'inin ANLAŞILDIĞI banttır. Daha kolayı yeni bilgi vermez, daha zoru
  tahmine ve kopmaya yol açar (Conti'nin derlediği %60-80 başarı bandı).
  Bu yüzden her cümlenin "en zor kelimesinin rankı" ve "lemma kapsamı"
  önceden hesaplanıyor. Uygulama, öğrencinin BİLDİĞİ kelime kümesine karşı
  anlık kapsam yüzdesi hesaplayıp tam kıvamındaki cümleyi seçebiliyor.
  Çoğu sitede olmayan şey bu: metin seçimi sabit seviye etiketine değil,
  öğrencinin gerçek sözcük dağarcığına göre yapılıyor.

SES
  sentences_with_audio.csv'den Tatoeba ses kayıtları eşleniyor. Lisans
  kolonu korunuyor: yalnızca yeniden dağıtımı serbest olanlar (CC BY / CC0 /
  CC BY-SA / CC BY-NC*) indirilebilir olarak işaretleniyor.

Çıktı: data-src/sentences.jsonl
"""
import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data-src"

WORD_RE = re.compile(r"[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]*")

# Yeniden dağıtımı serbest lisanslar. ND (NoDerivatives) sorun değil çünkü
# ses dosyasını değiştirmiyoruz; NC (NonCommercial) sorun değil çünkü site
# ticari değil. Lisansı boş/bilinmeyen kayıtlar indirilmiyor, sadece linkleniyor.
REDISTRIBUTABLE = {
    "CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0",
    "CC BY-NC 4.0", "CC BY-NC-ND 3.0",
}

MIN_LEN, MAX_LEN = 2, 18  # kelime sayısı


def norm(s):
    return unicodedata.normalize("NFC", s).lower()


def load_sentences(path, lang_filter=None):
    out = {}
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            c = line.rstrip("\n").split("\t")
            if len(c) >= 3:
                out[c[0]] = c[2]
    return out


def load_links(path):
    """deu_id -> [other_id, ...]"""
    out = defaultdict(list)
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            c = line.rstrip("\n").split("\t")
            if len(c) == 2:
                out[c[0]].append(c[1])
    return out


def load_audio(path):
    """
    sentences_with_audio.csv kolonları:
      sentence_id, audio_id, username, license, attribution_url

    DİKKAT — burada bir kez hata yapıldı, tekrarlanmasın:
    İki kolon da aynı sayı aralığında kimlikler taşıyor, bu yüzden "hangi
    kolon cümle kimliği?" sorusu Almanca kimliklerle kesişim sayarak
    çözülemez. Kesişim kolon 2 için daha büyük çıkıyor (86.209 vs 32.937)
    ama bu rastlantısal çakışma; doğrusu kolon 1 ve gerçek sayı 32.937.

    Kesin doğrulama yolu: indirilen mp3'ün ID3 etiketine bakmak.
    audio.tatoeba.org/sentences/deu/<cümle_id>.mp3 dosyasının TALB etiketi
    "tatoeba.org - German Audio" diyor. Yanlış kimlikle İspanyolca kayıt
    geliyordu ve HTTP 200 döndüğü için hata fark edilmiyordu.
    """
    out = {}
    skipped_unlicensed = 0
    with open(path, encoding="utf-8", newline="") as fh:
        for row in csv.reader(fh, delimiter="\t", quoting=csv.QUOTE_NONE):
            if len(row) < 4:
                continue
            sent_id, audio_id, user, lic = row[0], row[1], row[2], row[3].strip()
            # Lisansı beyan edilmemiş kayıtlar CDN'den 403 dönüyor: Tatoeba
            # bunları indirtmiyor. Ölçüldü: boş lisanslı 4 örneğin 4'ü de 403,
            # lisanslı 11 örneğin 11'i de 200. Bunları en baştan almıyoruz,
            # yoksa dinleme bölümünde sessiz alıştırmalar çıkıyor.
            if not lic or lic == "\\N":
                skipped_unlicensed += 1
                continue
            if sent_id in out:
                continue  # bir cümlenin birden çok kaydı olabilir; ilki yeterli
            out[sent_id] = {
                "aid": audio_id,
                "by": user,
                "lic": lic,
                "free": lic in REDISTRIBUTABLE,
            }
    print(f"  lisanssız (erişilemez) kayıt atlandı: {skipped_unlicensed:,}")
    return out


def build_lemma_index():
    """
    Yüzey biçimi -> en düşük rank (yani en sık/en kolay lemma).
    Zorluk hesabında bir kelimenin en kolay okunuşunu esas alıyoruz:
    "Bank" hem A1 (oturma yeri) hem B2 (banka) olabilir; öğrenci için
    o token A1 zorluğundadır.
    """
    lemma_rank = {}
    with open(SRC / "enriched.jsonl", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            lemma_rank[(r["w"], r["pos"])] = r["rank"]

    form_rank = {}
    with open(SRC / "form2lemma.tsv", encoding="utf-8") as fh:
        for line in fh:
            p = line.rstrip("\n").split("\t")
            if len(p) != 3:
                continue
            rank = lemma_rank.get((p[1], p[2]))
            if rank is None:
                continue
            key = norm(p[0])
            if key not in form_rank or rank < form_rank[key]:
                form_rank[key] = rank
    return form_rank


def score_sentence(text, form_rank):
    """
    Döner: (token_sayısı, bilinen_lemma_oranı, en_zor_rank, rank_listesi)
    en_zor_rank: bilinen tokenlar içindeki en yüksek (=en nadir) rank.
    Sözlükte hiç bulunmayan token 'bilinmeyen' sayılır ve kapsamı düşürür.
    """
    toks = WORD_RE.findall(text)
    if not toks:
        return 0, 0.0, 0, []
    ranks = []
    unknown = 0
    for t in toks:
        r = form_rank.get(norm(t))
        if r is None:
            unknown += 1
        else:
            ranks.append(r)
    coverage = len(ranks) / len(toks)
    hardest = max(ranks) if ranks else 99999
    return len(toks), round(coverage, 3), hardest, ranks


def cefr_of_rank(rank):
    for band, ceil in (("A1", 800), ("A2", 2000), ("B1", 4000), ("B2", 7000), ("C1", 11000), ("C2", 18000)):
        if rank <= ceil:
            return band
    return "C2"


def main():
    tato = Path(sys.argv[1])

    print("Tatoeba yükleniyor...", flush=True)
    deu = load_sentences(tato / "deu_sentences.tsv")
    tur = load_sentences(tato / "tur_sentences.tsv")
    rus = load_sentences(tato / "rus_sentences.tsv")
    aze = load_sentences(tato / "aze_sentences.tsv")
    print(f"  de={len(deu):,} tr={len(tur):,} ru={len(rus):,} az={len(aze):,}", flush=True)

    l_tur = load_links(tato / "deu-tur_links.tsv")
    l_rus = load_links(tato / "deu-rus_links.tsv")
    l_aze = load_links(tato / "deu-aze_links.tsv")
    audio = load_audio(tato / "sentences_with_audio.csv")
    print(f"  bağlantılar: tr={len(l_tur):,} ru={len(l_rus):,} az={len(l_aze):,}")
    print(f"  ses kaydı olan cümle (tüm diller): {len(audio):,}", flush=True)

    print("lemma indeksi kuruluyor...", flush=True)
    form_rank = build_lemma_index()
    print(f"  {len(form_rank):,} yüzey biçimi indekslendi", flush=True)

    out_path = SRC / "sentences.jsonl"
    kept = 0
    stats = defaultdict(int)

    with open(out_path, "w", encoding="utf-8") as out:
        for sid, text in deu.items():
            n_tok, cov, hardest, ranks = score_sentence(text, form_rank)
            if not (MIN_LEN <= n_tok <= MAX_LEN):
                continue
            # Kapsamı düşük cümle öğretim için işe yaramaz: içinde
            # sözlüğümüzde olmayan çok fazla kelime var (özel ad, argo, yazım hatası)
            if cov < 0.85:
                continue

            rec = {"id": sid, "de": text, "n": n_tok, "cov": cov, "hard": hardest,
                   "cefr": cefr_of_rank(hardest)}

            tr_ids = l_tur.get(sid, [])
            ru_ids = l_rus.get(sid, [])
            az_ids = l_aze.get(sid, [])
            if tr_ids and (t := tur.get(tr_ids[0])):
                rec["tr"] = t
            if ru_ids and (t := rus.get(ru_ids[0])):
                rec["ru"] = t
            if az_ids and (t := aze.get(az_ids[0])):
                rec["az"] = t

            # Çevirisiz cümle çok dilli sitede işe yaramaz
            if not (rec.get("tr") or rec.get("ru")):
                continue

            if (a := audio.get(sid)):
                rec["audio"] = a
                stats["with_audio"] += 1
                if a["free"]:
                    stats["audio_free"] += 1

            stats[rec["cefr"]] += 1
            if rec.get("tr"):
                stats["has_tr"] += 1
            if rec.get("ru"):
                stats["has_ru"] += 1
            if rec.get("az"):
                stats["has_az"] += 1

            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            kept += 1

    print(f"\n✓ {kept:,} cümle -> {out_path}")
    print("\nSEVİYE DAĞILIMI:")
    for b in ("A1", "A2", "B1", "B2", "C1", "C2"):
        print(f"  {b}: {stats[b]:,}")
    print("\nÇEVİRİ:")
    for l in ("tr", "ru", "az"):
        print(f"  {l}: {stats['has_' + l]:,}")
    print(f"\nSES: {stats['with_audio']:,} cümlede kayıt var "
          f"({stats['audio_free']:,} tanesi yeniden dağıtılabilir lisanslı)")


if __name__ == "__main__":
    main()
