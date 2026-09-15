/* DER FALL — Akte 1924/11 „Der letzte Gast"
   Drei Fassungen desselben Falls: A2, B1, B2.
   L(a2, b1, b2) → Text je Stufe. Eine blosse Zeichenkette gilt für alle Stufen.
   In INDIZIEN ist optionen[0] immer richtig (wird beim Anzeigen gemischt).   */

function L(a2, b1, b2) { return { a2: a2, b1: b1 || a2, b2: b2 || b1 || a2 }; }

const STUFEN = {
  a2: { code: "A2", name: "Grundstufe",   noetig: 4, tempo: 0.85 },
  b1: { code: "B1", name: "Mittelstufe",  noetig: 5, tempo: 1 },
  b2: { code: "B2", name: "Oberstufe",    noetig: 6, tempo: 1.00 }
};

const INDIZIEN = {
  akkusativ: {
    marke: "Wechselpräposition · Akkusativ", zitat: "auf den Tisch gestellt", quelle: "Otto Reinhardt",
    kurz: "Akkusativ heißt Richtung. Er hat das Glas bewegt.",
    tr: "„auf <strong>den</strong> Tisch“ — Akkusativ, yani <em>hareket</em>. Bardağı masaya o koymuş. Kurt ise „auf <strong>dem</strong> Tisch“ (Dativ, duruyordu) diyor. Demek ki Otto o odadaydı.",
    frage: "Was verrät „auf den Tisch“?",
    optionen: [
      "Akkusativ nach „auf“ = Richtung. Er hat das Glas bewegt — also war er im Büro.",
      "Dativ nach „auf“ = Ort. Er hat das Glas nur dort stehen sehen.",
      "„gestellt“ ist Partizip II — das heißt nur, dass es lange her ist."
    ],
    optionenTr: [
      "„auf“ + Akkusativ = yön. Bardağı hareket ettirmiş — demek ki ofisteydi.",
      "„auf“ + Dativ = yer. Bardağı sadece orada dururken görmüş.",
      "„gestellt“ Partizip II — sadece çok önce olduğunu gösterir."
    ]
  },
  mehr: {
    marke: "Gradpartikel „mehr“", zitat: "kein Geld mehr", quelle: "Otto Reinhardt",
    kurz: "„kein … mehr“ setzt voraus, dass vorher Geld da war.",
    tr: "„kein Geld <strong>mehr</strong>“ = önceden para <em>vardı</em>, şimdi yok. Kasa kilitliydi ve boşaltıldı — Otto bunu nereden biliyor?",
    frage: "Warum ist „kein Geld mehr“ verräterisch?",
    optionen: [
      "„kein … mehr“ heißt: vorher war Geld da, jetzt nicht. Er weiß, dass der Safe leer ist.",
      "„mehr“ ist ein Komparativ — er vergleicht zwei Geldsummen.",
      "„kein … mehr“ ist nur eine höfliche Verneinung ohne besondere Bedeutung."
    ],
    optionenTr: [
      "„kein … mehr“ = önce vardı, şimdi yok. Kasanın boşaldığını biliyor.",
      "„mehr“ bir karşılaştırma — iki meblağı kıyaslıyor.",
      "„kein … mehr“ sadece kibar bir olumsuzlama, özel anlamı yok."
    ]
  },
  zugang: {
    marke: "Pronomen „wir“", zitat: "Wir haben das Geld immer im Safe aufbewahrt", quelle: "Otto Reinhardt",
    kurz: "„wir“ schließt ihn selbst ein — er kannte den Safe.",
    tr: "„<strong>Wir</strong> haben … aufbewahrt“ — birinci çoğul şahıs kendisini de içine alır: kasayı biliyordu, erişimi vardı. Hemen ardından „Wir? Emil tabii ki“ diye geri adım atması da ayrıca anlamlı.",
    frage: "Warum ist „wir“ hier gefährlich für ihn?",
    optionen: [
      "„wir“ schließt ihn selbst ein: Er wusste, wo das Geld lag — und kam offenbar daran.",
      "„wir“ ist höflich gemeint wie „man“ und sagt nichts über ihn aus.",
      "„aufbewahrt“ steht im Passiv — man erfährt nicht, wer das Geld eingeschlossen hat."
    ],
    optionenTr: [
      "„wir“ kendisini de kapsar: paranın yerini biliyordu ve anlaşılan erişebiliyordu.",
      "„wir“ burada „man“ gibi kibar bir kullanım, onun hakkında bir şey söylemez.",
      "„aufbewahrt“ edilgen — parayı kimin kilitlediği anlaşılmıyor."
    ]
  },
  streit: {
    marke: "Widerspruch zu Frau Kessler", zitat: "Wir hatten nie Streit", quelle: "Otto Reinhardt",
    kurz: "Clara Kessler sagt das Gegenteil — und nennt den Grund: Geld.",
    tr: "Clara „Otto ile neredeyse her akşam kavga ediyordu“ diyor, Otto ise „hiç kavga etmedik“. İkisi aynı anda doğru olamaz — üstelik Clara sebebini de söylüyor: para.",
    frage: "Wer sagt genau das Gegenteil?",
    optionen: [
      "Clara Kessler. Brandt habe sich in den letzten Wochen fast jeden Abend mit ihm gestritten — um Geld.",
      "Hilde Wolff. Sie hat Streit aus dem Büro gehört.",
      "Kurt Sauer. Er sagt, die beiden hätten nie miteinander gesprochen."
    ],
    optionenTr: [
      "Clara Kessler. Brandt'ın son haftalarda onunla neredeyse her akşam para yüzünden kavga ettiğini söylüyor.",
      "Hilde Wolff. Ofisten kavga sesi duymuş.",
      "Kurt Sauer. İkisinin hiç konuşmadığını söylüyor."
    ]
  },
  passiv: {
    marke: "Passiv ohne Agens", zitat: "Die Tür wurde geöffnet", quelle: "Otto Reinhardt",
    stufe: "b1",
    kurz: "Wer hat sie geöffnet? Das Passiv verschweigt es.",
    tr: "Edilgen çatı „von + kişi“ olmadan <em>eylemi yapanı gizler</em>. Kapıyı kim açtı? Otto tam da bu boşluğa sığınıyor.",
    frage: "Was fehlt in „Die Tür wurde geöffnet“?",
    optionen: [
      "Der Handelnde. Passiv ohne „von …“ verschweigt, wer die Tür geöffnet hat.",
      "Das Objekt. Man erfährt nicht, welche Tür gemeint ist.",
      "Die Zeitangabe. „wurde“ kann Gegenwart oder Vergangenheit sein."
    ],
    optionenTr: [
      "Eylemi yapan kişi. „von …“ olmayan edilgen, kapıyı kimin açtığını gizler.",
      "Nesne. Hangi kapı olduğu anlaşılmıyor.",
      "Zaman bilgisi. „wurde“ hem şimdiki hem geçmiş olabilir."
    ]
  },
  hilde: {
    marke: "Alibi widerlegt", zitat: "In der Garderobe war niemand", quelle: "Hilde Wolff",
    kurz: "Um Viertel nach elf war die Garderobe leer.",
    tr: "Otto „bütün gece vestiyerdeydim“ diyor. Hilde 23:15'te döndüğünde orası <em>boştu</em>. Alibi çöktü.",
    frage: "Wessen Aussage bricht damit zusammen?",
    optionen: [
      "Ottos. Er sagt, er war die ganze Nacht in der Garderobe — um Viertel nach elf war dort niemand.",
      "Claras. Sie sagt, sie stand bis halb zwölf auf der Bühne.",
      "Kurts. Er sagt, er hat den ganzen Abend im Saal serviert."
    ],
    optionenTr: [
      "Otto'nunki. Bütün gece vestiyerde olduğunu söylüyor — oysa 23:15'te orası boştu.",
      "Clara'nınki. On bir buçuğa kadar sahnede olduğunu söylüyor.",
      "Kurt'unki. Bütün akşam salonda servis yaptığını söylüyor."
    ]
  },
  selbst: {
    marke: "Widerspruch in sich", zitat: "Ich habe nichts gehört", quelle: "Hilde Wolff",
    kurz: "Zwei Sätze derselben Zeugin schließen einander aus.",
    tr: "Hilde önce „hiçbir şey duymadım“ diyor, birkaç cümle sonra „yukarıda bir şey düştü“ diyor. Aynı ifadenin içinde iki cümle birbirini çürütüyor. En basit ama en güçlü çelişki türü.",
    frage: "Womit steht dieser Satz im Widerspruch?",
    optionen: [
      "Mit ihrer eigenen Aussage: „Oben ist etwas gefallen, gegen elf.“",
      "Mit Kurt Sauers Aussage über die Treppe.",
      "Mit dem Bericht: Die Bürotür war nicht verschlossen."
    ],
    optionenTr: [
      "Kendi ifadesiyle: „Yukarıda bir şey düştü, on bir civarı.“",
      "Kurt Sauer'in merdivenle ilgili ifadesiyle.",
      "Raporla: ofis kapısı kilitli değildi."
    ]
  },
  treppe: {
    marke: "Augenzeuge", zitat: "ging er die Treppe hinauf", quelle: "Kurt Sauer",
    kurz: "Aktiv, ohne Konjunktiv — er hat es selbst gesehen.",
    tr: "Etken çatı, dolaylı anlatım <em>yok</em> — Kurt bunu kendi gözüyle görmüş. 23:10'da Otto merdivenden ofise çıkıyor.",
    frage: "Warum wiegt dieser Satz schwer?",
    optionen: [
      "Aktiv, ohne Konjunktiv: Kurt hat es selbst gesehen — das ist ein Augenzeuge.",
      "Konjunktiv I: Kurt gibt nur weiter, was in der Küche erzählt wird.",
      "Passiv: Jemand hat Herrn Reinhardt nach oben gebracht."
    ],
    optionenTr: [
      "Etken, dolaylı anlatım yok: Kurt kendi görmüş — görgü tanığı.",
      "Konjunktiv I: Kurt sadece mutfakta anlatılanı aktarıyor.",
      "Edilgen: Birisi Bay Reinhardt'ı yukarı çıkarmış."
    ]
  },
  sollen: {
    marke: "subjektives „sollen“", zitat: "soll ihm Geld geliehen haben", quelle: "Kurt Sauer",
    stufe: "b1",
    kurz: "Hörensagen — ein Motiv, aber kein Beweis.",
    tr: "„sollen“ + Perfekt mastar <em>başkalarının iddiasını</em> aktarır (söylentiye göre). Kanıt değil ama güçlü bir saik: Otto'nun borcu varmış.",
    frage: "Was heißt „soll … geliehen haben“?",
    optionen: [
      "Hörensagen: „sollen“ + Perfekt-Infinitiv gibt eine fremde Behauptung wieder. Ein Motiv, kein Beweis.",
      "Eine Pflicht: Herr Brandt musste ihm das Geld leihen.",
      "Kurts eigene Beobachtung: Er hat die Übergabe gesehen."
    ],
    optionenTr: [
      "Söylenti: „sollen“ + Perfekt mastar başkasının iddiasını aktarır. Saik var, kanıt yok.",
      "Bir zorunluluk: Bay Brandt ona parayı vermek zorundaydı.",
      "Kurt'un kendi gözlemi: paranın verilişini görmüş."
    ]
  },
  konjunktiv: {
    marke: "Konjunktiv I", zitat: "er sei … gewesen", quelle: "Clara Kessler",
    stufe: "b2",
    kurz: "Indirekte Rede — sie hat ihn dort nicht gesehen.",
    tr: "Konjunktiv I dolaylı anlatım işaretidir. Clara, Otto'yu vestiyerde <em>görmüş değil</em> — sadece Otto'nun iddiasını aktarıyor. Yani Otto'nun tanığı yok.",
    frage: "Warum ist dieser Satz kein Alibi?",
    optionen: [
      "„sei gewesen“ ist Konjunktiv I — indirekte Rede. Clara gibt nur weiter, was Otto behauptet.",
      "„sei gewesen“ ist Konjunktiv II — sie hält seine Geschichte für unmöglich.",
      "„sei gewesen“ ist Passiv — jemand hat Otto dorthin gebracht."
    ],
    optionenTr: [
      "Konjunktiv I — dolaylı anlatım. Clara sadece Otto'nun iddiasını aktarıyor.",
      "Konjunktiv II — Clara bunu imkânsız buluyor.",
      "Edilgen çatı — Otto'yu biri oraya götürmüş."
    ]
  },
  wollen: {
    marke: "subjektives „wollen“", zitat: "will niemanden gesehen haben", quelle: "Clara Kessler",
    stufe: "b2",
    kurz: "Eine Behauptung, die Clara selbst bezweifelt.",
    tr: "„wollen“ + Perfekt mastar, kişinin <em>kendi hakkındaki iddiası</em>dır ve konuşan buna inanmadığını ima eder. Hilde'yi sorgulamak şart.",
    frage: "Was bedeutet „will … gesehen haben“?",
    optionen: [
      "Hilde behauptet es von sich selbst — und Clara glaubt ihr nicht. „wollen“ + Perfekt-Infinitiv.",
      "Hilde möchte jemanden sehen — ein Wunsch für die Zukunft.",
      "Hilde musste jemanden sehen — eine Pflicht."
    ],
    optionenTr: [
      "Hilde bunu kendisi iddia ediyor — Clara inanmıyor. „wollen“ + Perfekt mastar.",
      "Hilde birini görmek istiyor — geleceğe dair bir istek.",
      "Hilde birini görmek zorundaydı — bir yükümlülük."
    ]
  }
};

