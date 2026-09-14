/**
 * Dinleme — dikte (Diktat) ve gölgeleme (Shadowing).
 *
 * DİKTE
 *   Duyduğunu yazmak, dinlemeyi sesbirim düzeyinde ölçen az sayıda
 *   alıştırmadan biri. "Anladım" hissi ile gerçek ayırt etme arasındaki
 *   farkı acımasızca gösteriyor: çoktan seçmeli dinleme sorularında
 *   tahminle gizlenen boşluklar burada ortaya çıkıyor.
 *   Cevap kelime kelime karşılaştırılıp hangi kelimenin kaçırıldığı
 *   gösteriliyor — sadece puan vermek geri bildirim değildir.
 *
 * GÖLGELEME (Shadowing)
 *   Kaydı dinlerken eş zamanlı sesli tekrar. Sistematik derlemeler
 *   (Hamada & Suzuki 2024 dahil) fonemik ayırt etme, kelime tanıma,
 *   akıcılık ve prozodide ölçülebilir kazanım gösteriyor. Hız denetimi
 *   bu yüzden var: başlangıçta 0.75x, alışınca 1.0x.
 *
 * SES KAYNAĞI
 *   Tatoeba'nın gönüllü anadil konuşurları. Ses dosyaları repoda değil,
 *   audio.tatoeba.org'dan akıtılıyor (16 bin dosya ~180 MB tutardı).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadSentences, sentenceAudioUrl, shuffle, tokenize } from '../lib/data'
import type { Level, Sentence } from '../lib/types'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, useAsync, useAudio } from '../components/ui'

type Mode = 'dictation' | 'shadowing'

export default function Listening() {
  const { state, lang } = useStore()
  const level = state.profile.level ?? 'A1'
  const [mode, setMode] = useState<Mode>('dictation')

  const sentences = useAsync(async () => {
    const all = await loadSentences(level)
    // Yalnızca ses kaydı olanlar: dinleme alıştırması sessiz cümleyle olmaz
    return shuffle(all.filter((s) => s.a))
  }, [level])

  return (
    <main className="main">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t('listening', lang)}</h1>
        <Badge kind="level">{level}</Badge>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <button className={mode === 'dictation' ? 'primary' : ''} onClick={() => setMode('dictation')}>
          {t('dictation', lang)}
        </button>
        <button className={mode === 'shadowing' ? 'primary' : ''} onClick={() => setMode('shadowing')}>
          {t('shadowing', lang)}
        </button>
      </div>

      <Loading state={sentences}>
        {(list) =>
          list.length === 0 ? (
            <div className="card muted center">—</div>
          ) : mode === 'dictation' ? (
            <Dictation list={list} level={level} />
          ) : (
            <Shadowing list={list} />
          )
        }
      </Loading>
    </main>
  )
}

/* ---------- ses denetimi ---------- */

function AudioControls({
  sentenceId, rate, setRate, autoPlay,
}: {
  sentenceId: string
  rate: number
  setRate: (r: number) => void
  autoPlay?: boolean
}) {
  const { lang } = useStore()
  const { play, playing, failed, blocked } = useAudio()
  const url = sentenceAudioUrl(sentenceId)

  useEffect(() => {
    if (autoPlay) play(url, rate)
    // yalnızca cümle değiştiğinde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentenceId])

  return (
    <>
      <div className="row" style={{ gap: 8 }}>
        <button className="primary big" onClick={() => play(url, rate)}>
          {playing ? '❚❚' : '▶'} {t('play', lang)}
        </button>
        {([0.6, 0.75, 1] as const).map((r) => (
          <button key={r} className={rate === r ? 'primary' : ''} onClick={() => { setRate(r); play(url, r) }}>
            {r === 1 ? t('normalSpeed', lang) : `${r}×`}
          </button>
        ))}
      </div>
      {blocked && (
        <p className="hint">
          {lang === 'tr' && 'Tarayıcı otomatik oynatmayı engelledi — Oynat düğmesine basın.'}
          {lang === 'az' && 'Brauzer avtomatik oynatmanı bloklayıb — Oynat düyməsinə basın.'}
          {lang === 'ru' && 'Браузер заблокировал автовоспроизведение — нажмите «Воспроизвести».'}
          {lang === 'de' && 'Der Browser hat die automatische Wiedergabe blockiert — bitte auf Abspielen klicken.'}
        </p>
      )}
      {failed && (
        <p className="hint" style={{ color: 'var(--bad)' }}>
          {lang === 'tr' && 'Ses yüklenemedi — internet bağlantınızı kontrol edin.'}
          {lang === 'az' && 'Səs yüklənmədi — internet bağlantınızı yoxlayın.'}
          {lang === 'ru' && 'Не удалось загрузить аудио — проверьте соединение.'}
          {lang === 'de' && 'Audio konnte nicht geladen werden — Verbindung prüfen.'}
        </p>
      )}
    </>
  )
}

/* ---------- dikte ---------- */

interface DiffToken {
  text: string
  kind: 'hit' | 'miss' | 'add'
}

/**
 * Kelime düzeyinde karşılaştırma (LCS tabanlı).
 * Amaç puan değil, HANGİ kelimenin kaçırıldığını göstermek.
 */
function diffWords(expected: string[], actual: string[]): DiffToken[] {
  const n = expected.length
  const m = actual.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = eq(expected[i], actual[j])
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const out: DiffToken[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (eq(expected[i], actual[j])) {
      out.push({ text: expected[i], kind: 'hit' })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ text: expected[i], kind: 'miss' })
      i++
    } else {
      out.push({ text: actual[j], kind: 'add' })
      j++
    }
  }
  while (i < n) out.push({ text: expected[i++], kind: 'miss' })
  while (j < m) out.push({ text: actual[j++], kind: 'add' })
  return out
}

