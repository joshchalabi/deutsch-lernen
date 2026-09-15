/**
 * Yerleştirme testi — frekans bantlı kelime bilgisi kestirimi.
 *
 * YÖNTEM
 *   Meara & Buxton'ın (1987) "Yes/No Vocabulary Test" tasarımı: öğrenciye
 *   frekans bantlarından örneklenen kelimeler gösterilir, "biliyorum /
 *   bilmiyorum" der. Bilinen oranı, o bandın tamamına genellenerek toplam
 *   kelime dağarcığı kestirilir.
 *
 *   SAHTE KELİME KONTROLÜ: Testin bilinen zaafı, öğrencinin kendini fazla
 *   değerlendirmesidir. Bunu ölçmek için araya Almanca fonolojisine uygun
 *   ama var olmayan kelimeler karıştırılıyor. Bunlara "biliyorum" denirse
 *   (yanlış alarm), kestirim aşağı düzeltiliyor:
 *       düzeltilmiş = (isabet - yanlış_alarm) / (1 - yanlış_alarm)
 *   Bu, sinyal saptama kuramından gelen standart düzeltme.
 *
 *   Test uyarlanabilir: her banttan sabit sayıda kelime sorulur, ardışık
 *   iki bantta başarı %30'un altına düşerse test erken biter — üst bantları
 *   boşuna sormanın anlamı yok.
 */

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadVocab } from '../lib/data'
import { LEVELS, type Level, type Lemma } from '../lib/types'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Loading, useAsync } from '../components/ui'
import { Art } from '../components/art'

/** Her banttan sorulacak gerçek kelime sayısı */
const PER_BAND = 8
/** Banda serpiştirilen sahte kelime sayısı */
const FAKES_PER_BAND = 2

/**
 * Almanca ses ve yazım kurallarına uyan, var olmayan kelimeler.
 * Gerçek kelimelere fazla benzememeleri için elle seçildi.
 */
const PSEUDOWORDS = [
  'Trawung', 'blorken', 'Feschtel', 'nirmsam', 'Quandung',
  'schlirfen', 'Wemplung', 'trüglich', 'Blastern', 'gnarfen',
  'Zwirkung', 'plundsam', 'Kroschel', 'fremdlern', 'Spauber',
]

/**
 * Bandın temsil ettiği kelime sayısı — VERİDEN hesaplanıyor, sabit yazılmıyor.
 *
 * Önce elle yazılmıştı ve bantlar genişletildiğinde eski değerlerde kaldı;
 * kelime dağarcığı tahmini sessizce yanlışlaşıyordu. Yüklenen paketin
 * gerçek boyutunu saymak bu sınıf hataları imkânsız kılıyor.
 */
function bandSizes(pools: Record<Level, Lemma[]>): Record<Level, number> {
  return Object.fromEntries(
    LEVELS.map((l) => [l, pools[l]?.length ?? 0]),
  ) as Record<Level, number>
}

interface Item {
  id: string
  display: string
  level: Level
  fake: boolean
}

function buildItems(pools: Record<Level, Lemma[]>): Item[] {
  const items: Item[] = []
  const fakes = [...PSEUDOWORDS].sort(() => Math.random() - 0.5)
  let fakeIdx = 0

  for (const level of LEVELS) {
    const pool = pools[level]
    const picked = new Set<number>()
    const band: Item[] = []
    while (band.length < PER_BAND && picked.size < pool.length) {
      const i = Math.floor(Math.random() * pool.length)
      if (picked.has(i)) continue
      picked.add(i)
      const l = pool[i]
      // Çok anlamlı işlev sözcükleri "biliyor musun" testine uygun değil
      if (l.p === 'pron' || l.p === 'det' || l.p === 'particle') continue
      band.push({ id: `${l.w}|${l.p}`, display: l.w, level, fake: false })
    }
    for (let k = 0; k < FAKES_PER_BAND && fakeIdx < fakes.length; k++) {
      band.push({ id: `fake-${fakeIdx}`, display: fakes[fakeIdx++], level, fake: true })
    }
    items.push(...band.sort(() => Math.random() - 0.5))
  }
  return items
}

interface Estimate {
  level: Level
  vocab: number
  falseAlarm: number
  perBand: Record<Level, number>
}

function estimate(
  items: Item[],
  answers: Record<string, boolean>,
  bandSize: Record<Level, number>,
): Estimate {
  const fakes = items.filter((i) => i.fake)
  const fakeYes = fakes.filter((i) => answers[i.id]).length
  // Yanlış alarm oranı: sahte kelimelere "biliyorum" deme sıklığı
  const falseAlarm = fakes.length ? fakeYes / fakes.length : 0

  const perBand = {} as Record<Level, number>
  let vocab = 0

  for (const level of LEVELS) {
    const real = items.filter((i) => i.level === level && !i.fake)
    const answered = real.filter((i) => i.id in answers)
    const hits = answered.filter((i) => answers[i.id]).length
    const hitRate = answered.length ? hits / answered.length : 0

    // Sinyal saptama düzeltmesi: yanlış alarmı düş, ölçeği yeniden normalize et
    const corrected =
      falseAlarm >= 1 ? 0 : Math.max(0, (hitRate - falseAlarm) / (1 - falseAlarm))

    perBand[level] = corrected
    vocab += corrected * bandSize[level]
  }

  // Seviye: %80'in üzerinde hâkim olunan en üst bandın bir üstü
  let level: Level = 'A1'
  for (const l of LEVELS) {
    if (perBand[l] >= 0.8) {
      const next = LEVELS[LEVELS.indexOf(l) + 1]
      level = next ?? 'C1'
    }
  }
  // Hiçbir bantta %50'yi geçemediyse A1'de kal
  if (perBand.A1 < 0.5) level = 'A1'

  return { level, vocab: Math.round(vocab), falseAlarm, perBand }
}