const VERDAECHTIGE = [
  {
    id: "clara", name: "Clara Kessler", alter: 29, rolle: "Sängerin", typ: "saengerin",
    vorspann: L(
      "Clara Kessler kommt in das kleine Büro hinter der Bühne. Sie trägt noch ihr Kleid von der Vorstellung.",
      "Clara Kessler betritt das kleine Büro hinter der Bühne. Sie trägt noch das Bühnenkleid und raucht.",
      "Clara Kessler betritt das enge Büro hinter der Bühne, noch im Bühnenkleid, und zündet sich eine Zigarette an, ohne zu fragen."),
    vorspannTr: "Clara Kessler sahne arkasındaki küçük büroya giriyor. Üzerinde hâlâ sahne kıyafeti var.",
    eingang: L(
      "Fragen Sie. Ich habe nichts zu verbergen. Ich war die ganze Zeit auf der Bühne.",
      "Fragen Sie ruhig. Ich habe nichts zu verbergen — ich stand ja die ganze Zeit im Licht.",
      "Fragen Sie, so viel Sie wollen. Zu verbergen habe ich nichts; ich stand schließlich den ganzen Abend im Scheinwerferlicht."),
    eingangTr: "Sorun buyurun. Saklayacak bir şeyim yok — bütün gece ışığın altındaydım.",
    abwehr: ["Was soll daran falsch sein?", "Sie hören etwas, das ich nicht gesagt habe."],
    zusammenbruch: "Mehr weiß ich wirklich nicht, Herr Kommissar. Ich singe hier nur.",
    zusammenbruchTr: "Gerçekten daha fazlasını bilmiyorum, komiser bey. Ben burada sadece şarkı söylüyorum.",
    aussagen: [
      { de: L("Ich war bis halb zwölf auf der Bühne.", "Ich stand bis halb zwölf auf der Bühne."),
        tr: "On bir buçuğa kadar sahnedeydim.",
        nach: { de: L("Hundert Gäste haben mich gesehen. Fragen Sie den Kapellmeister.",
                      "Hundert Gäste können das bezeugen. Fragen Sie meinetwegen den Kapellmeister."),
                tr: "Yüz misafir beni gördü. İsterseniz orkestra şefine sorun." },
        falsch: { de: "Ein einfacher Satz über die Vergangenheit. Daran ist nichts faul.",
                  tr: "Geçmiş hakkında basit bir cümle. Burada şüpheli bir şey yok." } },

      { de: L("Otto ist um zehn nach elf aus dem Saal gegangen.", "Otto verließ den Saal um zehn nach elf."),
        tr: "Otto saat on biri on geçe salondan çıktı.",
        nach: { de: "Ich habe ihn von der Bühne aus gesehen. Er ging zur Treppe.",
                tr: "Onu sahneden gördüm. Merdivene doğru gitti." },
        falsch: { de: "Aktiv, mit Subjekt, ohne Umschweife — eine saubere Augenzeugenaussage.",
                  tr: "Etken, özne belli, dolambaç yok — temiz bir görgü tanıklığı." } },

      { de: L("Otto hat gesagt, dass er in der Garderobe war.",
              "Otto hat mir gesagt, er war die ganze Zeit in der Garderobe.",
              "Otto sagte mir, er sei die ganze Zeit in der Garderobe gewesen."),
        tr: "Otto bana bütün zaman vestiyerde olduğunu söyledi.",
        tell: "konjunktiv", abStufe: "b2",
        nach: { de: "Das hat er mir in der Pause erzählt. Gesehen habe ich ihn dort nicht.",
                tr: "Bunu bana arada anlattı. Onu orada görmedim." },
        falsch: { de: "Sie gibt weiter, was Otto behauptet. Auf dieser Stufe zählt das noch nicht als Indiz.",
                  tr: "Otto'nun iddiasını aktarıyor. Bu seviyede henüz delil sayılmıyor — B2'de sayılır." } },

      { de: L("Hilde sagt, sie hat niemanden gesehen.",
              "Hilde behauptet, sie hat niemanden gesehen.",
              "Hilde will niemanden gesehen haben."),
        tr: "Hilde kimseyi görmediğini iddia ediyor.",
        tell: "wollen", abStufe: "b2",
        nach: { de: "Ob das stimmt? Sie war nicht die ganze Zeit an ihrem Platz.",
                tr: "Doğru mu acaba? Bütün gece yerinde değildi." },
        falsch: { de: "Ein Hinweis auf Hilde — aber als Indiz zählt die Wendung erst auf der Oberstufe.",
                  tr: "Hilde'ye dair bir ipucu — ama bu kalıp delil olarak ancak B2'de sayılıyor." } },

      { de: L("Emil war in letzter Zeit nervös. Er hat oft mit Otto gestritten.",
              "Emil war in den letzten Wochen nervös. Er hatte oft Streit mit Otto.",
              "Emil war in den letzten Wochen kaum wiederzuerkennen — und mit Otto hat er sich fast jeden Abend gestritten."),
        tr: "Emil son zamanlarda gergindi. Otto ile sık sık kavga ediyordu.",
        nach: { de: "Immer um Geld. So etwas hört man hinter der Bühne.",
                tr: "Hep para yüzünden. Sahne arkasında böyle şeyler duyulur." },
        falsch: { de: "Wichtig — aber der Widerspruch steckt nicht hier, sondern bei Herrn Reinhardt.",
                  tr: "Önemli — ama çelişki burada değil, Bay Reinhardt'ta." } },

      { de: L("Nach der Vorstellung war die Bürotür offen.",
              "Nach der Vorstellung stand die Bürotür offen.",
              "Als ich nach der Vorstellung nach oben ging, stand die Bürotür offen."),
        tr: "Gösteriden sonra ofis kapısı açıktı.",
        nach: { de: "Ich bin nur vorbeigegangen. Hineingesehen habe ich nicht.",
                tr: "Sadece önünden geçtim. İçeri bakmadım." },
        falsch: { de: "Eine Beobachtung, kein Widerspruch.",
                  tr: "Bir gözlem, çelişki değil." } }
    ]
  },

  {
    id: "otto", name: "Otto Reinhardt", alter: 41, rolle: "Pianist und Teilhaber", typ: "pianist",
    vorspann: L(
      "Otto Reinhardt setzt sich, ohne dass Sie es ihm sagen. Seine Hände liegen flach auf dem Tisch.",
      "Otto Reinhardt setzt sich, ohne dass Sie ihn dazu aufgefordert haben. Seine Hände liegen flach auf dem Tisch.",
      "Otto Reinhardt nimmt Platz, ohne dass Sie ihn dazu aufgefordert hätten. Seine Hände liegen flach auf der Tischplatte, und sie bleiben dort."),
    vorspannTr: "Otto Reinhardt siz söylemeden oturuyor. Elleri masanın üstünde düz duruyor.",
    eingang: L(
      "Das ist absurd. Emil war mein Freund. Fragen Sie, aber machen Sie schnell.",
      "Das ist doch absurd. Emil war mein Freund. Fragen Sie, was Sie wollen, aber machen Sie schnell.",
      "Das ist doch vollkommen absurd. Emil war mein Freund. Fragen Sie meinetwegen, was Sie wollen — nur machen Sie es kurz."),
    eingangTr: "Bu saçmalık. Emil benim dostumdu. Ne isterseniz sorun ama çabuk olun.",
    abwehr: ["Was soll daran falsch sein?", "Hören Sie auf, mir Fallen zu stellen.", "Ich habe Ihnen doch alles gesagt."],
    zusammenbruch: "Sie … Sie verdrehen mir die Worte. Ich sage kein Wort mehr ohne Anwalt.",
    zusammenbruchTr: "Siz … siz sözlerimi çarpıtıyorsunuz. Avukatım olmadan tek kelime etmem.",
    aussagen: [
      { de: "Ich war die ganze Nacht in der Garderobe.",
        tr: "Bütün gece vestiyerdeydim.",
        nach: { de: L("Ich habe geraucht. Allein. Dort stört mich niemand.",
                      "Ich habe geraucht. Allein. Dort stört einen niemand."),
                tr: "Sigara içtim. Tek başıma. Orada kimse rahatsız etmez." },
        falsch: { de: "Eine Behauptung ohne grammatische Spur — aber merken Sie sich diesen Satz gut.",
                  tr: "Gramatik izi olmayan bir iddia — ama bu cümleyi aklında tut." } },

      { de: L("Das Glas kenne ich. Ich habe es auf den Tisch gestellt.",
              "Das Glas kenne ich. Ich habe es auf den Tisch gestellt.",
              "Das Glas? Natürlich kenne ich es — ich habe es selbst auf den Tisch gestellt."),
        tr: "Bardağı tanıyorum. Onu masanın üstüne koydum.",
        tell: "akkusativ",
        nach: { de: "Das war früh am Abend! Lange vor der Vorstellung. Warum fragen Sie so komisch?",
                tr: "Akşamın erken saatlerindeydi! Gösteriden çok önce. Neden böyle tuhaf soruyorsunuz?" } },

      { de: "Im Safe war kein Geld mehr.",
        tr: "Kasada artık para yoktu.",
        tell: "mehr",
        nach: { de: L("Emil hat mir das gesagt. Irgendwann. Ich weiß nicht mehr, wann.",
                      "Emil hat mir das erzählt. Irgendwann. Ich weiß nicht mehr, wann."),
                tr: "Emil bana söylemişti. Bir ara. Ne zaman olduğunu hatırlamıyorum." } },

      { de: L("Wir haben das Geld immer im Safe gelassen.",
              "Wir haben das Geld immer im Safe aufbewahrt.",
              "Wir haben die Tageseinnahmen grundsätzlich im Safe aufbewahrt."),
        tr: "Parayı hep kasada saklardık.",
        tell: "zugang",
        nach: { de: "Wir? Emil natürlich. Ich meine die Kasse des Hauses. Sie legen mir jedes Wort im Mund um.",
                tr: "Biz mi? Emil tabii ki. Kasadan bahsediyorum. Her kelimemi çarpıtıyorsunuz." } },

      { de: L("Die Tür war offen, mehr weiß ich nicht.",
              "Die Tür wurde geöffnet, mehr weiß ich nicht.",
              "Die Tür wurde geöffnet — mehr weiß ich beim besten Willen nicht."),
        tr: "Kapı açıldı, daha fazlasını bilmiyorum.",
        tell: "passiv", abStufe: "b1",
        nach: { de: "Von wem? Woher soll ich das wissen? Ich war doch unten.",
                tr: "Kim tarafından? Nereden bileyim? Ben aşağıdaydım ya." },
        falsch: { de: "Auf dieser Stufe ist der Satz schlicht. Auf der Mittelstufe wird daraus ein Passiv ohne Täter.",
                  tr: "Bu seviyede cümle sade. B1'den itibaren burası „failsiz edilgen“ hâline geliyor." } },

      { de: L("Emil und ich hatten nie Streit.",
              "Emil und ich hatten nie Streit.",
              "Zwischen Emil und mir hat es nie auch nur ein böses Wort gegeben."),
        tr: "Emil'le hiç kavga etmedik.",
        tell: "streit", braucht: "clara",
        nach: { de: "Geld? Nein. Zwischen uns ging es nie um Geld.",
                tr: "Para mı? Hayır. Aramızda hiç para meselesi olmadı." } }
    ]
  },

  {
    id: "hilde", name: "Hilde Wolff", alter: 58, rolle: "Garderobiere", typ: "garderobiere",
    vorspann: L(
      "Hilde Wolff setzt sich langsam. Sie hat die Hände im Schoß und sieht auf den Boden.",
      "Hilde Wolff setzt sich langsam hin, die Hände im Schoß, den Blick auf dem Boden.",
      "Hilde Wolff lässt sich langsam auf den Stuhl sinken, die Hände im Schoß, den Blick auf den Dielen."),
    vorspannTr: "Hilde Wolff yavaşça oturuyor. Elleri kucağında, gözleri yerde.",
    eingang: L(
      "Ich arbeite seit zwanzig Jahren hier. So etwas ist noch nie passiert.",
      "Ich bin seit zwanzig Jahren hier, junger Mann. So etwas ist noch nie passiert.",
      "Zwanzig Jahre bin ich nun hier, junger Mann. So etwas hat es in diesem Haus noch nie gegeben."),
    eingangTr: "Yirmi yıldır buradayım, delikanlı. Böyle bir şey hiç olmamıştı.",
    abwehr: ["Was soll daran falsch sein?", "Ich sage doch die Wahrheit."],
    zusammenbruch: "Ich wollte niemandem schaden. Ich war doch nur kurz an der Luft.",
    zusammenbruchTr: "Kimseye zarar vermek istemedim. Sadece kısa bir süre hava almaya çıkmıştım.",
    aussagen: [
      { de: "Ich saß den ganzen Abend an der Garderobe.",
        tr: "Bütün akşam vestiyerde oturdum.",
        nach: { de: "Naja. Fast den ganzen Abend.", tr: "Şey. Neredeyse bütün akşam." },
        falsch: { de: "Sie schwächt den Satz gleich selbst ab — aber grammatisch ist er harmlos.",
                  tr: "Cümleyi hemen kendisi yumuşatıyor — ama gramer açısından masum." } },

      { de: L("Ich habe die ganze Nacht nichts gehört.",
              "Ich habe die ganze Nacht nichts Ungewöhnliches gehört.",
              "Ich habe die ganze Nacht über nicht das Geringste gehört."),
        tr: "Bütün gece hiçbir şey duymadım.",
        tell: "selbst",
        nach: { de: "Nichts. Gar nichts. Wirklich.", tr: "Hiçbir şey. Hiç. Gerçekten." } },

      { de: L("In der Garderobe war niemand, als ich um Viertel nach elf zurückkam.",
              "In der Garderobe war niemand, als ich um Viertel nach elf zurückkam.",
              "Als ich um Viertel nach elf zurückkam, war in der Garderobe keine Menschenseele."),
        tr: "On biri çeyrek geçe döndüğümde vestiyerde kimse yoktu.",
        tell: "hilde", braucht: "otto",
        nach: { de: "Ich hätte ihn doch sehen müssen. Da war niemand, ganz sicher.",
                tr: "Onu görmem gerekirdi. Kimse yoktu, eminim." } },

      { de: "Ich war zwanzig Minuten draußen, an der frischen Luft.",
        tr: "Yirmi dakika dışarıda, temiz havadaydım.",
        nach: { de: "Vielleicht etwas länger. Es war so heiß im Saal.",
                tr: "Belki biraz daha uzun. Salon çok sıcaktı." },
        falsch: { de: "Sie gibt ihre Abwesenheit selbst zu. Das ist ehrlich, kein Widerspruch.",
                  tr: "Yokluğunu kendisi kabul ediyor. Bu dürüstlük, çelişki değil." } },

      { de: "Oben ist etwas gefallen, gegen elf.",
        tr: "Yukarıda bir şey düştü, on bir civarı.",
        nach: { de: "Ich habe mir nichts dabei gedacht. Hier fällt ständig etwas um.",
                tr: "Üzerinde durmadım. Burada sürekli bir şeyler devrilir." },
        falsch: { de: "Dieser Satz ist wahr — er ist der Gegenbeweis, nicht die Lüge. Suchen Sie den anderen.",
                  tr: "Bu cümle doğru — yalan değil, <em>karşı kanıt</em>. Yalan olan öbürü." } },

      { de: "Ich habe niemanden auf der Treppe gesehen.",
        tr: "Merdivende kimseyi görmedim.",
        nach: { de: "Ich war ja draußen. Was hätte ich sehen sollen?",
                tr: "Dışarıdaydım ki. Ne görecektim?" },
        falsch: { de: "Sie sagt die Wahrheit: Wer draußen steht, sieht die Treppe nicht.",
                  tr: "Doğru söylüyor: dışarıda olan merdiveni göremez." } }
    ]
  },

  {
    id: "kurt", name: "Kurt Sauer", alter: 24, rolle: "Kellner", typ: "kellner",
    vorspann: L(
      "Kurt Sauer steht an der Tür. Er hat die Serviette noch über dem Arm.",
      "Kurt Sauer bleibt an der Tür stehen, die Serviette noch über dem Arm.",
      "Kurt Sauer bleibt an der Tür stehen, als könnte er jeden Moment weglaufen, die Serviette noch über dem Arm."),
    vorspannTr: "Kurt Sauer kapıda duruyor. Peçete hâlâ kolunda.",
    eingang: L(
      "Bitte, ich habe nichts damit zu tun. Ich brauche diese Arbeit.",
      "Bitte, ich habe damit nichts zu tun. Ich brauche diese Stelle.",
      "Bitte, Herr Kommissar, ich habe damit nicht das Geringste zu tun. Ich brauche diese Stelle dringend."),
    eingangTr: "Lütfen, benim bununla ilgim yok. Bu işe ihtiyacım var.",
    abwehr: ["Was soll daran falsch sein?", "Bitte, ich sage doch alles, was ich weiß."],
    zusammenbruch: "Sagen Sie bitte niemandem, dass ich geredet habe. Bitte.",
    zusammenbruchTr: "Lütfen kimseye konuştuğumu söylemeyin. Lütfen.",
    aussagen: [
      { de: "Ich habe den ganzen Abend serviert.",
        tr: "Bütün akşam servis yaptım.",
        nach: { de: "Unten im Saal. Vierzig Tische, Herr Kommissar.",
                tr: "Aşağıda salonda. Kırk masa, komiser bey." },
        falsch: { de: "Perfekt mit „haben“, ganz normal. Kein Widerspruch.",
                  tr: "„haben“ ile Perfekt, gayet normal. Çelişki yok." } },

      { de: L("Um zehn nach elf ist Herr Reinhardt die Treppe hinaufgegangen.",
              "Um zehn nach elf ging Herr Reinhardt die Treppe hinauf.",
              "Um zehn nach elf ging Herr Reinhardt die Treppe hinauf, das habe ich mit eigenen Augen gesehen."),
        tr: "Saat on biri on geçe Bay Reinhardt merdivenden yukarı çıktı.",
        tell: "treppe", braucht: "otto",
        nach: { de: "Ich stand unten an der Treppe. Ich habe ihn genau gesehen.",
                tr: "Merdivenin dibinde duruyordum. Onu net gördüm." } },

      { de: L("Die Leute sagen, Herr Brandt hat ihm Geld geliehen.",
              "Herr Brandt soll ihm Geld geliehen haben.",
              "Herr Brandt soll ihm eine größere Summe geliehen haben."),
        tr: "Bay Brandt'ın ona borç para verdiği söyleniyor.",
        tell: "sollen", abStufe: "b1",
        nach: { de: "Das sagen alle in der Küche. Viel Geld, heißt es.",
                tr: "Mutfaktakilerin hepsi böyle diyor. Çok paraymış." },
        falsch: { de: "Auf dieser Stufe ist es einfach ein Gerücht. Ab der Mittelstufe steckt es in einem einzigen Wort: „soll“.",
                  tr: "Bu seviyede düpedüz bir söylenti. B1'den itibaren aynı şey tek bir kelimeye sığıyor: „soll“." } },

      { de: L("Ich habe um zehn einen Schnaps ins Büro gebracht. Das Glas stand auf dem Tisch, als ich ging.",
              "Ich brachte um zehn einen Schnaps ins Büro. Das Glas stand auf dem Tisch, als ich ging.",
              "Gegen zehn brachte ich Herrn Brandt einen Schnaps ins Büro. Als ich ging, stand das Glas auf dem Tisch."),
        tr: "Saat onda ofise bir kadeh şnaps götürdüm. Ben çıkarken bardak masanın üstünde duruyordu.",
        nach: { de: "Ein Glas. Nur eines. Herr Brandt hat allein getrunken.",
                tr: "Bir kadeh. Sadece bir tane. Bay Brandt tek başına içiyordu." },
        falsch: { de: "Achtung: „ins Büro“ ist Akkusativ und völlig richtig — er ging hinein. „auf dem Tisch“ ist Dativ: Das Glas stand dort, er hat es nicht bewegt. Genau so muss ein ehrlicher Satz klingen. Vergleichen Sie ihn mit Herrn Reinhardt.",
                  tr: "Dikkat: „ins Büro“ Akkusativ ve tamamen doğru — içeri <em>girmiş</em>. „auf dem Tisch“ ise Dativ: bardak orada <em>duruyordu</em>, o hareket ettirmedi. Dürüst cümle böyle olur. Otto'nunkiyle karşılaştır." } },

      { de: L("Herr Reinhardt war an dem Abend sehr nervös.",
              "Herr Reinhardt war an diesem Abend sehr nervös.",
              "Herr Reinhardt war an diesem Abend nicht wiederzuerkennen, so nervös war er."),
        tr: "Bay Reinhardt o akşam çok gergindi.",
        nach: { de: "Er hat dreimal nach Herrn Brandt gefragt. Dreimal in einer Stunde.",
                tr: "Üç kez Bay Brandt'ı sordu. Bir saat içinde üç kez." },
        falsch: { de: "Eine Beobachtung. Verdächtig, aber kein Widerspruch.",
                  tr: "Bir gözlem. Şüpheli ama çelişki değil." } },

      { de: "Ich habe den Safe nie offen gesehen.",
        tr: "Kasayı hiç açık görmedim.",
        nach: { de: "Nur Herr Brandt hatte den Schlüssel. Dachte ich.",
                tr: "Anahtar sadece Bay Brandt'taydı. Ben öyle sanıyordum." },
        falsch: { de: "Wahr — und genau darum wiegt es schwer, wenn ein anderer vom Inhalt des Safes spricht.",
                  tr: "Doğru — ve tam da bu yüzden başka birinin kasanın içeriğinden söz etmesi ağır basıyor." } }
    ]
  }
];

