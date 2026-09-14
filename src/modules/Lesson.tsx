/**
 * Ders oynatıcısı — bir üniteyi baştan sona yürüten sabit sıra.
 *
 * NEDEN SABİT SIRA?
 *   Serbest modüller (kelime çalış, dinle, oku) kendi başlarına iyi ama
 *   "bugün ne yapacağım?" sorusunu öğrenciye bırakıyor. Yeni başlayan biri
 *   için bu en kötü soru. Ders burada kitap gibi ilerliyor:
 *
 *     hedefler → kelime → dilbilgisi → alıştırma → dinleme → yazma → oyun
 *
 *   Bu sıra keyfî değil: önce anlam (kelime), sonra kural (dilbilgisi), sonra
 *   kuralın üretimde denenmesi (alıştırma), sonra aynı malzemenin sesle
 *   pekiştirilmesi (dinleme), sonra serbest üretim (yazma) ve kapanışta
 *   hız altında otomatikleşme (oyun).
 */

import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  displayForm, findUnit, glossOrTranslation, lemmaKey, loadCurriculum,
  loadSentences, loadUnitLemmas, sample, sentenceAudioUrl, shuffle, tokenize, wordAudioUrl,
} from '../lib/data'
import {
  LESSON_STEPS, type Lemma, type LessonStep, type Level,
  type Sentence, type Unit, type GrammarTopic,
} from '../lib/types'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, PlayButton, useAsync, useAudio } from '../components/ui'
import { Exercise, pickKind } from '../components/exercises'
import { Game, GAME_NAMES } from './Games'


const STEP_ICON: Record<LessonStep, string> = {
  intro: '🎯', vocab: '📖', grammar: '📐', drill: '✍️',
  listening: '🎧', writing: '📝', game: '🎮', done: '🏁',
}

const STEP_LABEL: Record<LessonStep, Record<string, string>> = {
  intro: { tr: 'Hedefler', az: 'Hədəflər', ru: 'Цели', de: 'Ziele' },
  vocab: { tr: 'Kelimeler', az: 'Sözlər', ru: 'Слова', de: 'Wortschatz' },
  grammar: { tr: 'Dilbilgisi', az: 'Qrammatika', ru: 'Грамматика', de: 'Grammatik' },
  drill: { tr: 'Alıştırma', az: 'Məşq', ru: 'Упражнение', de: 'Übung' },
  listening: { tr: 'Dinleme', az: 'Dinləmə', ru: 'Аудирование', de: 'Hören' },
  writing: { tr: 'Yazma', az: 'Yazma', ru: 'Письмо', de: 'Schreiben' },
  game: { tr: 'Oyun', az: 'Oyun', ru: 'Игра', de: 'Spiel' },
  done: { tr: 'Bitti', az: 'Bitdi', ru: 'Готово', de: 'Fertig' },
}

/* ---------- metin biçimlendirme ---------- */

/**
 * Açıklama metinlerini çizer. Tam markdown değil, yalnızca müfredatta
 * kullanılan üç şey: **kalın**, madde işaretli satırlar ve | ile tablo.
 * Küçük ve öngörülebilir tutmak, bir markdown kütüphanesi eklemekten iyi.
 */
function RichText({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.split('\n')
    const out: { kind: 'p' | 'table'; lines: string[] }[] = []
    for (const line of lines) {
      const isRow = line.trim().startsWith('|')
      const last = out[out.length - 1]
      if (isRow) {
        if (last?.kind === 'table') last.lines.push(line)
        else out.push({ kind: 'table', lines: [line] })
      } else {
        if (last?.kind === 'p') last.lines.push(line)
        else out.push({ kind: 'p', lines: [line] })
      }
    }
    return out
  }, [text])

  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'table' ? <MiniTable key={i} lines={b.lines} /> : (
          <p key={i} className="explain">
            {b.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                <Bold text={line} />
              </span>
            ))}
          </p>
        ),
      )}
    </>
  )
}

function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="hl">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>,
      )}
    </>
  )
}

