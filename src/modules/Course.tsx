/**
 * Kurs — kitabın içindekiler sayfası.
 *
 * Üniteler sırayla ilerler ve her birinin tamamlanma durumu görünür.
 * Kilit YOK: bir sonraki üniteyi açmak için öncekini bitirme zorunluluğu
 * koymadık. Mentörlü öğrenmede öğretmen sırayı bozmak isteyebilir ve
 * yapay kilitler yalnızca engel çıkarır. Sıra tavsiyedir, duvar değil.
 */

import { Link } from 'react-router-dom'
import { loadCurriculum } from '../lib/data'
import { LESSON_STEPS, LEVELS, type Curriculum, type Level } from '../lib/types'
import { useStore } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, useAsync } from '../components/ui'
import { GAME_NAMES } from './Games'

export default function Course() {
  const { lang } = useStore()
  const cur = useAsync(() => loadCurriculum(), [])
  return (
    <main className="main">
      <h1>{t('course', lang)}</h1>
      <Loading state={cur}>{(c) => <Levels cur={c} />}</Loading>
    </main>
  )
}

function Levels({ cur }: { cur: Curriculum }) {
  const { state, lang } = useStore()
  const available = LEVELS.filter((l) => cur[l]?.units.length)

  if (!available.length) {
    return <div className="card muted center">—</div>
  }

  return (
    <>
      {available.map((level) => (
        <LevelSection key={level} level={level} cur={cur} />
      ))}

      {state.profile.level && !available.includes(state.profile.level) && (
        <div className="notice" style={{ marginTop: 16 }}>
          {{ tr: `Seviyeniz ${state.profile.level}. Bu seviye için ders modülleri henüz hazır değil — şimdilik serbest çalışma bölümlerini ve sözlüğü kullanabilirsiniz.`,
             az: `Səviyyəniz ${state.profile.level}. Bu səviyyə üçün dərs modulları hələ hazır deyil — hələlik sərbəst çalışma bölmələrindən istifadə edə bilərsiniz.`,
             ru: `Ваш уровень ${state.profile.level}. Уроки для этого уровня пока не готовы — пользуйтесь свободными разделами и словарём.`,
             de: `Ihr Niveau ist ${state.profile.level}. Für dieses Niveau gibt es noch keine Lektionen — nutzen Sie solange die freien Bereiche.` }[lang]}
        </div>
      )}
    </>
  )
}

function LevelSection({ level, cur }: { level: Level; cur: Curriculum }) {
  const { state, lang } = useStore()
  const data = cur[level]!
  const totalSteps = LESSON_STEPS.length

  const doneUnits = data.units.filter(
    (u) => (state.units[u.id]?.steps.length ?? 0) >= totalSteps,
  ).length

  return (
    <section style={{ marginBottom: 28 }}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2 style={{ margin: 0 }}>{data.title[lang]}</h2>
        <Badge kind={doneUnits === data.units.length ? 'ok' : 'level'}>
          {doneUnits} / {data.units.length}
        </Badge>
      </div>
      <p className="muted small">{data.description[lang]}</p>

      <div className="unit-grid">
        {data.units.map((u, idx) => {
          const steps = state.units[u.id]?.steps.length ?? 0
          const pct = Math.round((steps / totalSteps) * 100)
          const complete = steps >= totalSteps
          return (
            <Link
              key={u.id}
              to={`/lesson/${u.id}`}
              className={`unit-card ${complete ? 'complete' : ''} ${steps > 0 && !complete ? 'started' : ''}`}
            >
              <div className="unit-no">{complete ? '✓' : idx + 1}</div>
              <div className="unit-body">
                <div className="unit-title">{u.title[lang]}</div>
                <div className="unit-theme">{u.theme[lang]}</div>
                <div className="unit-meta">
                  📖 {u.words.length} · 📐 {u.grammar.length} · 🎮 {GAME_NAMES[u.game]?.[lang]}
                </div>
                {steps > 0 && (
                  <div className="bar tiny-bar"><i style={{ width: `${pct}%` }} /></div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
