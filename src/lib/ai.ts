/**
 * Yapay zekâ öğretmen — isteğe bağlı katman.
 *
 * TASARIM KISITI: SUNUCU YOK
 *   Site GitHub Pages'te statik duruyor. Araya bir vekil sunucu koyamayız,
 *   dolayısıyla istek doğrudan tarayıcıdan sağlayıcıya gidiyor. Bunun iki
 *   sonucu var ve ikisi de kullanıcıya açıkça söylenmeli:
 *
 *   1. Anahtar kullanıcının kendi tarayıcısında (localStorage) durur. Aynı
 *      tarayıcıyı kullanan biri onu görebilir. Bu yüzden anahtar ilerleme
 *      dışa aktarımına DAHİL EDİLMEZ — yedek dosyasını paylaşmak anahtarı
 *      sızdırmamalı.
 *   2. Soru metni sağlayıcıya gider. Sitenin geri kalanı hiçbir veri
 *      göndermiyor; bu tek istisna ve opsiyonel.
 *
 * SAĞLAYICILAR
 *   openrouter — ücretsiz modeller var, ücretsiz anahtar gerekir (önerilen)
 *   gemini     — Google AI Studio ücretsiz katmanı, ücretsiz anahtar gerekir
 *   pollinations — anahtar gerekmez ama kotası sık tükeniyor; ölçüldü,
 *                  "budget reached" dönebiliyor. Yedek olarak duruyor.
 */

import type { Level, UiLang } from './types'

export type AiProvider = 'off' | 'openrouter' | 'gemini' | 'pollinations'

/**
 * OpenRouter'ın ücretsiz model YÖNLENDİRİCİSİ.
 *
 * NEDEN BELİRLİ BİR MODEL DEĞİL?
 *   Önce varsayılan `meta-llama/llama-3.3-70b-instruct:free` idi. O model
 *   ücretliye geçti ve uygulama 404 ile durdu:
 *     "This model is unavailable for free. The paid version is available now"
 *   Ücretsiz model listesi sürekli değişiyor; sabit bir kimlik yazmak, bu
 *   hatanın tekrarını garantilemek demek. `openrouter/free` o anda ücretsiz
 *   olan modeller arasından kendisi seçiyor, dolayısıyla çürümüyor.
 *   Kullanıcı isterse ayarlardan canlı listeden belirli bir model seçebilir.
 */
export const FREE_ROUTER = 'openrouter/free'

export interface AiSettings {
  provider: AiProvider
  /** Kullanıcının kendi anahtarı. Dışa aktarıma dahil edilmez. */
  apiKey: string
  model: string
}

export const DEFAULT_AI: AiSettings = {
  provider: 'off',
  apiKey: '',
  model: FREE_ROUTER,
}

export const PROVIDER_INFO: Record<
  Exclude<AiProvider, 'off'>,
  { label: string; needsKey: boolean; signup: string; defaultModel: string }
> = {
  openrouter: {
    label: 'OpenRouter',
    needsKey: true,
    signup: 'https://openrouter.ai/keys',
    defaultModel: FREE_ROUTER,
  },
  gemini: {
    label: 'Google AI Studio (Gemini)',
    needsKey: true,
    signup: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-2.0-flash',
  },
  pollinations: {
    label: 'Pollinations',
    needsKey: false,
    signup: '',
    defaultModel: 'openai',
  },
}

const LANG_NAME: Record<UiLang, string> = {
  tr: 'Türkisch', az: 'Aserbaidschanisch', ru: 'Russisch', de: 'Deutsch',
}

/**
 * Öğretmen kimliği. Dar tutuldu: bu bir genel sohbet botu değil, Almanca
 * sorularına kısa cevap veren bir yardımcı. Uzun cevap öğrenciyi okumaktan
 * vazgeçiriyor; üç cümle + bir örnek kuralı bilinçli.
 */
