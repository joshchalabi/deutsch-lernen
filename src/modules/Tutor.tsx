/**
 * Yapay zekâ öğretmen — "şunu neden böyle diyoruz?" sorusunun yeri.
 *
 * Sitenin geri kalanı çevrimdışı ve veri göndermeden çalışıyor; burası tek
 * istisna ve tamamen isteğe bağlı. Kapalıyken kurulum ekranı gösteriliyor,
 * sahte bir sohbet penceresi değil.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  askAi, AiError, buildSystemPrompt, PROVIDER_INFO, starterQuestions,
  type AiMessage,
} from '../lib/ai'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'

export default function Tutor() {
  const { state, lang } = useStore()
  const [params] = useSearchParams()
  const about = params.get('word') ?? undefined

  const ai = state.settings.ai
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(
    async (text: string) => {
      const q = text.trim()
      if (!q || busy) return
      setError(null)
      setInput('')
      const next: AiMessage[] = [...messages, { role: 'user', content: q }]
      setMessages(next)
      setBusy(true)

      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      try {
        const reply = await askAi(
          ai,
          buildSystemPrompt(lang, state.profile.level),
          next,
          ctrl.signal,
        )
        setMessages([...next, { role: 'assistant', content: reply }])
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        const kind = e instanceof AiError ? e.kind : 'network'
        setError(
          kind === 'no-key'
            ? t('aiNeedsSetup', lang)
            : `${t('aiFailed', lang)} ${e instanceof Error ? e.message : ''}`.slice(0, 220),
        )
        // Cevapsız kalan soruyu geri al ki kullanıcı yeniden deneyebilsin
        setMessages(messages)
        setInput(q)
      } finally {
        setBusy(false)
      }
    },
    [ai, busy, lang, messages, state.profile.level],
  )

  if (ai.provider === 'off') return <SetupNeeded />

  const starters = starterQuestions(lang, about)

  return (
    <main className="main">
      <div className="row between" style={{ marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>🤖 {t('tutor', lang)}</h1>
        {messages.length > 0 && (
          <button className="ghost" onClick={() => { setMessages([]); setError(null) }}>
            {t('clearChat', lang)}
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="card">
          <p className="muted small" style={{ marginTop: 0 }}>{t('tutorIntro', lang)}</p>
          <div className="starters">
            {starters.map((s) => (
              <button key={s} className="starter" onClick={() => void send(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === 'assistant' ? <Formatted text={m.content} /> : m.content}
          </div>
        ))}
        {busy && (
          <div className="bubble assistant thinking">
            <span /><span /><span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="feedback bad" style={{ marginTop: 10 }}>{error}</div>}

      <form
        className="chat-input"
        onSubmit={(e) => { e.preventDefault(); void send(input) }}
      >
        <input
          type="text"
          value={input}
          disabled={busy}
          placeholder={t('askPlaceholder', lang)}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="primary" disabled={busy || !input.trim()}>→</button>
      </form>

      <p className="hint center" style={{ marginTop: 10 }}>{t('aiPrivacyNote', lang)}</p>
    </main>
  )
}

/**
 * Cevapları biçimlendirir. Almanca örnek cümleleri ayrı gösterebilmek için
 * satır başına bakıyoruz: tırnak içinde ya da tek başına duran Almanca
 * cümleler serif yazıyla çiziliyor, geri kalanı normal.
 */
function Formatted({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <br key={i} />
        const looksGerman = /^[»"„]?[A-ZÄÖÜ][^.!?]*[.!?]["«"]?$/.test(trimmed)
          && /\b(der|die|das|ich|du|er|sie|es|wir|ihr|ist|sind|hat|haben|ein|eine|nicht|und|zu|mit)\b/i.test(trimmed)
        return (
          <p key={i} className={looksGerman ? 'de chat-example' : undefined}>
            <Bold text={trimmed} />
          </p>
        )
      })}
    </>
  )
}

function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>,
      )}
    </>
  )
}

function SetupNeeded() {
  const { lang } = useStore()
  return (
    <main className="main">
      <div className="card center">
        <div className="big-emoji">🤖</div>
        <h1>{t('tutor', lang)}</h1>
        <p className="muted">{t('aiOffExplain', lang)}</p>
        <Link to="/settings">
          <button className="primary big">{t('settings', lang)} →</button>
        </Link>
      </div>

      <div className="card">
        <h3>{t('aiFreeOptions', lang)}</h3>
        <ul className="small muted" style={{ paddingInlineStart: 18, lineHeight: 1.9 }}>
          <li>
            <strong>{PROVIDER_INFO.openrouter.label}</strong> — {t('aiOpenrouterNote', lang)}{' '}
            <a href={PROVIDER_INFO.openrouter.signup} target="_blank" rel="noreferrer">
              openrouter.ai/keys
            </a>
          </li>
          <li>
            <strong>{PROVIDER_INFO.gemini.label}</strong> — {t('aiGeminiNote', lang)}{' '}
            <a href={PROVIDER_INFO.gemini.signup} target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
          </li>
          <li>
            <strong>{PROVIDER_INFO.pollinations.label}</strong> — {t('aiPollinationsNote', lang)}
          </li>
        </ul>
      </div>
    </main>
  )
}
