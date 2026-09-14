/**
 * Kalıcı durum — localStorage.
 *
 * NEDEN SUNUCU YOK?
 *   Site GitHub Pages'te barınıyor: yalnızca statik dosya. Arkada veritabanı
 *   yok. İlerleme tarayıcıda saklanıyor. Bu, gizlilik açısından iyi (veri
 *   kimseye gitmiyor) ama iki kısıtı var:
 *     - cihazlar arası eşitlenmez
 *     - site verisi temizlenirse kaybolur
 *   Bu yüzden dışa/içe aktarma zorunlu bir özellik, süs değil: kullanıcı
 *   ilerlemesini JSON olarak indirip başka cihazda geri yükleyebilir.
 */

import type { AppState, Level, Settings, StudySession } from './types'

const KEY = 'deutsch-lernen/state/v1'
const STATE_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  uiLang: 'tr',
  transLang: 'tr',
  newPerDay: 15,
  maxReviews: 150,
  requestRetention: 0.9,
  ttsFallback: false,
  playbackRate: 1,
  theme: 'system',
}

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    profile: { level: null, estimatedVocab: null, placedAt: null },
    settings: { ...DEFAULT_SETTINGS },
    vocab: {},
    sessions: {},
    dictationDone: [],
  }
}

/** Tarayıcı depolaması erişilemeyebilir (gizli sekme, engellenmiş çerezler). */
function safeGet(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function safeSet(value: string): boolean {
  try {
    localStorage.setItem(KEY, value)
    return true
  } catch {
    return false
  }
}

export function loadState(): AppState {
  const raw = safeGet()
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(raw) as AppState
    if (parsed.version !== STATE_VERSION) return migrate(parsed)
    // Ayarlara sonradan eklenen alanlar eski kayıtlarda yok; varsayılanla doldur.
    parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings }
    parsed.dictationDone ??= []
    return parsed
  } catch {
    return emptyState()
  }
}

function migrate(old: Partial<AppState>): AppState {
  // Şimdilik tek sürüm var; ileride burada alan dönüşümleri yapılacak.
  const fresh = emptyState()
  return {
    ...fresh,
    profile: { ...fresh.profile, ...old.profile },
    settings: { ...fresh.settings, ...old.settings },
    vocab: old.vocab ?? {},
    sessions: old.sessions ?? {},
    dictationDone: old.dictationDone ?? [],
  }
}

export function saveState(state: AppState): boolean {
  return safeSet(JSON.stringify(state))
}

export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function bumpSession(
  state: AppState,
  patch: Partial<Omit<StudySession, 'day'>>,
): AppState {
  const day = todayKey()
  const prev = state.sessions[day] ?? { day, seconds: 0, reviews: 0, newWords: 0 }
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [day]: {
        day,
        seconds: prev.seconds + (patch.seconds ?? 0),
        reviews: prev.reviews + (patch.reviews ?? 0),
        newWords: prev.newWords + (patch.newWords ?? 0),
      },
    },
  }
}

/* ---------- dışa / içe aktarma ---------- */

export function exportState(state: AppState): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), app: 'deutsch-lernen', ...state },
    null,
    2,
  )
}

export interface ImportResult {
  ok: boolean
  state?: AppState
  error?: string
}

export function importState(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, error: 'invalid-shape' }
  }
  const candidate = parsed as Partial<AppState> & { app?: string }
  if (candidate.app !== 'deutsch-lernen' || !candidate.vocab) {
    return { ok: false, error: 'not-our-file' }
  }
  return { ok: true, state: migrate(candidate) }
}

/* ---------- toplam istatistik ---------- */

export interface Totals {
  /** toplam çalışılan saat */
  hours: number
  /** öğrenilmeye başlanmış kelime */
  seen: number
  /** olgunlaşmış kelime (aralık ≥ 21 gün) — bilgi "yerleşmiş" sayılır */
  mature: number
  reviews: number
  /** art arda çalışılan gün */
  streak: number
}

export function computeTotals(state: AppState): Totals {
  let seconds = 0
  let reviews = 0
  for (const s of Object.values(state.sessions)) {
    seconds += s.seconds
    reviews += s.reviews
  }
  const cards = Object.values(state.vocab)
  const mature = cards.filter((v) => v.card.s >= 21).length

  // Seri: bugünden (veya dünden) geriye doğru kesintisiz günler
  const days = new Set(Object.keys(state.sessions).filter((d) => state.sessions[d].seconds > 0))
  let streak = 0
  const cursor = new Date()
  if (!days.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(todayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return { hours: seconds / 3600, seen: cards.length, mature, reviews, streak }
}

/**
 * Goethe-Institut'un yayımladığı rehberli ders saati tahminleri.
 * Kümülatif, sıfırdan o seviyeye. "Saat bankası" göstergesi bunu kullanıyor:
 * sahte rozet yerine gerçek bir ölçüye karşı ilerleme göstermek için.
 */
export const GUIDED_HOURS: Record<Level, number> = {
  A1: 120,
  A2: 240,
  B1: 400,
  B2: 700,
  C1: 1000,
}
