/**
 * Günlük plan (Tagesplan) — "bugün 2 saat çalışacağım, ne yapayım?"
 *
 * Kullanıcı süreyi söyler, plan bloklara bölünür ve sırayla çalışılır.
 *
 * SÜRE DAĞILIMI NEDEN BÖYLE?
 *   Oranlar araştırmadan türetildi, hoşa gittiği için değil:
 *
 *   • Kelime (%35) — Nation'a göre B2'ye giden yolda en büyük tek darboğaz
 *     sözcük dağarcığı. Ayrıca aralıklı tekrar günlük olmayı gerektiriyor:
 *     kaçırılan gün birikmiş borç demek.
 *   • Dinleme (%25) — girdi olmadan üretim gelişmiyor; ayrıca öğrencilerin
 *     en çok ihmal ettiği beceri, çünkü ölçmesi rahatsız edici.
 *   • Dilbilgisi (%15) — az ama düzenli. Gramer tek başına akıcılık üretmiyor,
 *     ama yokluğu A2'den sonra tavan yapıyor.
 *   • Yazma (%15) — üretim, öğrenilenin gerçekten erişilebilir olup olmadığını
 *     ortaya çıkarır. Retrieval practice'in en zorlu biçimi.
 *   • Oyun (%10) — hız altında otomatikleşme ve günü bitirme motivasyonu.
 *
 *   30 dakikanın altında bloklar anlamsızca küçülüyor, o yüzden kısa
 *   planlarda yazma ve oyun birleştiriliyor.
 */

import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadCurriculum } from '../lib/data'
import {
  LESSON_STEPS, type BlockKind, type Curriculum, type DailyPlan as Plan,
  type PlanBlock, type Unit,
} from '../lib/types'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/storage'
import { isDue } from '../lib/fsrs'
import { t } from '../i18n/strings'
import { Loading, useAsync } from '../components/ui'

const PRESETS = [20, 45, 90, 120]

const SHARES: Record<BlockKind, number> = {
  vocab: 0.25, review: 0.12, listening: 0.25,
  grammar: 0.15, writing: 0.13, game: 0.10,
}

const BLOCK_META: Record<BlockKind, { icon: string; label: Record<string, string>; to: string }> = {
  vocab: {
    icon: '📖',
    label: { tr: 'Yeni kelime', az: 'Yeni söz', ru: 'Новые слова', de: 'Neue Wörter' },
    to: '/study',
  },
  review: {
    icon: '🔁',
    label: { tr: 'Tekrar', az: 'Təkrar', ru: 'Повторение', de: 'Wiederholung' },
    to: '/study',
  },
  listening: {
    icon: '🎧',
    label: { tr: 'Dinleme', az: 'Dinləmə', ru: 'Аудирование', de: 'Hören' },
    to: '/listening',
  },
  grammar: {
    icon: '📐',
    label: { tr: 'Dilbilgisi', az: 'Qrammatika', ru: 'Грамматика', de: 'Grammatik' },
    to: '/grammar',
  },
  writing: {
    icon: '📝',
    label: { tr: 'Yazma', az: 'Yazma', ru: 'Письмо', de: 'Schreiben' },
    to: '/reading',
  },
  game: {
    icon: '🎮',
    label: { tr: 'Oyun', az: 'Oyun', ru: 'Игра', de: 'Spiel' },
    to: '/course',
  },
}

/**
 * Dakika başına gerçekçi iş miktarı.
 *
 * Bu sayılar iyimser olmamalı: "34 dakikada 102 yeni kelime" yazan bir plan
 * ilk günde terk edilir. Ölçüler bir alıştırmanın düşünme süresi dahil
 * gerçek süresinden türetildi:
 *   yeni kelime  ~40 sn (tanıma + örnek cümleyi okuma)
 *   tekrar       ~12 sn
 *   dikte        ~85 sn (dinle, yaz, karşılaştır)
 *   gramer sorusu ~25 sn
 */