function Dictation({ list, level }: { list: Sentence[]; level: Level }) {
  const { state, lang, markDictation } = useStore()
  useStudyClock(true)

  // Daha önce yapılanları sona at: aynı cümleyi tekrar tekrar görmek sıkıcı
  const ordered = useMemo(() => {
    const done = new Set(state.dictationDone)
    return [...list].sort((a, b) => Number(done.has(a.i)) - Number(done.has(b.i)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list])

  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [rate, setRate] = useState(state.settings.playbackRate)

  const s = ordered[idx % ordered.length]

  const result = useMemo(() => {
    if (!checked) return null
    const expected = tokenize(s.d)
    const actual = tokenize(value)
    const tokens = diffWords(expected, actual)
    const hits = tokens.filter((t) => t.kind === 'hit').length
    return { tokens, accuracy: expected.length ? hits / expected.length : 0 }
  }, [checked, s, value])

  const next = useCallback(() => {
    markDictation(s.i)
    setIdx((i) => i + 1)
    setValue('')
    setChecked(false)
  }, [s.i, markDictation])

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>{t('dictationHint', lang)}</p>

      <AudioControls sentenceId={s.i} rate={rate} setRate={setRate} autoPlay />

      <div style={{ marginTop: 16 }}>
        <textarea
          rows={3}
          lang="de"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          disabled={checked}
          placeholder="…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault()
              setChecked(true)
            }
          }}
        />
      </div>

      {!checked ? (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={!value.trim()} onClick={() => setChecked(true)}>
            {t('check', lang)}
          </button>
          <button className="ghost" onClick={() => setChecked(true)}>{t('showAnswer', lang)}</button>
        </div>
      ) : (
        <>
          <div className="row between" style={{ marginTop: 14, marginBottom: 8 }}>
            <strong>{Math.round((result?.accuracy ?? 0) * 100)}%</strong>
            <Badge kind={level ? 'level' : undefined}>{level}</Badge>
          </div>
          <div className="diff de">
            {result?.tokens.map((tok, i) => (
              <span key={i} className={tok.kind}>{tok.text}{' '}</span>
            ))}
          </div>
          <p className="de" style={{ marginTop: 12, fontSize: '1.05rem' }}>{s.d}</p>
          <Translation s={s} />
          <button className="primary block" style={{ marginTop: 12 }} onClick={next}>
            {t('next', lang)} →
          </button>
        </>
      )}
    </div>
  )
}

/* ---------- gölgeleme ---------- */

function Shadowing({ list }: { list: Sentence[] }) {
  const { state, lang } = useStore()
  useStudyClock(true)

  const [idx, setIdx] = useState(0)
  const [rate, setRate] = useState(0.75)
  const [showText, setShowText] = useState(false)
  const s = list[idx % list.length]

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>{t('shadowingHint', lang)}</p>

      <AudioControls sentenceId={s.i} rate={rate} setRate={setRate} />

      <div style={{ marginTop: 18, minHeight: 60 }}>
        {showText ? (
          <p className="de" style={{ fontSize: '1.2rem' }}>{s.d}</p>
        ) : (
          <p className="muted center" style={{ padding: '14px 0' }}>· · ·</p>
        )}
      </div>

      <div className="row">
        <button onClick={() => setShowText((v) => !v)}>
          {showText ? t('close', lang) : t('showAnswer', lang)}
        </button>
        <span className="spacer" />
        <button className="primary" onClick={() => { setIdx((i) => i + 1); setShowText(false) }}>
          {t('next', lang)} →
        </button>
      </div>

      {showText && <Translation s={s} />}
      {state.settings.playbackRate !== rate && null}
    </div>
  )
}

function Translation({ s }: { s: Sentence }) {
  const { state } = useStore()
  const preferred = state.settings.transLang
  const text = s[preferred] ?? s.tr ?? s.ru ?? s.az
  if (!text) return null
  return <p className="small muted" style={{ marginTop: 8 }}>{text}</p>
}
