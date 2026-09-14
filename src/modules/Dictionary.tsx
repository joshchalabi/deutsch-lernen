/**
 * Sözlük — Almanca ⇄ Türkçe / Rusça / Azerice.
 *
 * Arama dört dilde de çalışıyor: "Haus", "ev", "дом" veya "ev" yazmak aynı
 * girdiye götürüyor. Bunun için index.json her kelimenin dört dildeki
 * karşılıklarını taşıyor (~1,4 MB, tek seferlik).
 *
 * Azerice köprüsü burada görünür hale geliyor: doğrulanmış Azerice karşılığı
 * olmayan kelimelerde Türkçe karşılık gösteriliyor ve "Türkçeden" rozetiyle
 * işaretleniyor. Sessizce Türkçeyi Azerice diye sunmak dürüst olmazdı.
 */

import { useDeferredValue, useMemo, useState } from 'react'
import { loadIndex, loadVocabUpTo, lemmaKey } from '../lib/data'
import type { IndexEntry, Lemma, TransLang } from '../lib/types'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, PlayButton, useAsync } from '../components/ui'

const POS_LABEL: Record<string, Record<string, string>> = {
  noun: { tr: 'isim', az: 'isim', ru: 'сущ.', de: 'Subst.' },
  verb: { tr: 'fiil', az: 'feil', ru: 'глаг.', de: 'Verb' },
  adj: { tr: 'sıfat', az: 'sifət', ru: 'прил.', de: 'Adj.' },
  adv: { tr: 'zarf', az: 'zərf', ru: 'нареч.', de: 'Adv.' },
  pron: { tr: 'zamir', az: 'əvəzlik', ru: 'мест.', de: 'Pron.' },
  prep: { tr: 'edat', az: 'ön qoşma', ru: 'предл.', de: 'Präp.' },
  conj: { tr: 'bağlaç', az: 'bağlayıcı', ru: 'союз', de: 'Konj.' },
  num: { tr: 'sayı', az: 'say', ru: 'числ.', de: 'Num.' },
  intj: { tr: 'ünlem', az: 'nida', ru: 'межд.', de: 'Interj.' },
  particle: { tr: 'edat', az: 'ədat', ru: 'частица', de: 'Partikel' },
  det: { tr: 'belirteç', az: 'təyinedici', ru: 'детерм.', de: 'Det.' },
  phrase: { tr: 'deyim', az: 'ifadə', ru: 'выраж.', de: 'Wendung' },
}

const norm = (s: string) => s.toLocaleLowerCase('tr').trim()

function scoreMatch(entry: IndexEntry, q: string): number {
  const w = norm(entry.w)
  if (w === q) return 0
  if (w.startsWith(q)) return 1
  const inTrans = [...entry.t, ...entry.u, ...entry.z].some((x) => norm(x) === q)
  if (inTrans) return 2
  const transStarts = [...entry.t, ...entry.u, ...entry.z].some((x) => norm(x).startsWith(q))
  if (transStarts) return 3
  if (w.includes(q)) return 4
  if ([...entry.t, ...entry.u, ...entry.z].some((x) => norm(x).includes(q))) return 5
  return Infinity
}

export default function Dictionary() {
  const { lang } = useStore()
  const index = useAsync(() => loadIndex(), [])

  return (
    <main className="main">
      <h1>{t('dictionary', lang)}</h1>
      <Loading state={index}>{(data) => <Search index={data} />}</Loading>
    </main>
  )
}

function Search({ index }: { index: IndexEntry[] }) {
  const { lang } = useStore()
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const results = useMemo(() => {
    const q = norm(deferred)
    if (q.length < 2) return []
    const scored: { e: IndexEntry; s: number }[] = []
    for (const e of index) {
      const s = scoreMatch(e, q)
      if (s !== Infinity) scored.push({ e, s })
      if (scored.length > 4000) break
    }
    scored.sort((a, b) => a.s - b.s || a.e.r - b.e.r)
    return scored.slice(0, 40).map((x) => x.e)
  }, [index, deferred])

  return (
    <>
      <div className="card">
        <input
          type="search"
          value={query}
          autoFocus
          placeholder={t('searchPlaceholder', lang)}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {deferred.trim().length >= 2 && results.length === 0 && (
        <div className="card muted center">{t('noResults', lang)}</div>
      )}

      {results.map((e) => {
        const key = `${e.w}|${e.p}`
        return (
          <div className="card" key={key} style={{ marginTop: 12 }}>
            <button
              className="ghost"
              style={{ width: '100%', textAlign: 'start', padding: 0 }}
              onClick={() => setOpenKey(openKey === key ? null : key)}
            >
              <div className="entry">
                <div className="head">
                  <span className="lemma de">{e.w}</span>
                  <Badge>{POS_LABEL[e.p]?.[lang] ?? e.p}</Badge>
                  <Badge kind="level">{e.c}</Badge>
                  <span className="spacer" />
                  <span className="small muted mono">#{e.r}</span>
                </div>
                <div className="gloss de">{e.g}</div>
                <TransLine code="TR" words={e.t} />
                <TransLine code="RU" words={e.u} />
                <TransLine code="AZ" words={e.z} />
              </div>
            </button>
            {openKey === key && <Detail word={e.w} pos={e.p} level={e.c} />}
          </div>
        )
      })}
    </>
  )
}