function MiniTable({ lines }: { lines: string[] }) {
  const rows = lines
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((r) => !r.every((c) => /^-*$/.test(c)))
  if (!rows.length) return null
  const [head, ...body] = rows
  return (
    <table className="infl" style={{ margin: '10px 0' }}>
      <thead><tr>{head.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j} className="de">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
}

/* ---------- ana bileşen ---------- */

export default function Lesson() {
  const { unitId } = useParams<{ unitId: string }>()
  const data = useAsync(async () => {
    const cur = await loadCurriculum()
    const found = unitId ? findUnit(cur, unitId) : null
    if (!found) throw new Error('Ünite bulunamadı')
    const [lemmas, sentences] = await Promise.all([
      loadUnitLemmas(found.unit),
      loadSentences(found.level),
    ])
    return { ...found, lemmas, sentences }
  }, [unitId])

  return (
    <main className="main">
      <Loading state={data}>
        {(d) => <Player unit={d.unit} level={d.level} lemmas={d.lemmas} sentences={d.sentences} />}
      </Loading>
    </main>
  )
}

function Player({
  unit, level, lemmas, sentences,
}: {
  unit: Unit
  level: Level
  lemmas: Lemma[]
  sentences: Sentence[]
}) {
  const { state, lang, completeStep } = useStore()
  useStudyClock(true)
  const navigate = useNavigate()

  const doneSteps = state.units[unit.id]?.steps ?? []
  const [step, setStep] = useState<LessonStep>(() => {
    const next = LESSON_STEPS.find((s) => !doneSteps.includes(s))
    return next ?? 'intro'
  })

  const finish = useCallback(
    (s: LessonStep) => {
      completeStep(unit.id, s, LESSON_STEPS.length)
      const idx = LESSON_STEPS.indexOf(s)
      setStep(LESSON_STEPS[Math.min(idx + 1, LESSON_STEPS.length - 1)])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [completeStep, unit.id],
  )

  return (
    <>
      <div className="lesson-head">
        <Link to="/course" className="ghost-link">← {t('course', lang)}</Link>
        <div className="row between" style={{ marginTop: 6 }}>
          <h1 style={{ margin: 0 }}>{unit.title[lang]}</h1>
          <Badge kind="level">{level}</Badge>
        </div>
        <p className="muted small" style={{ margin: '4px 0 0' }}>{unit.theme[lang]}</p>
      </div>

      <nav className="steps" aria-label="Lektionsschritte">
        {LESSON_STEPS.map((s) => {
          const isDone = doneSteps.includes(s)
          return (
            <button
              key={s}
              className={`step ${s === step ? 'active' : ''} ${isDone ? 'done' : ''}`}
              onClick={() => setStep(s)}
              title={STEP_LABEL[s][lang]}
            >
              <span className="ico" aria-hidden="true">{isDone && s !== step ? '✓' : STEP_ICON[s]}</span>
              <span className="lbl">{STEP_LABEL[s][lang]}</span>
            </button>
          )
        })}
      </nav>

      {step === 'intro' && <IntroStep unit={unit} onNext={() => finish('intro')} />}
      {step === 'vocab' && <VocabStep lemmas={lemmas} onNext={() => finish('vocab')} />}
      {step === 'grammar' && <GrammarStep unit={unit} onNext={() => finish('grammar')} />}
      {step === 'drill' && <DrillStep unit={unit} lemmas={lemmas} onNext={() => finish('drill')} />}
      {step === 'listening' && (
        <ListeningStep sentences={sentences} onNext={() => finish('listening')} />
      )}
      {step === 'writing' && <WritingStep unit={unit} onNext={() => finish('writing')} />}
      {step === 'game' && <GameStep unit={unit} lemmas={lemmas} onNext={() => finish('game')} />}
      {step === 'done' && <DoneStep unit={unit} onExit={() => navigate('/course')} />}
    </>
  )
}

/* ---------- 1. Hedefler ---------- */

function IntroStep({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { lang } = useStore()
  return (
    <div className="card">
      <h2>🎯 {STEP_LABEL.intro[lang]}</h2>
      <p className="muted small">
        {{ tr: 'Bu ünitenin sonunda şunları yapabileceksiniz:',
           az: 'Bu bölmənin sonunda bunları edə biləcəksiniz:',
           ru: 'К концу этого урока вы сможете:',
           de: 'Am Ende dieser Einheit können Sie:' }[lang]}
      </p>
      <ul className="cando">
        {unit.canDo.map((c, i) => <li key={i}>{c[lang]}</li>)}
      </ul>
      <div className="row small muted" style={{ marginTop: 14, gap: 14 }}>
        <span>📖 {unit.words.length}</span>
        <span>📐 {unit.grammar.length}</span>
        <span>📝 {unit.writing.length}</span>
        <span>🎮 {GAME_NAMES[unit.game]?.[lang]}</span>
      </div>
      <button className="primary big block" style={{ marginTop: 16 }} onClick={onNext}>
        {t('start', lang)} →
      </button>
    </div>
  )
}

/* ---------- 2. Kelimeler ---------- */

function VocabStep({ lemmas, onNext }: { lemmas: Lemma[]; onNext: () => void }) {
  const { state, lang, addWord } = useStore()
  const tl = state.settings.transLang
  const [phase, setPhase] = useState<'browse' | 'drill'>('browse')
  const [i, setI] = useState(0)

  const addAll = useCallback(() => {
    for (const l of lemmas) addWord(l)
    setPhase('drill')
  }, [lemmas, addWord])

  if (phase === 'browse') {
    return (
      <div className="card">
        <h2>📖 {STEP_LABEL.vocab[lang]} · {lemmas.length}</h2>
        <p className="muted small">
          {{ tr: 'Önce hepsine bir göz atın, sesleri dinleyin. Sonra alıştırmaya geçeceğiz.',
             az: 'Əvvəlcə hamısına baxın, səsləri dinləyin. Sonra məşqə keçəcəyik.',
             ru: 'Сначала просмотрите все слова и послушайте произношение. Потом перейдём к упражнению.',
             de: 'Sehen Sie sich zuerst alle Wörter an und hören Sie die Aussprache.' }[lang]}
        </p>
        <div className="word-grid">
          {lemmas.map((l) => {
            const g = glossOrTranslation(l, tl)
            return (
              <div className="word-chip" key={lemmaKey(l)}>
                <div className="row between">
                  <span className="de lemma">{displayForm(l)}</span>
                  <PlayButton url={wordAudioUrl(l)} text={l.w} label="play" />
                </div>
                <div className={`small ${g.isGerman ? 'de muted' : 'muted'}`}>{g.text}</div>
                {l.pl && <div className="tiny muted">Pl. {l.pl}</div>}
              </div>
            )
          })}
        </div>
        <button className="primary big block" style={{ marginTop: 16 }} onClick={addAll}>
          {{ tr: 'Alıştırmaya geç', az: 'Məşqə keç', ru: 'К упражнению', de: 'Zur Übung' }[lang]} →
        </button>
      </div>
    )
  }

  const current = lemmas[i]
  if (!current) {
    return (
      <div className="card center">
        <div className="big-emoji">✅</div>
        <button className="primary big" onClick={onNext}>{t('next', lang)} →</button>
      </div>
    )
  }

  return (
    <>
      <div className="bar" style={{ marginBottom: 14 }}>
        <i style={{ width: `${(i / lemmas.length) * 100}%` }} />
      </div>
      <Exercise
        key={lemmaKey(current)}
        kind="recognize"
        lemma={current}
        pool={lemmas}
        isNew
        onAnswer={() => setI((n) => n + 1)}
      />
    </>
  )
}

/* ---------- 3. Dilbilgisi ---------- */

function GrammarStep({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { lang } = useStore()
  return (
    <>
      {unit.grammar.map((g) => <GrammarCard key={g.id} topic={g} />)}
      <button className="primary big block" style={{ marginTop: 14 }} onClick={onNext}>
        {{ tr: 'Anladım, alıştırmaya geç', az: 'Başa düşdüm, məşqə keç',
           ru: 'Понятно, к упражнению', de: 'Verstanden, zur Übung' }[lang]} →
      </button>
    </>
  )
}

function GrammarCard({ topic }: { topic: GrammarTopic }) {
  const { lang } = useStore()
  return (
    <div className="card grammar">
      <h2>📐 {topic.title[lang]}</h2>
      <RichText text={topic.explain[lang]} />

      {topic.table && (
        <table className="infl paradigm">
          <thead>
            <tr>{topic.table.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {topic.table.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className={j === 0 ? 'muted' : 'de'}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="examples">
        {topic.examples.map((ex, i) => (
          <div className="example" key={i}>
            <div className="de">{ex.de}</div>
            <div className="small muted">{ex[lang === 'de' ? 'tr' : lang]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 4. Dilbilgisi alıştırması ---------- */

interface Drill {
  question: string
  hint: string
  answer: string
  options?: string[]
}

/**
 * Alıştırmaları AÇIKLAMANIN KENDİSİNDEN üretir: çekim tablosundaki hücreler
 * ve örnek cümlelerdeki o hücrelerle eşleşen kelimeler. Böylece alıştırma
 * her zaman az önce okunan kuralı ölçüyor, rastgele bir soru havuzunu değil.
 */
function buildDrills(unit: Unit): Drill[] {
  const drills: Drill[] = []

  for (const topic of unit.grammar) {
    const table = topic.table
    if (table) {
      const cells: { row: string; col: string; val: string }[] = []
      for (const row of table.rows) {
        for (let j = 1; j < row.length; j++) {
          const val = row[j]?.trim()
          const col = table.headers[j]?.trim()
          // Tek kelimelik, anlamlı hücreler soru olabilir
          if (val && col && val.length < 24 && !val.includes('—')) {
            cells.push({ row: row[0], col, val })
          }
        }
      }
      for (const c of sample(cells, 4)) {
        const others = cells.filter((x) => x.val !== c.val).map((x) => x.val)
        drills.push({
          question: `${c.col} · ${c.row}`,
          hint: topic.title.de,
          answer: c.val,
          options: shuffle([c.val, ...sample([...new Set(others)], 3)]),
        })
      }
    }

    // Örnek cümlelerden boşluk doldurma: tablodaki bir biçim cümlede geçiyorsa
    const forms = new Set(
      (table?.rows ?? []).flatMap((r) => r.slice(1)).map((v) => v.trim()).filter(Boolean),
    )
    for (const ex of topic.examples.slice(0, 3)) {
      const words = tokenize(ex.de)
      const target = words.find((w) => forms.has(w))
      if (!target) continue
      drills.push({
        question: ex.de.replace(new RegExp(`\\b${target}\\b`), '_____'),
        hint: ex.tr,
        answer: target,
      })
    }
  }

  return shuffle(drills).slice(0, 10)
}

function DrillStep({
  unit, lemmas, onNext,
}: {
  unit: Unit
  lemmas: Lemma[]
  onNext: () => void
}) {
  const { state, lang, rate } = useStore()
  const drills = useMemo(() => buildDrills(unit), [unit])

  // Dilbilgisi alıştırması üretilemediyse (tablosuz ünite) kelime
  // alıştırmasına düş — boş ekran göstermekten iyi.
  const fallback = useMemo(
    () => sample(lemmas.filter((l) => state.vocab[lemmaKey(l)]), 8),
    [lemmas, state.vocab],
  )

  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState(0)

  if (!drills.length) {
    const current = fallback[i]
    if (!current) {
      return (
        <div className="card center">
          <div className="big-emoji">✅</div>
          <button className="primary big" onClick={onNext}>{t('next', lang)} →</button>
        </div>
      )
    }
    const prog = state.vocab[lemmaKey(current)]
    return (
      <Exercise
        key={lemmaKey(current)}
        kind={pickKind(current, prog?.hist ?? [], prog?.card.reps ?? 0)}
        lemma={current}
        pool={lemmas}
        onAnswer={(correct, r) => { rate(current, r, correct); setI((n) => n + 1) }}
      />
    )
  }

  const d = drills[i]
  if (!d) {
    return (
      <div className="card center">
        <div className="big-emoji">{score >= drills.length * 0.7 ? '🎉' : '💪'}</div>
        <div className="score-big mono">{score} / {drills.length}</div>
        <button className="primary big" style={{ marginTop: 14 }} onClick={onNext}>
          {t('next', lang)} →
        </button>
      </div>
    )
  }

  const correct = value.trim().toLowerCase() === d.answer.toLowerCase()
  const advance = () => {
    if (correct) setScore((s) => s + 1)
    setValue(''); setChecked(false); setI((n) => n + 1)
  }

  return (
    <>
      <div className="bar" style={{ marginBottom: 14 }}>
        <i style={{ width: `${(i / drills.length) * 100}%` }} />
      </div>
      <div className="card">
        <div className="muted small" style={{ marginBottom: 8 }}>{d.hint}</div>
        <p className="de" style={{ fontSize: '1.2rem', lineHeight: 1.7 }}>{d.question}</p>

        {d.options ? (
          <div className="choices">
            {d.options.map((o) => (
              <button
                key={o}
                className={`de ${checked ? (o === d.answer ? 'correct' : o === value ? 'wrong' : '') : ''}`}
                disabled={checked}
                onClick={() => { setValue(o); setChecked(true) }}
              >
                {o}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="text" autoFocus lang="de" spellCheck={false} autoCapitalize="off"
            value={value} disabled={checked}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) setChecked(true) }}
          />
        )}

        {!checked ? (
          !d.options && (
            <button className="primary block" style={{ marginTop: 12 }}
              disabled={!value.trim()} onClick={() => setChecked(true)}>
              {t('check', lang)}
            </button>
          )
        ) : (
          <>
            <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
              <strong className="de">{d.answer}</strong>
            </div>
            <button className="primary block" style={{ marginTop: 10 }} onClick={advance}>
              {t('next', lang)} →
            </button>
          </>
        )}
      </div>
    </>
  )
}

/* ---------- 5. Dinleme ---------- */

function ListeningStep({
  sentences, onNext,
}: {
  sentences: Sentence[]
  onNext: () => void
}) {
  const { state, lang, markDictation } = useStore()
  const { play } = useAudio()
  const items = useMemo(
    () => sample(sentences.filter((s) => s.a), 5),
    [sentences],
  )
  const [i, setI] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)

  const s = items[i]

  if (!items.length) {
    return (
      <div className="card center">
        <p className="muted">—</p>
        <button className="primary" onClick={onNext}>{t('next', lang)} →</button>
      </div>
    )
  }

  if (!s) {
    return (
      <div className="card center">
        <div className="big-emoji">🎧</div>
        <button className="primary big" onClick={onNext}>{t('next', lang)} →</button>
      </div>
    )
  }

  const expected = tokenize(s.d)
  const actual = tokenize(value)
  const hits = expected.filter((w, k) => actual[k]?.toLowerCase() === w.toLowerCase()).length
  const trans = s[state.settings.transLang] ?? s.tr ?? s.ru ?? s.az

  return (
    <>
      <div className="bar" style={{ marginBottom: 14 }}>
        <i style={{ width: `${(i / items.length) * 100}%` }} />
      </div>
      <div className="card">
        <h2>🎧 {STEP_LABEL.listening[lang]}</h2>
        <p className="muted small">{t('dictationHint', lang)}</p>

        <div className="row" style={{ gap: 8 }}>
          <button className="primary big" onClick={() => play(sentenceAudioUrl(s.i))}>
            ▶ {t('play', lang)}
          </button>
          <button onClick={() => play(sentenceAudioUrl(s.i), 0.7)}>0.7×</button>
        </div>

        <textarea
          rows={2} lang="de" spellCheck={false} autoCapitalize="off"
          style={{ marginTop: 14 }}
          value={value} disabled={checked}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
              e.preventDefault(); setChecked(true)
            }
          }}
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
            <div className={`feedback ${hits === expected.length ? 'ok' : 'bad'}`}>
              <div className="de" style={{ fontSize: '1.05rem' }}>{s.d}</div>
              {trans && <div className="small muted" style={{ marginTop: 4 }}>{trans}</div>}
            </div>
            <button
              className="primary block" style={{ marginTop: 10 }}
              onClick={() => {
                markDictation(s.i); setValue(''); setChecked(false); setI((n) => n + 1)
              }}
            >
              {t('next', lang)} →
            </button>
          </>
        )}
      </div>
    </>
  )
}

/* ---------- 6. Yazma ---------- */

function WritingStep({ unit, onNext }: { unit: Unit; onNext: () => void }) {
  const { state, lang, saveWriting } = useStore()
  const [i, setI] = useState(0)
  const task = unit.writing[i]
  const key = `${unit.id}#${i}`
  const [text, setText] = useState(() => state.writings[key] ?? '')
  const [showModel, setShowModel] = useState(false)

  if (!task) {
    return (
      <div className="card center">
        <div className="big-emoji">📝</div>
        <button className="primary big" onClick={onNext}>{t('next', lang)} →</button>
      </div>
    )
  }

  // Kullanılması istenen kelimeler metinde geçiyor mu? Çekimli biçimleri de
  // yakalamak için kökün ilk %60'ı aranıyor — "arbeiten" için "arbeite" sayılır.
  const used = task.mustUse.map((w) => {
    const stem = w.slice(0, Math.max(3, Math.floor(w.length * 0.6))).toLowerCase()
    return { word: w, ok: text.toLowerCase().includes(stem) }
  })
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 2).length
  const words = tokenize(text).length

  return (
    <div className="card">
      <h2>📝 {STEP_LABEL.writing[lang]}</h2>
      <p className="prompt-text">{task.prompt[lang]}</p>

      <div className="row must-use" style={{ marginBottom: 10 }}>
        {used.map((u) => (
          <span key={u.word} className={`badge ${u.ok ? 'ok' : ''}`}>
            {u.ok ? '✓' : '○'} <span className="de">{u.word}</span>
          </span>
        ))}
      </div>

      <textarea
        rows={6} lang="de" spellCheck
        value={text}
        placeholder="…"
        onChange={(e) => { setText(e.target.value); saveWriting(key, e.target.value) }}
      />

      <div className="row between small muted" style={{ marginTop: 6 }}>
        <span className="mono">{words} {{ tr: 'kelime', az: 'söz', ru: 'слов', de: 'Wörter' }[lang]} · {sentences} {{ tr: 'cümle', az: 'cümlə', ru: 'предл.', de: 'Sätze' }[lang]}</span>
        <button className="ghost" onClick={() => setShowModel((v) => !v)}>
          {showModel ? t('close', lang) : { tr: 'Örnek cevap', az: 'Nümunə cavab', ru: 'Пример ответа', de: 'Musterlösung' }[lang]}
        </button>
      </div>

      {showModel && (
        <div className="notice" style={{ marginTop: 10 }}>
          <div className="de">{task.model}</div>
          <div className="hint" style={{ marginTop: 6 }}>
            {{ tr: 'Bu sadece bir örnek. Kendi metninizle karşılaştırın: eksik kalan yapı hangisi?',
               az: 'Bu sadəcə nümunədir. Öz mətninizlə müqayisə edin: hansı quruluş əskikdir?',
               ru: 'Это лишь образец. Сравните со своим текстом: какой конструкции не хватает?',
               de: 'Nur ein Beispiel. Vergleichen Sie mit Ihrem Text: Was fehlt?' }[lang]}
          </div>
        </div>
      )}

      <button
        className="primary big block"
        style={{ marginTop: 14 }}
        disabled={words < 5}
        onClick={() => {
          if (i + 1 < unit.writing.length) {
            setI(i + 1); setText(''); setShowModel(false)
          } else {
            onNext()
          }
        }}
      >
        {i + 1 < unit.writing.length ? t('next', lang) : t('finish', lang)} →
      </button>
      {words < 5 && (
        <p className="hint center">
          {{ tr: 'Devam etmek için en az birkaç cümle yazın.',
             az: 'Davam etmək üçün ən azı bir neçə cümlə yazın.',
             ru: 'Чтобы продолжить, напишите хотя бы несколько предложений.',
             de: 'Schreiben Sie ein paar Sätze, um fortzufahren.' }[lang]}
        </p>
      )}
    </div>
  )
}

/* ---------- 7. Oyun ---------- */

function GameStep({
  unit, lemmas, onNext,
}: {
  unit: Unit
  lemmas: Lemma[]
  onNext: () => void
}) {
  const { lang } = useStore()
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <div className="card center">
        <div className="big-emoji">🎮</div>
        <h2>{GAME_NAMES[unit.game]?.[lang]}</h2>
        <button className="primary big" onClick={() => setStarted(true)}>
          {t('start', lang)} →
        </button>
      </div>
    )
  }
  return <Game id={unit.game} pool={lemmas} onFinish={onNext} />
}

/* ---------- 8. Bitiş ---------- */

function DoneStep({ unit, onExit }: { unit: Unit; onExit: () => void }) {
  const { lang } = useStore()
  return (
    <div className="card center celebrate">
      <div className="big-emoji">🏁</div>
      <h2>{unit.title[lang]}</h2>
      <p className="muted">
        {{ tr: 'Ünite tamamlandı. Kelimeler tekrar programına eklendi — birkaç gün içinde tekrar karşınıza çıkacaklar.',
           az: 'Bölmə tamamlandı. Sözlər təkrar proqramına əlavə olundu — bir neçə gün ərzində yenidən qarşınıza çıxacaqlar.',
           ru: 'Урок пройден. Слова добавлены в программу повторения — они вернутся через несколько дней.',
           de: 'Einheit abgeschlossen. Die Wörter sind in der Wiederholung — sie kommen in ein paar Tagen wieder.' }[lang]}
      </p>
      <button className="primary big" onClick={onExit}>{t('course', lang)} →</button>
    </div>
  )
}
