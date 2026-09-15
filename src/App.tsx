import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store'
import { t, type StringKey } from './i18n/strings'
import { Icon, type IconName } from './components/icons'
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
 * GEZİNME — iki yerleşim, tek kaynak
 *
 * Eskiden dokuz bölüm üstte yan yana kayan tek bir şeritteydi. Telefonda
 * bu kullanılabilir değil: hedefler başparmağın ulaşamadığı yerde ve
 * yarısı ekran dışında kalıyor.
 *
 * Şimdi aynı liste iki farklı yerleşime besleniyor:
 *   • Telefon  → altta beş sekme. İlk dördü en sık kullanılanlar, beşincisi
 *                kalanları açan bir sayfa. Başparmak bölgesinde duruyor.
 *   • Masaüstü → solda sabit kenar çubuğu. Hepsi aynı anda görünür,
 *                okuma alanı ortada dar ve rahat kalıyor.
 *
 * PRIMARY/SECONDARY ayrımı kullanım sırasına göre: günlük plan ve kurs her
 * gün açılıyor, sözlük ve öğretmen ise ihtiyaç oldukça.
 */
type NavItem = { to: string; key: StringKey; icon: IconName }

const PRIMARY: NavItem[] = [
  { to: '/', key: 'home', icon: 'home' },
  { to: '/plan', key: 'todayPlan', icon: 'calendar' },
  { to: '/course', key: 'course', icon: 'course' },
  { to: '/study', key: 'study', icon: 'cards' },
]

const SECONDARY: NavItem[] = [
  { to: '/listening', key: 'listening', icon: 'headphones' },
  { to: '/reading', key: 'reading', icon: 'text' },
  { to: '/dictionary', key: 'dictionary', icon: 'book' },
  { to: '/tutor', key: 'tutor', icon: 'chat' },
  { to: '/progress', key: 'progress', icon: 'chart' },
]

const MORE_LABEL = { tr: 'Daha fazla', az: 'Daha çox', ru: 'Ещё', de: 'Mehr' }

export default function App() {
  const { lang, state } = useStore()
  const { theme } = state.settings
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

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

  // Sayfa değişince "daha fazla" paneli kapansın ve başa dönülsün
  useEffect(() => {
    setMoreOpen(false)
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  // Panel açıkken arkadaki sayfa kaymasın
  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  const link = (item: NavItem, withLabel = true) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) => (isActive ? 'active' : undefined)}
    >
      <Icon name={item.icon} />
      {withLabel && <span>{t(item.key, lang)}</span>}
    </NavLink>
  )

  const secondaryActive = SECONDARY.some((s) => location.pathname.startsWith(s.to))

  return (
    <div className="app">
      {/* — masaüstü: sol kenar çubuğu — */}
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          Deutsch<b>.</b>
        </NavLink>
        <nav className="side-nav">
          {PRIMARY.map((i) => link(i))}
          <hr />
          {SECONDARY.map((i) => link(i))}
        </nav>
        <NavLink to="/settings" className="side-settings">
          <Icon name="settings" size={20} />
          <span>{t('settings', lang)}</span>
        </NavLink>
      </aside>

      {/* — telefon: ince üst başlık — */}
      <header className="topbar">
        <NavLink to="/" className="brand">
          Deutsch<b>.</b>
        </NavLink>
        <NavLink to="/settings" className="icon-btn" title={t('settings', lang)}>
          <Icon name="settings" size={21} />
          <span className="sr-only">{t('settings', lang)}</span>
        </NavLink>
      </header>

      <div className="content">
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

      {/* — telefon: alt sekme çubuğu — */}
      <nav className="tabbar">
        {PRIMARY.map((i) => link(i))}
        <button
          type="button"
          className={secondaryActive || moreOpen ? 'active' : undefined}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          <Icon name="more" />
          <span>{MORE_LABEL[lang]}</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sheet-grid">
              {SECONDARY.map((i) => link(i))}
              <NavLink to="/settings">
                <Icon name="settings" />
                <span>{t('settings', lang)}</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