function TransLine({ code, words }: { code: string; words: string[] }) {
  if (!words.length) return null
  return (
    <div className="trans-line">
      <span className="code">{code}</span>
      <span>{words.join(', ')}</span>
    </div>
  )
}

/** Tam kayıt: çekim tablosu, örnekler, eş/zıt anlamlılar */
function Detail({ word, pos, level }: { word: string; pos: string; level: IndexEntry['c'] }) {
  const { lang, state, addWord } = useStore()
  const full = useAsync(async () => {
    const all = await loadVocabUpTo(level)
    return all.find((l) => l.w === word && l.p === pos) ?? null
  }, [word, pos, level])

  return (
    <Loading state={full}>
      {(lemma) =>
        !lemma ? null : <DetailBody lemma={lemma} lang={lang} inDeck={!!state.vocab[lemmaKey(lemma)]} onAdd={() => addWord(lemma)} />
      }
    </Loading>
  )
}

function DetailBody({
  lemma, lang, inDeck, onAdd,
}: {
  lemma: Lemma
  lang: ReturnType<typeof useStore>['lang']
  inDeck: boolean
  onAdd: () => void
}) {
  const azBridged = lemma.azs === 'tr'

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14 }}>
      <div className="row" style={{ marginBottom: 10 }}>
        {lemma.ipa && <span className="muted small">/{lemma.ipa}/</span>}
        <PlayButton url={lemma.a ?? null} text={lemma.w} label="Aussprache" />
        <span className="spacer" />
        <button className={inDeck ? 'ghost' : 'primary'} disabled={inDeck} onClick={onAdd}>
          {inDeck ? t('inStudy', lang) : t('addToStudy', lang)}
        </button>
      </div>

      {(['tr', 'ru', 'az'] as TransLang[]).map((l) => {
        const words = lemma.t[l]
        const showBridge = l === 'az' && azBridged
        const shown = words?.length ? words : showBridge ? lemma.t.tr : undefined
        if (!shown?.length) return null
        return (
          <div className="trans-line" key={l}>
            <span className="code">{l}</span>
            <span>
              {shown.join(', ')}
              {showBridge && !words?.length && (
                <>
                  {' '}
                  <span title={t('bridgedExplain', lang)}>
                    <Badge kind="warn">{t('bridgedFromTurkish', lang)}</Badge>
                  </span>
                </>
              )}
            </span>
          </div>
        )
      })}

      {lemma.p === 'noun' && lemma.k && <CaseTable lemma={lemma} lang={lang} />}
      {lemma.p === 'verb' && lemma.vf && <VerbTable lemma={lemma} lang={lang} />}

      {lemma.s.some((s) => s.x.length) && (
        <>
          <h3 style={{ marginTop: 16 }}>{t('examples', lang)}</h3>
          {lemma.s.flatMap((s) => s.x).slice(0, 3).map((x, i) => (
            <p key={i} className="de small" style={{ marginBottom: 6 }}>{x}</p>
          ))}
        </>
      )}

      <div className="row small" style={{ marginTop: 12 }}>
        {lemma.syn?.length ? (
          <span><strong className="muted">{t('synonyms', lang)}:</strong>{' '}
            <span className="de">{lemma.syn.slice(0, 5).join(', ')}</span></span>
        ) : null}
        {lemma.ant?.length ? (
          <span><strong className="muted">{t('antonyms', lang)}:</strong>{' '}
            <span className="de">{lemma.ant.slice(0, 5).join(', ')}</span></span>
        ) : null}
      </div>
    </div>
  )
}

const CASE_KEYS = [
  ['nom', 'nominative'], ['akk', 'accusative'], ['dat', 'dative'], ['gen', 'genitive'],
] as const

function CaseTable({ lemma, lang }: { lemma: Lemma; lang: ReturnType<typeof useStore>['lang'] }) {
  const k = lemma.k!
  // Anahtarlar 01_extract'ta "nom_si", "gen_pl" biçiminde üretiliyor
  const cell = (c: string, n: 'si' | 'pl') => {
    const map: Record<string, string> = { nom: 'nom', akk: 'acc', dat: 'dat', gen: 'gen' }
    const v = k[`${map[c]}_${n}`]
    return v ? `${v.art ? v.art + ' ' : ''}${v.form}` : '—'
  }
  return (
    <>
      <h3 style={{ marginTop: 16 }}>{t('caseLabel', lang)}</h3>
      <table className="infl">
        <thead>
          <tr>
            <th />
            <th>{t('singular', lang)}</th>
            <th>{t('plural', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {CASE_KEYS.map(([short, key]) => (
            <tr key={short}>
              <th>{t(key, lang)}</th>
              <td className="de">{cell(short, 'si')}</td>
              <td className="de">{cell(short, 'pl')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function VerbTable({ lemma, lang }: { lemma: Lemma; lang: ReturnType<typeof useStore>['lang'] }) {
  const v = lemma.vf!
  const rows: [string, string | undefined][] = [
    ['Infinitiv', lemma.w],
    ['Präsens (er/sie/es)', v.praesens_3sg],
    ['Präteritum', v.praeteritum],
    ['Partizip II', v.partizip2],
    ['Hilfsverb', v.hilfsverb],
  ]
  return (
    <>
      <h3 style={{ marginTop: 16 }}>{t('verbForms', lang)}</h3>
      <table className="infl">
        <tbody>
          {rows.filter(([, val]) => val).map(([label, val]) => (
            <tr key={label}>
              <th style={{ width: '45%' }}>{label}</th>
              <td className="de">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
