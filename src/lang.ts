import { ref } from 'vue'
import type { Card } from './data/types'

/** Which language card names are shown in first (the other is shown underneath). */
export const lang = ref<'ko' | 'en'>('ko')

/** Main display name in the chosen language (English when no Korean name exists). */
export function primaryName(card: Card): string {
  return lang.value === 'en' ? card.en : (card.ko ?? card.en)
}

/** Secondary name in the other language, or null when it would repeat the main one. */
export function secondaryName(card: Card): string | null {
  if (!card.ko) return null
  return lang.value === 'en' ? card.ko : card.en
}
