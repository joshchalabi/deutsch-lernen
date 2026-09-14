import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import { loadState, saveState, bumpSession, computeTotals, type Totals } from './storage'
import { newCard, schedule, type Rating } from './fsrs'
import type { AppState, Lemma, Settings, Level } from './types'
import { lemmaKey } from './data'

interface Store {
  state: AppState
  totals: Totals
  lang: AppState['settings']['uiLang']
  setSettings: (patch: Partial<Settings>) => void
  setLevel: (level: Level, estimatedVocab: number) => void
  /** Kelimeyi çalışma destesine ekler (zaten varsa dokunmaz) */
  addWord: (lemma: Lemma) => void
  /** Bir kelimeyi derecelendirir ve FSRS'e göre yeniden planlar */
  rate: (lemma: Lemma, rating: Rating, correct: boolean) => void
  markDictation: (sentenceId: string) => void
  /** Çalışma süresini saniye olarak ekler */
  addTime: (seconds: number) => void
  replaceState: (next: AppState) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState())

  // Yazmayı geciktir: her tuş vuruşunda localStorage'a yazmak arayüzü takar.
  const saveTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => saveState(state), 400)
    return () => window.clearTimeout(saveTimer.current)
  }, [state])

  // Sekme kapanırken bekleyen yazmayı kaçırmayalım
  useEffect(() => {
    const flush = () => saveState(state)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [state])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  }, [])

  const setLevel = useCallback((level: Level, estimatedVocab: number) => {
    setState((s) => ({
      ...s,
      profile: { level, estimatedVocab, placedAt: Date.now() },
    }))
  }, [])

  const addWord = useCallback((lemma: Lemma) => {
    const key = lemmaKey(lemma)
    setState((s) => {
      if (s.vocab[key]) return s
      const withCard = {
        ...s,
        vocab: { ...s.vocab, [key]: { card: newCard(), hist: [] } },
      }
      return bumpSession(withCard, { newWords: 1 })
    })
  }, [])

  const rate = useCallback((lemma: Lemma, rating: Rating, correct: boolean) => {
    const key = lemmaKey(lemma)
    setState((s) => {
      const prev = s.vocab[key] ?? { card: newCard(), hist: [] }
      const { card } = schedule(prev.card, rating, Date.now(), {
        requestRetention: s.settings.requestRetention,
        maximumInterval: 365 * 3,
      })
      const next = {
        ...s,
        vocab: {
          ...s.vocab,
          [key]: { card, hist: [...prev.hist, correct].slice(-10) },
        },
      }
      return bumpSession(next, { reviews: 1 })
    })
  }, [])

  const markDictation = useCallback((sentenceId: string) => {
    setState((s) =>
      s.dictationDone.includes(sentenceId)
        ? s
        : { ...s, dictationDone: [...s.dictationDone, sentenceId].slice(-2000) },
    )
  }, [])

  const addTime = useCallback((seconds: number) => {
    if (seconds <= 0) return
    setState((s) => bumpSession(s, { seconds }))
  }, [])

  const replaceState = useCallback((next: AppState) => setState(next), [])

  const totals = useMemo(() => computeTotals(state), [state])

  const value = useMemo<Store>(
    () => ({
      state, totals, lang: state.settings.uiLang,
      setSettings, setLevel, addWord, rate, markDictation, addTime, replaceState,
    }),
    [state, totals, setSettings, setLevel, addWord, rate, markDictation, addTime, replaceState],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore, StoreProvider içinde kullanılmalı')
  return ctx
}

/**
 * Sayfada geçirilen süreyi ölçüp saat bankasına yazar.
 * Sekme arka plana alındığında sayaç durur — açık unutulan sekme
 * çalışma saati üretmemeli, yoksa gösterge anlamını yitirir.
 */
export function useStudyClock(active = true) {
  const { addTime } = useStore()
  const accumulated = useRef(0)
  const lastTick = useRef<number | null>(null)

  useEffect(() => {
    if (!active) return
    lastTick.current = Date.now()

    const tick = () => {
      if (document.hidden || lastTick.current === null) return
      const now = Date.now()
      const delta = (now - lastTick.current) / 1000
      lastTick.current = now
      // 60 saniyeden uzun boşluk = kullanıcı masada değildi
      if (delta < 60) accumulated.current += delta
    }

    const onVisibility = () => {
      if (document.hidden) {
        tick()
        lastTick.current = null
      } else {
        lastTick.current = Date.now()
      }
    }

    const id = window.setInterval(tick, 5000)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      tick()
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
      if (accumulated.current >= 1) {
        addTime(Math.round(accumulated.current))
        accumulated.current = 0
      }
    }
  }, [active, addTime])
}
