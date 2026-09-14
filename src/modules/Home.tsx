import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Stat } from '../components/ui'
import { GUIDED_HOURS } from '../lib/storage'
import { isDue } from '../lib/fsrs'
import { LEVELS } from '../lib/types'

export default function Home() {
  const { state, totals, lang } = useStore()
  const level = state.profile.level

  const dueCount = Object.values(state.vocab).filter((v) => isDue(v.card)).length
  const target = level ? GUIDED_HOURS[level] : GUIDED_HOURS.B2
  const hourProgress = Math.min(1, totals.hours / target)

  return (
    <main className="main">
      {!level ? (
        <div className="card">
          <h1>{t('appName', lang)}</h1>
          <p className="muted">{t('placementIntro', lang)}</p>
          <Link to="/placement">
            <button className="primary big">{t('placementTitle', lang)} →</button>
          </Link>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="row between">
              <h1 style={{ margin: 0 }}>{t('appName', lang)}</h1>
              <Badge kind="level">{level}</Badge>
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <Link to="/study" style={{ flex: 1, minWidth: 180 }}>
                <button className="primary big block">
                  {t('study', lang)}
                  {dueCount > 0 && ` · ${dueCount}`}
                </button>
              </Link>
              <Link to="/listening" style={{ flex: 1, minWidth: 140 }}>
                <button className="big block">{t('listening', lang)}</button>
              </Link>
            </div>
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
              <div className="bar"><i style={{ width: `${hourProgress * 100}%` }} /></div>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>{t('hourBankExplain', lang)}</p>
          </div>

          <div className="grid two" style={{ marginTop: 14 }}>
            <Link to="/reading" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h3>{t('reading', lang)}</h3>
              <p className="small muted" style={{ margin: 0 }}>{t('coverageExplain', lang)}</p>
            </Link>
            <Link to="/grammar" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <h3>{t('grammar', lang)}</h3>
              <p className="small muted" style={{ margin: 0 }}>
                {t('caseLabel', lang)} · {t('verbForms', lang)}
              </p>
            </Link>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h3>{t('progress', lang)}</h3>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {LEVELS.map((l) => (
                <Badge key={l} kind={LEVELS.indexOf(l) <= LEVELS.indexOf(level) ? 'ok' : undefined}>
                  {l}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