export function buildSystemPrompt(lang: UiLang, level: Level | null): string {
  return [
    `Du bist ein geduldiger Deutschlehrer für einen Lernenden auf Niveau ${level ?? 'A1'}.`,
    `Antworte IMMER auf ${LANG_NAME[lang]}, außer bei deutschen Beispielsätzen.`,
    '',
    'LÄNGE — das ist die wichtigste Regel:',
    '• Erklärung: HÖCHSTENS 60 Wörter. Keine Ausnahme.',
    '• Danach GENAU 1-2 deutsche Beispielsätze, je mit Übersetzung in einer Zeile.',
    '• KEINE Überschriften, KEINE Tabellen, KEINE Listen mit mehr als 2 Punkten.',
    '• Wiederhole die Frage nicht und fasse am Ende nichts zusammen.',
    '',
    'INHALT:',
    '• Nenne Nomen immer mit Artikel (der/die/das).',
    '• Wenn der Lernende einen falschen Satz schickt: zeige zuerst die',
    '  korrigierte Fassung, dann in einem Satz warum.',
    '• Erfinde nichts. Bist du unsicher, sage das in einem Satz.',
    '• Bei Fragen ohne Bezug zu Deutsch oder zum Sprachenlernen: sage höflich,',
    '  dass du nur bei Deutsch helfen kannst, und nichts weiter.',
  ].join('\n')
}

export interface FreeModel {
  id: string
  name: string
  context: number
  /** Ücretsiz mi? Ücretli modeller yalnızca açıkça istendiğinde listelenir. */
  free: boolean
}

/**
 * OpenRouter'dan O ANDA ücretsiz olan metin modellerini çeker.
 * Anahtar gerektirmiyor; liste herkese açık.
 *
 * Süzgeç: hem istem hem üretim ücreti 0 OLMALI (yalnızca prompt'a bakmak
 * yanıltıcı), çıktı metin olmalı (listede müzik üreten modeller de var,
 * ör. lyria — sohbet için işe yaramaz).
 */
export async function fetchOpenRouterModels(
  { includePaid = false }: { includePaid?: boolean } = {},
  signal?: AbortSignal,
): Promise<FreeModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', { signal })
  if (!res.ok) throw new AiError(`${res.status}`, 'http')
  const data = (await res.json()) as {
    data?: {
      id: string
      name?: string
      context_length?: number
      pricing?: { prompt?: string; completion?: string }
      architecture?: { output_modalities?: string[] }
    }[]
  }
  const out: FreeModel[] = []
  for (const m of data.data ?? []) {
    const p = m.pricing ?? {}
    const isFree = String(p.prompt) === '0' && String(p.completion) === '0'
    if (!isFree && !includePaid) continue
    const outs = m.architecture?.output_modalities ?? ['text']
    if (!outs.includes('text') || outs.includes('audio')) continue
    out.push({ id: m.id, name: m.name ?? m.id, context: m.context_length ?? 0, free: isFree })
  }
  // Yönlendirici her zaman başta: en güvenli seçenek o
  out.sort((a, b) =>
    (a.id === FREE_ROUTER ? -1 : b.id === FREE_ROUTER ? 1 : 0) || b.context - a.context)
  return out
}

/**
 * Google AI Studio'da BU ANAHTARIN erişebildiği modelleri listeler.
 *
 * OpenRouter listesi herkese açık ama Google'ınki anahtar istiyor — ve bu
 * aslında daha iyi: ücretli bir anahtarla gemini-2.5-pro gibi modeller de
 * listede görünür, ücretsiz anahtarla görünmez. Yani liste kullanıcıya tam
 * olarak kendi erişebildiğini gösteriyor, genel bir katalog değil.
 */