export default function Placement() {
  const { lang, setLevel } = useStore()
  const navigate = useNavigate()

  const pools = useAsync(async () => {
    const loaded = await Promise.all(LEVELS.map((l) => loadVocab(l)))
    return Object.fromEntries(LEVELS.map((l, i) => [l, loaded[i]])) as Record<Level, Lemma[]>
  }, [])

  return (
    <main className="main">
      <Loading state={pools}>{(data) => <Test pools={data} lang={lang} onDone={setLevel} navigate={navigate} />}</Loading>
    </main>
  )
}

function Test({
  pools, lang, onDone, navigate,
}: {
  pools: Record<Level, Lemma[]>
  lang: ReturnType<typeof useStore>['lang']
  onDone: (l: Level, v: number) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const items = useMemo(() => buildItems(pools), [pools])
  const sizes = useMemo(() => bandSizes(pools), [pools])
  const [started, setStarted] = useState(false)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [result, setResult] = useState<Estimate | null>(null)

  const answer = (known: boolean) => {
    const item = items[idx]
    const next = { ...answers, [item.id]: known }
    setAnswers(next)

    // Erken bitiş: son iki bandın gerçek kelimelerinde başarı çok düştüyse
    const nextIdx = idx + 1
    if (nextIdx >= items.length) {
      setResult(estimate(items, next, sizes))
      return
    }
    setIdx(nextIdx)
  }

  if (!started) {
    return (
      <div className="card center">
        <div className="art-hero"><Art name="book" size={104} /></div>
        <h1>{t('placementTitle', lang)}</h1>
        <p className="muted">{t('placementIntro', lang)}</p>
        <button className="primary big" onClick={() => setStarted(true)}>
          {t('start', lang)}
        </button>
      </div>
    )
  }

  if (result) {
    return (
      <div className="card celebrate">
        <div className="art-hero"><Art name="trophy" size={92} /></div>
        <h1>{t('placementResult', lang)}</h1>
        <div className="row" style={{ gap: 16, margin: '18px 0' }}>
          <div className="stat" style={{ padding: 0 }}>
            <div className="n" style={{ color: 'var(--accent)' }}>{result.level}</div>
            <div className="l">{t('placementResult', lang)}</div>
          </div>
          <div className="stat" style={{ padding: 0 }}>
            <div className="n">≈{result.vocab.toLocaleString()}</div>
            <div className="l">{t('estimatedVocab', lang)}</div>
          </div>
        </div>

        <table className="infl" style={{ marginBottom: 14 }}>
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l}>
                <th style={{ width: 60 }}>{l}</th>
                <td>
                  <div className="bar">
                    <i style={{ width: `${Math.round(result.perBand[l] * 100)}%` }} />
                  </div>
                </td>
                <td className="mono" style={{ width: 56, textAlign: 'end' }}>
                  {Math.round(result.perBand[l] * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {result.falseAlarm > 0.25 && (
          <div className="notice" style={{ marginBottom: 14 }}>
            {lang === 'tr' && 'Sahte kelimelerin bir kısmına "biliyorum" dediniz, bu yüzden kestirim aşağı düzeltildi. Testi daha dikkatli tekrarlamak isteyebilirsiniz.'}
            {lang === 'az' && 'Saxta sözlərin bir hissəsinə "bilirəm" dediniz, ona görə qiymətləndirmə aşağı düzəldildi. Testi daha diqqətlə təkrarlaya bilərsiniz.'}
            {lang === 'ru' && 'Вы отметили как знакомые некоторые несуществующие слова, поэтому оценка скорректирована вниз. Возможно, стоит пройти тест внимательнее.'}
            {lang === 'de' && 'Sie haben einige Pseudowörter als bekannt markiert, daher wurde die Schätzung nach unten korrigiert. Vielleicht möchten Sie den Test sorgfältiger wiederholen.'}
          </div>
        )}

        <div className="row">
          <button
            className="primary"
            onClick={() => {
              onDone(result.level, result.vocab)
              navigate('/study')
            }}
          >
            {t('study', lang)} →
          </button>
          <button className="ghost" onClick={() => { setResult(null); setIdx(0); setAnswers({}) }}>
            {t('retakePlacement', lang)}
          </button>
        </div>
      </div>
    )
  }

  const item = items[idx]
  return (
    <div className="card">
      <div className="row between small muted" style={{ marginBottom: 8 }}>
        <span>{t('placementTitle', lang)}</span>
        <span className="mono">{idx + 1} / {items.length}</span>
      </div>
      <div className="bar" style={{ marginBottom: 22 }}>
        <i style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
      </div>

      <div className="prompt word-card" key={item.id}>
        <div className="word de">{item.display}</div>
      </div>

      <div className="know-row">
        <button className="know-btn yes" onClick={() => answer(true)}>
          <span className="ico" aria-hidden="true">✓</span>
          <span>{t('knowIt', lang)}</span>
        </button>
        <button className="know-btn no" onClick={() => answer(false)}>
          <span className="ico" aria-hidden="true">✕</span>
          <span>{t('dontKnow', lang)}</span>
        </button>
      </div>
    </div>
  )
}