const AKTE = {
  nummer: "1924/11",
  titel: "Der letzte Gast",
  taeter: "otto",
  beginn: 23 * 60,
  schluss: 30 * 60,
  jagdrufe: [
    "Moment! Einen Satz davon glaube ich Ihnen nicht.",
    "Halt. Das war eben zu viel gesagt.",
    "Bleiben Sie sitzen. Einer dieser Sätze stimmt nicht."
  ],
  prolog: {
    de: L("Es regnet in der Friedrichstraße. Im „Blauen Vogel“ ist noch Licht. Die Musik hat vor einer Stunde aufgehört. Oben liegt Emil Brandt tot in seinem Büro.",
          "Der Regen fällt schräg in die Friedrichstraße. Im „Blauen Vogel“ brennt noch Licht, die Kapelle hat vor einer Stunde aufgehört zu spielen. Oben im ersten Stock liegt Emil Brandt über seinem Schreibtisch.",
          "Der Regen steht schräg in der Friedrichstraße. Im „Blauen Vogel“ brennt noch Licht; die Kapelle hat vor einer Stunde ihr letztes Stück gespielt. Oben, im ersten Stock, liegt Emil Brandt über seinem Schreibtisch, als wäre er mitten im Satz eingeschlafen."),
    tr: "Friedrichstraße'de yağmur yağıyor. „Blauer Vogel“de hâlâ ışık var, orkestra bir saat önce susmuş. Yukarıda, birinci katta, Emil Brandt yazı masasının üstüne yığılmış duruyor."
  },
  anklageVorspann: {
    de: L("Jetzt müssen Sie sich entscheiden. Einen Haftbefehl bekommen Sie nur einmal.",
          "Jetzt müssen Sie sich entscheiden. Einen Haftbefehl stellt Ihnen der Staatsanwalt nur einmal aus.",
          "Nun müssen Sie sich festlegen. Einen Haftbefehl stellt Ihnen der Staatsanwalt kein zweites Mal aus."),
    tr: "Şimdi karar vermelisin. Tutuklama emri sadece bir kez çıkar."
  },
  bericht: [
    { de: L("Um 23:40 Uhr wurde Emil Brandt, 52 Jahre alt, tot in seinem Büro gefunden. Er war der Besitzer des Kabaretts.",
            "Um 23:40 Uhr wurde der Besitzer des Kabaretts, Emil Brandt, 52 Jahre alt, tot in seinem Büro aufgefunden.",
            "Um 23:40 Uhr wurde der Besitzer des Kabaretts, Emil Brandt, 52 Jahre alt, tot in seinem Büro aufgefunden."),
      tr: "Saat 23:40'ta kabarenin sahibi, 52 yaşındaki Emil Brandt, ofisinde ölü bulundu." },
    { de: L("Auf dem Schreibtisch stand ein leeres Glas. Der Safe war offen und leer. Die Tür war nicht abgeschlossen.",
            "Auf dem Schreibtisch stand ein leeres Glas. Der Wandsafe war offen und leer. Die Tür war nicht verschlossen, Spuren eines Einbruchs gibt es nicht.",
            "Auf dem Schreibtisch stand ein leeres Glas. Der Wandsafe war offen und leer. Die Tür war nicht verschlossen; Spuren eines gewaltsamen Eindringens wurden nicht festgestellt."),
      tr: "Yazı masasının üstünde boş bir bardak duruyordu. Duvardaki kasa açık ve boştu. Kapı kilitli değildi, zorla girme izi yok." },
    { de: L("Vier Personen waren in dieser Nacht im Haus. Eine Person lügt. Hören Sie genau zu: Der Fehler steckt nicht im Inhalt, sondern in der Form.",
            "Vier Personen waren in dieser Nacht im Haus. Eine von ihnen lügt — und verrät sich nicht durch das, was sie sagt, sondern durch die Form, in der sie es sagt.",
            "Vier Personen waren in dieser Nacht im Haus. Eine von ihnen lügt — und verrät sich nicht durch das, was sie sagt, sondern durch die Form, in der sie es sagt."),
      tr: "O gece binada dört kişi vardı. Biri yalan söylüyor — ve kendini söylediği <em>şeyle</em> değil, söylediği <em>biçimle</em> ele veriyor." },
    { de: "Sie haben bis sechs Uhr morgens Zeit.",
      tr: "Sabah altıya kadar vaktiniz var." }
  ],
  epilog: {
    richtig: {
      de: L("Otto Reinhardt hat am nächsten Morgen alles zugegeben. Er hatte bei Emil Brandt zwölftausend Mark Schulden. Das Glas hat er selbst auf den Tisch gestellt — und damit alles verraten. Wer „auf den Tisch“ sagt, hat das Glas bewegt. Wer „auf dem Tisch“ sagt, hat es nur gesehen.",
            "Otto Reinhardt gestand am Morgen des 16. November. Er schuldete Emil Brandt zwölftausend Mark. Das Glas hatte er selbst auf den Tisch gestellt — und sich mit einem einzigen Buchstaben verraten: Wer „auf den Tisch“ sagt, hat das Glas bewegt. Wer „auf dem Tisch“ sagt, hat es nur gesehen.",
            "Otto Reinhardt legte am Morgen des 16. November ein Geständnis ab. Er schuldete Emil Brandt zwölftausend Mark. Das Glas hatte er selbst auf den Tisch gestellt — und sich damit an einem einzigen Buchstaben verraten: Wer „auf den Tisch“ sagt, hat das Glas bewegt; wer „auf dem Tisch“ sagt, hat es nur gesehen."),
      tr: "Otto Reinhardt 16 Kasım sabahı itiraf etti. Emil Brandt'a on iki bin mark borcu vardı. Bardağı masaya kendi koymuştu — ve kendini tek bir harfle ele verdi: „auf <strong>den</strong> Tisch“ diyen bardağı hareket ettirmiştir; „auf <strong>dem</strong> Tisch“ diyen onu yalnızca görmüştür."
    },
    falsch: {
      de: L("Sie haben die falsche Person verhaftet. Otto Reinhardt ist noch in derselben Woche aus Berlin weggegangen. Die Akte blieb offen.",
            "Sie haben die falsche Person verhaftet. Otto Reinhardt verließ Berlin noch in derselben Woche. Die Akte blieb offen.",
            "Sie haben die Falsche oder den Falschen verhaftet. Otto Reinhardt verließ Berlin noch in derselben Woche. Die Akte blieb offen."),
      tr: "Yanlış kişiyi tutukladınız. Otto Reinhardt daha o hafta Berlin'i terk etti. Dosya açık kaldı."
    },
    zeit: {
      de: L("Um sechs Uhr morgens kam die Tagschicht. Ohne Beweise konnte niemand angeklagt werden. Der „Blaue Vogel“ machte im Frühjahr 1925 zu.",
            "Um sechs Uhr morgens übernahm die Tagschicht. Ohne Beweise wurde niemand angeklagt. Der „Blaue Vogel“ schloss im Frühjahr 1925.",
            "Um sechs Uhr morgens übernahm die Tagschicht. Ohne Beweise erhob die Staatsanwaltschaft keine Anklage. Der „Blaue Vogel“ schloss im Frühjahr 1925."),
      tr: "Sabah altıda gündüz vardiyası devraldı. Kanıt olmadan kimse suçlanmadı. „Blauer Vogel“ 1925 baharında kapandı."
    }
  }
};
