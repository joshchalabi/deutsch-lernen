/**
 * Kelime çalışması — FSRS planlaması + geri çağırma pratiği.
 *
 * TASARIM İLKELERİ (hepsi araştırma dayanaklı)
 *
 * 1. GERİ ÇAĞIRMA > TEKRAR OKUMA
 *    Karpicke & Roediger: bilgiyi tekrar okumak yerine hatırlamaya çalışmak,
 *    uzun vadeli hatırlamayı belirgin şekilde artırıyor. Bu yüzden hiçbir
 *    alıştırma "şu kelimeye bak ve ezberle" demiyor; hepsi önce cevabı
 *    üretmeni istiyor.
 *
 * 2. BAŞARI BANDI %60-80
 *    Sürekli başarısızlık öğrenme değil tahmin ve kopma üretir. Alıştırma
 *    türü, kelimenin geçmiş başarı oranına göre seçiliyor: yeni/zayıf
 *    kelimelerde tanıma (çoktan seçmeli), sağlamlaşmış kelimelerde üretim
 *    (yazma). Böylece zorluk öğrencinin durumuna uyarlanıyor.
 *
 * 3. DEĞİŞKEN ALIŞTIRMA (interleaving)
 *    Aynı kelime her seferinde farklı biçimde soruluyor — tanıma, üretim,
 *    artikel, boşluk doldurma. Tek kalıba alışmak "kart ezberi" üretiyor,
 *    dil bilgisi değil.
 *
 * 4. ARTİKEL BAŞTAN
 *    İsimler her zaman artikeliyle gösteriliyor ve ayrı bir artikel
 *    alıştırması var. Artikeli sonradan eklemek, Almanca öğrenenlerin en
 *    yaygın ve en kalıcı hatası.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadVocabUpTo, displayForm, lemmaKey, sample, shuffle, translationOf, wordAudioUrl } from '../lib/data'
import type { Lemma, Level } from '../lib/types'
import { isDue, previewIntervals, Rating } from '../lib/fsrs'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, PlayButton, useAsync } from '../components/ui'

type ExerciseKind = 'recognize' | 'produce' | 'article' | 'cloze'

interface Queued {
  lemma: Lemma
  kind: ExerciseKind
  isNew: boolean
}

/** Bir kelimenin son denemelerdeki başarı oranı */
function successRate(hist: boolean[]): number {
  if (!hist.length) return 0
  return hist.filter(Boolean).length / hist.length
}

/**
 * Alıştırma türünü seçer. Amaç: başarıyı %60-80 bandında tutmak.
 * Zayıf kelimede kolay (tanıma), güçlü kelimede zor (üretim) soru.
 */
function pickKind(lemma: Lemma, hist: boolean[], reps: number): ExerciseKind {
  const rate = successRate(hist)
  const isNoun = lemma.p === 'noun' && !!lemma.g?.length
  const hasExample = lemma.s.some((s) => s.x.length > 0)

  // İlk karşılaşmalar hep tanıma: henüz üretilecek bir şey yok
  if (reps < 2) return 'recognize'

  // İsimlerde artikel, düzenli aralıklarla ayrı bir hedef
  if (isNoun && reps % 4 === 2) return 'article'

  if (rate < 0.6) return 'recognize'
  if (rate > 0.85 && hasExample && reps % 3 === 0) return 'cloze'
  if (rate > 0.75) return 'produce'
  return 'recognize'
}

