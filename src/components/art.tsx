/**
 * SVG görseller.
 *
 * NEDEN DOSYA DEĞİL, KOD?
 *   Site çevrimdışı ve dış bağımlılıksız çalışmalı. Hazır resim indirmek
 *   hem lisans hem boyut sorunu; ayrıca sabit renkli bir PNG koyu temada
 *   çirkin durur. Bu çizimler `currentColor` ve tema değişkenlerini
 *   kullanıyor, dolayısıyla açık/koyu temada kendiliğinden doğru görünüyor
 *   ve toplam maliyeti birkaç kilobayt.
 */

export type ArtName =
  | 'greeting' | 'family' | 'clock' | 'food' | 'shopping' | 'home'
  | 'action' | 'leisure' | 'health' | 'travel' | 'chat' | 'book'
  | 'trophy' | 'empty' | 'listen' | 'write'

const P = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Ünite temasına göre çizim seçer — kimlik önekinden tahmin ediyor. */
export function artForUnit(unitId: string): ArtName {
  const n = Number(unitId.split('-')[1] ?? 0)
  const byLevel: Record<string, ArtName[]> = {
    a1: ['greeting', 'family', 'clock', 'food', 'shopping', 'home', 'action', 'leisure', 'health', 'travel'],
    a2: ['chat', 'home', 'action', 'clock', 'health', 'book', 'write', 'travel', 'greeting', 'trophy'],
    b1: ['chat', 'book', 'leisure', 'action', 'home', 'listen', 'write', 'clock', 'family', 'chat'],
    b2: ['book', 'action', 'chat', 'listen', 'leisure', 'write', 'home', 'book', 'chat', 'trophy'],
  }
  const lvl = unitId.split('-')[0]
  return byLevel[lvl]?.[n - 1] ?? 'book'
}

