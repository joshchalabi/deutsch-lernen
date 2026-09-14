# Veri boru hattı

`public/data/` altındaki paketler bu betiklerle üretiliyor. Ham kaynaklar yaklaşık
4 GB tuttuğu için depoda değil; aşağıdaki adımlar sıfırdan yeniden üretiyor.

Betikler bağımsız: birini değiştirip yalnızca sonrakileri çalıştırabilirsiniz.

## Kaynakları indir

```bash
mkdir -p data-src/raw && cd data-src/raw

# 1. Almanca Wiktionary — yapılandırılmış döküm (303 MB)
curl -L -o raw-dewikt.jsonl.gz \
  https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz

# 2. Türkçe Wiktionary — Almanca girdilerin Türkçe tanımları (43 MB)
curl -L -o raw-trwikt.jsonl.gz \
  https://kaikki.org/trwiktionary/raw-wiktextract-data.jsonl.gz

# 3. Frekans listesi — OpenSubtitles 2018
curl -L -o de_full.txt \
  https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_full.txt

# 4. Tatoeba — cümleler, eşleşmeler, ses kayıtları
mkdir -p tatoeba && cd tatoeba
for f in deu/deu_sentences tur/tur_sentences rus/rus_sentences aze/aze_sentences \
         deu/deu-tur_links deu/deu-rus_links deu/deu-aze_links; do
  curl -L -O "https://downloads.tatoeba.org/exports/per_language/$f.tsv.bz2"
done
curl -L -O https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2
bunzip2 -kf *.bz2 && tar xjf sentences_with_audio.tar.bz2
cd ..

# 5. FreeDict — ek çeviriler
mkdir -p freedict && cd freedict
curl -L -o deu-tur.tar.xz https://download.freedict.org/dictionaries/deu-tur/0.2.2/freedict-deu-tur-0.2.2.src.tar.xz
curl -L -o deu-rus.tar.xz https://download.freedict.org/dictionaries/deu-rus/2025.11.23/freedict-deu-rus-2025.11.23.src.tar.xz
tar xf deu-tur.tar.xz && tar xf deu-rus.tar.xz
```

## Çalıştır

```bash
R=data-src/raw

python3 scripts/01_extract_wiktionary.py   $R/raw-dewikt.jsonl.gz
python3 scripts/02_rank_and_band.py        $R/de_full.txt $R/tatoeba/deu_sentences.tsv
python3 scripts/03_enrich_translations.py  $R/freedict $R/raw-trwikt.jsonl.gz
python3 scripts/04_build_sentences.py      $R/tatoeba
python3 scripts/05_build_web_bundles.py
```

Toplam süre: yaklaşık 10-15 dakika, ~6 GB geçici disk.

## Aşamalar ne yapıyor

**01 — Wiktionary çıkarımı.** 1,4 milyon satırlık dökümden Almanca lemmaları süzer.
811 bin *çekimli biçim* girdisini (`tags: ["form-of"]`) sözlükten ayıklar ama
frekanslarını ait oldukları lemmaya yönlendirir. Geriye 160.356 gerçek lemma kalır.
Büyük-küçük harf korunur — sonraki aşamada `Ich` (isim) ile `ich` (zamir) ayrımını
yapan tek kanıt budur.

**02 — Sıralama ve bandlama.** İki derlemi harmanlar: OpenSubtitles (156M token,
konuşma dili) ve Tatoeba (6M token, dengeli cümleler). Geometrik ortalama, film
diyaloğu sapmasını dengeliyor.

Frekans listesi küçük harfe indirgenmiş olduğundan isim/fiil ayrımı yapamıyor.
Tatoeba'dan her biçim için büyük/küçük harf oranı ölçülüp (cümle başı sayılmaz —
orada büyük harf zorunlu, kanıt değeri yok) frekans aday lemmalara bu orana göre
paylaştırılıyor.

Ayrıca işlev sözcüklerinden türemiş isimler (`das Ich`, `die Sie`, `das Nein`)
ağır şekilde geri çekiliyor: sıklıkları tamamen homograf oldukları zamirden sızıyor.

**03 — Çeviri zenginleştirme.** Dört kaynağı öncelik sırasıyla harmanlar. Elle
doğrulanmış çekirdek (`curated/core_translations.json`) diğerlerinin önüne geçer
ve o dilde tek başına kullanılır — otomatik kaynaklar tam da en sık kelimelerde
gürültülü ("und" → "vesaire", "ich" → "alışılmış"). Azerice köprüsü burada
işaretlenir (`az_src: "native" | "tr" | "none"`).

**04 — Cümle derlemi.** Her cümleye zorluk puanı verir: en zor kelimesinin frekans
rankı ve sözlük kapsaması. Kapsaması %85'in altındaki cümleler elenir (özel ad,
argo, yazım hatası dolu). Ses kayıtları lisans bilgisiyle eşlenir.

**05 — Web paketleri.** Seviye başına ayrı dosya: A1 öğrencisi C1 kelimelerini
indirmez. Cümle seçiminde ses ve Türkçe için **ayrı kotalar** var — tek bir "önce
sesliler" sıralaması Türkçeyi dışarı itiyordu, çünkü Almanca-Türkçe çift sayısı
(22 bin) sesli Almanca cümle sayısına (86 bin) göre dar ve kesişimleri daha da dar.

## Kalite denetimi

```bash
python3 - <<'PY'
import json
recs=[json.loads(l) for l in open('data-src/enriched.jsonl',encoding='utf-8')]
print("ilk 20 kelime:", [r['w'] for r in recs[:20]])
for lang in ('tr','ru','az'):
    n=sum(1 for r in recs if r.get('tr',{}).get(lang))
    print(f"{lang} kapsama: {n/len(recs)*100:.1f}%")
PY
```

En sık 20 kelime `sein, haben, werden, nicht, und, ich, wir, können…` gibi
görünmüyorsa sıralamada bir şey bozulmuş demektir.
