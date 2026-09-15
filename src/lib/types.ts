import type { Card } from './fsrs'
import type { AiSettings } from './ai'

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

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
export type Example = { d: string } & Partial<Record<TransLang, string>>

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
/**
   * Çevirili örnek cümle (Tatoeba). Sözlük kaydındaki `s[].x` örnekleri
   * yalnızca Almanca; bu alan Almancasıyla birlikte karşılığını da taşıyor.
   *
   * İkisi birden olabiliyor: tek bir cümle hem Türkçe hem Rusça taşımadığında
   * `xs` Türkçeyi, `xs2` Rusçayı getiriyor. Arayüz istenen dili taşıyan
   * ilkini gösteriyor.
   */
  xs?: Example
  xs2?: Example
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

/* ---------- müfredat ---------- */

/** Dört dilde aynı metin. Eksik dil TypeScript hatası verir. */
export type Localized = Record<UiLang, string>

export interface GrammarTable {
  headers: string[]
  rows: string[][]
}

export interface GrammarExample {
  de: string
  tr: string
  az: string
  ru: string
}

export interface GrammarTopic {
  id: string
  title: Localized
  /** Açıklama metni. **kalın** ve satır sonları desteklenir. */
  explain: Localized
  table?: GrammarTable
  examples: GrammarExample[]
}

/** Müfredattaki kelime, aşama 6'da gerçek bir lemmaya bağlanmış hâliyle */
export interface CurriculumWord {
  /** "Haus|noun" — sözlükteki anahtar */
  k: string
  /** müfredatta yazıldığı hâli */
  w: string
  p: Pos
  c: Level
}

export interface WritingTask {
  prompt: Localized
  /** Metinde geçmesi beklenen kelimeler */
  mustUse: string[]
  /** Örnek cevap — kullanıcı kendi metnini buna karşı değerlendirir */
  model: string
}

export type GameId =
  | 'artikel-rush' | 'wortsalat' | 'satzbau'
  | 'perfekt-paare' | 'wo-wohin' | 'adjektiv-endung'

export interface Unit {
  id: string
  title: Localized
  theme: Localized
  canDo: Localized[]
  grammar: GrammarTopic[]
  words: CurriculumWord[]
  writing: WritingTask[]
  game: GameId
}

export interface LevelCurriculum {
  level: Level
  title: Localized
  description: Localized
  units: Unit[]
}

export type Curriculum = Partial<Record<Level, LevelCurriculum>>

/** Bir dersin adımları — sabit pedagojik sıra */
export const LESSON_STEPS = [
  'intro', 'vocab', 'grammar', 'drill', 'listening', 'writing', 'game', 'done',
] as const
export type LessonStep = (typeof LESSON_STEPS)[number]

/* ---------- günlük plan ---------- */

export type BlockKind = 'vocab' | 'listening' | 'grammar' | 'writing' | 'game' | 'review'

export interface PlanBlock {
  id: string
  kind: BlockKind
  minutes: number
  /** kaç birim iş: kelime sayısı, dikte sayısı vb. */
  target: number
}

export interface DailyPlan {
  /** YYYY-MM-DD */
  date: string
  totalMinutes: number
  /** çalışılan ünite; serbest çalışmada null */
  unitId: string | null
  blocks: PlanBlock[]
  /** tamamlanan blok kimlikleri */
  done: string[]
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
  /** İsteğe bağlı YZ öğretmen. Anahtar dışa aktarıma DAHİL EDİLMEZ. */
  ai: AiSettings
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
  /** ünite kimliği -> tamamlanan adımlar */
  units: Record<string, { steps: LessonStep[]; completedAt: number | null }>
  /** bugünün planı; başka güne aitse yenisi üretilir */
  plan: DailyPlan | null
  /** yazma görevlerinin metinleri: "üniteId#index" -> metin */
  writings: Record<string, string>
}
