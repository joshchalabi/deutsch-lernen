import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, Stat, useAsync } from '../components/ui'
import { GUIDED_HOURS } from '../lib/storage'
import { isDue } from '../lib/fsrs'
import { loadCurriculum } from '../lib/data'
import { LESSON_STEPS, type Curriculum } from '../lib/types'

export default function Home() {
  const { state, totals, lang } = useStore()
  const level = state.profile.level
  const cur = useAsync(() => loadCurriculum(), [])

  const dueCount = Object.values(state.vocab).filter((v) => isDue(v.card)).length
  const target = level ? GUIDED_HOURS[level] : GUIDED_HOURS.B2

  if (!level) {
    return (
      <main className="main">
        <div className="card center celebrate">
          <div className="big-emoji">🇩🇪</div>
          <h1>{t('appName', lang)}</h1>
          <p className="muted">{t('placementIntro', lang)}</p>
          <Link to="/placement">
            <button className="primary big">{t('placementTitle', lang)} →</button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <div className="card">
        <div className="row between">
          <h1 style={{ margin: 0 }}>
            {{ tr: 'Hoş geldiniz', az: 'Xoş gəlmisiniz', ru: 'Добро пожаловать', de: 'Willkommen' }[lang]}
          </h1>
          <Badge kind="level">{level}</Badge>
        </div>

        <Link to="/plan">
          <button className="primary big block" style={{ marginTop: 14 }}>
            📅 {state.plan ? t('todayPlan', lang) : t('startDay', lang)}
          </button>
        </Link>

        <Loading state={cur}>{(c) => <NextLesson cur={c} />}</Loading>
      </div>

      <div className="grid three" style={{ marginTop: 14 }}>
        <Stat n={dueCount} label={t('dueToday', lang)} />
        <Stat n={totals.mature} label={t('wordsMature', lang)} />
        <Stat n={totals.streak} label={t('streak', lang)} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row between">
          <h3 style={{ margin: 0 }}>{t('hourBank', lang)}</h3>
          <span className="mono small muted">
            {totals.hours.toFixed(1)} / {target} {lang === 'de' ? 'Std.' : 'h'}
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="bar">
            <i style={{ width: `${Math.min(100, (totals.hours / target) * 100)}%` }} />
          </div>
        </div>
        <p className="hint">{t('hourBankExplain', lang)}</p>
      </div>

      <h3 style={{ marginTop: 22 }}>{t('freePractice', lang)}</h3>
      <div className="grid three">
        {([
          ['/study', '📖', 'study'],
          ['/listening', '🎧', 'listening'],
          ['/reading', '📰', 'reading'],
          ['/grammar', '📐', 'grammar'],
          ['/dictionary', '🔍', 'dictionary'],
          ['/progress', '📊', 'progress'],
        ] as const).map(([to, icon, key]) => (
          <Link key={to} to={to} className="unit-card" style={{ alignItems: 'center' }}>
            <div className="unit-no">{icon}</div>
            <div className="unit-body">
              <div className="unit-title">{t(key, lang)}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

/** Sıradaki bitmemiş ünite — ana sayfadan tek tıkla devam */
function NextLesson({ cur }: { cur: Curriculum }) {
  const { state, lang } = useStore()

  const next = useMemo(() => {
    const level = state.profile.level ?? 'A1'
    for (const l of [level, 'A1', 'A2'] as const) {
      const unit = cur[l]?.units.find(
        (u) => (state.units[u.id]?.steps.length ?? 0) < LESSON_STEPS.length,
      )
      if (unit) {
        const done = state.units[unit.id]?.steps.length ?? 0
        return { unit, started: done > 0, pct: (done / LESSON_STEPS.length) * 100 }
      }
    }
    return null
  }, [cur, state.profile.level, state.units])

  if (!next) return null

  return (
    <Link to={`/lesson/${next.unit.id}`} className="unit-card" style={{ marginTop: 10 }}>
      <div className="unit-no">📚</div>
      <div className="unit-body">
        <div className="unit-theme">
          {next.started ? t('continueLesson', lang) : t('todayLesson', lang)}
        </div>
        <div className="unit-title">{next.unit.title[lang]}</div>
        {next.started && <div className="bar tiny-bar"><i style={{ width: `${next.pct}%` }} /></div>}
      </div>
    </Link>
  )
}
