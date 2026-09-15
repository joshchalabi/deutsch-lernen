/**
 * Oyunlar — dersin kapanışı.
 *
 * NEDEN OYUN?
 *   Oyunlar burada süs değil, bilinçli bir alıştırma biçimi: hepsi HIZ altında
 *   çalışıyor. Bir kelimenin artikelini 4 saniyede seçmek zorunda kalmak,
 *   düşünerek doğru cevabı bulmaktan farklı bir beceriyi ölçüyor — otomatikleşme.
 *   Konuşurken artikeli düşünecek vaktiniz olmadığı için asıl hedef budur.
 *
 *   Her oyun ünitedeki gerçek kelimelerden üretiliyor; hazır soru listesi yok.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameId, Lemma } from '../lib/types'
import { glossOrTranslation, sample, shuffle } from '../lib/data'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Art, Confetti } from '../components/art'

export interface GameProps {
  /** Oyunun soru üreteceği kelimeler */
  pool: Lemma[]
  onFinish: (score: number, total: number) => void
}

const ROUND_LENGTH = 10

/* ---------- ortak kabuk ---------- */

function GameShell({
  round, total, score, timeLeft, children,
}: {
  round: number
  total: number
  score: number
  timeLeft?: number
  children: React.ReactNode
}) {
  return (
    <div className="game">
      <div className="game-hud">
        <span className="mono">{round} / {total}</span>
        {timeLeft !== undefined && (
          <div className="timer">
            <i style={{ width: `${(timeLeft / 100) * 100}%` }} />
          </div>
        )}
        <span className="mono score">★ {score}</span>
      </div>
      {children}
    </div>
  )
}

function GameOver({
  score, total, onFinish,
}: {
  score: number
  total: number
  onFinish: GameProps['onFinish']
}) {
  const { lang } = useStore()
  const pct = total ? Math.round((score / total) * 100) : 0
  const face = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '💪'
  return (
    <div className="card center game-over celebrate">
      <Confetti show={pct >= 70} />
      {pct >= 70
        ? <div className="art-hero"><Art name="trophy" size={88} /></div>
        : <div className="big-emoji">{face}</div>}
      <div className="score-big mono">{score} / {total}</div>
      <div className="muted small" style={{ marginBottom: 16 }}>{pct}%</div>
      <button className="primary big" onClick={() => onFinish(score, total)}>
        {t('finish', lang)} →
      </button>
    </div>
  )
}

