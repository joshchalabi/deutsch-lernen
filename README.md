# Deutsch lernen

Sıfırdan C1'e Almanca öğrenme platformu. Türkçe, Azerice, Rusça ve Almanca arayüz.
Statik site — GitHub Pages'te sunucusuz çalışır.

---

## Neden bu site farklı

Çoğu dil sitesi içeriği bir seviye etiketine göre dağıtır ("B1 metni") ve kelimeleri
sabit aralıklarla tekrarlatır. Buradaki her tasarım kararı bunun yerine yayımlanmış
araştırmaya dayanıyor.

### 1. FSRS aralıklı tekrar

Anki'nin 500 milyondan fazla gerçek tekrar kaydı üzerinde yapılan kıyaslamalarda
[FSRS](https://github.com/open-spaced-repetition/fsrs4anki), klasik SM-2'ye göre aynı
hatırlama oranını **%20-30 daha az tekrarla** sağlıyor. Anki 23.10'dan beri varsayılan.

SM-2 her kartı tek bir "kolaylık faktörü" ile yönetir. FSRS üç durum değişkeni tutar:
dayanıklılık (stability), zorluk (difficulty) ve anlık hatırlama olasılığı
(retrievability). Bir sonraki tekrar, hatırlama olasılığı hedef orana (varsayılan %90)
düştüğü gün planlanır.

`src/lib/fsrs.ts` — `npm test` ile doğrulanıyor.

### 2. Geri çağırma pratiği, tekrar okuma değil

Karpicke & Roediger'in çalışmaları ve bunların ikinci dil kelime öğreniminde
yinelenmesi: bilgiyi tekrar *okumak* yerine *hatırlamaya çalışmak* uzun vadeli
hatırlamayı belirgin şekilde artırıyor. Hiçbir alıştırma "şu kelimeye bak ve ezberle"
demiyor; hepsi önce cevabı üretmeni istiyor.

### 3. Başarı bandı %60-80

Sürekli başarısızlık öğrenme değil tahmin ve kopma üretiyor. Alıştırma türü kelimenin
geçmiş başarı oranına göre seçiliyor: zayıf kelimelerde tanıma (çoktan seçmeli),
sağlamlaşmış kelimelerde üretim (yazma), örnek cümlesi olanlarda boşluk doldurma.
Zorluk öğrencinin gerçek durumuna uyarlanıyor.

### 4. Kapsama oranına göre metin seçimi

Nation (2006), Laufer (1989), Schmitt vd. (2011): öğrenmenin gerçekleştiği bant,
metnin **okumada %98, dinlemede %95**'inin anlaşıldığı banttır. Daha kolayı yeni bilgi
vermez, daha zoru tahmine yol açar.

Okuma modülü her cümlenin kapsamasını öğrencinin **gerçek** bilinen kelime kümesine
karşı anlık hesaplıyor ve akışı o banda göre süzüyor. İki B1 öğrencisi aynı metinleri
görmez — çünkü bildikleri kelimeler farklıdır.

### 5. Dikte ve gölgeleme

Dikte, dinlemeyi sesbirim düzeyinde ölçen az sayıda alıştırmadan biri: çoktan seçmeli
dinleme sorularında tahminle gizlenen boşlukları ortaya çıkarıyor. Cevap kelime
kelime karşılaştırılıp hangi kelimenin kaçırıldığı gösteriliyor.

Gölgeleme (shadowing) üzerine sistematik derlemeler — Hamada & Suzuki (2024) dahil —
fonemik ayırt etme, kelime tanıma, akıcılık ve prozodide ölçülebilir kazanım
gösteriyor. Hız denetimi (0.6× / 0.75× / 1.0×) bu yüzden var.

### 6. Gerçek saat bütçesi, sahte rozet değil

Goethe-Institut sıfırdan B2 için yaklaşık **600-800 rehberli ders saati** öngörüyor.
"Saat bankası" göstergesi, uydurma puanlar yerine bu gerçek ölçüye karşı nerede
olduğunuzu gösteriyor. Sekme arka plana alındığında sayaç duruyor: açık unutulan
sekme çalışma saati üretmemeli.

### 7. Yerleştirme testi — sahte kelime denetimli

Meara & Buxton'ın (1987) Yes/No kelime testi tasarımı. Bilinen zaafı öğrencinin
kendini fazla değerlendirmesi olduğu için araya Almanca sesbilgisine uygun ama var
olmayan kelimeler karıştırılıyor (*Trawung*, *blorken*, *Feschtel*…). Bunlara
"biliyorum" denirse kestirim sinyal saptama kuramının standart düzeltmesiyle aşağı
çekiliyor:

```
düzeltilmiş = (isabet − yanlış_alarm) / (1 − yanlış_alarm)
```

---

## Veri

Hepsi açık lisanslı, hepsi otomatik boru hattıyla üretiliyor.

| Ne | Miktar | Kaynak | Lisans |
|---|---|---|---|
| Kelime | 9.000 lemma, A1–C1 | [Wiktionary](https://de.wiktionary.org) via [kaikki.org](https://kaikki.org) | CC BY-SA 3.0 |
| Çekim tablosu | isimlerde 4 hâl × 2 sayı, fiillerde Stammformen | aynı | CC BY-SA 3.0 |
| IPA | %100 kapsama | aynı | CC BY-SA 3.0 |
| Kelime telaffuzu | %99,4 kapsama, insan kaydı | Wikimedia Commons | CC / kamu malı |
| Cümle | 20.400 cümle, zorluk puanlı | [Tatoeba](https://tatoeba.org) | CC BY 2.0 FR |
| Cümle sesi | 12.294 insan kaydı | Tatoeba | CC BY-NC-ND 3.0 vb. |
| Frekans | 156M token | [OpenSubtitles 2018](https://github.com/hermitdave/FrequencyWords) | CC BY-SA 4.0 |
| TR çeviri | %86,3 kapsama | Wiktionary + TR Wiktionary + [FreeDict](https://freedict.org) | CC BY-SA 3.0 / GPL-2.0+ |
| RU çeviri | %80,2 kapsama | Wiktionary + FreeDict | CC BY-SA 3.0 |
| AZ çeviri | %8,1 yerli + %78 köprü | Wiktionary + elle | CC BY-SA 3.0 |

### Seviye bandları nasıl belirlendi

Frekans sırasına göre. Frekans, bir kelimenin CEFR seviyesinin tek başına en güçlü
yordayıcısı. Bandlar:

```
A1: 1–650      A2: 651–1.600     B1: 1.601–3.000
B2: 3.001–5.500                  C1: 5.501–9.000
```

A1/A2/B1 tavanları Goethe sınav sözcük listelerinin yayımlanmış **boyut mertebesiyle**
hizalı (A1 ~650, A2 ~1.300, B1 ~2.400 kelime). C1 tavanı Nation'ın %98 kapsam için
gereken 8.000–9.000 kelime ailesi hesabından geliyor.

> **Telif notu.** Goethe-Institut'un Wortliste PDF'leri açıkça şunu belirtiyor:
> *"Weder das Werk noch seine Teile dürfen ohne eine solche Einwilligung überspielt,
> gespeichert und in ein Netzwerk eingespielt werden."* Bu listelerin içeriği —
> kelimeler ve örnek cümleler — bu projede **kullanılmadı**. Yalnızca yayımlanmış
> liste büyüklükleri, kendi frekans tabanlı bandlarımızı ölçeklendirmek için referans
> alındı.

### Azerice hakkında dürüst not

Açık veride Azerice neredeyse yok: Tatoeba'da Almanca–Azerice cümle çifti **272**
(Rusça'da 227.020), kaikki.org'da Azerice Wiktionary dökümü yok.

Bu yüzden köprü yaklaşımı kullanılıyor: doğrulanmış Azerice karşılığı olmayan
kelimelerde Türkçe karşılık gösteriliyor ve arayüzde **"Türkçeden"** rozetiyle
işaretleniyor. Sessizce Türkçeyi Azerice diye sunmak dürüst olmazdı.

En sık ~180 işlev sözcüğü (zamirler, modal fiiller, edatlar, bağlaçlar) elle
doğrulanmış dört dilli çevirilerle `curated/core_translations.json` dosyasında.
Otomatik kaynaklar tam da bu kelimelerde başarısız oluyordu — oysa bunlar dilin
iskeleti. Katkı vermek için bu dosyayı düzenlemek yeterli.

---

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173/deutsch-lernen/
npm test         # FSRS motorunun doğrulaması
npm run build
```

### GitHub Pages'e yayımlama

1. Depoyu GitHub'a gönderin.
2. Depo adınız `deutsch-lernen` değilse `vite.config.ts` içindeki `base` değerini
   güncelleyin (ya da `BASE_PATH=/depo-adiniz/ npm run build` ile derleyin).
3. Depo ayarlarında **Settings → Pages → Source: GitHub Actions** seçin.
4. `main` dalına her gönderimde `.github/workflows/deploy.yml` otomatik yayımlar.

Yönlendirme `HashRouter` kullanıyor: GitHub Pages statik dosya sunduğu için
`/study` gibi bir yola doğrudan girmek 404 verirdi. Hash yönlendirme (`#/study`)
sunucuya hiç uğramıyor, derin bağlantılar ve sayfa yenileme sorunsuz çalışıyor.

### İlerleme verisi

Sunucu yok; ilerleme tarayıcının `localStorage`'ında. Gizlilik açısından iyi ama
cihazlar arası eşitlenmez ve site verisi temizlenirse kaybolur. Bu yüzden
Ayarlar'daki **dışa/içe aktarma** süs değil, asıl yedekleme yolu.

---

## Veriyi yeniden üretme

Ham kaynaklar (~4 GB) depoda değil. `scripts/README.md` tüm zinciri anlatıyor.

```
01_extract_wiktionary.py   Wiktionary dökümü  → 160.356 lemma + biçim eşlemesi
02_rank_and_band.py        frekansla sırala   → 9.000 lemma, CEFR bandlı
03_enrich_translations.py  çeviri kaynaklarını harmanla
04_build_sentences.py      Tatoeba → zorluk puanlı cümle derlemi
05_build_web_bundles.py    tarayıcı paketleri → public/data/
```

---

## Bilinen sınırlar

- **Türkçe cümle çevirisi seyrek.** Tatoeba'da Almanca–Türkçe 22.138 çift var
  (Rusça'da 227.020). Paketleme kotası her seviyede Türkçe için ayrı taban
  ayırıyor ama Rusça kadar bol değil.
- **Çeviri gürültüsü.** FreeDict ve Wiktionary bazı kelimelerde tuhaf karşılıklar
  veriyor (ör. *Haus* için "beyt"). Elle doğrulanmış çekirdek listesi bu sorunu
  en sık kelimelerde çözüyor; seyrek kelimelerde kalabilir.
- **Kapsama hesabı yaklaşık.** Tam biçim→lemma eşlemesi 30 MB'tan büyük olduğu için
  tarayıcıya gönderilmiyor; kapsama, lemma + çoğul + fiil biçimleri + hâl tablosu
  üzerinden hesaplanıyor.
- **Ses dış kaynaktan akıtılıyor.** `tatoeba.org` erişilemezse dinleme çalışmaz.

## Lisans

Kod MIT. Veri, yukarıdaki tabloda belirtilen kaynak lisanslarına tabi —
FreeDict deu-tur GPL-2.0-or-later içerdiği için türetilmiş veri paketleri
o koşulu taşır. Atıf künyesi uygulama içinde Ayarlar sayfasında.
