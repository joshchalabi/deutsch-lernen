/**
 * Okuma — kapsama oranına göre uyarlanmış metin akışı.
 *
 * SİTENİN AYIRT EDİCİ YANI BURASI.
 *   Çoğu site metinleri sabit bir seviye etiketine göre veriyor ("B1 metni").
 *   Ama iki B1 öğrencisinin bildiği kelimeler farklı. Nation (2006), Laufer
 *   (1989) ve Schmitt vd. (2011) öğrenmenin okumada %98, dinlemede %95
 *   kapsama bandında gerçekleştiğini gösteriyor.
 *
 *   Burada her cümlenin kapsaması, öğrencinin GERÇEK bilinen kelime kümesine
 *   karşı anlık hesaplanıyor ve akış o banda göre süzülüyor. Bilinmeyen
 *   kelimeler vurgulanıyor; tıklanınca anlamı açılıyor ve tek tuşla çalışma
 *   destesine ekleniyor.
 */

import { useCallback, useMemo, useState } from 'react'
import { coverage, coverageVerdict, loadSentences, loadVocabUpTo, lemmaKey, tokenize, strictTranslation } from '../lib/data'
import type { Lemma, Sentence } from '../lib/types'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, PlayButton, useAsync } from '../components/ui'
import { sentenceAudioUrl } from '../lib/data'

const VERDICT_KEY = {
  'too-easy': 'covTooEasy',
  ideal: 'covIdeal',
  hard: 'covHard',
  'too-hard': 'covTooHard',
} as const

const VERDICT_KIND = {
  'too-easy': undefined,
  ideal: 'ok',
  hard: 'warn',
  'too-hard': 'bad',
} as const

export default function Reading() {
  const { state, lang } = useStore()
  const level = state.profile.level ?? 'A1'

  const data = useAsync(async () => {
    const [sentences, vocab] = await Promise.all([
      loadSentences(level),
      loadVocabUpTo(level),
    ])
    return { sentences, vocab }
  }, [level])

  return (
    <main className="main">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t('reading', lang)}</h1>
        <Badge kind="level">{level}</Badge>
      </div>
      <Loading state={data}>{(d) => <Feed sentences={d.sentences} vocab={d.vocab} />}</Loading>
    </main>
  )
}