const RATE: Record<BlockKind, number> = {
  vocab: 1.5, review: 5, listening: 0.7, grammar: 2.4, writing: 0.1, game: 1,
}

/** Bir blokta makul üst sınır — plan ne kadar uzun olursa olsun aşılmaz */
const CAP: Record<BlockKind, number> = {
  vocab: 40, review: 200, listening: 25, grammar: 20, writing: 3, game: 2,
}

function buildPlan(
  minutes: number,
  unit: Unit | null,
  dueCount: number,
  newPerDay: number,
): Plan {
  const kinds: BlockKind[] = ['review', 'vocab', 'listening', 'grammar', 'writing', 'game']
  // Tekrar borcu yoksa o bloğun payını kelimeye ver
  const active = kinds.filter((k) => k !== 'review' || dueCount > 0)
  const totalShare = active.reduce((s, k) => s + SHARES[k], 0)

  const blocks: PlanBlock[] = active.map((kind) => {
    const mins = Math.max(3, Math.round((minutes * SHARES[kind]) / totalShare))
    let target = Math.max(1, Math.round(mins * RATE[kind]))
    target = Math.min(target, CAP[kind])
    // Yeni kelime hedefi kullanıcının günlük ayarını aşmamalı: aralıklı tekrar
    // yarınki yükü bugünün yeni kelimesinden üretir, sınırsız eklemek borç yığar.
    if (kind === 'vocab') target = Math.min(target, newPerDay)
    if (kind === 'review') target = Math.min(target, dueCount)
    return { id: `${kind}`, kind, minutes: mins, target }
  })

  // Yuvarlamadan kaynaklı sapmayı en büyük bloktan düzelt
  const sum = blocks.reduce((s, b) => s + b.minutes, 0)
  if (blocks.length && sum !== minutes) {
    const biggest = blocks.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    biggest.minutes = Math.max(3, biggest.minutes + (minutes - sum))
  }

  return {
    date: todayKey(),
    totalMinutes: minutes,
    unitId: unit?.id ?? null,
    blocks,
    done: [],
  }
}

export default function DailyPlan() {
  const cur = useAsync(() => loadCurriculum(), [])
  return (
    <main className="main">
      <Loading state={cur}>{(c) => <PlanView cur={c} />}</Loading>
    </main>
  )
}

