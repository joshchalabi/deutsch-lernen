/**
 * FSRS-4.5 — Free Spaced Repetition Scheduler
 *
 * NEDEN BU ALGORİTMA?
 *   Anki'nin 500 milyondan fazla gerçek tekrar kaydı üzerinde yapılan
 *   kıyaslamalarda FSRS, klasik SM-2'ye göre aynı hatırlama oranını
 *   %20-30 daha az tekrarla sağlıyor. Anki 23.10'dan beri varsayılan.
 *
 *   SM-2 her kartı tek bir "kolaylık faktörü" ile yönetir. FSRS bunun yerine
 *   üç durum değişkeni tutar:
 *     stability  (S) — hatırlama olasılığının %90'a düşmesi için geçen gün
 *     difficulty (D) — kartın içsel zorluğu, 1..10
 *     retrievability (R) — şu an hatırlama olasılığı, geçen süreye bağlı
 *
 *   Bir sonraki tekrar, R hedef orana (varsayılan 0.90) düştüğü gün planlanır.
 *
 * KAYNAK
 *   Algoritma ve ağırlıklar: open-spaced-repetition/fsrs4anki (MIT lisansı).
 *   Buradaki uygulama aynı formülleri takip eder.
 */

export const Rating = {
  Again: 1, // hatırlayamadım
  Hard: 2, // zor hatırladım
  Good: 3, // hatırladım
  Easy: 4, // çok kolaydı
} as const

export type Rating = (typeof Rating)[keyof typeof Rating]

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface Card {
  /** stability — gün cinsinden bellek dayanıklılığı */
  s: number
  /** difficulty — 1..10 */
  d: number
  /** son tekrar zamanı (epoch ms); yeni kartta null */
  last: number | null
  /** planlanan bir sonraki tekrar (epoch ms) */
  due: number
  state: CardState
  /** toplam tekrar sayısı */
  reps: number
  /** "Again" sayısı — kartın ne kadar takıldığını gösterir */
  lapses: number
}

/** fsrs4anki v4.5 varsayılan ağırlıkları */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
] as const

/** FSRS-4.5 unutma eğrisi sabitleri */
const DECAY = -0.5
const FACTOR = 19 / 81

const DAY = 86_400_000

/** Öğrenme aşamasındaki kısa aralıklar (dakika) — gün bazlı planlamadan önce */
const LEARNING_STEPS = [1, 10]
const RELEARNING_STEPS = [10]

export interface SchedulerOptions {
  /** Hedef hatırlama oranı. 0.9 = tekrar anında %90 hatırlıyor olmak. */
  requestRetention: number
  /** Aralık tavanı (gün). Çok uzun aralıklar motivasyonu kırıyor. */
  maximumInterval: number
}

export const DEFAULT_OPTIONS: SchedulerOptions = {
  requestRetention: 0.9,
  maximumInterval: 365 * 3,
}

export function newCard(now = Date.now()): Card {
  return { s: 0, d: 0, last: null, due: now, state: 'new', reps: 0, lapses: 0 }
}

/** Hatırlama olasılığı: t gün sonra bu kartı hatırlama ihtimali */
export function retrievability(card: Card, now = Date.now()): number {
  if (card.state === 'new' || card.last === null || card.s <= 0) return 0
  const elapsedDays = Math.max(0, (now - card.last) / DAY)
  return Math.pow(1 + (FACTOR * elapsedDays) / card.s, DECAY)
}

const clampD = (d: number) => Math.min(10, Math.max(1, d))

/** İlk tekrarda dayanıklılık doğrudan ağırlıklardan okunur */
function initialStability(rating: Rating): number {
  return Math.max(W[rating - 1], 0.1)
}

function initialDifficulty(rating: Rating): number {
  return clampD(W[4] - Math.exp(W[5] * (rating - 1)) + 1)
}

function nextDifficulty(d: number, rating: Rating): number {
  const delta = d - W[6] * (rating - 3)
  // ortalamaya geri çekme (mean reversion): zorluk sonsuza kaçmasın
  const meanReverted = W[7] * initialDifficulty(Rating.Easy) + (1 - W[7]) * delta
  return clampD(meanReverted)
}

/** Başarılı hatırlamada dayanıklılık artışı */
function stabilityAfterRecall(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === Rating.Hard ? W[15] : 1
  const easyBonus = rating === Rating.Easy ? W[16] : 1
  const growth =
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus
  return s * (1 + growth)
}

/** Unutma sonrası dayanıklılık — her zaman düşer, sıfırlanmaz */
function stabilityAfterLapse(d: number, s: number, r: number): number {
  return Math.min(
    s,
    W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r)),
  )
}

/** R hedef orana düştüğü günü hesaplar */
function intervalFromStability(s: number, opts: SchedulerOptions): number {
  const days = (s / FACTOR) * (Math.pow(opts.requestRetention, 1 / DECAY) - 1)
  return Math.min(opts.maximumInterval, Math.max(1, Math.round(days)))
}

export interface ScheduleResult {
  card: Card
  /** Kullanıcıya gösterilecek aralık metni için: gün cinsinden (0 = bugün içinde) */
  intervalDays: number
}

/**
 * Bir kartı derecelendirir ve yeni halini döndürür.
 * Saf fonksiyon: girdiyi değiştirmez.
 */
export function schedule(
  card: Card,
  rating: Rating,
  now = Date.now(),
  opts: SchedulerOptions = DEFAULT_OPTIONS,
): ScheduleResult {
  const next: Card = { ...card, reps: card.reps + 1, last: now }

  if (card.state === 'new') {
    next.d = initialDifficulty(rating)
    next.s = initialStability(rating)
    if (rating === Rating.Again) {
      next.state = 'learning'
      next.due = now + LEARNING_STEPS[0] * 60_000
      return { card: next, intervalDays: 0 }
    }
    if (rating === Rating.Hard) {
      next.state = 'learning'
      next.due = now + LEARNING_STEPS[1] * 60_000
      return { card: next, intervalDays: 0 }
    }
    // Good / Easy: doğrudan gün bazlı plana geç
    next.state = 'review'
    const iv = intervalFromStability(next.s, opts)
    next.due = now + iv * DAY
    return { card: next, intervalDays: iv }
  }

  const r = retrievability(card, now)

  if (rating === Rating.Again) {
    next.lapses = card.lapses + 1
    next.d = nextDifficulty(card.d, rating)
    next.s = stabilityAfterLapse(next.d, card.s, r)
    next.state = 'relearning'
    next.due = now + RELEARNING_STEPS[0] * 60_000
    return { card: next, intervalDays: 0 }
  }

  next.d = nextDifficulty(card.d, rating)
  next.s = stabilityAfterRecall(next.d, card.s, r, rating)
  next.state = 'review'
  const iv = intervalFromStability(next.s, opts)
  next.due = now + iv * DAY
  return { card: next, intervalDays: iv }
}

/** Derecelendirme butonlarında gösterilecek aralıkları önceden hesaplar */
export function previewIntervals(
  card: Card,
  now = Date.now(),
  opts: SchedulerOptions = DEFAULT_OPTIONS,
): Record<Rating, number> {
  return {
    [Rating.Again]: schedule(card, Rating.Again, now, opts).intervalDays,
    [Rating.Hard]: schedule(card, Rating.Hard, now, opts).intervalDays,
    [Rating.Good]: schedule(card, Rating.Good, now, opts).intervalDays,
    [Rating.Easy]: schedule(card, Rating.Easy, now, opts).intervalDays,
  }
}

export const isDue = (card: Card, now = Date.now()) => card.due <= now
