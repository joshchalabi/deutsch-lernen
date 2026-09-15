import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './lib/store'
import { t } from './i18n/strings'
import Home from './modules/Home'
import Placement from './modules/Placement'
import Study from './modules/Study'
import Dictionary from './modules/Dictionary'
import Listening from './modules/Listening'
import Reading from './modules/Reading'
import Grammar from './modules/Grammar'
import Progress from './modules/Progress'
import Settings from './modules/Settings'
import Course from './modules/Course'
import Lesson from './modules/Lesson'
import DailyPlan from './modules/DailyPlan'
import Tutor from './modules/Tutor'

/**
 * Gezinme iki katmanlı: önce KURS (kitap gibi sıralı dersler) ve GÜNLÜK PLAN,
 * sonra serbest çalışma bölümleri. Yeni başlayan biri ilk ikisini kullanır,
 * ileri seviye kullanıcı doğrudan modüllere gider.
 */
const NAV = [
  { to: '/', key: 'home' },
  { to: '/plan', key: 'todayPlan' },
  { to: '/course', key: 'course' },
  { to: '/study', key: 'study' },
  { to: '/listening', key: 'listening' },
  { to: '/reading', key: 'reading' },
  { to: '/dictionary', key: 'dictionary' },
  { to: '/tutor', key: 'tutor' },
  { to: '/progress', key: 'progress' },
] as const

export default function App() {
  const { lang, state } = useStore()
  const { theme } = state.settings

  // Tema: 'system' seçiliyse işletim sistemi tercihini izle
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    if (theme !== 'system') {
      root.classList.remove('prefers-dark')
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.classList.toggle('prefers-dark', mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  // Ekran okuyucular ve yazım denetimi için sayfa dilini bildir
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          Deutsch<span>.</span>
        </NavLink>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {t(item.key, lang)}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/settings" className="nav-settings" title={t('settings', lang)}>
          <span aria-hidden="true">⚙</span>
          <span className="sr-only">{t('settings', lang)}</span>
        </NavLink>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/placement" element={<Placement />} />
        <Route path="/plan" element={<DailyPlan />} />
        <Route path="/course" element={<Course />} />
        <Route path="/lesson/:unitId" element={<Lesson />} />
        <Route path="/study" element={<Study />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/dictionary" element={<Dictionary />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