export default function Study() {
  const { state, lang } = useStore()
  const level = state.profile.level

  const vocab = useAsync(
    async () => (level ? loadVocabUpTo(level) : []),
    [level],
  )

  if (!level) {
    return (
      <main className="main">
        <div className="card center">
          <h1>{t('placementTitle', lang)}</h1>
          <p className="muted">{t('placementIntro', lang)}</p>
          <Link to="/placement">
            <button className="primary big">{t('start', lang)}</button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <Loading state={vocab}>{(all) => <Session all={all} level={level} />}</Loading>
    </main>
  )
}

function Session({ all, level }: { all: Lemma[]; level: Level }) {
  const { state, lang, rate, addWord } = useStore()
  useStudyClock(true)

  const byKey = useMemo(() => new Map(all.map((l) => [lemmaKey(l), l])), [all])

  /** Bugünün kuyruğu: önce vadesi gelen tekrarlar, sonra kota kadar yeni kelime */
  const queue = useMemo<Queued[]>(() => {
    const now = Date.now()
    const due: Queued[] = []

    for (const [key, prog] of Object.entries(state.vocab)) {
      if (!isDue(prog.card, now)) continue
      const lemma = byKey.get(key)
      if (!lemma) continue
      due.push({
        lemma,
        kind: pickKind(lemma, prog.hist, prog.card.reps),
        isNew: false,
      })
    }
    due.sort((a, b) => state.vocab[lemmaKey(a.lemma)].card.due - state.vocab[lemmaKey(b.lemma)].card.due)
    const capped = due.slice(0, state.settings.maxReviews)

    // Yeni kelimeler: frekans sırasına göre, henüz destede olmayanlar
    const todayNew = state.sessions[new Date().toISOString().slice(0, 10)]?.newWords ?? 0
    const room = Math.max(0, state.settings.newPerDay - todayNew)
    const fresh = all
      .filter((l) => !state.vocab[lemmaKey(l)])
      .sort((a, b) => a.r - b.r)
      .slice(0, room)
      .map<Queued>((lemma) => ({ lemma, kind: 'recognize', isNew: true }))

    // Yeni kelimeleri kuyruğa serpiştir: hepsi sona yığılırsa yorucu olur
    return shuffle([...capped, ...fresh])
    // state.vocab her derecelendirmede değişir; kuyruk kasıtlı olarak
    // oturum boyunca sabit kalsın diye yalnızca ilk kurulumda hesaplanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byKey, all])

  const [pos, setPos] = useState(0)
  const [done, setDone] = useState(0)

  const current = queue[pos]

  const advance = useCallback(() => {
    setDone((d) => d + 1)
    setPos((p) => p + 1)
  }, [])

  const handleAnswer = useCallback(
    (lemma: Lemma, correct: boolean, ratingOverride?: Rating) => {
      const key = lemmaKey(lemma)
      if (!state.vocab[key]) addWord(lemma)
      const r = ratingOverride ?? (correct ? Rating.Good : Rating.Again)
      rate(lemma, r, correct)
      advance()
    },
    [state.vocab, addWord, rate, advance],
  )

  if (!queue.length) {
    return (
      <div className="card center">
        <h2>{t('noDue', lang)}</h2>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <Link to="/listening"><button>{t('listening', lang)}</button></Link>
          <Link to="/reading"><button>{t('reading', lang)}</button></Link>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="card center">
        <h2>✓</h2>
        <p className="muted">
          {done} {t('totalReviews', lang).toLowerCase()}
        </p>
        <Link to="/progress"><button className="primary">{t('progress', lang)}</button></Link>
      </div>
    )
  }

  return (
    <>
      <div className="row between small muted" style={{ marginBottom: 10 }}>
        <span>
          <Badge kind="level">{level}</Badge>{' '}
          {current.isNew ? t('newWords', lang) : t('dueToday', lang)}
        </span>
        <span className="mono">{pos + 1} / {queue.length}</span>
      </div>
      <div className="bar" style={{ marginBottom: 16 }}>
        <i style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <Exercise
        key={`${lemmaKey(current.lemma)}-${pos}`}
        item={current}
        pool={all}
        onAnswer={handleAnswer}
      />
    </>
  )
}

/* ---------- alıştırmalar ---------- */

function Exercise({
  item, pool, onAnswer,
}: {
  item: Queued
  pool: Lemma[]
  onAnswer: (l: Lemma, correct: boolean, r?: Rating) => void
}) {
  switch (item.kind) {
    case 'article':
      return <ArticleExercise lemma={item.lemma} onAnswer={onAnswer} />
    case 'produce':
      return <ProduceExercise lemma={item.lemma} onAnswer={onAnswer} />
    case 'cloze':
      return <ClozeExercise lemma={item.lemma} onAnswer={onAnswer} />
    default:
      return <RecognizeExercise lemma={item.lemma} pool={pool} isNew={item.isNew} onAnswer={onAnswer} />
  }
}

/** Derecelendirme çubuğu — doğru cevaptan sonra FSRS notu almak için */
function RatingBar({ lemma, onRate }: { lemma: Lemma; onRate: (r: Rating) => void }) {
  const { state, lang } = useStore()
  const prog = state.vocab[lemmaKey(lemma)]
  const ivs = prog ? previewIntervals(prog.card) : null
  const label = (d: number) =>
    d === 0 ? `<10 ${t('minutes', lang)}` : `${d} ${t('days', lang)}`

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

function WordHead({ lemma, showAudio = true }: { lemma: Lemma; showAudio?: boolean }) {
  return (
    <div className="prompt">
      <div className="word de">{displayForm(lemma)}</div>
      {lemma.ipa && <div className="ipa">/{lemma.ipa}/</div>}
      {showAudio && (
        <div style={{ marginTop: 6 }}>
          <PlayButton url={wordAudioUrl(lemma)} text={lemma.w} label="Aussprache" />
        </div>
      )}
    </div>
  )
}

/** Tanıma: Almanca kelime → anlamı seç */
function RecognizeExercise({
  lemma, pool, isNew, onAnswer,
}: {
  lemma: Lemma
  pool: Lemma[]
  isNew: boolean
  onAnswer: (l: Lemma, c: boolean, r?: Rating) => void
}) {
  const { state, lang } = useStore()
  const tl = state.settings.transLang
  const [picked, setPicked] = useState<string | null>(null)

  const correctText = useMemo(() => {
    const tr = translationOf(lemma, tl)
    return tr ? tr.words.slice(0, 2).join(', ') : lemma.s[0]?.g ?? lemma.w
  }, [lemma, tl])

  const options = useMemo(() => {
    // Çeldiriciler aynı sözcük türünden ve benzer frekanstan: rastgele
    // seçilen çeldirici soruyu kolaylaştırıp ölçümü bozuyor.
    const near = pool
      .filter((l) => l.p === lemma.p && l.w !== lemma.w && Math.abs(l.r - lemma.r) < 1200)
      .filter((l) => translationOf(l, tl))
    const pickedDistractors = sample(near.length >= 3 ? near : pool.filter((l) => l.w !== lemma.w), 3)
    const texts = pickedDistractors.map((l) => {
      const tr = translationOf(l, tl)
      return tr ? tr.words.slice(0, 2).join(', ') : l.s[0]?.g ?? l.w
    })
    return shuffle([correctText, ...texts.filter((x) => x !== correctText)]).slice(0, 4)
  }, [pool, lemma, tl, correctText])

  const answered = picked !== null
  const correct = picked === correctText

  return (
    <div className="card">
      <WordHead lemma={lemma} />
      <div className="prompt" style={{ padding: 0, marginBottom: 12 }}>
        <div className="q">{t('recallMeaning', lang)}</div>
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
          {lemma.s[0]?.x[0] && (
            <p className="de small muted" style={{ marginTop: 10 }}>{lemma.s[0].x[0]}</p>
          )}
          {isNew ? (
            <button className="primary block" style={{ marginTop: 12 }}
              onClick={() => onAnswer(lemma, correct, correct ? Rating.Good : Rating.Again)}>
              {t('next', lang)}
            </button>
          ) : (
            <RatingBar lemma={lemma} onRate={(r) => onAnswer(lemma, correct, r)} />
          )}
        </>
      )}
    </div>
  )
}

/** Üretim: anlamdan Almanca kelimeyi yaz */
function ProduceExercise({
  lemma, onAnswer,
}: {
  lemma: Lemma
  onAnswer: (l: Lemma, c: boolean, r?: Rating) => void
}) {
  const { state, lang } = useStore()
  const tl = state.settings.transLang
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)

  const tr = translationOf(lemma, tl)
  const hint = tr ? tr.words.slice(0, 3).join(', ') : lemma.s[0]?.g ?? ''

  const normalized = value.trim().toLowerCase().replace(/^(der|die|das)\s+/, '')
  const correct = normalized === lemma.w.toLowerCase()

  return (
    <div className="card">
      <div className="prompt">
        <div className="q">{t('recallWord', lang)}</div>
        <div className="word" style={{ fontSize: '1.4rem' }}>{hint}</div>
        {tr?.bridged && (
          <div style={{ marginTop: 6 }}>
            <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge>
          </div>
        )}
      </div>

      <input
        type="text"
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        lang="de"
        value={value}
        disabled={checked}
        placeholder={lemma.p === 'noun' ? 'der/die/das …' : '…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) setChecked(true) }}
      />

      {!checked ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={!value.trim()} onClick={() => setChecked(true)}>
            {t('check', lang)}
          </button>
          <button className="ghost" onClick={() => { setValue(''); setChecked(true) }}>
            {t('showAnswer', lang)}
          </button>
        </div>
      ) : (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{displayForm(lemma)}</strong>
            {lemma.pl && <span className="small muted"> · Pl. {lemma.pl}</span>}
          </div>
          <RatingBar lemma={lemma} onRate={(r) => onAnswer(lemma, correct, r)} />
        </>
      )}
    </div>
  )
}

/** Artikel: der / die / das */
function ArticleExercise({
  lemma, onAnswer,
}: {
  lemma: Lemma
  onAnswer: (l: Lemma, c: boolean, r?: Rating) => void
}) {
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
        {['der', 'die', 'das'].map((a) => (
          <button
            key={a}
            className={`big ${answered ? (a === right ? 'correct' : a === picked ? 'wrong' : '') : ''}`}
            style={{ flex: 1 }}
            disabled={answered}
            onClick={() => setPicked(a)}
          >
            <span className="de">{a}</span>
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{right} {lemma.w}</strong>
            {lemma.pl && <span className="small"> · Pl. die {lemma.pl}</span>}
          </div>
          <RatingBar lemma={lemma} onRate={(r) => onAnswer(lemma, correct, r)} />
        </>
      )}
    </div>
  )
}

/** Boşluk doldurma: kelimeyi gerçek bir cümle içinde üret */
function ClozeExercise({
  lemma, onAnswer,
}: {
  lemma: Lemma
  onAnswer: (l: Lemma, c: boolean, r?: Rating) => void
}) {
  const { state, lang } = useStore()
  const tl = state.settings.transLang
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)

  const sentence = useMemo(
    () => lemma.s.find((s) => s.x.length)?.x[0] ?? '',
    [lemma],
  )

  // Cümlede kelimenin hangi biçimde geçtiğini bul (çekimli olabilir)
  const { masked, target } = useMemo(() => {
    const stem = lemma.w.slice(0, Math.max(3, Math.floor(lemma.w.length * 0.6)))
    const re = new RegExp(`\\b${stem}\\w*`, 'i')
    const m = sentence.match(re)
    if (!m) return { masked: sentence, target: lemma.w }
    return { masked: sentence.replace(m[0], '_____'), target: m[0] }
  }, [sentence, lemma])

  const tr = translationOf(lemma, tl)
  const correct = value.trim().toLowerCase() === target.toLowerCase()

  if (!sentence) {
    // Örnek cümlesi yoksa üretim alıştırmasına düş
    return <ProduceExercise lemma={lemma} onAnswer={onAnswer} />
  }

  return (
    <div className="card">
      <div className="prompt" style={{ paddingBottom: 10 }}>
        <div className="q">{t('fillGap', lang)}</div>
      </div>
      <p className="de" style={{ fontSize: '1.15rem', lineHeight: 1.8 }}>{masked}</p>
      <p className="small muted">
        {t('recallWord', lang)}: {tr ? tr.words.slice(0, 2).join(', ') : lemma.s[0]?.g}
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
          </div>
          <RatingBar lemma={lemma} onRate={(r) => onAnswer(lemma, correct, r)} />
        </>
      )}
    </div>
  )
}

/** Klavye kısayolları: 1-4 derecelendirme, Enter ilerlet */
export function useShortcuts(handlers: Partial<Record<string, () => void>>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return
      handlers[e.key]?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
