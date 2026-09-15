# Deutsch lernen

Sıfırdan C1'e Almanca öğrenme platformu. Türkçe, Azerice, Rusça ve Almanca arayüz.
Statik site — GitHub Pages'te sunucusuz çalışır.

---

## Nasıl kullanılır

Site iki şekilde çalışır ve ikisi aynı ilerlemeyi paylaşır.

### 1. Kurs — kitap gibi, sırayla

**A1'den B2'ye 40 ünite.** Her ünite bir konu, bir dilbilgisi hedefi ve ~25 kelime
içerir ve sabit bir sırayla ilerler:

```
🎯 Hedefler → 📖 Kelime → 📐 Dilbilgisi → ✍️ Alıştırma
           → 🎧 Dinleme → 📝 Yazma → 🎮 Oyun → 🏁 Bitiş
```

**Yazma adımı üç ödev içeriyor:**
1. **Ödev** — elle yazılmış, örnek cevaplı
2. **Kendi cümlelerin** — ünitenin beş kelimesiyle kendi cümlelerini kurarsın;
   kelime metinde geçtiğinde kart yeşile döner (çekimli biçimler de sayılır)
3. **Çeviri** — kendi dilinden Almancaya; önce yazarsın, sonra doğrusunu açarsın

Son ikisi ünitenin kendi malzemesinden üretiliyor, yani her açılışta farklı —
sabit bir ödev listesi ikinci turda ezbere döner.

Bu sıra keyfî değil: önce anlam, sonra kural, sonra kuralın üretimde denenmesi,
sonra aynı malzemenin sesle pekiştirilmesi, sonra serbest üretim, kapanışta hız
altında otomatikleşme.

Dilbilgisi açıklamaları dört dilde yazılmış; çekim tabloları ve örnek cümleler
ünitenin kendi malzemesinden geliyor. Alıştırmalar da öyle: sorular o ünitenin
tablosundan ve örneklerinden üretiliyor, hazır bir soru havuzundan değil.

Üniteler kilitli değil. Mentörlü öğrenmede sırayı bozmak gerekebilir; sıra
tavsiyedir, duvar değil.

### 2. Günlük plan — "bugün 2 saat çalışacağım"

Süreyi söylersiniz, plan blokları üretir:

| 120 dakika için | |
|---|---|
| 📖 Yeni kelime | 34 dk · 20 kelime |
| 🎧 Dinleme | 34 dk · 24 dikte |
| 📐 Dilbilgisi | 20 dk · 20 soru |
| 📝 Yazma | 18 dk |
| 🎮 Oyun | 14 dk |

Hedef sayıları iyimser değil: bir alıştırmanın düşünme süresi dahil gerçek
süresinden hesaplanıyor (yeni kelime ~40 sn, dikte ~85 sn, gramer sorusu ~25 sn).
"34 dakikada 102 kelime" yazan bir plan ilk günde terk edilir.

Yeni kelime hedefi ayarlardaki günlük sınırı aşmaz — aralıklı tekrar yarınki yükü
bugünün yeni kelimesinden üretir, sınırsız eklemek borç yığar.

### 3. 🤖 Yapay zekâ öğretmen (isteğe bağlı)

"Neden burada Dativ?", "Bu cümlem doğru mu?" gibi soruları soracağınız bir sohbet
penceresi. Varsayılan olarak **kapalı**; açmak için ayarlardan bir sağlayıcı seçmek
gerekiyor. Üç ücretsiz yol var:

| Sağlayıcı | Anahtar | Not |
|---|---|---|
| **OpenRouter** | ücretsiz kayıt | ~20 ücretsiz model, listeden canlı seçilir. En güvenilir. |
| **Google AI Studio** | ücretsiz kayıt | Günlük kota var. |
| **Pollinations** | gerekmez | Kurulumsuz, ama kotası sık tükeniyor — ölçtük, çalışmayabilir. |

**Ücretli anahtar da kullanılabilir.** Kendi Google AI Studio ya da OpenRouter
anahtarınızı girerseniz erişebildiğiniz tüm modeller listeye gelir:

- **Gemini**: model listesi *anahtarınızla* çekilir, yani tam olarak sizin
  erişebildiklerinizi gösterir — ücretli planda `gemini-2.5-pro` da listede çıkar.
- **OpenRouter**: varsayılan liste yalnızca ücretsizler (20 model). «Ücretlileri de
  göster» kutusuyla 441 modelin tamamı gelir, ücretliler 💳 ile işaretli.

Faturalandırma tamamen sağlayıcıyla aranızda; site araya girmiyor, kendi anahtarı yok.

**Model listesi koda gömülü değil.** İlk sürümde varsayılan olarak belirli bir
model yazılıydı; o model ücretliye geçince uygulama 404 verdi. Artık ayarlardaki
liste OpenRouter'dan **canlı** çekiliyor ve varsayılan `openrouter/free` — o anda
ücretsiz olan modeller arasından kendisi seçen bir yönlendirici. Eski, ölü model
kimlikleri açılışta sessizce bununla değiştiriliyor.

İki teknik ayrıntı, ikisi de ölçümle bulundu:
- **Akıl yürütme modelleri** düşünme adımlarını ayrı bir alana yazıyor ve bu token
  bütçesinden düşüyor. 500 tokenlık bütçenin tamamı düşünmeye gidip cevap boş
  dönüyordu. İstek artık `reasoning: { exclude: true }` gönderiyor.
- Serbest bırakılan modeller **çok uzun cevap** veriyordu (ölçüldü: basit bir soruya
  4.305 karakter). Sistem istemi kelime sınırı verecek şekilde sıkılaştırıldı;
  aynı soru artık ~430 karakter.

**Dürüst sınır:** ücretsiz küçük modeller bazen yanlış gerekçe veriyor — testte biri
«nach» edatını Akkusativ diye açıkladı (doğrusu Dativ). Arayüzde bu konuda uyarı var:
kurstaki dilbilgisi açıklamaları elle yazıldı, çelişki durumunda kurs geçerli.

Sunucumuz olmadığı için istek **doğrudan tarayıcıdan** sağlayıcıya gidiyor. Bunun
iki sonucu var ve ikisi de arayüzde yazılı:

1. Anahtar yalnızca sizin tarayıcınızda durur ve **ilerleme yedeğine dahil edilmez** —
   yedek dosyasını paylaşmak anahtarınızı sızdırmaz.
2. Yalnızca sorduğunuz metin dışarı çıkar. Sitenin geri kalanı hiçbir veri göndermez.

Öğretmenin kimliği dar tutuldu: en fazla üç cümle açıklama, ardından mutlaka Almanca
örnek cümle ve çevirisi. Konu dışı sorulara "sadece Almanca konusunda yardımcı
olabilirim" diyor. Sözlükteki her kelimenin yanında **🤖 Öğretmene sor** düğmesi var.

### 4. Serbest çalışma

Kelime, dinleme, okuma, dilbilgisi, sözlük ve ilerleme modülleri bağımsız olarak
da kullanılabilir. Kurs bitince ya da ileri seviyede asıl kullanım burası.

### 🎮 Oyunlar

Altı oyun, hepsi ünitenin gerçek kelimelerinden üretiliyor: **Artikel Yarışı**
(süreli der/die/das), **Kelime Eşleştirme**, **Cümle Kurma**, **Perfekt Çiftleri**,
**Nerede/Nereye** (Akkusativ mi Dativ mi), **Sıfat Eki**.

Oyunlar süs değil, bilinçli alıştırmanın bir biçimi: hepsi hız altında çalışıyor.
Bir kelimenin artikelini 4 saniyede seçmek, düşünerek bulmaktan farklı bir beceriyi
ölçüyor — otomatikleşme. Konuşurken artikeli düşünecek vaktiniz olmadığı için asıl
hedef budur.

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

### 3. Altı alıştırma türü

Tanıma (çoktan seçmeli) · Üretim (yazarak) · Artikel · Boşluk doldurma ·
**Dinleyerek tanıma** (kelimeyi görmeden, sesten) · **Aykırı olanı bul**

