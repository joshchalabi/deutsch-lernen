/**
 * Büyük dinleme oyunları — bağımsız sayfalar olarak çalışıp iframe ile gömülüyor.
 *
 * NEDEN REACT BİLEŞENİNE ÇEVİRİLMEDİ?
 *   İki oyun da kendi CSS'i, kendi global sınıf adları (.kopf, .knopf, .szene)
 *   ve kendi DOM kimlikleriyle yazılmış vanilla JS. Bunları siteye doğrudan
 *   katmak iki riski birden getirirdi: oyunların stilleri sitenin tasarım
 *   sistemini ezerdi, sitenin stilleri de oyunları bozardı. 60 KB oyun
 *   mantığını yeniden yazmak ise çalışan bir şeyi kırma riski demek.
 *
 *   iframe bu ikisini de çözüyor: tam CSS yalıtımı, ses dosyalarının göreli
 *   yolları ("ton/xyz.mp3") olduğu gibi çalışıyor, oyunlar kendi başlarına
 *   açıldıklarında olduğu gibi davranıyor. Aynı köken olduğu için
 *   localStorage'a da erişiyorlar — Gleis 7b rekorunu böyle saklıyor.
 */

import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import type { UiLang } from '../lib/types'

const BASE = import.meta.env.BASE_URL

type Loc = Record<UiLang, string>

interface Spiel {
  id: string
  name: string
  ort: Loc
  stufe: string
  dauer: Loc
  kurz: Loc
  lang: Loc
}

const SPIELE: Spiel[] = [
  {
    id: 'derfall',
    name: 'Der Fall',
    ort: {
      tr: 'Berlin, 1924 · Cinayet soruşturması',
      az: 'Berlin, 1924 · Cinayət istintaqı',
      ru: 'Берлин, 1924 · Расследование убийства',
      de: 'Berlin, 1924 · Mordermittlung',
    },
    stufe: 'A2 – B2',
    dauer: { tr: '30-45 dakika', az: '30-45 dəqiqə', ru: '30-45 минут', de: '30-45 Minuten' },
    kurz: {
      tr: 'Dört tanık, bir gece. Biri yalan söylüyor.',
      az: 'Dörd şahid, bir gecə. Biri yalan danışır.',
      ru: 'Четверо свидетелей, одна ночь. Кто-то лжёт.',
      de: 'Vier Zeugen, eine Nacht. Einer von ihnen lügt.',
    },
    lang: {
      tr: 'Kabare sahibi bürosunda ölü bulunur. Her rolü ayrı bir ses seslendiriyor — anlatıcı, komiser ve dört tanık. Tanığı dinle; bir cümlesi seni rahatsız ettiğinde «Widerspruch!» de ve o cümleyi göster. Cümle kurmak ya da yazmak yok: sadece dinlemek, çelişkiyi fark etmek ve suçlamak. Hörmodus açıkken yazı bulanıklaşır, anlamadığın cümleye tıklayınca açılır.',
      az: 'Kabare sahibi öz kabinetində ölü tapılır. Hər rolu ayrı bir səs səsləndirir — nağılçı, komissar və dörd şahid. Şahidi dinlə; bir cümləsi səni narahat edəndə «Widerspruch!» de və o cümləni göstər. Cümlə qurmaq və ya yazmaq yoxdur: yalnız dinləmək, ziddiyyəti sezmək və ittiham etmək.',
      ru: 'Владельца кабаре находят мёртвым в его кабинете. Каждую роль озвучивает отдельный голос — рассказчик, комиссар и четверо свидетелей. Слушайте показания; когда фраза вас насторожит, скажите «Widerspruch!» и укажите на неё. Ничего не нужно писать: только слушать, замечать противоречие и обвинять.',
      de: 'Der Besitzer des Kabaretts liegt tot in seinem Büro. Jede Rolle hat eine eigene Stimme — Erzähler, Kommissar und vier Zeugen. Hören Sie zu; wenn ein Satz Sie stutzig macht, rufen Sie «Widerspruch!» und zeigen darauf. Kein Schreiben, kein Satzbau: nur hören, bemerken und anklagen.',
    },
  },
  {
    id: 'gleis7b',
    name: 'Gleis 7b',
    ort: {
      tr: 'Hannover Hauptbahnhof · Peron anonsları',
      az: 'Hannover Hauptbahnhof · Peron elanları',
      ru: 'Hannover Hauptbahnhof · Объявления на перроне',
      de: 'Hannover Hauptbahnhof · Bahnsteigdurchsagen',
    },
    stufe: 'A2 – B1',
    dauer: { tr: '10-15 dakika', az: '10-15 dəqiqə', ru: '10-15 минут', de: '10-15 Minuten' },
    kurz: {
      tr: 'Tabela geç kalır. Kulağına güven.',
      az: 'Tabloda gecikmə olur. Qulağına güvən.',
      ru: 'Табло опаздывает. Доверяйте слуху.',
      de: 'Die Anzeigetafel hinkt hinterher. Vertrauen Sie Ihrem Ohr.',
    },
    lang: {
      tr: 'Elinde bir bilet var ve hoparlörden anonslar yağıyor — çoğu seni ilgilendirmiyor. Kendi trenini duyman, peron değişikliğini yakalaman ve zamanında doğru perona varman gerek. Tabela anonstan saniyeler sonra güncelleniyor, ileri seviyelerde hiç güncellenmiyor. Perona yürümek zaman alıyor, yani son saniyede fikir değiştiremezsin. Üç kez tren kaçırırsan yolculuk biter.',
      az: 'Əlində bilet var və dinamikdən elanlar yağır — çoxu sənə aid deyil. Öz qatarını eşitməli, peron dəyişikliyini tutmalı və vaxtında doğru perona çatmalısan. Tablo elandan saniyələr sonra yenilənir, yuxarı səviyyələrdə heç yenilənmir. Üç dəfə qatarı qaçırsan səyahət bitir.',
      ru: 'У вас билет, а из динамиков сыплются объявления — большинство не про вас. Нужно услышать свой поезд, поймать смену пути и вовремя дойти до нужного перрона. Табло обновляется на несколько секунд позже объявления, а на высоких уровнях не обновляется вовсе. Три пропущенных поезда — и поездка окончена.',
      de: 'Sie haben eine Fahrkarte, und aus den Lautsprechern prasseln Durchsagen — die meisten gehen Sie nichts an. Sie müssen Ihren Zug heraushören, den Gleiswechsel mitbekommen und rechtzeitig am richtigen Bahnsteig stehen. Die Tafel aktualisiert sich Sekunden nach der Durchsage, auf höheren Stufen gar nicht. Dreimal verpasst — die Reise ist vorbei.',
    },
  },
]

