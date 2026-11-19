import type { Card } from '../data/types'
import { shuffle, type Rng } from './rng'

export const KINGDOM_SIZE = 10

/**
 * Kingdom piles available from the selected boxes. A card printed in several
 * selected boxes (e.g. both editions of an expansion) appears once.
 */
export function kingdomPool(cards: readonly Card[], selectedSets: ReadonlySet<string>): Card[] {
  return cards.filter((c) => c.kind === 'kingdom' && c.sets.some((s) => selectedSets.has(s)))
}

export type DrawResult = { ok: true; kingdom: Card[] } | { ok: false; reason: 'not-enough-cards'; available: number }

/**
 * Draws `size` distinct Kingdom piles at random from the pool.
 */
export function drawKingdom(pool: readonly Card[], rng: Rng, size = KINGDOM_SIZE): DrawResult {
  if (pool.length < size) return { ok: false, reason: 'not-enough-cards', available: pool.length }
  return { ok: true, kingdom: shuffle(pool, rng).slice(0, size) }
}

/** Sort key: coin + debt, then potion, then English name. */
export function compareByCost(a: Card, b: Card): number {
  const ca = (a.cost.coin ?? 0) + a.cost.debt
  const cb = (b.cost.coin ?? 0) + b.cost.debt
  return ca - cb || a.cost.potion - b.cost.potion || a.en.localeCompare(b.en)
}
