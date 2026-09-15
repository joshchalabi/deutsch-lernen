/**
 * Yeniden kullanılabilir alıştırma bileşenleri.
 *
 * Hem serbest çalışma (Study) hem ders oynatıcısı (Lesson) bunları kullanıyor.
 *
 * DİL TUTARLILIĞI KURALI
 *   Bir alıştırmadaki TÜM seçenekler aynı dilde olmak zorunda. Doğru cevabın
 *   Türkçe, çeldiricilerin Rusça çıktığı bir soru dil bilgisini değil "hangisi
 *   Türkçe görünüyor" sezgisini ölçer. Bu yüzden önce doğru cevabın hangi
 *   kipte sunulacağına karar veriliyor (seçilen dil ya da Almanca tanım),
 *   sonra çeldiriciler yalnızca aynı kipi sağlayabilen kelimelerden seçiliyor.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  displayForm, exampleFor, glossOrTranslation, lemmaKey, sample, shuffle,
  strictTranslation, wordAudioUrl,
} from '../lib/data'
import type { Lemma, TransLang } from '../lib/types'
import { previewIntervals, Rating } from '../lib/fsrs'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, PlayButton, useAudio } from './ui'
import { Confetti } from './art'

export interface ExerciseProps {
  lemma: Lemma
  pool: Lemma[]
  /** Yeni kelimede derecelendirme çubuğu yerine tek "İleri" düğmesi gösterilir */
  isNew?: boolean
  onAnswer: (correct: boolean, rating: Rating) => void
}

/* ---------- ortak parçalar ---------- */

export function RatingBar({
  lemma, onRate,
}: {
  lemma: Lemma
  onRate: (r: Rating) => void
}) {
  const { state, lang } = useStore()
  const prog = state.vocab[lemmaKey(lemma)]
  const ivs = prog ? previewIntervals(prog.card) : null
  const label = (d: number) => (d === 0 ? `<10 ${t('minutes', lang)}` : `${d} ${t('days', lang)}`)

  return (
    <div className="ratings" style={{ marginTop: 14 }}>
      {([
        [Rating.Again, 'again', 'r1'],
        [Rating.Hard, 'hard', 'r2'],
        [Rating.Good, 'good', 'r3'],
        [Rating.Easy, 'easy', 'r4'],
      ] as const).map(([r, key, cls]) => (
        <button key={r} className={cls} onClick={() => onRate(r)}>
          <span>{t(key, lang)}</span>
          {ivs && <span className="iv">{label(ivs[r])}</span>}
        </button>
      ))}
    </div>
  )
}

function Finish({
  lemma, correct, isNew, onAnswer,
}: {
  lemma: Lemma
  correct: boolean
  isNew?: boolean
  onAnswer: ExerciseProps['onAnswer']
}) {
  const { lang } = useStore()
  // Konfeti yalnızca doğru cevapta ve bir kez: her render'da patlarsa
  // ödül olmaktan çıkıp arka plan gürültüsü olur.
  const [burst, setBurst] = useState(correct)
  useEffect(() => {
    if (!correct) return
    const id = window.setTimeout(() => setBurst(false), 900)
    return () => window.clearTimeout(id)
  }, [correct])
  if (isNew) {
    return (
      <>
        <Confetti show={burst} />
        <button
          className="primary block"
          style={{ marginTop: 12 }}
          onClick={() => onAnswer(correct, correct ? Rating.Good : Rating.Again)}
        >
          {t('next', lang)} →
        </button>
      </>
    )
  }
  return (
    <>
      <Confetti show={burst} />
      <RatingBar lemma={lemma} onRate={(r) => onAnswer(correct, r)} />
    </>
  )
}

export function WordHead({ lemma }: { lemma: Lemma }) {
  return (
    <div className="prompt">
      <div className="word de">{displayForm(lemma)}</div>
      {lemma.ipa && <div className="ipa">/{lemma.ipa}/</div>}
      <div style={{ marginTop: 6 }}>
        <PlayButton url={wordAudioUrl(lemma)} text={lemma.w} label="Aussprache" />
      </div>
    </div>
  )
}

/* ---------- 1. Tanıma: Almanca → anlam ---------- */

