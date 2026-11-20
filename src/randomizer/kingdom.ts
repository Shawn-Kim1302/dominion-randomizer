import { sets } from '../data'
import type { Card } from '../data/types'
import { shuffle, type Rng } from './rng'

export const KINGDOM_SIZE = 10

/** Promos are sold one card at a time, so each is selected on its own as `promo:<card id>`. */
export const PROMO_SET = 'promo'

/** Selection key for a single promo card. */
export function promoKey(cardId: string): string {
  return `${PROMO_SET}:${cardId}`
}

/**
 * True when the card is available: one of its boxes is selected, or it is an individually selected promo.
 */
export function isAvailable(card: Card, selected: ReadonlySet<string>): boolean {
  return card.sets.some((s) => s !== PROMO_SET && selected.has(s)) || selected.has(promoKey(card.id))
}

/**
 * Kingdom piles available from the selected boxes. A card printed in several
 * selected boxes (e.g. both editions of an expansion) appears once.
 */
export function kingdomPool(cards: readonly Card[], selected: ReadonlySet<string>): Card[] {
  return cards.filter((c) => c.kind === 'kingdom' && isAvailable(c, selected))
}

export type DrawResult = { ok: true; kingdom: Card[] } | { ok: false; reason: 'not-enough-cards'; available: number }

/**
 * Draws `size` distinct Kingdom piles at random from the pool.
 */
export function drawKingdom(pool: readonly Card[], rng: Rng, size = KINGDOM_SIZE): DrawResult {
  if (pool.length < size) return { ok: false, reason: 'not-enough-cards', available: pool.length }
  return { ok: true, kingdom: shuffle(pool, rng).slice(0, size) }
}

/**
 * Landscapes (Events, Landmarks, Projects, Ways, Traits) available from the selected boxes.
 */
export function landscapePool(cards: readonly Card[], selected: ReadonlySet<string>): Card[] {
  return cards.filter((c) => c.kind === 'landscape' && isAvailable(c, selected))
}

/**
 * shuffled — official default: landscapes are shuffled into the randomizer deck and
 *            set aside as they come up while dealing 10 Kingdom cards (so 0..max of them).
 * fixed    — official alternative: shuffle landscapes separately and deal exactly `count`.
 */
export type LandscapeRule = { mode: 'shuffled'; max: number } | { mode: 'fixed'; count: number }

/**
 * Official recommendation (Plunder rulebook): use at most 2 Events, Traits, Landmarks,
 * Projects and Ways in total. Extra ones turned over are skipped (Empires/Renaissance rulebooks).
 */
export const DEFAULT_LANDSCAPE_RULE: LandscapeRule = { mode: 'shuffled', max: 2 }

/** Menagerie rulebook: use at most one Way per game. */
export const MAX_WAYS = 1

/** Takes landscapes in order, skipping Ways past MAX_WAYS, until `limit` are taken. */
function takeLandscapes(ordered: readonly Card[], limit: number): Card[] {
  const out: Card[] = []
  for (const c of ordered) {
    if (out.length >= limit) break
    if (c.landscape === 'Way' && out.filter((x) => x.landscape === 'Way').length >= MAX_WAYS) continue
    out.push(c)
  }
  return out
}

export type DealResult =
  | { ok: true; kingdom: Card[]; landscapes: Card[] }
  | { ok: false; reason: 'not-enough-cards'; available: number }

/**
 * Deals 10 Kingdom piles plus landscapes following the official randomizer procedure.
 */
export function dealKingdom(
  kingdomCards: readonly Card[],
  landscapeCards: readonly Card[],
  rng: Rng,
  rule: LandscapeRule = DEFAULT_LANDSCAPE_RULE,
  size = KINGDOM_SIZE,
): DealResult {
  if (kingdomCards.length < size) return { ok: false, reason: 'not-enough-cards', available: kingdomCards.length }

  if (rule.mode === 'fixed') {
    return {
      ok: true,
      kingdom: shuffle(kingdomCards, rng).slice(0, size),
      landscapes: takeLandscapes(shuffle(landscapeCards, rng), rule.count),
    }
  }

  const kingdom: Card[] = []
  const turnedOver: Card[] = []
  for (const c of shuffle([...kingdomCards, ...landscapeCards], rng)) {
    if (c.kind === 'landscape') {
      turnedOver.push(c)
    } else {
      kingdom.push(c)
      if (kingdom.length === size) break
    }
  }
  return { ok: true, kingdom, landscapes: takeLandscapes(turnedOver, rule.max) }
}

/** Sort key: coin + debt, then potion, then English name. */
export function compareByCost(a: Card, b: Card): number {
  const ca = (a.cost.coin ?? 0) + a.cost.debt
  const cb = (b.cost.coin ?? 0) + b.cost.debt
  return ca - cb || a.cost.potion - b.cost.potion || a.en.localeCompare(b.en)
}

/** Sort key: Korean name in 가나다 order (English name when there is no Korean name). */
export function compareByName(a: Card, b: Card): number {
  return (a.ko ?? a.en).localeCompare(b.ko ?? b.en, 'ko')
}

/** Box release order (sets.json is listed in release order, promos last). */
const SET_ORDER = new Map(sets.map((s, i) => [s.id, i]))
const setRank = (c: Card) => Math.min(...c.sets.map((id) => SET_ORDER.get(id) ?? sets.length))

/** Sort key: expansion in release order (a card in both editions counts as its earliest box), then cost. */
export function compareBySet(a: Card, b: Card): number {
  return setRank(a) - setRank(b) || compareByCost(a, b)
}
