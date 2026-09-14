/**
 * Dilbilgisi alıştırmaları — Wiktionary'nin çekim tablolarından üretiliyor.
 *
 * NEDEN ÜRETİLMİŞ ALIŞTIRMA?
 *   Elle yazılmış 50 soruluk sabit bir set, ikinci turda ezbere dönüşür.
 *   Burada sorular 9.000 kelimenin gerçek çekim tablolarından anlık
 *   üretiliyor: soru havuzu pratikte tükenmiyor ve öğrencinin çalıştığı
 *   kelimelerle örtüşüyor.
 *
 * İKİ HEDEF
 *   1. Kasus (hâl) — Almanca öğrenenlerin en kalıcı zorluğu. Artikel +
 *      isim biçimi birlikte soruluyor, çünkü ikisi ayrılmaz.
 *   2. Stammformen — düzensiz fiillerin üç temel biçimi. Perfekt ve
 *      Präteritum kurmanın ön koşulu.
 */

import { useMemo, useState } from 'react'
import { loadVocabUpTo, sample, shuffle } from '../lib/data'
import type { Lemma } from '../lib/types'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, useAsync } from '../components/ui'

type Drill = 'case' | 'verb'

const CASES = [
  { key: 'nom', tag: 'nominative' },
  { key: 'acc', tag: 'accusative' },
  { key: 'dat', tag: 'dative' },
  { key: 'gen', tag: 'genitive' },
] as const

export default function Grammar() {
  const { state, lang } = useStore()
  const level = state.profile.level ?? 'A1'
  const [drill, setDrill] = useState<Drill>('case')

  const vocab = useAsync(() => loadVocabUpTo(level), [level])

  return (
    <main className="main">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t('grammar', lang)}</h1>
        <Badge kind="level">{level}</Badge>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <button className={drill === 'case' ? 'primary' : ''} onClick={() => setDrill('case')}>
          {t('caseLabel', lang)}
        </button>
        <button className={drill === 'verb' ? 'primary' : ''} onClick={() => setDrill('verb')}>
          {t('verbForms', lang)}
        </button>
      </div>

      <Loading state={vocab}>
        {(all) => (drill === 'case' ? <CaseDrill all={all} /> : <VerbDrill all={all} />)}
      </Loading>
    </main>
  )
}

/* ---------- Kasus ---------- */

interface CaseQuestion {
  lemma: Lemma
  caseKey: (typeof CASES)[number]
  number: 'si' | 'pl'
  answer: string
  options: string[]
}

function buildCaseQuestions(all: Lemma[], n: number): CaseQuestion[] {
  const nouns = all.filter((l) => l.p === 'noun' && l.k && l.g?.length)
  const out: CaseQuestion[] = []

  for (const lemma of sample(nouns, n * 3)) {
    if (out.length >= n) break
    const caseKey = CASES[Math.floor(Math.random() * CASES.length)]
    const number: 'si' | 'pl' = Math.random() < 0.7 ? 'si' : 'pl'
    const cell = lemma.k![`${caseKey.key}_${number}`]
    if (!cell?.art) continue

    const answer = `${cell.art} ${cell.form}`
    // Çeldiriciler: aynı ismin diğer hâlleri. Rastgele kelimeden çeldirici
    // yapmak soruyu anlamsızlaştırır — hedef hâl ayrımı, kelime ayrımı değil.
    const others = new Set<string>()
    for (const c of CASES) {
      for (const num of ['si', 'pl'] as const) {
        const other = lemma.k![`${c.key}_${num}`]
        if (other?.art) {
          const text = `${other.art} ${other.form}`
          if (text !== answer) others.add(text)
        }
      }
    }
    if (others.size < 2) continue

    out.push({
      lemma, caseKey, number, answer,
      options: shuffle([answer, ...sample([...others], 3)]),
    })
  }
  return out
}