function PlanView({ cur }: { cur: Curriculum }) {
  const { state, lang, setPlan, completeBlock } = useStore()
  const navigate = useNavigate()
  const [minutes, setMinutes] = useState(45)

  const dueCount = useMemo(
    () => Object.values(state.vocab).filter((v) => isDue(v.card)).length,
    [state.vocab],
  )

  /** Sıradaki bitmemiş ünite — planın "bugünkü ders"i */
  const nextUnit = useMemo(() => {
    const level = state.profile.level ?? 'A1'
    const order = [level, 'A1', 'A2'] as const
    for (const l of order) {
      const units = cur[l]?.units ?? []
      const found = units.find(
        (u) => (state.units[u.id]?.steps.length ?? 0) < LESSON_STEPS.length,
      )
      if (found) return found
    }
    return null
  }, [cur, state.profile.level, state.units])

  const start = useCallback(() => {
    setPlan(buildPlan(minutes, nextUnit, dueCount, state.settings.newPerDay))
  }, [minutes, nextUnit, dueCount, state.settings.newPerDay, setPlan])

  const plan = state.plan

  if (!plan) {
    return (
      <>
        <h1>{t('todayPlan', lang)}</h1>
        <div className="card">
          <p className="muted">{t('planIntro', lang)}</p>

          <div className="preset-row">
            {PRESETS.map((m) => (
              <button
                key={m}
                className={`preset ${minutes === m ? 'primary' : ''}`}
                onClick={() => setMinutes(m)}
              >
                <span className="n">{m}</span>
                <span className="u">{t('minutes', lang)}</span>
              </button>
            ))}
          </div>

          <input
            type="range" min={10} max={180} step={5} value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            style={{ marginTop: 14 }}
          />

          {nextUnit && (
            <div className="notice" style={{ marginTop: 14 }}>
              <strong>{t('todayLesson', lang)}:</strong> {nextUnit.title[lang]}
              <div className="small muted">{nextUnit.theme[lang]}</div>
            </div>
          )}

          <PlanPreview plan={buildPlan(minutes, nextUnit, dueCount, state.settings.newPerDay)} />

          <button className="primary big block" style={{ marginTop: 14 }} onClick={start}>
            {t('startDay', lang)} →
          </button>
        </div>
      </>
    )
  }

  const doneMin = plan.blocks
    .filter((b) => plan.done.includes(b.id))
    .reduce((s, b) => s + b.minutes, 0)
  const allDone = plan.done.length === plan.blocks.length

  return (
    <>
      <div className="row between">
        <h1 style={{ margin: 0 }}>{t('todayPlan', lang)}</h1>
        <button className="ghost" onClick={() => setPlan(null)}>{t('resetPlan', lang)}</button>
      </div>

      <div className="card plan-summary">
        <div className="row between">
          <span className="mono big-num">{doneMin} / {plan.totalMinutes}</span>
          <span className="muted small">{t('minutes', lang)}</span>
        </div>
        <div className="bar" style={{ marginTop: 8 }}>
          <i className={allDone ? 'ok' : ''} style={{ width: `${(doneMin / plan.totalMinutes) * 100}%` }} />
        </div>
      </div>

      {allDone && (
        <div className="card center celebrate" style={{ marginTop: 14 }}>
          <div className="big-emoji">🎉</div>
          <h2>{t('dayComplete', lang)}</h2>
        </div>
      )}

      <div className="plan-list">
        {plan.blocks.map((b, i) => {
          const done = plan.done.includes(b.id)
          const meta = BLOCK_META[b.kind]
          const to = b.kind === 'game' && plan.unitId ? `/lesson/${plan.unitId}` : meta.to
          return (
            <div className={`plan-block ${done ? 'done' : ''}`} key={b.id}>
              <div className="pb-icon">{done ? '✓' : meta.icon}</div>
              <div className="pb-body">
                <div className="pb-title">{meta.label[lang]}</div>
                <div className="pb-meta">
                  {b.minutes} {t('minutes', lang)}
                  {b.kind !== 'writing' && b.kind !== 'game' && ` · ${b.target} ×`}
                </div>
              </div>
              <div className="pb-actions">
                {!done && (
                  <>
                    <button className="primary" onClick={() => navigate(to)}>
                      {t('go', lang)}
                    </button>
                    <button className="ghost" onClick={() => completeBlock(b.id)} title={t('markDone', lang)}>
                      ✓
                    </button>
                  </>
                )}
              </div>
              {i < plan.blocks.length - 1 && <div className="pb-line" />}
            </div>
          )
        })}
      </div>

      {plan.unitId && (
        <Link to={`/lesson/${plan.unitId}`}>
          <button className="big block" style={{ marginTop: 14 }}>
            📚 {t('openLesson', lang)}
          </button>
        </Link>
      )}
    </>
  )
}

function PlanPreview({ plan }: { plan: Plan }) {
  const { lang } = useStore()
  return (
    <div className="plan-preview">
      {plan.blocks.map((b) => (
        <div
          key={b.id}
          className="pp-seg"
          style={{ flexGrow: b.minutes }}
          title={`${BLOCK_META[b.kind].label[lang]} · ${b.minutes} ${t('minutes', lang)}`}
        >
          <span>{BLOCK_META[b.kind].icon}</span>
          <span className="pp-min mono">{b.minutes}</span>
        </div>
      ))}
    </div>
  )
}
