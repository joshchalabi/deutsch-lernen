import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { t, type StringKey } from '../i18n/strings'

export function Spinner() {
  return <div className="spinner" role="status" aria-label="loading" />
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { lang } = useStore()
  return (
    <div className="card">
      <h3>{t('error', lang)}</h3>
      <p className="muted small">{message}</p>
      {onRetry && <button onClick={onRetry}>{t('retry', lang)}</button>}
    </div>
  )
}

/** Veri yükleme durumu — her modülde tekrarlanan üçlü (yükleniyor/hata/veri) */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setData(null)
    setError(null)
    fn().then(
      (v) => alive && setData(v),
      (e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)),
    )
    return () => {
      alive = false
    }
    // fn kimliği her render değişir; bağımlılığı çağıran belirtir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, error, retry: () => setNonce((n) => n + 1) }
}

export function Loading<T>({
  state,
  children,
}: {
  state: { data: T | null; error: string | null; retry: () => void }
  children: (data: T) => ReactNode
}) {
  const { lang } = useStore()
  if (state.error) return <ErrorBox message={state.error} onRetry={state.retry} />
  if (!state.data) return <Spinner />
  void lang
  return <>{children(state.data)}</>
}

export function Badge({
  children,
  kind,
}: {
  children: ReactNode
  kind?: 'level' | 'ok' | 'warn' | 'bad'
}) {
  return <span className={`badge${kind ? ' ' + kind : ''}`}>{children}</span>
}

export function Stat({ n, label }: { n: ReactNode; label: string }) {
  return (
    <div className="card stat">
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  )
}

export function Bar({ value, ok }: { value: number; ok?: boolean }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)}>
      <i style={{ width: `${pct}%`, background: ok ? 'var(--ok)' : undefined }} />
    </div>
  )
}

export function T({ k }: { k: StringKey }) {
  const { lang } = useStore()
  return <>{t(k, lang)}</>
}

/* ---------- ses ---------- */

/**
 * Uygulama genelinde TEK ses öğesi.
 *
 * Önce her useAudio çağrısı kendi `new Audio()` nesnesini yaratıyordu. Okuma
 * sayfası cümle başına bir oynat düğmesi çizdiği için tek sayfada 80'den fazla
 * ses nesnesi oluşuyordu (ölçüldü). Zaten aynı anda yalnızca biri çalabilir;
 * tek öğe hem doğru davranış hem de mobilde oynatma izninin korunması için
 * gerekli.
 */
let sharedAudio: HTMLAudioElement | null = null
function getSharedAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null
  sharedAudio ??= new Audio()
  return sharedAudio
}

export function useAudio() {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  /**
   * Tarayıcı, kullanıcı sayfayla etkileşmeden ses çalmayı engeller
   * (NotAllowedError). Bu bir yükleme hatası DEĞİL — kullanıcıya "internetini
   * kontrol et" demek yanlış yönlendirme olur. Ayrı durum olarak tutuluyor.
   */
  const [blocked, setBlocked] = useState(false)
  const { state } = useStore()

  ref.current ??= getSharedAudio()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onEnd = () => setPlaying(false)
    const onErr = () => {
      setPlaying(false)
      setFailed(true)
    }
    el.addEventListener('ended', onEnd)
    el.addEventListener('error', onErr)
    return () => {
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('error', onErr)
      // Paylaşılan öğeyi burada durdurmuyoruz: başka bir bileşen çalıyor
      // olabilir ve bu bileşenin sökülmesi onun sesini kesmemeli.
    }
  }, [])

  const play = useCallback(
    (url: string, rate = state.settings.playbackRate) => {
      const el = ref.current
      if (!el) return
      setFailed(false)
      setBlocked(false)
      if (el.src !== url) el.src = url
      el.playbackRate = rate
      el.currentTime = 0
      setPlaying(true)
      el.play().catch((err: unknown) => {
        setPlaying(false)
        const name = err instanceof Error ? err.name : ''
        // NotAllowedError = otomatik oynatma engeli; AbortError = araya giren
        // yeni oynatma isteği. İkisi de kullanıcıya hata olarak gösterilmemeli.
        if (name === 'NotAllowedError') setBlocked(true)
        else if (name !== 'AbortError') setFailed(true)
      })
    },
    [state.settings.playbackRate],
  )

  const stop = useCallback(() => {
    ref.current?.pause()
    setPlaying(false)
  }, [])

  /**
   * Tarayıcı konuşma sentezi — yalnızca ayarlarda açıksa ve gerçek kayıt
   * yoksa. Varsayılan kapalı: insan kaydı her zaman daha iyi.
   */
  const speak = useCallback(
    (text: string, rate = state.settings.playbackRate) => {
      if (!state.settings.ttsFallback) return false
      if (typeof speechSynthesis === 'undefined') return false
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'de-DE'
      u.rate = rate
      speechSynthesis.speak(u)
      return true
    },
    [state.settings.ttsFallback, state.settings.playbackRate],
  )

  return { play, stop, speak, playing, failed, blocked }
}

export function PlayButton({
  url,
  text,
  rate,
  label,
}: {
  url: string | null
  text?: string
  rate?: number
  label?: string
}) {
  const { play, speak, playing } = useAudio()
  const { state } = useStore()
  const canTts = !url && text && state.settings.ttsFallback

  if (!url && !canTts) return null

  return (
    <button
      className="ghost"
      title={label}
      aria-label={label ?? 'play'}
      onClick={() => {
        if (url) play(url, rate)
        else if (text) speak(text, rate)
      }}
    >
      <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
    </button>
  )
}
