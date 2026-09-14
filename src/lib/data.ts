/**
 * Veri yükleme ve dil bilgisi yardımcıları.
 *
 * Paketler istendiğinde yüklenir ve bellekte tutulur: A1 çalışan biri
 * C1 kelimelerini hiç indirmez.
 */

import type { Curriculum, IndexEntry, Lemma, Level, Sentence, TransLang, Unit } from './types'

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

let curriculumCache: Curriculum | null = null

export async function loadCurriculum(): Promise<Curriculum> {
  if (curriculumCache) return curriculumCache
  curriculumCache = await getJson<Curriculum>('curriculum.json')
  return curriculumCache
}

/** Üniteyi kimliğinden bulur ve hangi seviyeye ait olduğunu da döndürür */
export function findUnit(cur: Curriculum, unitId: string): { unit: Unit; level: Level } | null {
  for (const [level, data] of Object.entries(cur)) {
    const unit = data?.units.find((u) => u.id === unitId)
    if (unit) return { unit, level: level as Level }
  }
  return null
}

/**
 * Bir ünitenin kelimelerini tam lemma kayıtlarına çevirir.
 * Ünite kelimeleri farklı seviyelerden gelebildiği için (A1 ünitesinde B1
 * kelimesi olabilir) gerekli tüm seviye paketleri yükleniyor.
 */
export async function loadUnitLemmas(unit: Unit): Promise<Lemma[]> {
  const levels = [...new Set(unit.words.map((w) => w.c))]
  const chunks = await Promise.all(levels.map(loadVocab))
  const byKey = new Map<string, Lemma>()
  for (const l of chunks.flat()) byKey.set(lemmaKey(l), l)
  return unit.words.map((w) => byKey.get(w.k)).filter((l): l is Lemma => !!l)
}

/* ---------- kimlik ---------- */

export const lemmaKey = (l: { w: string; p: string }) => `${l.w}|${l.p}`

/* ---------- ses ---------- */

/**
 * Tatoeba cümle sesi. Dosyalar repoya kopyalanmıyor: 12 bin dosya ~140 MB
 * eder ve deponun klonlanmasını yavaşlatır. Doğrudan kaynaktan akıtılıyor.
 *
 * NEDEN /audio/download/ DEĞİL?
 *   Bu uç nokta CÜMLE değil SES kimliği bekliyor. Cümle kimliğiyle çağrılınca
 *   HTTP 200 ve geçerli bir mp3 döndürüyor — ama başka bir dilin kaydını.
 *   Sessizce yanlış çalıştığı için hata gözden kaçmıştı: dinleme bölümünde
 *   Almanca yerine İspanyolca/İngilizce kayıtlar çalıyordu.
 *   audio.tatoeba.org/sentences/deu/<cümle_id>.mp3 yolu dilin kendisini
 *   yolda taşıdığı için böyle bir karışıklığa yer bırakmıyor.
 */
export const sentenceAudioUrl = (sentenceId: string) =>
  `https://audio.tatoeba.org/sentences/deu/${sentenceId}.mp3`

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

/**
 * Çeviriyi YALNIZCA istenen dilde döndürür.
 *
 * Tek istisna, kullanıcının onayladığı Azerice köprüsü: doğrulanmış Azerice
 * karşılık yoksa Türkçe gösterilir ve `bridged` ile işaretlenir (arayüz bunu
 * "Türkçeden" rozetiyle belirtir).
 *
 * NEDEN BAŞKA DİLE DÜŞMÜYOR?
 *   Önce Türkçe yoksa Rusçaya, o da yoksa Azericeye düşen bir yedekleme
 *   zinciri vardı. Alıştırmalarda bu felaket oluyordu: doğru cevap Türkçe,
 *   çeldiriciler Rusça ve Azerice çıkıyor, soru dil bilgisini değil hangi
 *   şıkkın Türkçe göründüğünü ölçüyordu. Karşılık yoksa `null` dönmek ve
 *   çağıranın tutarlı bir yedek (Almanca tanım) seçmesi doğrusu.
 */
export function strictTranslation(
  l: Lemma,
  lang: TransLang,
): { words: string[]; bridged: boolean } | null {
  const primary = l.t[lang]
  if (primary?.length) {
    return { words: primary, bridged: lang === 'az' && l.azs === 'tr' }
  }
  if (lang === 'az' && l.t.tr?.length) {
    return { words: l.t.tr, bridged: true }
  }
  return null
}

/**
 * Gösterim için karşılık: istenen dil, yoksa Almanca tanım.
 * Almanca tanıma düşmek dil karıştırmaz — hedef dilin kendisidir ve
 * ileri seviyede zaten tercih edilen çalışma biçimi.
 */
export function glossOrTranslation(
  l: Lemma,
  lang: TransLang,
): { text: string; isGerman: boolean; bridged: boolean } {
  const t = strictTranslation(l, lang)
  if (t) return { text: t.words.slice(0, 2).join(', '), isGerman: false, bridged: t.bridged }
  return { text: l.s[0]?.g ?? l.w, isGerman: true, bridged: false }
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