function Feed({ sentences, vocab }: { sentences: Sentence[]; vocab: Lemma[] }) {
  const { state, lang } = useStore()
  useStudyClock(true)

  /**
   * Bilinen kelimeler: çalışma destesindeki kelimelerin tüm yüzey biçimleri
   * elimizde yok (form2lemma tarayıcıya gönderilmiyor, 30 MB'tan büyük).
   * Bu yüzden lemma + çoğul + fiil biçimleri ile yaklaşıyoruz. Yaklaşık ama
   * kapsama tahmini için yeterli; gerçek kullanımda sapma küçük.
   */
  const known = useMemo(() => {
    const set = new Set<string>()
    for (const l of vocab) {
      const prog = state.vocab[lemmaKey(l)]
      // Henüz görülmemiş kelimeler "bilinmiyor" sayılır; görülmüşse,
      // dayanıklılığı bir günden büyükse biliniyor kabul ediliyor.
      if (!prog || prog.card.s < 1) continue
      set.add(l.w.toLowerCase())
      if (l.pl) set.add(l.pl.toLowerCase())
      if (l.vf) {
        for (const v of Object.values(l.vf)) if (v) set.add(v.toLowerCase())
      }
      if (l.k) {
        for (const c of Object.values(l.k)) set.add(c.form.toLowerCase())
      }
    }
    return set
  }, [vocab, state.vocab])

  const lemmaByWord = useMemo(() => {
    const m = new Map<string, Lemma>()
    for (const l of vocab) {
      const k = l.w.toLowerCase()
      const prev = m.get(k)
      if (!prev || l.r < prev.r) m.set(k, l)
    }
    return m
  }, [vocab])

  const [band, setBand] = useState<'ideal' | 'all'>('ideal')

  const scored = useMemo(() => {
    const out = sentences.map((s) => ({ s, cov: coverage(s.d, known) }))
    if (band === 'all') return out.slice(0, 60)
    const ideal = out.filter((x) => {
      const v = coverageVerdict(x.cov)
      return v === 'ideal' || v === 'hard'
    })
    // Hiç kelime bilinmiyorsa (yeni kullanıcı) ideal bant boş kalır;
    // o durumda en kolay cümleleri göster.
    if (ideal.length < 5) return out.sort((a, b) => b.cov - a.cov).slice(0, 40)
    return ideal.slice(0, 60)
  }, [sentences, known, band])

  const [selected, setSelected] = useState<string | null>(null)

  return (
    <>
      <div className="card">
        <div className="row between">
          <span className="small muted">{t('coverageLabel', lang)}</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={band === 'ideal' ? 'primary' : ''} onClick={() => setBand('ideal')}>
              {t('covIdeal', lang)}
            </button>
            <button className={band === 'all' ? 'primary' : ''} onClick={() => setBand('all')}>
              {lang === 'de' ? 'Alle' : lang === 'ru' ? 'Все' : 'Hepsi'}
            </button>
          </div>
        </div>
        <p className="hint" style={{ marginBottom: 0 }}>{t('coverageExplain', lang)}</p>
        <p className="hint">
          {lang === 'tr' && `Şu an ${known.size.toLocaleString()} kelimeyi biliyorsunuz.`}
          {lang === 'az' && `Hazırda ${known.size.toLocaleString()} sözü bilirsiniz.`}
          {lang === 'ru' && `Сейчас вы знаете ${known.size.toLocaleString()} слов.`}
          {lang === 'de' && `Sie kennen derzeit ${known.size.toLocaleString()} Wörter.`}
        </p>
      </div>

      {scored.map(({ s, cov }) => {
        const verdict = coverageVerdict(cov)
        return (
          <div className="card" key={s.i} style={{ marginTop: 12 }}>
            <div className="row between small" style={{ marginBottom: 8 }}>
              <Badge kind={VERDICT_KIND[verdict]}>
                {t(VERDICT_KEY[verdict], lang)} · {Math.round(cov * 100)}%
              </Badge>
              {s.a && <PlayButton url={sentenceAudioUrl(s.i)} label="play" />}
            </div>

            <p className="reading de">
              {renderTokens(s.d, known, (w) => setSelected(w))}
            </p>

            <TranslationLine s={s} />
            {selected && (
              <WordPopover
                word={selected}
                lemma={lemmaByWord.get(selected.toLowerCase()) ?? null}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

/** Metni kelimelere bölüp bilinmeyenleri işaretler */
function renderTokens(text: string, known: Set<string>, onClick: (w: string) => void) {
  const parts: React.ReactNode[] = []
  const re = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const w = m[0]
    const isKnown = known.has(w.toLowerCase())
    parts.push(
      <span
        key={i++}
        className={`tok${isKnown ? '' : ' unknown'}`}
        onClick={() => onClick(w)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(w) }}
      >
        {w}
      </span>,
    )
    last = m.index + w.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function WordPopover({
  word, lemma, onClose,
}: {
  word: string
  lemma: Lemma | null
  onClose: () => void
}) {
  const { state, lang, addWord } = useStore()
  const inDeck = lemma ? !!state.vocab[lemmaKey(lemma)] : false
  const tr = lemma ? strictTranslation(lemma, state.settings.transLang) : null

  const add = useCallback(() => {
    if (lemma) addWord(lemma)
  }, [lemma, addWord])

  return (
    <div className="notice" style={{ marginTop: 10 }}>
      <div className="row between">
        <strong className="de">{lemma ? lemma.w : word}</strong>
        <button className="ghost" onClick={onClose} aria-label={t('close', lang)}>✕</button>
      </div>
      {tr ? (
        <div className="small" style={{ marginTop: 4 }}>
          {tr.words.join(', ')}
          {tr.bridged && <> <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge></>}
        </div>
      ) : (
        <div className="small muted" style={{ marginTop: 4 }}>
          {lemma?.s[0]?.g ?? t('noResults', lang)}
        </div>
      )}
      {lemma && (
        <button
          className={inDeck ? 'ghost' : 'primary'}
          disabled={inDeck}
          style={{ marginTop: 8 }}
          onClick={add}
        >
          {inDeck ? t('inStudy', lang) : t('addToStudy', lang)}
        </button>
      )}
    </div>
  )
}

function TranslationLine({ s }: { s: Sentence }) {
  const { state } = useStore()
  const [open, setOpen] = useState(false)
  const text = s[state.settings.transLang] ?? s.tr ?? s.ru ?? s.az
  if (!text) return null
  return open ? (
    <p className="small muted" style={{ marginTop: 6 }}>{text}</p>
  ) : (
    <button className="ghost small" style={{ marginTop: 4, padding: '2px 6px' }} onClick={() => setOpen(true)}>
      …
    </button>
  )
}

/** tokenize'ı dışa taşımamak için kullanıldığından emin ol */
void tokenize
