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

export interface AiSettings {
  provider: AiProvider
  /** Kullanıcının kendi anahtarı. Dışa aktarıma dahil edilmez. */
  apiKey: string
  model: string
}

export const DEFAULT_AI: AiSettings = {
  provider: 'off',
  apiKey: '',
  model: 'meta-llama/llama-3.3-70b-instruct:free',
}

export const PROVIDER_INFO: Record<
  Exclude<AiProvider, 'off'>,
  { label: string; needsKey: boolean; signup: string; defaultModel: string }
> = {
  openrouter: {
    label: 'OpenRouter',
    needsKey: true,
    signup: 'https://openrouter.ai/keys',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
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
    'Du bist ein geduldiger Deutschlehrer für einen Lernenden auf Niveau',
    `${level ?? 'A1'}.`,
    `Antworte IMMER auf ${LANG_NAME[lang]}, außer bei deutschen Beispielsätzen.`,
    'Regeln:',
    '1. Fasse dich kurz: höchstens 3 Sätze Erklärung.',
    '2. Gib danach immer 1-2 konkrete deutsche Beispielsätze mit Übersetzung.',
    '3. Nenne Nomen immer mit Artikel (der/die/das) und Plural.',
    '4. Wenn die Frage nichts mit Deutsch, Sprache oder dem Lernen zu tun hat,',
    '   sage höflich, dass du nur bei Deutsch helfen kannst.',
    '5. Erfinde nichts. Wenn du unsicher bist, sage das.',
  ].join(' ')
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export class AiError extends Error {
  constructor(message: string, readonly kind: 'no-key' | 'http' | 'network' | 'empty') {
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
      max_tokens: 500,
      messages: [{ role: 'system', content: system }, ...history],
    }),
  })
  if (!res.ok) throw new AiError(`${res.status} ${await res.text()}`.slice(0, 200), 'http')
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new AiError('empty', 'empty')
  return text
}

async function askGemini(
  key: string, model: string, system: string, history: AiMessage[], signal?: AbortSignal,
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: 600 },
    }),
  })
  if (!res.ok) throw new AiError(`${res.status} ${await res.text()}`.slice(0, 200), 'http')
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join('')
  if (!text) throw new AiError('empty', 'empty')
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