export default function Spiele() {
  const { lang } = useStore()
  return (
    <main className="main">
      <h1>{t('games', lang)}</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        {{
          tr: 'Uzun soluklu dinleme oyunları. Her biri kendi başına bir ders: seslendirmeler anadil hızında, altyazı yok.',
          az: 'Uzunmüddətli dinləmə oyunları. Hər biri öz-özlüyündə bir dərsdir: səsləndirmələr ana dili sürətindədir, altyazı yoxdur.',
          ru: 'Большие игры на аудирование. Каждая — отдельный урок: озвучка в естественном темпе, без субтитров.',
          de: 'Große Hörspiele. Jedes ist für sich eine Lektion: gesprochen im natürlichen Tempo, ohne Untertitel.',
        }[lang]}
      </p>

      <div className="unit-grid" style={{ marginTop: 18 }}>
        {SPIELE.map((s) => (
          <Link key={s.id} to={`/spiele/${s.id}`} className="unit-card spiel-karte">
            <div className="spiel-marke" aria-hidden="true">{s.id === 'derfall' ? '🕵' : '🚉'}</div>
            <div className="unit-body">
              <div className="unit-title de">{s.name}</div>
              <div className="unit-theme">{s.ort[lang]}</div>
              <p className="small" style={{ margin: '8px 0 0' }}>{s.kurz[lang]}</p>
              <div className="unit-meta">{s.stufe} · {s.dauer[lang]}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

export function SpielPlayer() {
  const { lang } = useStore()
  const { spielId } = useParams()
  const spiel = SPIELE.find((s) => s.id === spielId)

  if (!spiel) {
    return (
      <main className="main">
        <div className="card center">
          <h2>{t('error', lang)}</h2>
          <Link to="/spiele"><button className="primary">{t('games', lang)}</button></Link>
        </div>
      </main>
    )
  }

  const url = `${BASE}spiele/${spiel.id}/index.html`

  return (
    <div className="spiel-seite">
      <div className="spiel-leiste">
        <Link to="/spiele" className="ghost-link">← {t('games', lang)}</Link>
        <b className="de">{spiel.name}</b>
        <a href={url} target="_blank" rel="noreferrer" className="ghost-link">
          {{ tr: 'Yeni sekmede', az: 'Yeni səhifədə', ru: 'В новой вкладке', de: 'Neuer Tab' }[lang]} ↗
        </a>
      </div>
      <iframe
        className="spiel-rahmen"
        src={url}
        title={spiel.name}
        allow="autoplay"
        loading="lazy"
      />
      <details className="spiel-hilfe">
        <summary>{{ tr: 'Nasıl oynanır?', az: 'Necə oynanır?', ru: 'Как играть?', de: 'Wie wird gespielt?' }[lang]}</summary>
        <p>{spiel.lang[lang]}</p>
      </details>
    </div>
  )
}