export function Art({
  name, size = 96, className,
}: {
  name: ArtName
  size?: number
  className?: string
}) {
  const common = {
    width: size, height: size, viewBox: '0 0 64 64',
    className: `art ${className ?? ''}`,
    'aria-hidden': true as const,
  }
  const s = { ...P, stroke: 'currentColor', strokeWidth: 2.4 }
  const a = { fill: 'currentColor', opacity: 0.14 }

  switch (name) {
    case 'greeting': // el sallayan kişi
      return (
        <svg {...common}>
          <circle cx="26" cy="20" r="8" {...a} />
          <circle cx="26" cy="20" r="8" {...s} />
          <path d="M14 52c0-8 5.4-13 12-13s12 5 12 13" {...s} />
          <path d="M40 30l7-7M44 34l9-4M42 24l5-9" {...s} />
        </svg>
      )
    case 'family': // iki büyük bir küçük
      return (
        <svg {...common}>
          <circle cx="20" cy="18" r="6.5" {...a} /><circle cx="20" cy="18" r="6.5" {...s} />
          <circle cx="40" cy="18" r="6.5" {...a} /><circle cx="40" cy="18" r="6.5" {...s} />
          <circle cx="30" cy="36" r="5" {...a} /><circle cx="30" cy="36" r="5" {...s} />
          <path d="M10 42c0-6 4.4-10 10-10s10 4 10 10M30 42c0-6 4.4-10 10-10s10 4 10 10M22 56c0-4.4 3.6-8 8-8s8 3.6 8 8" {...s} />
        </svg>
      )
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="32" cy="34" r="20" {...a} /><circle cx="32" cy="34" r="20" {...s} />
          <path d="M32 22v12l8 5M24 8l-8 6M40 8l8 6" {...s} />
        </svg>
      )
    case 'food': // tabak ve çatal-bıçak
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="16" {...a} /><circle cx="32" cy="32" r="16" {...s} />
          <circle cx="32" cy="32" r="8" {...s} />
          <path d="M8 14v14M12 14v14M10 28v22M54 14c3 4 3 10 0 14v22" {...s} />
        </svg>
      )
    case 'shopping': // alışveriş çantası
      return (
        <svg {...common}>
          <path d="M14 22h36l-3 30H17z" {...a} />
          <path d="M14 22h36l-3 30H17z" {...s} />
          <path d="M24 26v-6a8 8 0 0116 0v6" {...s} />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M12 30l20-16 20 16v22H12z" {...a} />
          <path d="M8 32L32 12l24 20M14 30v22h36V30" {...s} />
          <path d="M26 52V38h12v14" {...s} />
        </svg>
      )
    case 'action': // koşan figür
      return (
        <svg {...common}>
          <circle cx="38" cy="14" r="6" {...a} /><circle cx="38" cy="14" r="6" {...s} />
          <path d="M40 22l-8 10 8 8-4 12M32 32l-12 4M40 30l10 6" {...s} />
        </svg>
      )
    case 'leisure': // müzik notası + top
      return (
        <svg {...common}>
          <circle cx="20" cy="44" r="8" {...a} /><circle cx="20" cy="44" r="8" {...s} />
          <path d="M28 44V14l20-4v26" {...s} />
          <circle cx="44" cy="38" r="5" {...a} /><circle cx="44" cy="38" r="5" {...s} />
        </svg>
      )
    case 'health': // kalp + artı
      return (
        <svg {...common}>
          <path d="M32 52S10 38 10 24a11 11 0 0122-4 11 11 0 0122 4c0 14-22 28-22 28z" {...a} />
          <path d="M32 52S10 38 10 24a11 11 0 0122-4 11 11 0 0122 4c0 14-22 28-22 28z" {...s} />
          <path d="M32 22v14M25 29h14" {...s} />
        </svg>
      )
    case 'travel': // uçak
      return (
        <svg {...common}>
          <path d="M6 34l52-18-14 22-8 14-6-12-14-4z" {...a} />
          <path d="M6 34l52-18-14 22-8 14-6-12-14-4z" {...s} />
          <path d="M20 40l24-24" {...s} />
        </svg>
      )
    case 'chat': // iki konuşma balonu
      return (
        <svg {...common}>
          <path d="M8 16h30v20H20l-8 8v-8H8z" {...a} />
          <path d="M8 16h30v20H20l-8 8v-8H8z" {...s} />
          <path d="M26 28h30v18H44l-6 6v-6h-2" {...s} />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path d="M10 14h18a6 6 0 016 6v30a6 6 0 00-6-6H10z" {...a} />
          <path d="M10 14h18a6 6 0 016 6v30a6 6 0 00-6-6H10zM54 14H36a6 6 0 00-6 6v30a6 6 0 016-6h18z" {...s} />
        </svg>
      )
    case 'listen': // kulaklık
      return (
        <svg {...common}>
          <path d="M12 38v-6a20 20 0 0140 0v6" {...s} />
          <rect x="8" y="36" width="12" height="16" rx="5" {...a} />
          <rect x="8" y="36" width="12" height="16" rx="5" {...s} />
          <rect x="44" y="36" width="12" height="16" rx="5" {...a} />
          <rect x="44" y="36" width="12" height="16" rx="5" {...s} />
        </svg>
      )
    case 'write': // kalem + satırlar
      return (
        <svg {...common}>
          <path d="M12 44L40 16l8 8-28 28-10 2z" {...a} />
          <path d="M12 44L40 16l8 8-28 28-10 2zM36 20l8 8" {...s} />
          <path d="M12 56h40" {...s} />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M20 12h24v14a12 12 0 01-24 0z" {...a} />
          <path d="M20 12h24v14a12 12 0 01-24 0zM20 16h-6a6 6 0 006 8M44 16h6a6 6 0 01-6 8M32 38v8M22 52h20" {...s} />
        </svg>
      )
    case 'empty': // boş kutu
      return (
        <svg {...common}>
          <path d="M10 24h44v26H10z" {...a} />
          <path d="M10 24h44v26H10zM10 24l6-10h32l6 10M32 14v10" {...s} />
        </svg>
      )
  }
}

/**
 * Doğru cevapta patlayan küçük parçacıklar.
 * Canvas ya da kütüphane yok: 12 adet span, tek bir CSS animasyonu.
 * Hareketi azaltılmış tercih edenlerde CSS tarafında kendiliğinden kapanıyor.
 */
export function Confetti({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} style={{ '--i': i } as React.CSSProperties} />
      ))}
    </div>
  )
}
