import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Stat } from '../components/ui'
import { GUIDED_HOURS, todayKey } from '../lib/storage'
import { retrievability } from '../lib/fsrs'
import { LEVELS } from '../lib/types'

/** Son 8 haftanın günlük çalışma süresi */
function buildHeatmap(sessions: Record<string, { seconds: number }>) {
  const days: { key: string; minutes: number }[] = []
  const d = new Date()
  for (let i = 55; i >= 0; i--) {
    const day = new Date(d)
    day.setDate(d.getDate() - i)
    const key = todayKey(day)
    days.push({ key, minutes: (sessions[key]?.seconds ?? 0) / 60 })
  }
  return days
}

export default function Progress() {
  const { state, totals, lang } = useStore()
  const level = state.profile.level

  const heat = useMemo(() => buildHeatmap(state.sessions), [state.sessions])

  /** Kartların bellekteki durumu: ne kadarı hâlâ taze? */
  const health = useMemo(() => {
    const now = Date.now()
    let fresh = 0
    let fading = 0
    let forgotten = 0
    for (const v of Object.values(state.vocab)) {
      if (v.card.state === 'new') continue
      const r = retrievability(v.card, now)
      if (r >= 0.9) fresh++
      else if (r >= 0.7) fading++
      else forgotten++
    }
    return { fresh, fading, forgotten }
  }, [state.vocab])

  const target = level ? GUIDED_HOURS[level] : GUIDED_HOURS.B2
  const maxMin = Math.max(30, ...heat.map((h) => h.minutes))

  return (
    <main className="main">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>{t('progress', lang)}</h1>
        {level && <Badge kind="level">{level}</Badge>}
      </div>

      <div className="grid three">
        <Stat n={totals.hours.toFixed(1)} label={t('studiedHours', lang)} />
        <Stat n={totals.seen} label={t('wordsSeen', lang)} />
        <Stat n={totals.mature} label={t('wordsMature', lang)} />
        <Stat n={totals.reviews} label={t('totalReviews', lang)} />
        <Stat n={totals.streak} label={t('streak', lang)} />
        <Stat
          n={state.profile.estimatedVocab?.toLocaleString() ?? '—'}
          label={t('estimatedVocab', lang)}
        />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>{t('hourBank', lang)}</h3>
          <span className="mono small muted">
            {totals.hours.toFixed(1)} / {target}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (totals.hours / target) * 100)}%` }} />
          </div>
        </div>
        <div className="row small muted" style={{ marginTop: 8, gap: 12 }}>
          {LEVELS.map((l) => (
            <span key={l} className="mono">
              {l}: {GUIDED_HOURS[l]}h
            </span>
          ))}
        </div>
        <p className="hint">{t('hourBankExplain', lang)}</p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>
          {lang === 'tr' && 'Bellek durumu'}
          {lang === 'az' && 'Yaddaş vəziyyəti'}
          {lang === 'ru' && 'Состояние памяти'}
          {lang === 'de' && 'Gedächtnisstand'}
        </h3>
        <p className="hint" style={{ marginTop: 0 }}>
          {lang === 'tr' && 'FSRS her kelime için şu anki hatırlama olasılığını hesaplar. Soluklaşan kelimeler tekrar sırasına girer.'}
          {lang === 'az' && 'FSRS hər söz üçün hazırkı yada salma ehtimalını hesablayır. Solğunlaşan sözlər təkrar növbəsinə düşür.'}
          {lang === 'ru' && 'FSRS вычисляет текущую вероятность вспоминания для каждого слова. Угасающие слова попадают в очередь повторения.'}
          {lang === 'de' && 'FSRS berechnet für jedes Wort die aktuelle Abrufwahrscheinlichkeit. Verblassende Wörter kommen in die Wiederholung.'}
        </p>
        <div className="row" style={{ gap: 10 }}>
          <Badge kind="ok">≥90% · {health.fresh}</Badge>
          <Badge kind="warn">70-90% · {health.fading}</Badge>
          <Badge kind="bad">&lt;70% · {health.forgotten}</Badge>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>
          {lang === 'tr' && 'Son 8 hafta'}
          {lang === 'az' && 'Son 8 həftə'}
          {lang === 'ru' && 'Последние 8 недель'}
          {lang === 'de' && 'Letzte 8 Wochen'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
          {heat.map((h) => {
            const strength = Math.min(1, h.minutes / maxMin)
            return (
              <div
                key={h.key}
                title={`${h.key} · ${Math.round(h.minutes)} ${t('minutes', lang)}`}
                style={{
                  aspectRatio: '1',
                  borderRadius: 4,
                  background:
                    strength === 0
                      ? 'var(--surface-2)'
                      : `color-mix(in srgb, var(--accent) ${Math.round(20 + strength * 80)}%, var(--surface-2))`,
                }}
              />
            )
          })}
        </div>
      </div>

      {!level && (
        <div className="card center" style={{ marginTop: 14 }}>
          <Link to="/placement">
            <button className="primary">{t('placementTitle', lang)}</button>
          </Link>
        </div>
      )}
    </main>
  )
}
