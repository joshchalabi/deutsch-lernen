import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t, LANG_NAMES } from '../i18n/strings'
import { exportState, importState } from '../lib/storage'
import { UI_LANGS, type TransLang, type UiLang } from '../lib/types'
import { PROVIDER_INFO, type AiProvider } from '../lib/ai'

export default function Settings() {
  const { state, lang, setSettings, replaceState } = useStore()
  const s = state.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const doExport = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deutsch-lernen-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (file: File) => {
    const text = await file.text()
    const result = importState(text)
    if (result.ok && result.state) {
      replaceState(result.state)
      setMessage({ ok: true, text: t('importOk', lang) })
    } else {
      setMessage({ ok: false, text: t('importFail', lang) })
    }
  }

  return (
    <main className="main">
      <h1>{t('settings', lang)}</h1>

      <div className="card">
        <div className="field">
          <label>{t('uiLanguage', lang)}</label>
          <select value={s.uiLang} onChange={(e) => setSettings({ uiLang: e.target.value as UiLang })}>
            {UI_LANGS.map((l) => (
              <option key={l} value={l}>{LANG_NAMES[l]}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t('translationLanguage', lang)}</label>
          <select
            value={s.transLang}
            onChange={(e) => setSettings({ transLang: e.target.value as TransLang })}
          >
            <option value="tr">{LANG_NAMES.tr}</option>
            <option value="az">{LANG_NAMES.az}</option>
            <option value="ru">{LANG_NAMES.ru}</option>
          </select>
          {s.transLang === 'az' && (
            <p className="hint">{t('bridgedExplain', lang)}</p>
          )}
        </div>

        <div className="field">
          <label>{t('theme', lang)}</label>
          <select value={s.theme} onChange={(e) => setSettings({ theme: e.target.value as typeof s.theme })}>
            <option value="system">{t('themeSystem', lang)}</option>
            <option value="light">{t('themeLight', lang)}</option>
            <option value="dark">{t('themeDark', lang)}</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>{t('newPerDay', lang)}: <strong className="mono">{s.newPerDay}</strong></label>
          <input
            type="range" min={0} max={50} step={1} value={s.newPerDay}
            onChange={(e) => setSettings({ newPerDay: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <label>{t('maxReviews', lang)}: <strong className="mono">{s.maxReviews}</strong></label>
          <input
            type="range" min={20} max={400} step={10} value={s.maxReviews}
            onChange={(e) => setSettings({ maxReviews: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <label>
            {t('targetRetention', lang)}:{' '}
            <strong className="mono">{Math.round(s.requestRetention * 100)}%</strong>
          </label>
          <input
            type="range" min={0.8} max={0.97} step={0.01} value={s.requestRetention}
            onChange={(e) => setSettings({ requestRetention: Number(e.target.value) })}
          />
          <p className="hint">{t('retentionExplain', lang)}</p>
        </div>
      </div>

      <div className="card">
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={s.ttsFallback}
              onChange={(e) => setSettings({ ttsFallback: e.target.checked })}
              style={{ width: 'auto', marginInlineEnd: 8 }}
            />
            {t('ttsFallback', lang)}
          </label>
          <p className="hint">{t('ttsFallbackNote', lang)}</p>
        </div>
      </div>

      <AiSection />

      <div className="card">
        <h3>{t('exportData', lang)}</h3>
        <p className="hint" style={{ marginTop: 0 }}>{t('exportNote', lang)}</p>
        <div className="row">
          <button className="primary" onClick={doExport}>{t('exportData', lang)}</button>
          <button onClick={() => fileRef.current?.click()}>{t('importData', lang)}</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
              e.target.value = ''
            }}
          />
        </div>
        {message && (
          <div className={`feedback ${message.ok ? 'ok' : 'bad'}`} style={{ marginTop: 10 }}>
            {message.text}
          </div>
        )}
      </div>

      <div className="card">
        <h3>{t('placementTitle', lang)}</h3>
        <p className="small muted">
          {state.profile.level
            ? `${t('placementResult', lang)}: ${state.profile.level}`
            : '—'}
        </p>
        <Link to="/placement"><button>{t('retakePlacement', lang)}</button></Link>
      </div>

      <Attribution />
    </main>
  )
}

/**
 * Yapay zekâ ayarları.
 *
 * Anahtar alanı type="password": omuz üstünden okunmasın diye. Değeri
 * yalnızca localStorage'da durur ve yedeğe girmez (bkz. storage.ts).
 */
function AiSection() {
  const { state, lang, setSettings } = useStore()
  const ai = state.settings.ai
  const info = ai.provider === 'off' ? null : PROVIDER_INFO[ai.provider]

  const setProvider = (provider: AiProvider) => {
    const next = provider === 'off' ? null : PROVIDER_INFO[provider]
    setSettings({
      ai: { ...ai, provider, model: next ? next.defaultModel : ai.model },
    })
  }

  return (
    <div className="card">
      <h3>🤖 {t('tutor', lang)}</h3>

      <div className="field">
        <label>{t('aiProvider', lang)}</label>
        <select value={ai.provider} onChange={(e) => setProvider(e.target.value as AiProvider)}>
          <option value="off">{t('aiOff', lang)}</option>
          <option value="openrouter">{PROVIDER_INFO.openrouter.label}</option>
          <option value="gemini">{PROVIDER_INFO.gemini.label}</option>
          <option value="pollinations">{PROVIDER_INFO.pollinations.label}</option>
        </select>
      </div>

      {info?.needsKey && (
        <div className="field">
          <label>{t('aiApiKey', lang)}</label>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={ai.apiKey}
            placeholder="sk-…"
            onChange={(e) => setSettings({ ai: { ...ai, apiKey: e.target.value } })}
          />
          <p className="hint">
            <a href={info.signup} target="_blank" rel="noreferrer">{info.signup}</a>
          </p>
        </div>
      )}

      {ai.provider !== 'off' && (
        <div className="field">
          <label>{t('aiModel', lang)}</label>
          <input
            type="text"
            spellCheck={false}
            value={ai.model}
            onChange={(e) => setSettings({ ai: { ...ai, model: e.target.value } })}
          />
        </div>
      )}

      {ai.provider === 'pollinations' && (
        <div className="feedback bad small">{t('aiPollinationsNote', lang)}</div>
      )}

      <p className="hint">{t('aiPrivacyNote', lang)}</p>
    </div>
  )
}

/**
 * Kaynak ve lisans künyesi.
 * Kullanılan veri kümelerinin hepsi atıf zorunlu lisanslarla geliyor;
 * bu bölüm yasal bir gereklilik, süs değil.
 */
function Attribution() {
  const { lang } = useStore()
  return (
    <div className="card">
      <h3>
        {lang === 'tr' && 'Kaynaklar ve lisanslar'}
        {lang === 'az' && 'Mənbələr və lisenziyalar'}
        {lang === 'ru' && 'Источники и лицензии'}
        {lang === 'de' && 'Quellen und Lizenzen'}
      </h3>
      <ul className="small muted" style={{ paddingInlineStart: 18, lineHeight: 1.8 }}>
        <li>
          Sözlük, çekim tabloları, IPA, kelime telaffuzu:{' '}
          <a href="https://de.wiktionary.org" target="_blank" rel="noreferrer">Wiktionary</a>
          {' '}(CC BY-SA 3.0), <a href="https://kaikki.org" target="_blank" rel="noreferrer">kaikki.org</a> üzerinden
        </li>
        <li>
          Cümleler ve ses kayıtları:{' '}
          <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR)
        </li>
        <li>
          Frekans listesi:{' '}
          <a href="https://github.com/hermitdave/FrequencyWords" target="_blank" rel="noreferrer">
            OpenSubtitles 2018
          </a>{' '}(CC BY-SA 4.0)
        </li>
        <li>
          Ek çeviriler:{' '}
          <a href="https://freedict.org" target="_blank" rel="noreferrer">FreeDict</a>{' '}
          deu-tur (GPL-2.0+), deu-rus (CC BY-SA 3.0)
        </li>
        <li>
          Aralıklı tekrar:{' '}
          <a href="https://github.com/open-spaced-repetition/fsrs4anki" target="_blank" rel="noreferrer">
            FSRS-4.5
          </a>{' '}(MIT)
        </li>
      </ul>
      <p className="hint">
        {lang === 'tr' && 'Seviye bandları frekans sırasına göre hesaplanıyor; telifli sınav kelime listeleri kullanılmadı.'}
        {lang === 'az' && 'Səviyyə zolaqları tezlik sırasına görə hesablanır; müəllif hüququ ilə qorunan imtahan söz siyahıları istifadə edilməyib.'}
        {lang === 'ru' && 'Уровни рассчитаны по частотности; защищённые авторским правом экзаменационные списки слов не использовались.'}
        {lang === 'de' && 'Die Niveaustufen beruhen auf Häufigkeitsrängen; urheberrechtlich geschützte Prüfungswortlisten wurden nicht verwendet.'}
      </p>
    </div>
  )
}