Dinleyerek tanıma ayrıca duruyor: diğer alıştırmaların hepsi yazılı biçimi
gösteriyor, dolayısıyla öğrenci kelimeyi gözüyle tanıyıp kulağıyla tanıyamayabilir.
Almanca'da bu fark büyük — *Bahn/Bann*, *Beeren/Bären* yazıda ayrışır, seste
ayrışmaz. Kelimelerin %99'unda insan kaydı olduğu için bu alıştırma gerçek sesle
çalışıyor.

### 4. Başarı bandı %60-80

Sürekli başarısızlık öğrenme değil tahmin ve kopma üretiyor. Alıştırma türü kelimenin
geçmiş başarı oranına göre seçiliyor: zayıf kelimelerde tanıma (çoktan seçmeli),
sağlamlaşmış kelimelerde üretim (yazma), örnek cümlesi olanlarda boşluk doldurma.
Zorluk öğrencinin gerçek durumuna uyarlanıyor.

### 5. Kapsama oranına göre metin seçimi

Nation (2006), Laufer (1989), Schmitt vd. (2011): öğrenmenin gerçekleştiği bant,
metnin **okumada %98, dinlemede %95**'inin anlaşıldığı banttır. Daha kolayı yeni bilgi
vermez, daha zoru tahmine yol açar.

Okuma modülü her cümlenin kapsamasını öğrencinin **gerçek** bilinen kelime kümesine
karşı anlık hesaplıyor ve akışı o banda göre süzüyor. İki B1 öğrencisi aynı metinleri
görmez — çünkü bildikleri kelimeler farklıdır.

### 6. Dikte ve gölgeleme

Dikte, dinlemeyi sesbirim düzeyinde ölçen az sayıda alıştırmadan biri: çoktan seçmeli
dinleme sorularında tahminle gizlenen boşlukları ortaya çıkarıyor. Cevap kelime
kelime karşılaştırılıp hangi kelimenin kaçırıldığı gösteriliyor.

Gölgeleme (shadowing) üzerine sistematik derlemeler — Hamada & Suzuki (2024) dahil —
fonemik ayırt etme, kelime tanıma, akıcılık ve prozodide ölçülebilir kazanım
gösteriyor. Hız denetimi (0.6× / 0.75× / 1.0×) bu yüzden var.

### 7. Gerçek saat bütçesi, sahte rozet değil

Goethe-Institut sıfırdan B2 için yaklaşık **600-800 rehberli ders saati** öngörüyor.
"Saat bankası" göstergesi, uydurma puanlar yerine bu gerçek ölçüye karşı nerede
olduğunuzu gösteriyor. Sekme arka plana alındığında sayaç duruyor: açık unutulan
sekme çalışma saati üretmemeli.

