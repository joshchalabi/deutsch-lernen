/**
 * Gezinme ve arayüz simgeleri.
 *
 * NEDEN EMOJİ DEĞİL?
 *   Emoji her işletim sisteminde başka çiziliyor: Android'de dolgun,
 *   Windows'ta düz, Linux'ta çoğu zaman kutu. Gezinme çubuğu gibi
 *   sabit duran bir yerde bu tutarsızlık hemen göze batıyor.
 *   Bu çizgi simgeler `currentColor` kullandığı için tema ve durum
 *   rengini kendiliğinden alıyor, toplam maliyeti birkaç kilobayt.
 */

export type IconName =
  | 'home' | 'calendar' | 'course' | 'cards' | 'headphones'
  | 'text' | 'book' | 'chat' | 'chart' | 'settings' | 'more'

const D: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6',
  calendar: 'M4 6.5h16v14H4zM4 10.5h16M8.5 3v4M15.5 3v4M8 15h3',
  course: 'M4 5.5A2 2 0 0 1 6 4h13v15H6a2 2 0 0 0-2 2zM19 19v2M8 8.5h7M8 12h5',
  cards: 'M7.5 7h10.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM4 16.5V6.5a2 2 0 0 1 2-2h10',
  headphones: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2.5 2.5 0 0 1 5 0v3a2.5 2.5 0 0 1-5 0zM15 14a2.5 2.5 0 0 1 5 0v3a2.5 2.5 0 0 1-5 0z',
  text: 'M5 4.5h14v15H5zM8.5 9h7M8.5 12.5h7M8.5 16h4',
  book: 'M4.5 5.5h6a2.5 2.5 0 0 1 2.5 2.5v11a2 2 0 0 0-2-2h-6.5zM19.5 5.5h-6A2.5 2.5 0 0 0 11 8v11a2 2 0 0 1 2-2h6.5z',
  chat: 'M20 13.5a3 3 0 0 1-3 3H9l-4.5 3.5V7a3 3 0 0 1 3-3h9.5a3 3 0 0 1 3 3zM9 10h7M9 13h4',
  chart: 'M4 20h16M7.5 20v-6M12 20V7M16.5 20v-9',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.5 12a7.5 7.5 0 0 0-.12-1.32l2-1.55-2-3.46-2.35.95a7.5 7.5 0 0 0-2.29-1.33L14.4 2.9h-4l-.34 2.39a7.5 7.5 0 0 0-2.29 1.33l-2.35-.95-2 3.46 2 1.55a7.5 7.5 0 0 0 0 2.64l-2 1.55 2 3.46 2.35-.95a7.5 7.5 0 0 0 2.29 1.33l.34 2.39h4l.34-2.39a7.5 7.5 0 0 0 2.29-1.33l2.35.95 2-3.46-2-1.55c.08-.43.12-.87.12-1.32z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
}

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={D[name]} />
    </svg>
  )
}
