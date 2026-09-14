/**
 * Veri yükleme ve dil bilgisi yardımcıları.
 *
 * Paketler istendiğinde yüklenir ve bellekte tutulur: A1 çalışan biri
 * C1 kelimelerini hiç indirmez.
 */

import type { IndexEntry, Lemma, Level, Sentence, TransLang } from './types'

const BASE = import.meta.env.BASE_URL

const vocabCache = new Map<Level, Lemma[]>()
const sentenceCache = new Map<Level, Sentence[]>()
let indexCache: IndexEntry[] | null = null

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`)
  if (!res.ok) throw new Error(`Veri yüklenemedi: ${path} (${res.status})`)
  return res.json() as Promise<T>
}

export async function loadVocab(level: Level): Promise<Lemma[]> {
  const hit = vocabCache.get(level)
  if (hit) return hit
  const data = await getJson<Lemma[]>(`vocab/${level}.json`)
  vocabCache.set(level, data)
  return data
}

/** Verilen seviyeye kadar tüm kelimeler (A1..level) */
export async function loadVocabUpTo(level: Level): Promise<Lemma[]> {
  const levels: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']
  const upTo = levels.slice(0, levels.indexOf(level) + 1)
  const chunks = await Promise.all(upTo.map(loadVocab))
  return chunks.flat()
}

export async function loadSentences(level: Level): Promise<Sentence[]> {
  const hit = sentenceCache.get(level)
  if (hit) return hit
  const data = await getJson<Sentence[]>(`sentences/${level}.json`)
  sentenceCache.set(level, data)
  return data
}

export async function loadIndex(): Promise<IndexEntry[]> {
  if (indexCache) return indexCache
  indexCache = await getJson<IndexEntry[]>('index.json')
  return indexCache
}

/* ---------- kimlik ---------- */

export const lemmaKey = (l: { w: string; p: string }) => `${l.w}|${l.p}`

/* ---------- ses ---------- */

/**
 * Tatoeba cümle sesi. Dosyalar repoya kopyalanmıyor: 12 bin dosya ~140 MB
 * eder ve deponun klonlanmasını yavaşlatır. Doğrudan kaynaktan akıtılıyor.
 *
 * NEDEN /audio/download/ VE audio.tatoeba.org DEĞİL?
 *   audio.tatoeba.org/sentences/deu/<id>.mp3 yolu yalnızca Tatoeba'nın kendi
 *   barındırdığı kayıtlar için çalışıyor; toplu içe aktarılmış kayıtlarda
 *   403/404 dönüyor (ölçtük: 12 örnekten 3'ü çalıştı). /audio/download/<id>
 *   uç noktası kaynağa göre yönlendirme yapıyor ve aynı 12 örnekte 12/12
 *   çalıştı. Yönlendirmeyi <audio> öğesi kendiliğinden takip ediyor.
 */
export const sentenceAudioUrl = (sentenceId: string) =>
  `https://tatoeba.org/audio/download/${sentenceId}`

/** Kelime telaffuzu — Wikimedia Commons kaydı (Lemma.a alanında tam URL) */
export const wordAudioUrl = (lemma: Lemma) => lemma.a ?? null

/* ---------- görüntüleme ---------- */

const ARTICLE: Record<string, string> = { m: 'der', f: 'die', n: 'das' }

/** İsimleri artikeliyle gösterir: "der Mann". Artikel öğrenmenin parçası. */
export function displayForm(l: Lemma): string {
  if (l.p === 'noun' && l.g?.length) {
    const arts = l.g.map((g) => ARTICLE[g]).filter(Boolean)
    if (arts.length) return `${arts.join('/')} ${l.w}`
  }
  return l.w
}

export const articleOf = (l: Lemma): string | null =>
  l.p === 'noun' && l.g?.length ? (ARTICLE[l.g[0]] ?? null) : null

/** Çeviriyi istenen dilde döndürür; yoksa yedek dile düşer. */
export function translationOf(
  l: Lemma,
  lang: TransLang,
  fallback: TransLang[] = ['tr', 'ru', 'az'],
): { words: string[]; lang: TransLang; bridged: boolean } | null {
  const primary = l.t[lang]
  if (primary?.length) {
    return { words: primary, lang, bridged: lang === 'az' && l.azs === 'tr' }
  }
  // Azerice yoksa Türkçeye köprü: kullanıcı onaylı davranış, arayüzde etiketli.
  if (lang === 'az' && l.t.tr?.length) {
    return { words: l.t.tr, lang: 'tr', bridged: true }
  }
  for (const f of fallback) {
    if (f !== lang && l.t[f]?.length) {
      return { words: l.t[f]!, lang: f, bridged: false }
    }
  }
  return null
}

/* ---------- metin çözümleme ---------- */

const WORD_RE = /[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g

export const tokenize = (text: string): string[] => text.match(WORD_RE) ?? []

/**
 * Bir metnin öğrencinin bildiği kelimelere göre KAPSAMA oranı.
 *
 * Nation (2006): okumada %98, dinlemede %95 kapsama, öğrenmenin
 * gerçekleştiği banttır. Bunun altında öğrenci tahmine düşer, üstünde
 * yeni bilgi kalmaz. Metinleri sabit seviye etiketine göre değil bu orana
 * göre seçiyoruz — sitenin ayırt edici yanı bu.
 */
export function coverage(text: string, known: Set<string>): number {
  const toks = tokenize(text)
  if (!toks.length) return 1
  let hits = 0
  for (const t of toks) if (known.has(t.toLowerCase())) hits++
  return hits / toks.length
}

/** Kapsama oranını öğrenme bandına göre yorumlar */
export function coverageVerdict(cov: number): 'too-easy' | 'ideal' | 'hard' | 'too-hard' {
  if (cov >= 0.99) return 'too-easy'
  if (cov >= 0.95) return 'ideal'
  if (cov >= 0.9) return 'hard'
  return 'too-hard'
}

/* ---------- karıştırma ---------- */

/** Fisher-Yates — girdiyi değiştirmez */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const sample = <T,>(items: readonly T[], n: number): T[] => shuffle(items).slice(0, n)