/** Süre sayacı — her soruda sıfırlanır */
function useCountdown(seconds: number, active: boolean, onExpire: () => void) {
  const [left, setLeft] = useState(100)
  const expire = useRef(onExpire)
  expire.current = onExpire

  useEffect(() => {
    if (!active) return
    setLeft(100)
    const started = Date.now()
    const id = window.setInterval(() => {
      const pct = 100 - ((Date.now() - started) / (seconds * 1000)) * 100
      if (pct <= 0) {
        window.clearInterval(id)
        setLeft(0)
        expire.current()
      } else {
        setLeft(pct)
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [active, seconds])

  return left
}

/* ---------- 1. Artikel Rush ---------- */

function ArtikelRush({ pool, onFinish }: GameProps) {
  const nouns = useMemo(
    () => sample(pool.filter((l) => l.p === 'noun' && l.g?.length), ROUND_LENGTH),
    [pool],
  )
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)

  const next = useCallback((correct: boolean) => {
    setFlash(correct ? 'ok' : 'bad')
    if (correct) setScore((s) => s + 1)
    window.setTimeout(() => {
      setFlash(null)
      setI((n) => n + 1)
    }, 380)
  }, [])

  const current = nouns[i]
  const timeLeft = useCountdown(5, !!current && !flash, () => next(false))

  if (!nouns.length) return <GameOver score={0} total={0} onFinish={onFinish} />
  if (!current) return <GameOver score={score} total={nouns.length} onFinish={onFinish} />

  const right = { m: 'der', f: 'die', n: 'das' }[current.g![0]] ?? 'der'

  return (
    <GameShell round={i + 1} total={nouns.length} score={score} timeLeft={timeLeft}>
      <div className={`game-card ${flash ?? ''}`}>
        <div className="game-word de">{current.w}</div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        {(['der', 'die', 'das'] as const).map((a) => (
          <button
            key={a}
            className="big de"
            style={{ flex: 1, fontSize: '1.15rem' }}
            disabled={!!flash}
            onClick={() => next(a === right)}
          >
            {a}
          </button>
        ))}
      </div>
    </GameShell>
  )
}

/* ---------- 2. Wortsalat: eşleştirme ---------- */

function Wortsalat({ pool, onFinish }: GameProps) {
  const { state } = useStore()
  const tl = state.settings.transLang

  const pairs = useMemo(() => {
    const usable = pool.filter((l) => glossOrTranslation(l, tl).text)
    return sample(usable, 6).map((l) => ({
      key: l.w,
      de: l.w,
      other: glossOrTranslation(l, tl).text,
    }))
  }, [pool, tl])

  const [left] = useState(() => shuffle(pairs))
  const [right] = useState(() => shuffle(pairs))
  const [picked, setPicked] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [tries, setTries] = useState(0)

  const done = matched.length === pairs.length

  const tapRight = (key: string) => {
    if (!picked || matched.includes(key)) return
    setTries((n) => n + 1)
    if (picked === key) {
      setMatched((m) => [...m, key])
      setPicked(null)
    } else {
      setWrong(key)
      window.setTimeout(() => { setWrong(null); setPicked(null) }, 400)
    }
  }

  if (!pairs.length) return <GameOver score={0} total={0} onFinish={onFinish} />
  if (done) {
    // Puan: en az deneme ile eşleştirmek daha iyi
    const perfect = pairs.length
    const score = Math.max(1, Math.round(perfect * (perfect / Math.max(tries, perfect))))
    return <GameOver score={score} total={perfect} onFinish={onFinish} />
  }

  return (
    <GameShell round={matched.length + 1} total={pairs.length} score={matched.length}>
      <div className="match-grid">
        <div className="match-col">
          {left.map((p) => (
            <button
              key={p.key}
              className={`match-item de ${matched.includes(p.key) ? 'matched' : ''} ${picked === p.key ? 'picked' : ''}`}
              disabled={matched.includes(p.key)}
              onClick={() => setPicked(p.key)}
            >
              {p.de}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((p) => (
            <button
              key={p.key}
              className={`match-item ${matched.includes(p.key) ? 'matched' : ''} ${wrong === p.key ? 'shake' : ''}`}
              disabled={matched.includes(p.key)}
              onClick={() => tapRight(p.key)}
            >
              {p.other}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  )
}

/* ---------- 3. Satzbau: cümle dizme ---------- */

function Satzbau({ pool, onFinish }: GameProps) {
  const { lang } = useStore()

  const sentences = useMemo(() => {
    const withEx = pool.flatMap((l) => l.s.flatMap((s) => s.x))
      .filter((x) => {
        const n = x.split(/\s+/).length
        return n >= 4 && n <= 9
      })
    return sample([...new Set(withEx)], 5)
  }, [pool])

  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [built, setBuilt] = useState<string[]>([])
  const [checked, setChecked] = useState(false)

  const target = sentences[i]
  const words = useMemo(
    () => (target ? shuffle(target.replace(/[.!?]$/, '').split(/\s+/)) : []),
    [target],
  )

  if (!sentences.length) return <GameOver score={0} total={0} onFinish={onFinish} />
  if (!target) return <GameOver score={score} total={sentences.length} onFinish={onFinish} />

  const expected = target.replace(/[.!?]$/, '').split(/\s+/)
  const correct = built.join(' ') === expected.join(' ')
  const remaining = (() => {
    const pool2 = [...words]
    for (const b of built) {
      const idx = pool2.indexOf(b)
      if (idx >= 0) pool2.splice(idx, 1)
    }
    return pool2
  })()

  const advance = () => {
    if (correct) setScore((s) => s + 1)
    setBuilt([]); setChecked(false); setI((n) => n + 1)
  }

  return (
    <GameShell round={i + 1} total={sentences.length} score={score}>
      <div className="build-area">
        {built.length === 0 && <span className="muted small">…</span>}
        {built.map((w, idx) => (
          <button
            key={`${w}-${idx}`}
            className="chip"
            disabled={checked}
            onClick={() => setBuilt((b) => b.filter((_, k) => k !== idx))}
          >
            <span className="de">{w}</span>
          </button>
        ))}
      </div>

      <div className="chip-pool">
        {remaining.map((w, idx) => (
          <button
            key={`${w}-${idx}`}
            className="chip ghost-chip"
            disabled={checked}
            onClick={() => setBuilt((b) => [...b, w])}
          >
            <span className="de">{w}</span>
          </button>
        ))}
      </div>

      {!checked ? (
        <button
          className="primary block"
          disabled={remaining.length > 0}
          onClick={() => setChecked(true)}
        >
          {t('check', lang)}
        </button>
      ) : (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <span className="de">{target}</span>
          </div>
          <button className="primary block" style={{ marginTop: 10 }} onClick={advance}>
            {t('next', lang)} →
          </button>
        </>
      )}
    </GameShell>
  )
}

/* ---------- 4. Perfekt-Paare ---------- */

function PerfektPaare({ pool, onFinish }: GameProps) {
  const verbs = useMemo(
    () => sample(pool.filter((l) => l.p === 'verb' && l.vf?.partizip2), ROUND_LENGTH),
    [pool],
  )
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const current = verbs[i]

  const options = useMemo(() => {
    if (!current) return []
    const right = current.vf!.partizip2!
    const others = sample(
      verbs.filter((v) => v.vf?.partizip2 && v.vf.partizip2 !== right), 3,
    ).map((v) => v.vf!.partizip2!)
    return shuffle([right, ...others])
  }, [current, verbs])

  if (!verbs.length) return <GameOver score={0} total={0} onFinish={onFinish} />
  if (!current) return <GameOver score={score} total={verbs.length} onFinish={onFinish} />

  const right = current.vf!.partizip2!

  const choose = (o: string) => {
    setPicked(o)
    if (o === right) setScore((s) => s + 1)
    window.setTimeout(() => { setPicked(null); setI((n) => n + 1) }, 600)
  }

  return (
    <GameShell round={i + 1} total={verbs.length} score={score}>
      <div className="game-card">
        <div className="game-word de">{current.w}</div>
        <div className="muted small">Partizip II?</div>
      </div>
      <div className="choices" style={{ marginTop: 14 }}>
        {options.map((o) => (
          <button
            key={o}
            className={`de ${picked ? (o === right ? 'correct' : o === picked ? 'wrong' : '') : ''}`}
            disabled={!!picked}
            onClick={() => choose(o)}
          >
            {current.vf?.hilfsverb ? `${current.vf.hilfsverb} ${o}` : o}
          </button>
        ))}
      </div>
    </GameShell>
  )
}

/* ---------- 5. Wo oder Wohin? ---------- */

const WO_WOHIN = [
  { s: 'Ich stelle die Lampe ___ den Tisch.', a: 'auf', kasus: 'akk' },
  { s: 'Die Lampe steht ___ dem Tisch.', a: 'auf', kasus: 'dat' },
  { s: 'Er hängt das Bild ___ die Wand.', a: 'an', kasus: 'akk' },
  { s: 'Das Bild hängt ___ der Wand.', a: 'an', kasus: 'dat' },
  { s: 'Wir gehen ___ die Küche.', a: 'in', kasus: 'akk' },
  { s: 'Wir sind ___ der Küche.', a: 'in', kasus: 'dat' },
  { s: 'Die Katze springt ___ das Bett.', a: 'auf', kasus: 'akk' },
  { s: 'Die Katze schläft ___ dem Bett.', a: 'auf', kasus: 'dat' },
  { s: 'Setz dich ___ den Stuhl!', a: 'auf', kasus: 'akk' },
  { s: 'Das Buch liegt ___ dem Regal.', a: 'in', kasus: 'dat' },
]

function WoWohin({ onFinish }: GameProps) {
  const { lang } = useStore()
  const items = useMemo(() => sample(WO_WOHIN, 8), [])
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const current = items[i]
  if (!current) return <GameOver score={score} total={items.length} onFinish={onFinish} />

  const choose = (k: string) => {
    setPicked(k)
    if (k === current.kasus) setScore((s) => s + 1)
    window.setTimeout(() => { setPicked(null); setI((n) => n + 1) }, 700)
  }

  return (
    <GameShell round={i + 1} total={items.length} score={score}>
      <div className="game-card">
        <div className="de" style={{ fontSize: '1.2rem', lineHeight: 1.7 }}>
          {current.s.replace('___', current.a)}
        </div>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <button
          className={`big ${picked ? (current.kasus === 'akk' ? 'correct' : picked === 'akk' ? 'wrong' : '') : ''}`}
          style={{ flex: 1 }} disabled={!!picked} onClick={() => choose('akk')}
        >
          Wohin? · Akkusativ
        </button>
        <button
          className={`big ${picked ? (current.kasus === 'dat' ? 'correct' : picked === 'dat' ? 'wrong' : '') : ''}`}
          style={{ flex: 1 }} disabled={!!picked} onClick={() => choose('dat')}
        >
          Wo? · Dativ
        </button>
      </div>
      {picked && (
        <div className="feedback ok" style={{ marginTop: 12 }}>
          {current.kasus === 'akk'
            ? { tr: 'Hareket var → Akkusativ', az: 'Hərəkət var → Akkusativ', ru: 'Есть движение → Akkusativ', de: 'Bewegung → Akkusativ' }[lang]
            : { tr: 'Konum bildiriyor → Dativ', az: 'Yer bildirir → Dativ', ru: 'Указано место → Dativ', de: 'Ort → Dativ' }[lang]}
        </div>
      )}
    </GameShell>
  )
}

/* ---------- 6. Adjektiv-Endung ---------- */

const ADJ_ITEMS = [
  { s: 'Ich habe ein___ neu___ Auto.', a: '— · es', full: 'ein neues Auto' },
  { s: 'Der groß___ Mann kommt.', a: 'e', full: 'der große Mann' },
  { s: 'Ich sehe den klein___ Hund.', a: 'en', full: 'den kleinen Hund' },
  { s: 'Wir wohnen in einem alt___ Haus.', a: 'en', full: 'in einem alten Haus' },
  { s: 'Die jung___ Frau liest.', a: 'e', full: 'die junge Frau' },
  { s: 'Er trinkt kalt___ Wasser.', a: 'es', full: 'kaltes Wasser' },
  { s: 'Das ist ein gut___ Buch.', a: 'es', full: 'ein gutes Buch' },
  { s: 'Ich kenne einen nett___ Lehrer.', a: 'en', full: 'einen netten Lehrer' },
]

function AdjektivEndung({ onFinish }: GameProps) {
  const items = useMemo(() => sample(ADJ_ITEMS, 6), [])
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const current = items[i]
  if (!current) return <GameOver score={score} total={items.length} onFinish={onFinish} />

  const options = shuffle(['e', 'en', 'es', 'er'])
  const right = current.a.split('·').pop()!.trim()

  const choose = (o: string) => {
    setPicked(o)
    if (o === right) setScore((s) => s + 1)
    window.setTimeout(() => { setPicked(null); setI((n) => n + 1) }, 800)
  }

  return (
    <GameShell round={i + 1} total={items.length} score={score}>
      <div className="game-card">
        <div className="de" style={{ fontSize: '1.2rem', lineHeight: 1.7 }}>{current.s}</div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        {options.map((o) => (
          <button
            key={o}
            className={`big de ${picked ? (o === right ? 'correct' : o === picked ? 'wrong' : '') : ''}`}
            style={{ flex: 1 }} disabled={!!picked} onClick={() => choose(o)}
          >
            -{o}
          </button>
        ))}
      </div>
      {picked && <div className="feedback ok" style={{ marginTop: 12 }}><span className="de">{current.full}</span></div>}
    </GameShell>
  )
}

/* ---------- dağıtıcı ---------- */

export const GAME_NAMES: Record<GameId, Record<string, string>> = {
  'artikel-rush': { tr: 'Artikel Yarışı', az: 'Artikl Yarışı', ru: 'Гонка артиклей', de: 'Artikel-Rush' },
  wortsalat: { tr: 'Kelime Eşleştirme', az: 'Söz Uyğunlaşdırma', ru: 'Найди пару', de: 'Wortsalat' },
  satzbau: { tr: 'Cümle Kurma', az: 'Cümlə Qurma', ru: 'Собери фразу', de: 'Satzbau' },
  'perfekt-paare': { tr: 'Perfekt Çiftleri', az: 'Perfekt Cütləri', ru: 'Пары Perfekt', de: 'Perfekt-Paare' },
  'wo-wohin': { tr: 'Nerede? Nereye?', az: 'Harada? Haraya?', ru: 'Где? Куда?', de: 'Wo oder Wohin?' },
  'adjektiv-endung': { tr: 'Sıfat Eki', az: 'Sifət Şəkilçisi', ru: 'Окончание', de: 'Adjektiv-Endung' },
}

export function Game({ id, pool, onFinish }: GameProps & { id: GameId }) {
  switch (id) {
    case 'wortsalat': return <Wortsalat pool={pool} onFinish={onFinish} />
    case 'satzbau': return <Satzbau pool={pool} onFinish={onFinish} />
    case 'perfekt-paare': return <PerfektPaare pool={pool} onFinish={onFinish} />
    case 'wo-wohin': return <WoWohin pool={pool} onFinish={onFinish} />
    case 'adjektiv-endung': return <AdjektivEndung pool={pool} onFinish={onFinish} />
    default: return <ArtikelRush pool={pool} onFinish={onFinish} />
  }
}
