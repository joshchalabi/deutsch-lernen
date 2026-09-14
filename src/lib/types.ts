import type { Card } from './fsrs'

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** Arayüz dilleri. Almanca da dahil: ileri seviyede tek dilli çalışmak için. */
export type UiLang = 'tr' | 'az' | 'ru' | 'de'
export const UI_LANGS: UiLang[] = ['tr', 'az', 'ru', 'de']

/** Çeviri dilleri — sözlükte Almanca karşısına konan diller */
export type TransLang = 'tr' | 'az' | 'ru'

export type Pos =
  | 'noun' | 'verb' | 'adj' | 'adv' | 'pron' | 'prep'
  | 'conj' | 'num' | 'intj' | 'particle' | 'det' | 'phrase'

/** İsim çekim tablosu hücresi */
export interface CaseCell {
  form: string
  art: string | null
}

/** Fiil temel biçimleri (Stammformen) */
export interface VerbForms {
  praesens_3sg?: string
  praeteritum?: string
  partizip2?: string
  hilfsverb?: string
}

export interface Sense {
  /** Almanca tanım */
  g: string
  /** örnek cümleler */
  x: string[]
}

/** Paketlenmiş kelime kaydı (public/data/vocab/<seviye>.json) */
export interface Lemma {
  w: string
  p: Pos
  /** frekans sırası — 1 en sık */
  r: number
  c: Level
  s: Sense[]
  /** çeviriler: dil -> karşılıklar */
  t: Partial<Record<TransLang, string[]>>
  /** Azerice kaynağı: yerli mi, Türkçeden köprü mü, yok mu */
  azs?: 'native' | 'tr' | 'none'
  ipa?: string
  /** Wikimedia Commons telaffuz kaydı (mp3) */
  a?: string
  /** isim cinsiyeti: m/f/n */
  g?: string[]
  /** çoğul */
  pl?: string
  vf?: VerbForms
  /** isim çekim tablosu: nom_si, gen_pl, ... */
  k?: Record<string, CaseCell>
  syn?: string[]
  ant?: string[]
}

/** Arama indeksi kaydı (public/data/index.json) */
export interface IndexEntry {
  w: string
  p: Pos
  r: number
  c: Level
  /** Almanca kısa tanım */
  g: string
  /** Türkçe */
  t: string[]
  /** Rusça */
  u: string[]
  /** Azerice */
  z: string[]
}

export interface SentenceAudio {
  id: string
  by: string
  l: string
  f: boolean
}

/** Paketlenmiş cümle (public/data/sentences/<seviye>.json) */
export interface Sentence {
  /** Tatoeba cümle kimliği — ses dosyası bununla çekilir */
  i: string
  /** Almanca metin */
  d: string
  /** kelime sayısı */
  n: number
  /** en zor kelimenin frekans rankı */
  h: number
  tr?: string
  ru?: string
  az?: string
  a?: SentenceAudio
}

/* ---------- öğrenci durumu ---------- */

/** Bir kelimenin öğrenilme durumu. Anahtar: "kelime|tür" */
export interface VocabProgress {
  card: Card
  /** doğru/yanlış geçmişi — son 10 deneme, başarı oranı için */
  hist: boolean[]
}

export interface StudySession {
  /** gün (YYYY-MM-DD) */
  day: string
  /** o gün çalışılan saniye */
  seconds: number
  /** o gün yapılan tekrar sayısı */
  reviews: number
  /** yeni öğrenilen kelime */
  newWords: number
}

export interface Settings {
  uiLang: UiLang
  /** sözlükte öncelikli gösterilen çeviri dili */
  transLang: TransLang
  /** günlük yeni kelime hedefi */
  newPerDay: number
  /** günlük tekrar tavanı */
  maxReviews: number
  /** hedef hatırlama oranı (FSRS) */
  requestRetention: number
  /** ses yoksa tarayıcı TTS ile oku (varsayılan kapalı) */
  ttsFallback: boolean
  /** dinleme alıştırmalarında oynatma hızı */
  playbackRate: number
  theme: 'light' | 'dark' | 'system'
}

export interface Profile {
  /** yerleştirme testi sonucu; test yapılmadıysa null */
  level: Level | null
  /** yerleştirme testinin tahmin ettiği bilinen kelime sayısı */
  estimatedVocab: number | null
  placedAt: number | null
}

export interface AppState {
  version: number
  profile: Profile
  settings: Settings
  /** "kelime|tür" -> ilerleme */
  vocab: Record<string, VocabProgress>
  /** gün -> oturum özeti */
  sessions: Record<string, StudySession>
  /** tamamlanan dinleme/dikte alıştırmaları: cümle kimlikleri */
  dictationDone: string[]
}
