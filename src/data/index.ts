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