function CaseDrill({ all }: { all: Lemma[] }) {
  const { lang } = useStore()
  useStudyClock(true)

  const questions = useMemo(() => buildCaseQuestions(all, 20), [all])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })

  if (!questions.length) {
    return <div className="card muted center">—</div>
  }

  const q = questions[idx % questions.length]
  const answered = picked !== null
  const correct = picked === q.answer

  const next = () => {
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), total: s.total + 1 }))
    setPicked(null)
    setIdx((i) => i + 1)
  }

  return (
    <div className="card">
      <div className="row between small muted" style={{ marginBottom: 12 }}>
        <span>
          {t(q.caseKey.tag, lang)} · {t(q.number === 'si' ? 'singular' : 'plural', lang)}
        </span>
        <span className="mono">{score.right}/{score.total}</span>
      </div>

      <div className="prompt">
        <div className="word de">{q.lemma.w}</div>
        <div className="q">
          {t(q.caseKey.tag, lang)} · {t(q.number === 'si' ? 'singular' : 'plural', lang)}
        </div>
      </div>

      <div className="choices">
        {q.options.map((o) => (
          <button
            key={o}
            className={`de ${answered ? (o === q.answer ? 'correct' : o === picked ? 'wrong' : '') : ''}`}
            disabled={answered}
            onClick={() => setPicked(o)}
          >
            {o}
          </button>
        ))}
      </div>

      {answered && (
        <>
          <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
            <strong className="de">{q.answer}</strong>
          </div>
          <button className="primary block" style={{ marginTop: 12 }} onClick={next}>
            {t('next', lang)} →
          </button>
        </>
      )}
    </div>
  )
}

/* ---------- Stammformen ---------- */

function VerbDrill({ all }: { all: Lemma[] }) {
  const { lang } = useStore()
  useStudyClock(true)

  const verbs = useMemo(
    () => all.filter((l) => l.p === 'verb' && l.vf?.partizip2 && l.vf?.praeteritum),
    [all],
  )
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({ prat: '', part: '' })
  const [checked, setChecked] = useState(false)
  const [score, setScore] = useState({ right: 0, total: 0 })

  if (!verbs.length) return <div className="card muted center">—</div>

  const v = verbs[idx % verbs.length]
  const okPrat = answers.prat.trim().toLowerCase() === v.vf!.praeteritum!.toLowerCase()
  const okPart = answers.part.trim().toLowerCase() === v.vf!.partizip2!.toLowerCase()
  const bothOk = okPrat && okPart

  const next = () => {
    setScore((s) => ({ right: s.right + (bothOk ? 1 : 0), total: s.total + 1 }))
    setAnswers({ prat: '', part: '' })
    setChecked(false)
    setIdx((i) => i + 1)
  }

  return (
    <div className="card">
      <div className="row between small muted" style={{ marginBottom: 12 }}>
        <span>{t('verbForms', lang)}</span>
        <span className="mono">{score.right}/{score.total}</span>
      </div>

      <div className="prompt">
        <div className="word de">{v.w}</div>
        {v.vf?.praesens_3sg && <div className="ipa de">er/sie/es {v.vf.praesens_3sg}</div>}
      </div>

      <div className="field">
        <label>Präteritum (ich / er)</label>
        <input
          type="text" lang="de" autoCapitalize="off" spellCheck={false}
          value={answers.prat} disabled={checked}
          onChange={(e) => setAnswers((a) => ({ ...a, prat: e.target.value }))}
        />
      </div>
      <div className="field">
        <label>Partizip II</label>
        <input
          type="text" lang="de" autoCapitalize="off" spellCheck={false}
          value={answers.part} disabled={checked}
          onChange={(e) => setAnswers((a) => ({ ...a, part: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') setChecked(true) }}
        />
      </div>

      {!checked ? (
        <button className="primary block" onClick={() => setChecked(true)}>
          {t('check', lang)}
        </button>
      ) : (
        <>
          <div className={`feedback ${bothOk ? 'ok' : 'bad'}`}>
            <table className="infl">
              <tbody>
                <tr>
                  <th>Präteritum</th>
                  <td className="de">{v.vf!.praeteritum}</td>
                  <td>{okPrat ? '✓' : '✗'}</td>
                </tr>
                <tr>
                  <th>Partizip II</th>
                  <td className="de">
                    {v.vf!.hilfsverb ? `${v.vf!.hilfsverb} ` : ''}{v.vf!.partizip2}
                  </td>
                  <td>{okPart ? '✓' : '✗'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="primary block" style={{ marginTop: 12 }} onClick={next}>
            {t('next', lang)} →
          </button>
        </>
      )}
    </div>
  )
}