export async function fetchGeminiModels(
  apiKey: string,
  signal?: AbortSignal,
): Promise<FreeModel[]> {
  if (!apiKey.trim()) throw new AiError('missing-key', 'no-key')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`,
    { signal },
  )
  if (!res.ok) throw new AiError(`${res.status} ${await res.text()}`.slice(0, 160), 'http')
  const data = (await res.json()) as {
    models?: {
      name?: string
      displayName?: string
      inputTokenLimit?: number
      supportedGenerationMethods?: string[]
    }[]
  }
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => ({
      // "models/gemini-2.0-flash" -> "gemini-2.0-flash"
      id: (m.name ?? '').replace(/^models\//, ''),
      name: m.displayName ?? m.name ?? '',
      context: m.inputTokenLimit ?? 0,
      free: false,
    }))
    .filter((m) => m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind:
      | 'no-key' | 'http' | 'network' | 'empty' | 'model-not-free' | 'reasoning-only',
  ) {
    super(message)
  }
}

/** Sağlayıcıdan cevap ister. Akış yok — basit tutuldu, cevaplar kısa. */
export async function askAi(
  settings: AiSettings,
  system: string,
  history: AiMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const { provider, apiKey, model } = settings
  if (provider === 'off') throw new AiError('provider-off', 'no-key')

  const info = PROVIDER_INFO[provider]
  if (info.needsKey && !apiKey.trim()) throw new AiError('missing-key', 'no-key')

  try {
    if (provider === 'gemini') return await askGemini(apiKey, model, system, history, signal)
    if (provider === 'pollinations') return await askPollinations(model, system, history, signal)
    return await askOpenAiCompatible(apiKey, model, system, history, signal)
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new AiError(e instanceof Error ? e.message : String(e), 'network')
  }
}

async function askOpenAiCompatible(
  key: string, model: string, system: string, history: AiMessage[], signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      // Akıl yürütme modelleri düşünme adımlarını `reasoning` alanına yazıyor
      // ve bu da token bütçesinden düşüyor. 500 tokenlık bütçe tamamen
      // düşünmeye gidip `content` BOŞ dönüyordu — ölçüldü: 403 karakter
      // reasoning, 0 karakter cevap. `exclude` ile düşünme çıktısı istenmiyor,
      // bütçe de rahat tutuluyor ki parametreyi yok sayan model de sığsın.
      reasoning: { exclude: true },
      max_tokens: 1000,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    // OpenRouter, ücretsizken ücretliye geçen modeller için 404 + bu metni
    // döndürüyor. Genel "bağlantı hatası" demek kullanıcıyı yanlış yere
    // bakmaya iter; ayrı bir tür verip ayarlara yönlendiriyoruz.
    if (/unavailable for free|paid version is available/i.test(body)) {
      throw new AiError(body.slice(0, 200), 'model-not-free')
    }
    throw new AiError(`${res.status} ${body}`.slice(0, 200), 'http')
  }
  const data = await res.json()
  const msg = data?.choices?.[0]?.message
  const text: string | undefined = msg?.content
  if (!text?.trim()) {
    // Cevap boş ama düşünme dolu: model bütçeyi düşünmeye harcadı.
    // Kullanıcıya "bilinmeyen hata" demek yerine ne yapacağını söylüyoruz.
    if (msg?.reasoning) throw new AiError('reasoning-only', 'reasoning-only')
    throw new AiError('empty', 'empty')
  }
  return text
}

async function askGemini(
  key: string, model: string, system: string, history: AiMessage[], signal?: AbortSignal,
): Promise<string> {
  /**
   * Gemini 2.5 ailesi varsayılan olarak "düşünüyor" ve bu düşünme
   * maxOutputTokens bütçesinden düşüyor — OpenRouter'daki akıl yürütme
   * modelleriyle aynı tuzak: cevap boş dönüyor. `thinkingBudget: 0` bunu
   * kapatıyor ama bu alan her modelde geçerli değil; desteklemeyen model
   * 400 veriyor. Bu yüzden önce kapatmayı deniyoruz, reddedilirse alansız
   * tekrar gönderiyoruz. Model kimliğine göre tahmin yürütmekten sağlam:
   * yeni model adları çıktığında da kendiliğinden doğru davranıyor.
   */
  const send = async (withThinkingOff: boolean) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: history.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: 2000,
            ...(withThinkingOff ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      },
    )

  let res = await send(true)
  if (res.status === 400) {
    const body = await res.clone().text()
    if (/thinking/i.test(body)) res = await send(false)
  }

  if (!res.ok) throw new AiError(`${res.status} ${await res.text()}`.slice(0, 200), 'http')

  const data = await res.json()
  const cand = data?.candidates?.[0]
  const text: string | undefined = cand?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .join('')
  if (!text?.trim()) {
    // Bütçe düşünmeye gitti: kullanıcıya ne yapacağını söyleyen hata
    if (cand?.finishReason === 'MAX_TOKENS') throw new AiError('thinking', 'reasoning-only')
    throw new AiError(`empty (${cand?.finishReason ?? 'bilinmiyor'})`, 'empty')
  }
  return text
}

async function askPollinations(
  model: string, system: string, history: AiMessage[], signal?: AbortSignal,
): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })
  if (!res.ok) throw new AiError(`${res.status}`, 'http')
  const text = await res.text()
  // Pollinations bazen düz metin, bazen OpenAI biçimi döndürüyor
  try {
    const data = JSON.parse(text)
    const t = data?.choices?.[0]?.message?.content
    if (t) return t
  } catch {
    /* düz metin */
  }
  if (!text.trim() || /budget|rate limit/i.test(text)) throw new AiError(text.slice(0, 160), 'http')
  return text
}

/** Hazır sorular — boş sohbet ekranı yerine başlangıç noktası verir */
export function starterQuestions(lang: UiLang, word?: string): string[] {
  if (word) {
    return {
      tr: [
        `"${word}" kelimesini bir cümlede nasıl kullanırım?`,
        `"${word}" ile benzer anlamlı kelimeler neler?`,
        `"${word}" kelimesinin artikeli neden böyle?`,
      ],
      az: [
        `"${word}" sözünü cümlədə necə işlədim?`,
        `"${word}" ilə yaxın mənalı sözlər hansılardır?`,
        `"${word}" sözünün artikli niyə belədir?`,
      ],
      ru: [
        `Как употребить слово "${word}" в предложении?`,
        `Какие синонимы есть у "${word}"?`,
        `Почему у "${word}" такой артикль?`,
      ],
      de: [
        `Wie benutze ich "${word}" in einem Satz?`,
        `Welche Synonyme gibt es für "${word}"?`,
        `Warum hat "${word}" diesen Artikel?`,
      ],
    }[lang]
  }
  return {
    tr: [
      'Akkusativ ile Dativ arasındaki farkı basitçe anlat.',
      'Perfekt\'te "haben" mi "sein" mi kullanacağımı nasıl bilirim?',
      'Yan cümlede fiil neden sona gidiyor?',
      'Bu cümlem doğru mu: "Ich habe nach Berlin gegangen."',
    ],
    az: [
      'Akkusativ və Dativ arasındakı fərqi sadə izah et.',
      'Perfektdə "haben" yoxsa "sein" işlətməli olduğumu necə bilim?',
      'Budaq cümlədə feil niyə sona gedir?',
      'Bu cümləm düzgündür? "Ich habe nach Berlin gegangen."',
    ],
    ru: [
      'Объясни просто разницу между Akkusativ и Dativ.',
      'Как понять, брать в Perfekt "haben" или "sein"?',
      'Почему в придаточном глагол уходит в конец?',
      'Правильно ли: "Ich habe nach Berlin gegangen."?',
    ],
    de: [
      'Erkläre einfach den Unterschied zwischen Akkusativ und Dativ.',
      'Woher weiß ich, ob im Perfekt "haben" oder "sein" steht?',
      'Warum steht das Verb im Nebensatz am Ende?',
      'Ist dieser Satz richtig: "Ich habe nach Berlin gegangen."?',
    ],
  }[lang]
}
