import cardsJson from './cards.json'
import setsJson from './sets.json'
import type { Card, CardSet } from './types'

export const cards = cardsJson as Card[]
export const sets = setsJson as CardSet[]

const setById = new Map(sets.map((s) => [s.id, s]))

/**
 * Looks up a box by id; undefined for the "base" pseudo set.
 */
export function getSet(id: string): CardSet | undefined {
  return setById.get(id)
}

/** Box label in the chosen language, with the edition when the expansion has two. */
export function setLabel(set: CardSet, lang: 'ko' | 'en'): string {
  const name = lang === 'ko' ? set.ko : set.en
  if (set.edition === 0) return name
  return lang === 'ko' ? `${name} ${set.edition}판` : `${name} (${set.edition === 1 ? '1st' : '2nd'} ed.)`
}

const cardById = new Map(cards.map((c) => [c.id, c]))

/**
 * Looks up a card by id (dominiontabs card_tag).
 */
export function getCard(id: string): Card | undefined {
  return cardById.get(id)
}

/** Display name: Korean when known, otherwise English. */
export function cardName(card: Card): string {
  return card.ko ?? card.en
}

/** Cornucopia and Guilds were merged into one box in the 2nd edition, so they form one group. */
const MERGED_GROUPS: Record<string, string> = { cornucopia: 'cornucopia-guilds', guilds: 'cornucopia-guilds', cornucopiaGuilds: 'cornucopia-guilds' }

/**
 * Expansion group of a box (both editions share one group), used for per-expansion limits.
 */
export function groupOf(setId: string): string {
  const expansion = getSet(setId)?.expansion ?? setId
  return MERGED_GROUPS[expansion] ?? expansion
}

/** Korean title of an expansion group. */
export function groupTitle(group: string): string {
  if (group === 'cornucopia-guilds') return '풍요의 뿔 · 길드를 위하여'
  return sets.find((s) => groupOf(s.id) === group)?.ko ?? group
}
