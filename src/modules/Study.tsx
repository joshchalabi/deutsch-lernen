/**
 * Kelime çalışması — FSRS planlaması + geri çağırma pratiği.
 *
 * TASARIM İLKELERİ (hepsi araştırma dayanaklı)
 *
 * 1. GERİ ÇAĞIRMA > TEKRAR OKUMA
 *    Karpicke & Roediger: bilgiyi tekrar okumak yerine hatırlamaya çalışmak,
 *    uzun vadeli hatırlamayı belirgin şekilde artırıyor. Bu yüzden hiçbir
 *    alıştırma "şu kelimeye bak ve ezberle" demiyor; hepsi önce cevabı
 *    üretmeni istiyor.
 *
 * 2. BAŞARI BANDI %60-80
 *    Sürekli başarısızlık öğrenme değil tahmin ve kopma üretir. Alıştırma
 *    türü, kelimenin geçmiş başarı oranına göre seçiliyor: yeni/zayıf
 *    kelimelerde tanıma (çoktan seçmeli), sağlamlaşmış kelimelerde üretim
 *    (yazma). Böylece zorluk öğrencinin durumuna uyarlanıyor.
 *
 * 3. DEĞİŞKEN ALIŞTIRMA (interleaving)
 *    Aynı kelime her seferinde farklı biçimde soruluyor — tanıma, üretim,
 *    artikel, boşluk doldurma. Tek kalıba alışmak "kart ezberi" üretiyor,
 *    dil bilgisi değil.
 *
 * 4. ARTİKEL BAŞTAN
 *    İsimler her zaman artikeliyle gösteriliyor ve ayrı bir artikel
 *    alıştırması var. Artikeli sonradan eklemek, Almanca öğrenenlerin en
 *    yaygın ve en kalıcı hatası.
 */

import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadVocabUpTo, lemmaKey, shuffle } from '../lib/data'
import type { Lemma, Level } from '../lib/types'
import { isDue, Rating } from '../lib/fsrs'
import { useStore, useStudyClock } from '../lib/store'
import { t } from '../i18n/strings'
import { Badge, Loading, useAsync } from '../components/ui'
import { Exercise, pickKind, type ExerciseKind } from '../components/exercises'

interface Queued {
  lemma: Lemma
  kind: ExerciseKind
  isNew: boolean
}

export default function Study() {
  const { state, lang } = useStore()
  const level = state.profile.level

  const vocab = useAsync(
    async () => (level ? loadVocabUpTo(level) : []),
    [level],
  )

  if (!level) {
    return (
      <main className="main">
        <div className="card center">
          <h1>{t('placementTitle', lang)}</h1>
          <p className="muted">{t('placementIntro', lang)}</p>
          <Link to="/placement">
            <button className="primary big">{t('start', lang)}</button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="main">
      <Loading state={vocab}>{(all) => <Session all={all} level={level} />}</Loading>
    </main>
  )
}

function Session({ all, level }: { all: Lemma[]; level: Level }) {
  const { state, lang, rate, addWord } = useStore()
  useStudyClock(true)

  const byKey = useMemo(() => new Map(all.map((l) => [lemmaKey(l), l])), [all])

  /** Bugünün kuyruğu: önce vadesi gelen tekrarlar, sonra kota kadar yeni kelime */
  const queue = useMemo<Queued[]>(() => {
    const now = Date.now()
    const due: Queued[] = []

    for (const [key, prog] of Object.entries(state.vocab)) {
      if (!isDue(prog.card, now)) continue
      const lemma = byKey.get(key)
      if (!lemma) continue
      due.push({
        lemma,
        kind: pickKind(lemma, prog.hist, prog.card.reps),
        isNew: false,
      })
    }
    due.sort((a, b) => state.vocab[lemmaKey(a.lemma)].card.due - state.vocab[lemmaKey(b.lemma)].card.due)
    const capped = due.slice(0, state.settings.maxReviews)

    // Yeni kelimeler: frekans sırasına göre, henüz destede olmayanlar
    const todayNew = state.sessions[new Date().toISOString().slice(0, 10)]?.newWords ?? 0
    const room = Math.max(0, state.settings.newPerDay - todayNew)
    const fresh = all
      .filter((l) => !state.vocab[lemmaKey(l)])
      .sort((a, b) => a.r - b.r)
      .slice(0, room)
      .map<Queued>((lemma) => ({ lemma, kind: 'recognize', isNew: true }))

    // Yeni kelimeleri kuyruğa serpiştir: hepsi sona yığılırsa yorucu olur
    return shuffle([...capped, ...fresh])
    // state.vocab her derecelendirmede değişir; kuyruk kasıtlı olarak
    // oturum boyunca sabit kalsın diye yalnızca ilk kurulumda hesaplanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byKey, all])

  const [pos, setPos] = useState(0)
  const [done, setDone] = useState(0)

  const current = queue[pos]

  const advance = useCallback(() => {
    setDone((d) => d + 1)
    setPos((p) => p + 1)
  }, [])

  const handleAnswer = useCallback(
    (lemma: Lemma, correct: boolean, ratingOverride?: Rating) => {
      const key = lemmaKey(lemma)
      if (!state.vocab[key]) addWord(lemma)
      const r = ratingOverride ?? (correct ? Rating.Good : Rating.Again)
      rate(lemma, r, correct)
      advance()
    },
    [state.vocab, addWord, rate, advance],
  )

  if (!queue.length) {
    return (
      <div className="card center">
        <h2>{t('noDue', lang)}</h2>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <Link to="/listening"><button>{t('listening', lang)}</button></Link>
          <Link to="/reading"><button>{t('reading', lang)}</button></Link>
        </div>
      </div>
    )
  }

  if (!current) {
    return (
      <div className="card center">
        <h2>✓</h2>
        <p className="muted">
          {done} {t('totalReviews', lang).toLowerCase()}
        </p>
        <Link to="/progress"><button className="primary">{t('progress', lang)}</button></Link>
      </div>
    )
  }

  return (
    <>
      <div className="row between small muted" style={{ marginBottom: 10 }}>
        <span>
          <Badge kind="level">{level}</Badge>{' '}
          {current.isNew ? t('newWords', lang) : t('dueToday', lang)}
        </span>
        <span className="mono">{pos + 1} / {queue.length}</span>
      </div>
      <div className="bar" style={{ marginBottom: 16 }}>
        <i style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <Exercise
        key={`${lemmaKey(current.lemma)}-${pos}`}
        kind={current.kind}
        lemma={current.lemma}
        pool={all}
        isNew={current.isNew}
        onAnswer={(correct, rating) => handleAnswer(current.lemma, correct, rating)}
      />
    </>
  )
}