export function RecognizeExercise({ lemma, pool, isNew, onAnswer }: ExerciseProps) {
  const { state, lang } = useStore()
  const tl: TransLang = state.settings.transLang
  const [picked, setPicked] = useState<string | null>(null)

  const { correctText, options, germanMode, bridged } = useMemo(() => {
    const own = strictTranslation(lemma, tl)
    // Doğru cevap seçilen dilde yoksa TÜM şıklar Almanca tanım olur.
    const useGerman = !own
    const render = (l: Lemma): string | null => {
      if (useGerman) return l.s[0]?.g ?? null
      const tr = strictTranslation(l, tl)
      return tr ? tr.words.slice(0, 2).join(', ') : null
    }

    const right = useGerman ? (lemma.s[0]?.g ?? lemma.w) : own!.words.slice(0, 2).join(', ')

    // Çeldiriciler: aynı sözcük türü, yakın frekans, AYNI kipte sunulabilen.
    const near = pool.filter(
      (l) => l.p === lemma.p && l.w !== lemma.w && Math.abs(l.r - lemma.r) < 1500 && render(l),
    )
    const wide = pool.filter((l) => l.w !== lemma.w && render(l))
    const source = near.length >= 6 ? near : wide

    const texts = new Set<string>()
    for (const l of sample(source, 24)) {
      const txt = render(l)
      if (txt && txt !== right) texts.add(txt)
      if (texts.size >= 3) break
    }

    return {
      correctText: right,
      options: shuffle([right, ...texts]),
      germanMode: useGerman,
      bridged: own?.bridged ?? false,
    }
  }, [lemma, pool, tl])

  const answered = picked !== null
  const correct = picked === correctText

  return (
    <div className="card">
      <WordHead lemma={lemma} />
      <div className="prompt" style={{ padding: 0, marginBottom: 12 }}>
        <div className="q">
          {t('recallMeaning', lang)}
          {germanMode && (
            <> · <Badge>DE</Badge></>
          )}
          {bridged && (
            <> · <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge></>
          )}
        </div>
      </div>

      <div className="choices">
        {options.map((o) => (
          <button
            key={o}
            disabled={answered}
            className={[
              germanMode ? 'de' : '',
              answered ? (o === correctText ? 'correct' : o === picked ? 'wrong' : '') : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setPicked(o)}
          >
            {o}
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            {correct ? t('correct', lang) : `${t('wrong', lang)} — ${correctText}`}
          </div>
          <Example lemma={lemma} />
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

/**
 * Kelimenin geçtiği örnek cümle — Almancası ve karşılığı birlikte.
 *
 * Tek başına Almanca cümle yeni başlayan için işe yaramıyor: okuyamadığı
 * için atlıyor ve kelimenin bağlamını hiç görmemiş oluyor. Karşılığıyla
 * birlikte ise cümle, kelimenin nerede ve nasıl kullanıldığını gösteren
 * asıl öğretici parçaya dönüşüyor.
 */
function Example({ lemma }: { lemma: Lemma }) {
  const { state, lang } = useStore()
  const ex = exampleFor(lemma, state.settings.transLang, lang)
  if (!ex) return null
  return (
    <div className="example-pair">
      <p className="de">{ex.de}</p>
      {ex.text && (
        <p className="trans" lang={ex.lang ?? undefined}>
          {ex.text}
          {ex.bridged && (
            <>
              {' '}
              <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge>
            </>
          )}
        </p>
      )}
    </div>
  )
}

/* ---------- 2. Üretim: anlam → Almanca (yazarak) ---------- */

export function ProduceExercise({ lemma, isNew, onAnswer }: ExerciseProps) {
  const { state, lang } = useStore()
  const tl = state.settings.transLang
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)

  const hint = glossOrTranslation(lemma, tl)
  const normalized = value.trim().toLowerCase().replace(/^(der|die|das)\s+/, '')
  const correct = normalized === lemma.w.toLowerCase()

  return (
    <div className="card">
      <div className="prompt">
        <div className="q">{t('recallWord', lang)}</div>
        <div
          className={`word ${hint.isGerman ? 'de' : ''}`}
          style={{ fontSize: hint.isGerman ? '1.15rem' : '1.4rem' }}
        >
          {hint.text}
        </div>
        {hint.bridged && (
          <div style={{ marginTop: 6 }}>
            <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge>
          </div>
        )}
      </div>

      <input
        type="text" autoFocus autoCapitalize="off" autoCorrect="off"
        spellCheck={false} lang="de" value={value} disabled={checked}
        placeholder={lemma.p === 'noun' ? 'der/die/das …' : '…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) setChecked(true) }}
      />

      {!checked ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={!value.trim()} onClick={() => setChecked(true)}>
            {t('check', lang)}
          </button>
          <button className="ghost" onClick={() => setChecked(true)}>{t('showAnswer', lang)}</button>
        </div>
      ) : (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{displayForm(lemma)}</strong>
            {lemma.pl && <span className="small muted"> · Pl. {lemma.pl}</span>}
          </div>
          <Example lemma={lemma} />
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

/* ---------- 3. Artikel ---------- */

export function ArticleExercise({ lemma, isNew, onAnswer }: ExerciseProps) {
  const { lang } = useStore()
  const [picked, setPicked] = useState<string | null>(null)
  const right = { m: 'der', f: 'die', n: 'das' }[lemma.g?.[0] ?? 'm'] ?? 'der'
  const answered = picked !== null
  const correct = picked === right

  return (
    <div className="card">
      <div className="prompt">
        <div className="q">{t('chooseArticle', lang)}</div>
        <div className="word de">{lemma.w}</div>
        {lemma.ipa && <div className="ipa">/{lemma.ipa}/</div>}
      </div>

      <div className="row" style={{ gap: 8 }}>
        {(['der', 'die', 'das'] as const).map((a) => (
          <button
            key={a}
            className={`big de ${answered ? (a === right ? 'correct' : a === picked ? 'wrong' : '') : ''}`}
            style={{ flex: 1 }}
            disabled={answered}
            onClick={() => setPicked(a)}
          >
            {a}
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{right} {lemma.w}</strong>
            {lemma.pl && <span className="small"> · Pl. die {lemma.pl}</span>}
          </div>
          <Example lemma={lemma} />
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

/* ---------- 4. Boşluk doldurma ---------- */

export function ClozeExercise(props: ExerciseProps) {
  const { lemma, isNew, onAnswer } = props
  const { state, lang } = useStore()
  const tl = state.settings.transLang
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)

  // Çevirili örnek varsa onu kullan: cevaptan sonra karşılığını da
  // gösterebiliyoruz, yoksa sözlükteki Almanca örneğe düşüyor.
  const example = useMemo(() => exampleFor(lemma, tl, lang), [lemma, tl, lang])
  const sentence = example?.de ?? ''

  const { masked, target } = useMemo(() => {
    const stem = lemma.w.slice(0, Math.max(3, Math.floor(lemma.w.length * 0.6)))
    const re = new RegExp(`\\b${stem}\\w*`, 'i')
    const m = sentence.match(re)
    if (!m) return { masked: sentence, target: lemma.w }
    return { masked: sentence.replace(m[0], '_____'), target: m[0] }
  }, [sentence, lemma])

  // Örnek cümlesi yoksa üretim alıştırmasına düş
  if (!sentence) return <ProduceExercise {...props} />

  const hint = glossOrTranslation(lemma, tl)
  const correct = value.trim().toLowerCase() === target.toLowerCase()

  return (
    <div className="card">
      <div className="prompt" style={{ paddingBottom: 10 }}>
        <div className="q">{t('fillGap', lang)}</div>
      </div>
      <p className="de" style={{ fontSize: '1.15rem', lineHeight: 1.8 }}>{masked}</p>
      <p className="small muted">
        {t('recallWord', lang)}: <span className={hint.isGerman ? 'de' : ''}>{hint.text}</span>
      </p>

      <input
        type="text" autoFocus autoCapitalize="off" autoCorrect="off"
        spellCheck={false} lang="de" value={value} disabled={checked}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) setChecked(true) }}
      />

      {!checked ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={!value.trim()} onClick={() => setChecked(true)}>
            {t('check', lang)}
          </button>
          <button className="ghost" onClick={() => setChecked(true)}>{t('showAnswer', lang)}</button>
        </div>
      ) : (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <span className="de">{sentence}</span>
            {example?.text && (
              <span className="trans" lang={example.lang ?? undefined}>
                {example.text}
                {example.bridged && (
                  <>
                    {' '}
                    <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge>
                  </>
                )}
              </span>
            )}
          </div>
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

/* ---------- 5. Dinleyerek tanıma ---------- */

/**
 * Kelimeyi GÖRMEDEN sesten tanıma.
 *
 * Diğer alıştırmaların hepsi yazılı biçimi gösteriyor; öğrenci kelimeyi
 * gözüyle tanımayı öğrenip kulağıyla tanıyamayabiliyor. Almanca'da bu fark
 * büyük: "Bahn / Bann", "Beeren / Bären" gibi çiftler yazıda ayrışıyor,
 * seste ayrışmıyor. Kelimelerin %99'unda Wikimedia insan kaydı olduğu için
 * bu alıştırma gerçek sesle çalışabiliyor.
 */
export function ListenExercise({ lemma, pool, isNew, onAnswer }: ExerciseProps) {
  const { state, lang } = useStore()
  const tl: TransLang = state.settings.transLang
  const { play } = useAudio()
  const [picked, setPicked] = useState<string | null>(null)
  const url = wordAudioUrl(lemma)

  const { correctText, options } = useMemo(() => {
    const own = strictTranslation(lemma, tl)
    const render = (l: Lemma) => {
      const tr = strictTranslation(l, tl)
      return tr ? tr.words.slice(0, 2).join(', ') : (l.s[0]?.g ?? null)
    }
    const right = own ? own.words.slice(0, 2).join(', ') : (lemma.s[0]?.g ?? lemma.w)
    const near = pool.filter(
      (l) => l.p === lemma.p && l.w !== lemma.w && Math.abs(l.r - lemma.r) < 2000 && render(l),
    )
    const texts = new Set<string>()
    for (const l of sample(near.length >= 6 ? near : pool, 24)) {
      const txt = render(l)
      if (txt && txt !== right) texts.add(txt)
      if (texts.size >= 3) break
    }
    return { correctText: right, options: shuffle([right, ...texts]) }
  }, [lemma, pool, tl])

  // Ses yoksa bu alıştırma anlamsız: tanımaya düş
  if (!url) return <RecognizeExercise lemma={lemma} pool={pool} isNew={isNew} onAnswer={onAnswer} />

  const answered = picked !== null
  const correct = picked === correctText

  return (
    <div className="card">
      <div className="prompt">
        <div className="q">🎧 {t('listenAndPick', lang)}</div>
        <button
          className="primary big listen-orb"
          onClick={() => play(url)}
          aria-label={t('play', lang)}
        >
          ▶
        </button>
        {answered && <div className="word de" style={{ marginTop: 14 }}>{displayForm(lemma)}</div>}
      </div>

      <div className="choices">
        {options.map((o) => (
          <button
            key={o}
            disabled={answered}
            className={answered ? (o === correctText ? 'correct' : o === picked ? 'wrong' : '') : ''}
            onClick={() => setPicked(o)}
          >
            {o}
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            {correct ? t('correct', lang) : `${t('wrong', lang)} — ${correctText}`}
          </div>
          <Example lemma={lemma} />
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

/* ---------- 6. Aykırı olanı bul ---------- */

/**
 * Dört kelimeden üçü aynı sözcük türünden ve yakın frekanstan; biri farklı
 * türden. Tek kelimeyi tek anlamla eşleştirmek yerine kelimeler arası
 * ilişkiye bakmayı gerektiriyor — sözcük ağını kuran alıştırma türü.
 */
export function OddOneExercise({ lemma, pool, isNew, onAnswer }: ExerciseProps) {
  const { lang } = useStore()
  const [picked, setPicked] = useState<string | null>(null)

  const built = useMemo(() => {
    const same = pool.filter((l) => l.p === lemma.p && l.w !== lemma.w)
    const other = pool.filter((l) => l.p !== lemma.p && l.p !== 'phrase')
    if (same.length < 2 || !other.length) return null
    const odd = sample(other, 1)[0]
    const items = shuffle([lemma, ...sample(same, 2), odd])
    return { items, oddWord: odd.w, oddPos: odd.p }
  }, [lemma, pool])

  if (!built) return <RecognizeExercise lemma={lemma} pool={pool} isNew={isNew} onAnswer={onAnswer} />

  const answered = picked !== null
  const correct = picked === built.oddWord

  return (
    <div className="card">
      <div className="prompt" style={{ paddingBottom: 8 }}>
        <div className="q">{t('oddOneOut', lang)}</div>
      </div>
      <div className="choices">
        {built.items.map((l) => (
          <button
            key={l.w}
            className={`de ${answered ? (l.w === built.oddWord ? 'correct' : l.w === picked ? 'wrong' : '') : ''}`}
            disabled={answered}
            onClick={() => setPicked(l.w)}
          >
            {displayForm(l)}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{built.oddWord}</strong> — {POS_NAME[built.oddPos]?.[lang] ?? built.oddPos}
          </div>
          <Example lemma={lemma} />
          <Finish lemma={lemma} correct={correct} isNew={isNew} onAnswer={onAnswer} />
        </>
      )}
    </div>
  )
}

const POS_NAME: Record<string, Record<string, string>> = {
  noun: { tr: 'isim', az: 'isim', ru: 'существительное', de: 'Nomen' },
  verb: { tr: 'fiil', az: 'feil', ru: 'глагол', de: 'Verb' },
  adj: { tr: 'sıfat', az: 'sifət', ru: 'прилагательное', de: 'Adjektiv' },
  adv: { tr: 'zarf', az: 'zərf', ru: 'наречие', de: 'Adverb' },
  pron: { tr: 'zamir', az: 'əvəzlik', ru: 'местоимение', de: 'Pronomen' },
  prep: { tr: 'edat', az: 'ön qoşma', ru: 'предлог', de: 'Präposition' },
  conj: { tr: 'bağlaç', az: 'bağlayıcı', ru: 'союз', de: 'Konjunktion' },
  num: { tr: 'sayı', az: 'say', ru: 'числительное', de: 'Numerale' },
  particle: { tr: 'edat', az: 'ədat', ru: 'частица', de: 'Partikel' },
  intj: { tr: 'ünlem', az: 'nida', ru: 'междометие', de: 'Interjektion' },
  det: { tr: 'belirteç', az: 'təyinedici', ru: 'детерминатив', de: 'Determinativ' },
  phrase: { tr: 'deyim', az: 'ifadə', ru: 'выражение', de: 'Wendung' },
}

/* ---------- alıştırma seçici ---------- */

export type ExerciseKind = 'recognize' | 'produce' | 'article' | 'cloze' | 'listen' | 'oddone'

/**
 * Alıştırma türünü kelimenin geçmişine göre seçer.
 * Amaç başarıyı %60-80 bandında tutmak: zayıf kelimede tanıma (kolay),
 * güçlü kelimede üretim (zor).
 */
export function pickKind(lemma: Lemma, hist: boolean[], reps: number): ExerciseKind {
  const rate = hist.length ? hist.filter(Boolean).length / hist.length : 0
  const isNoun = lemma.p === 'noun' && !!lemma.g?.length
  const hasExample = lemma.s.some((s) => s.x.length > 0)

  const hasAudio = !!lemma.a

  if (reps < 2) return 'recognize'
  if (isNoun && reps % 5 === 2) return 'article'
  // Ses tanıma zorluktan bağımsız: göz-kulak açığını erken kapatmak için
  // düzenli aralıklarla araya giriyor.
  if (hasAudio && reps % 4 === 3) return 'listen'
  if (rate < 0.6) return 'recognize'
  if (rate > 0.8 && reps % 6 === 5) return 'oddone'
  if (rate > 0.85 && hasExample && reps % 3 === 0) return 'cloze'
  if (rate > 0.75) return 'produce'
  return 'recognize'
}

export function Exercise({ kind, ...props }: ExerciseProps & { kind: ExerciseKind }) {
  switch (kind) {
    case 'article': return <ArticleExercise {...props} />
    case 'produce': return <ProduceExercise {...props} />
    case 'cloze': return <ClozeExercise {...props} />
    case 'listen': return <ListenExercise {...props} />
    case 'oddone': return <OddOneExercise {...props} />
    default: return <RecognizeExercise {...props} />
  }
}
