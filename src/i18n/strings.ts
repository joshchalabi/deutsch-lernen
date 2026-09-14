/**
 * Arayüz metinleri — Türkçe, Azerice, Rusça, Almanca.
 *
 * Tek dosyada tutuluyor: dört dilin aynı anahtarı görmesi, birinin eksik
 * kalmasını imkânsız kılıyor (TypeScript eksik anahtarı derleme hatası yapar).
 */

import type { UiLang } from '../lib/types'

export const STRINGS = {
  /* --- genel --- */
  appName: { tr: 'Almanca Öğren', az: 'Alman dili', ru: 'Немецкий язык', de: 'Deutsch lernen' },
  home: { tr: 'Ana sayfa', az: 'Ana səhifə', ru: 'Главная', de: 'Start' },
  study: { tr: 'Çalış', az: 'Çalış', ru: 'Учить', de: 'Lernen' },
  dictionary: { tr: 'Sözlük', az: 'Lüğət', ru: 'Словарь', de: 'Wörterbuch' },
  listening: { tr: 'Dinleme', az: 'Dinləmə', ru: 'Аудирование', de: 'Hören' },
  reading: { tr: 'Okuma', az: 'Oxuma', ru: 'Чтение', de: 'Lesen' },
  grammar: { tr: 'Dilbilgisi', az: 'Qrammatika', ru: 'Грамматика', de: 'Grammatik' },
  writing: { tr: 'Yazma', az: 'Yazma', ru: 'Письмо', de: 'Schreiben' },
  progress: { tr: 'İlerleme', az: 'İrəliləyiş', ru: 'Прогресс', de: 'Fortschritt' },
  settings: { tr: 'Ayarlar', az: 'Tənzimləmələr', ru: 'Настройки', de: 'Einstellungen' },
  games: { tr: 'Oyunlar', az: 'Oyunlar', ru: 'Игры', de: 'Spiele' },

  loading: { tr: 'Yükleniyor…', az: 'Yüklənir…', ru: 'Загрузка…', de: 'Wird geladen…' },
  error: { tr: 'Hata', az: 'Xəta', ru: 'Ошибка', de: 'Fehler' },
  retry: { tr: 'Tekrar dene', az: 'Yenidən cəhd et', ru: 'Повторить', de: 'Erneut versuchen' },
  next: { tr: 'İleri', az: 'İrəli', ru: 'Далее', de: 'Weiter' },
  back: { tr: 'Geri', az: 'Geri', ru: 'Назад', de: 'Zurück' },
  check: { tr: 'Kontrol et', az: 'Yoxla', ru: 'Проверить', de: 'Prüfen' },
  skip: { tr: 'Atla', az: 'Keç', ru: 'Пропустить', de: 'Überspringen' },
  finish: { tr: 'Bitir', az: 'Bitir', ru: 'Завершить', de: 'Beenden' },
  start: { tr: 'Başla', az: 'Başla', ru: 'Начать', de: 'Anfangen' },
  correct: { tr: 'Doğru', az: 'Düzgün', ru: 'Верно', de: 'Richtig' },
  wrong: { tr: 'Yanlış', az: 'Səhv', ru: 'Неверно', de: 'Falsch' },
  showAnswer: { tr: 'Cevabı göster', az: 'Cavabı göstər', ru: 'Показать ответ', de: 'Antwort zeigen' },
  close: { tr: 'Kapat', az: 'Bağla', ru: 'Закрыть', de: 'Schließen' },

  /* --- yerleştirme --- */
  placementTitle: {
    tr: 'Seviye belirleme testi',
    az: 'Səviyyə təyini testi',
    ru: 'Тест на определение уровня',
    de: 'Einstufungstest',
  },
  placementIntro: {
    tr: 'Bu test kelime bilginizi ölçerek başlangıç seviyenizi belirler. Yaklaşık 3 dakika sürer. Bilmediğiniz kelimede "Bilmiyorum" demek testi bozmaz — aksine, doğru seviyeye yerleşmenizi sağlar.',
    az: 'Bu test söz ehtiyatınızı ölçərək başlanğıc səviyyənizi müəyyən edir. Təxminən 3 dəqiqə çəkir. Bilmədiyiniz sözdə "Bilmirəm" demək testi pozmur — əksinə, doğru səviyyəyə düşməyinizi təmin edir.',
    ru: 'Этот тест определяет ваш начальный уровень, измеряя словарный запас. Занимает около 3 минут. Ответ «Не знаю» не портит тест — наоборот, помогает попасть на нужный уровень.',
    de: 'Dieser Test bestimmt Ihr Ausgangsniveau anhand Ihres Wortschatzes. Er dauert etwa 3 Minuten. «Weiß ich nicht» verfälscht den Test nicht — im Gegenteil, so landen Sie auf dem richtigen Niveau.',
  },
  knowIt: { tr: 'Biliyorum', az: 'Bilirəm', ru: 'Знаю', de: 'Kenne ich' },
  dontKnow: { tr: 'Bilmiyorum', az: 'Bilmirəm', ru: 'Не знаю', de: 'Kenne ich nicht' },
  placementResult: { tr: 'Seviyeniz', az: 'Səviyyəniz', ru: 'Ваш уровень', de: 'Ihr Niveau' },
  estimatedVocab: {
    tr: 'Tahmini kelime dağarcığı',
    az: 'Təxmini söz ehtiyatı',
    ru: 'Оценка словарного запаса',
    de: 'Geschätzter Wortschatz',
  },
  retakePlacement: {
    tr: 'Testi tekrar yap',
    az: 'Testi yenidən et',
    ru: 'Пройти тест заново',
    de: 'Test wiederholen',
  },

  /* --- çalışma --- */
  dueToday: { tr: 'Bugün tekrar', az: 'Bu gün təkrar', ru: 'Повторить сегодня', de: 'Heute fällig' },
  newWords: { tr: 'Yeni kelime', az: 'Yeni söz', ru: 'Новые слова', de: 'Neue Wörter' },
  noDue: {
    tr: 'Bugünlük tekrar kalmadı. Yeni kelime ekleyebilir veya dinleme çalışabilirsiniz.',
    az: 'Bu günlük təkrar qalmadı. Yeni söz əlavə edə və ya dinləmə məşğul ola bilərsiniz.',
    ru: 'На сегодня повторений нет. Можно добавить новые слова или заняться аудированием.',
    de: 'Heute sind keine Wiederholungen mehr fällig. Sie können neue Wörter hinzufügen oder Hörverstehen üben.',
  },
  again: { tr: 'Tekrar', az: 'Yenidən', ru: 'Снова', de: 'Nochmal' },
  hard: { tr: 'Zor', az: 'Çətin', ru: 'Трудно', de: 'Schwer' },
  good: { tr: 'İyi', az: 'Yaxşı', ru: 'Хорошо', de: 'Gut' },
  easy: { tr: 'Kolay', az: 'Asan', ru: 'Легко', de: 'Leicht' },
  days: { tr: 'gün', az: 'gün', ru: 'дн.', de: 'Tg.' },
  minutes: { tr: 'dk', az: 'dəq', ru: 'мин', de: 'Min.' },

  /* --- alıştırma türleri --- */
  recallMeaning: {
    tr: 'Bu kelimenin anlamı ne?',
    az: 'Bu sözün mənası nədir?',
    ru: 'Что означает это слово?',
    de: 'Was bedeutet dieses Wort?',
  },
  recallWord: {
    tr: 'Bu anlamın Almancası ne?',
    az: 'Bu mənanın alman dilində qarşılığı nədir?',
    ru: 'Как это по-немецки?',
    de: 'Wie heißt das auf Deutsch?',
  },
  chooseArticle: {
    tr: 'Doğru artikeli seçin',
    az: 'Düzgün artikli seçin',
    ru: 'Выберите правильный артикль',
    de: 'Wählen Sie den richtigen Artikel',
  },
  typeWord: {
    tr: 'Kelimeyi yazın',
    az: 'Sözü yazın',
    ru: 'Напишите слово',
    de: 'Schreiben Sie das Wort',
  },
  fillGap: {
    tr: 'Boşluğu doldurun',
    az: 'Boşluğu doldurun',
    ru: 'Заполните пропуск',
    de: 'Füllen Sie die Lücke',
  },

  /* --- dinleme --- */
  dictation: { tr: 'Dikte', az: 'Diktə', ru: 'Диктант', de: 'Diktat' },
  shadowing: { tr: 'Gölgeleme', az: 'Kölgələmə', ru: 'Шэдоуинг', de: 'Shadowing' },
  dictationHint: {
    tr: 'Cümleyi dinleyin ve duyduğunuzu yazın. İstediğiniz kadar tekrar dinleyebilirsiniz.',
    az: 'Cümləni dinləyin və eşitdiyinizi yazın. İstədiyiniz qədər təkrar dinləyə bilərsiniz.',
    ru: 'Прослушайте предложение и запишите услышанное. Можно слушать сколько угодно раз.',
    de: 'Hören Sie den Satz und schreiben Sie, was Sie hören. Sie können beliebig oft wiederholen.',
  },
  shadowingHint: {
    tr: 'Kaydı dinlerken aynı anda sesli tekrar edin. Gecikmeyi kısa tutun — bu, dinleme kasını çalıştıran en etkili yöntemlerden biri.',
    az: 'Qeydi dinləyərkən eyni anda səsli təkrar edin. Gecikməni qısa saxlayın — bu, dinləmə əzələsini işlədən ən təsirli üsullardan biridir.',
    ru: 'Повторяйте вслух одновременно с записью. Держите задержку минимальной — это один из самых эффективных способов тренировки слуха.',
    de: 'Sprechen Sie gleichzeitig mit der Aufnahme mit. Halten Sie den Abstand kurz — eine der wirksamsten Methoden für das Hörverstehen.',
  },
  play: { tr: 'Oynat', az: 'Oynat', ru: 'Воспроизвести', de: 'Abspielen' },
  replay: { tr: 'Tekrar', az: 'Təkrar', ru: 'Ещё раз', de: 'Nochmal' },
  slower: { tr: 'Yavaş', az: 'Yavaş', ru: 'Медленнее', de: 'Langsamer' },
  normalSpeed: { tr: 'Normal', az: 'Normal', ru: 'Обычно', de: 'Normal' },

  /* --- okuma --- */
  coverageLabel: {
    tr: 'Kelime kapsaması',
    az: 'Söz əhatəsi',
    ru: 'Покрытие словаря',
    de: 'Wortabdeckung',
  },
  covTooEasy: { tr: 'Çok kolay', az: 'Çox asan', ru: 'Слишком легко', de: 'Zu leicht' },
  covIdeal: { tr: 'Tam kıvamında', az: 'Tam yerində', ru: 'В самый раз', de: 'Genau richtig' },
  covHard: { tr: 'Zorlayıcı', az: 'Çətin', ru: 'Сложновато', de: 'Fordernd' },
  covTooHard: { tr: 'Çok zor', az: 'Çox çətin', ru: 'Слишком трудно', de: 'Zu schwer' },
  coverageExplain: {
    tr: 'Araştırmalar okumada %98, dinlemede %95 kelime kapsamasının öğrenme için en verimli bant olduğunu gösteriyor (Nation, 2006). Metinler bu orana göre seçiliyor.',
    az: 'Araşdırmalar oxumada 98%, dinləmədə 95% söz əhatəsinin öyrənmə üçün ən səmərəli zolaq olduğunu göstərir (Nation, 2006). Mətnlər bu nisbətə görə seçilir.',
    ru: 'Исследования показывают, что оптимальное покрытие — 98% при чтении и 95% при аудировании (Nation, 2006). Тексты подбираются по этому показателю.',
    de: 'Studien zeigen: 98% Abdeckung beim Lesen und 95% beim Hören sind das lernwirksamste Band (Nation, 2006). Die Texte werden danach ausgewählt.',
  },

  /* --- dilbilgisi --- */
  caseLabel: { tr: 'Hâl', az: 'Hal', ru: 'Падеж', de: 'Kasus' },
  nominative: { tr: 'Yalın', az: 'Adlıq', ru: 'Именительный', de: 'Nominativ' },
  accusative: { tr: 'Belirtme', az: 'Təsirlik', ru: 'Винительный', de: 'Akkusativ' },
  dative: { tr: 'Yönelme', az: 'Yönlük', ru: 'Дательный', de: 'Dativ' },
  genitive: { tr: 'İlgi', az: 'Yiyəlik', ru: 'Родительный', de: 'Genitiv' },
  singular: { tr: 'Tekil', az: 'Tək', ru: 'Ед. ч.', de: 'Singular' },
  plural: { tr: 'Çoğul', az: 'Cəm', ru: 'Мн. ч.', de: 'Plural' },
  verbForms: { tr: 'Fiil biçimleri', az: 'Feil formaları', ru: 'Формы глагола', de: 'Stammformen' },

  /* --- ilerleme --- */
  studiedHours: { tr: 'Çalışılan saat', az: 'Çalışılan saat', ru: 'Часов занятий', de: 'Lernstunden' },
  wordsSeen: { tr: 'Görülen kelime', az: 'Görülən söz', ru: 'Слов изучено', de: 'Gesehene Wörter' },
  wordsMature: {
    tr: 'Yerleşmiş kelime',
    az: 'Möhkəmlənmiş söz',
    ru: 'Закреплённых слов',
    de: 'Gefestigte Wörter',
  },
  streak: { tr: 'Gün serisi', az: 'Gün seriyası', ru: 'Дней подряд', de: 'Tagesserie' },
  totalReviews: { tr: 'Toplam tekrar', az: 'Ümumi təkrar', ru: 'Всего повторений', de: 'Wiederholungen' },
  hourBank: {
    tr: 'Saat bankası',
    az: 'Saat bankı',
    ru: 'Банк часов',
    de: 'Stundenkonto',
  },
  hourBankExplain: {
    tr: 'Goethe-Institut sıfırdan B2 için yaklaşık 600-800 rehberli ders saati öngörüyor. Buradaki çubuk, sahte bir rozet değil, o gerçek ölçüye karşı nerede olduğunuzu gösterir.',
    az: 'Goethe-Institut sıfırdan B2 üçün təxminən 600-800 rəhbərli dərs saatı nəzərdə tutur. Buradakı zolaq saxta nişan deyil, həmin real ölçüyə qarşı harada olduğunuzu göstərir.',
    ru: 'Goethe-Institut оценивает путь с нуля до B2 примерно в 600-800 учебных часов. Эта шкала — не декоративный бейдж, а ваше положение относительно реальной величины.',
    de: 'Das Goethe-Institut veranschlagt für den Weg von null bis B2 etwa 600-800 Unterrichtsstunden. Dieser Balken ist kein Abzeichen, sondern Ihr Stand an diesem realen Maß.',
  },

  /* --- ayarlar --- */
  uiLanguage: { tr: 'Arayüz dili', az: 'İnterfeys dili', ru: 'Язык интерфейса', de: 'Oberflächensprache' },
  translationLanguage: {
    tr: 'Çeviri dili',
    az: 'Tərcümə dili',
    ru: 'Язык перевода',
    de: 'Übersetzungssprache',
  },
  newPerDay: { tr: 'Günlük yeni kelime', az: 'Gündəlik yeni söz', ru: 'Новых слов в день', de: 'Neue Wörter pro Tag' },
  maxReviews: { tr: 'Günlük tekrar tavanı', az: 'Gündəlik təkrar limiti', ru: 'Лимит повторений', de: 'Max. Wiederholungen' },
  targetRetention: {
    tr: 'Hedef hatırlama oranı',
    az: 'Hədəf yadda saxlama nisbəti',
    ru: 'Целевое запоминание',
    de: 'Ziel-Behaltensrate',
  },
  retentionExplain: {
    tr: 'Yüksek oran daha sık tekrar, daha az unutma demek. %90 çoğu öğrenci için en verimli denge.',
    az: 'Yüksək nisbət daha tez-tez təkrar, daha az unutma deməkdir. 90% əksər öyrənən üçün ən səmərəli balansdır.',
    ru: 'Высокий показатель — чаще повторения и меньше забывания. 90% — оптимальный баланс для большинства.',
    de: 'Ein höherer Wert bedeutet häufigere Wiederholungen und weniger Vergessen. 90% ist für die meisten optimal.',
  },
  ttsFallback: {
    tr: 'Kaydı olmayan kelimelerde tarayıcı sesi kullan',
    az: 'Qeydi olmayan sözlərdə brauzer səsindən istifadə et',
    ru: 'Использовать синтез речи, если нет записи',
    de: 'Browser-Sprachausgabe verwenden, wenn keine Aufnahme vorliegt',
  },
  ttsFallbackNote: {
    tr: 'Kelimelerin %99\'unda ve cümlelerin çoğunda gerçek insan kaydı var. Bu seçenek yalnızca kalan boşluklar için.',
    az: 'Sözlərin 99%-də və cümlələrin çoxunda həqiqi insan qeydi var. Bu seçim yalnız qalan boşluqlar üçündür.',
    ru: 'Для 99% слов и большинства предложений есть живая запись. Эта опция — только для оставшихся пробелов.',
    de: 'Für 99% der Wörter und die meisten Sätze gibt es echte Aufnahmen. Diese Option betrifft nur die Lücken.',
  },
  theme: { tr: 'Tema', az: 'Tema', ru: 'Тема', de: 'Design' },
  themeLight: { tr: 'Açık', az: 'Açıq', ru: 'Светлая', de: 'Hell' },
  themeDark: { tr: 'Koyu', az: 'Tünd', ru: 'Тёмная', de: 'Dunkel' },
  themeSystem: { tr: 'Sistem', az: 'Sistem', ru: 'Системная', de: 'System' },
  exportData: { tr: 'İlerlemeyi dışa aktar', az: 'İrəliləyişi ixrac et', ru: 'Экспорт прогресса', de: 'Fortschritt exportieren' },
  importData: { tr: 'İlerlemeyi içe aktar', az: 'İrəliləyişi idxal et', ru: 'Импорт прогресса', de: 'Fortschritt importieren' },
  exportNote: {
    tr: 'İlerlemeniz yalnızca bu tarayıcıda saklanıyor — sunucu yok. Başka cihaza taşımak veya yedeklemek için dışa aktarın.',
    az: 'İrəliləyişiniz yalnız bu brauzerdə saxlanılır — server yoxdur. Başqa cihaza köçürmək və ya ehtiyat nüsxə üçün ixrac edin.',
    ru: 'Прогресс хранится только в этом браузере — сервера нет. Для переноса или резервной копии используйте экспорт.',
    de: 'Ihr Fortschritt liegt nur in diesem Browser — es gibt keinen Server. Zum Übertragen oder Sichern exportieren Sie ihn.',
  },
  importOk: { tr: 'İlerleme yüklendi', az: 'İrəliləyiş yükləndi', ru: 'Прогресс загружен', de: 'Fortschritt geladen' },
  importFail: {
    tr: 'Dosya okunamadı — bu uygulamanın dışa aktardığı bir dosya olmalı',
    az: 'Fayl oxunmadı — bu tətbiqin ixrac etdiyi fayl olmalıdır',
    ru: 'Не удалось прочитать файл — нужен файл, экспортированный этим приложением',
    de: 'Datei nicht lesbar — es muss eine von dieser App exportierte Datei sein',
  },

  /* --- sözlük --- */
  searchPlaceholder: {
    tr: 'Almanca, Türkçe, Rusça veya Azerice ara…',
    az: 'Alman, türk, rus və ya azərbaycan dilində axtar…',
    ru: 'Искать на немецком, турецком, русском или азербайджанском…',
    de: 'Auf Deutsch, Türkisch, Russisch oder Aserbaidschanisch suchen…',
  },
  noResults: { tr: 'Sonuç yok', az: 'Nəticə yoxdur', ru: 'Ничего не найдено', de: 'Keine Treffer' },
  bridgedFromTurkish: {
    tr: 'Türkçeden',
    az: 'Türkcədən',
    ru: 'с турецкого',
    de: 'aus dem Türkischen',
  },
  bridgedExplain: {
    tr: 'Bu kelimenin doğrulanmış Azerice karşılığı açık kaynaklarda yok. Gösterilen karşılık Türkçedendir; Azerice kullanımda farklılık olabilir.',
    az: 'Bu sözün təsdiqlənmiş Azərbaycan dilində qarşılığı açıq mənbələrdə yoxdur. Göstərilən qarşılıq türkcədəndir; Azərbaycan dilində fərq ola bilər.',
    ru: 'Проверенного азербайджанского перевода в открытых источниках нет. Показан турецкий вариант; в азербайджанском возможны отличия.',
    de: 'Es gibt keine geprüfte aserbaidschanische Übersetzung in offenen Quellen. Gezeigt wird die türkische; im Aserbaidschanischen kann sie abweichen.',
  },
  addToStudy: { tr: 'Çalışmaya ekle', az: 'Çalışmaya əlavə et', ru: 'Добавить в учёбу', de: 'Zum Lernen hinzufügen' },
  inStudy: { tr: 'Çalışılıyor', az: 'Çalışılır', ru: 'В учёбе', de: 'Wird gelernt' },
  frequencyRank: { tr: 'Sıklık sırası', az: 'Tezlik sırası', ru: 'Ранг частотности', de: 'Häufigkeitsrang' },
  examples: { tr: 'Örnekler', az: 'Nümunələr', ru: 'Примеры', de: 'Beispiele' },
  synonyms: { tr: 'Eş anlamlı', az: 'Sinonim', ru: 'Синонимы', de: 'Synonyme' },
  antonyms: { tr: 'Zıt anlamlı', az: 'Antonim', ru: 'Антонимы', de: 'Antonyme' },
} as const

export type StringKey = keyof typeof STRINGS

export function t(key: StringKey, lang: UiLang): string {
  return STRINGS[key][lang]
}

export const LANG_NAMES: Record<UiLang, string> = {
  tr: 'Türkçe',
  az: 'Azərbaycanca',
  ru: 'Русский',
  de: 'Deutsch',
}