### 8. Yerleştirme testi — sahte kelime denetimli

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
| Kelime | 14.000 lemma, A1–C1 | [Wiktionary](https://de.wiktionary.org) via [kaikki.org](https://kaikki.org) | CC BY-SA 3.0 |
| Çekim tablosu | isimlerde 4 hâl × 2 sayı, fiillerde Stammformen | aynı | CC BY-SA 3.0 |
| IPA | %100 kapsama | aynı | CC BY-SA 3.0 |
| Kelime telaffuzu | %99,4 kapsama, insan kaydı | Wikimedia Commons | CC / kamu malı |
| Cümle | 14.900 cümle, zorluk puanlı | [Tatoeba](https://tatoeba.org) | CC BY 2.0 FR |
| Cümle sesi | 5.122 insan kaydı | Tatoeba | CC BY-NC-ND 3.0 vb. |
| Ders | A1–B2 için 40 ünite, 4 dilli | elle yazıldı | MIT |
| Azerice (kurs kelimeleri) | 919/919 = %100 yerli | elle yazıldı | MIT |
| Frekans | 156M token | [OpenSubtitles 2018](https://github.com/hermitdave/FrequencyWords) | CC BY-SA 4.0 |
| TR çeviri | %86,3 kapsama | Wiktionary + TR Wiktionary + [FreeDict](https://freedict.org) | CC BY-SA 3.0 / GPL-2.0+ |
| RU çeviri | %80,2 kapsama | Wiktionary + FreeDict | CC BY-SA 3.0 |
| AZ çeviri | %17 yerli (kurs kelimelerinde %100) | Wiktionary + elle | CC BY-SA 3.0 |

### Seviye bandları nasıl belirlendi

Frekans sırasına göre. Frekans, bir kelimenin CEFR seviyesinin tek başına en güçlü
yordayıcısı. Bandlar:

```
A1: 1–800      A2: 801–2.000     B1: 2.001–4.000
B2: 4.001–7.000                  C1: 7.001–14.000
```

Bantlar A1–B2 lehine genişletildi: kurs bu seviyelerde ve öğrencinin orada daha
çok malzemeye ihtiyacı var. A1 800, A2 1.200, B1 2.134, B2 2.943 kelime.

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

**Otomatik köprü artık istisna, kural değil.** Kursta geçen 919 kelimenin
tamamının Azericesi elle yazıldı (`curated/az_translations.json`), en sık 180 işlev
sözcüğü de dört dilli olarak `curated/core_translations.json` dosyasında.

Neden otomatik yapılmadı: mevcut tek otomatik yol İngilizce üzerinden köprü kurmak
(Almanca → İngilizce → Azerice) ve bu, çok anlamlı kelimelerde sistematik olarak
yanlış sonuç veriyor. Örneğin "danke" için açık veride Azerice karşılık hiç yok;
köprü Türkçe "teşekkür"ü gösteriyordu, oysa doğrusu **"sağ ol"**.

Kurs dışındaki seyrek kelimelerde köprü hâlâ devrede ve arayüzde "Türkçeden"
rozetiyle işaretli. Katkı vermek için bu iki dosyayı düzenlemek yeterli.

---

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:5173/deutsch-lernen/
npm test         # FSRS motorunun doğrulaması
npm run build
```

### GitHub Pages'e yayımlama

Canlı: **https://joshchalabi.github.io/deutsch-lernen/**

Güncellemek için tek komut:

```bash
npm run deploy
```

Derlemeyi yerelde yapıp `dist/` klasörünü `gh-pages` dalına gönderir. Pages o dalı
sunar. Bir-iki dakika içinde yayına girer.

İlk kurulumda yapılanlar (tekrarı gerekmez):
- Depo adı `deutsch-lernen` — `vite.config.ts` içindeki `base` bununla uyumlu.
  Farklı bir ada taşırsanız `BASE_PATH=/yeni-ad/ npm run build` ile derleyin.
- Pages kaynağı: `gh-pages` dalı, kök dizin.

**Neden Actions değil?** `.github/workflows/deploy.yml` hazır duruyor ama yalnızca
elle tetiklenecek şekilde ayarlı: bu hesapta Actions faturalandırma nedeniyle kilitli
(`The job was not started because your account is locked due to a billing issue`) ve
her push'ta kırmızı hata üretiyordu. Kilit kalkınca workflow'un başındaki yorumdaki
iki satırı geri alıp Pages kaynağını "GitHub Actions"a çevirmek yeterli.

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
- **Ders modülleri A1'den B2'ye kadar.** C1'de serbest çalışma bölümleri,
  sözlük ve günlük plan çalışıyor ama ünite yok. Yeni ünite eklemek için
  `curated/curriculum/<seviye>.json` dosyasına yazıp `scripts/06_build_curriculum.py`
  çalıştırmak yeterli — betik her kelimeyi sözlüğe karşı doğruluyor.
- **Yazma otomatik değerlendirilmiyor.** Sunucu olmadığı için serbest metni
  gerçekten puanlamak mümkün değil. Bunun yerine istenen kelimelerin geçip
  geçmediği, kelime/cümle sayısı ölçülüyor ve örnek cevap karşılaştırma için
  gösteriliyor. Mentör geri bildirimi bu noktada asıl değeri katıyor.

## Lisans

Kod MIT. Veri, yukarıdaki tabloda belirtilen kaynak lisanslarına tabi —
FreeDict deu-tur GPL-2.0-or-later içerdiği için türetilmiş veri paketleri
o koşulu taşır. Atıf künyesi uygulama içinde Ayarlar sayfasında.
