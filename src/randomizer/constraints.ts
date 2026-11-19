import { groupOf, groupTitle } from '../data'
import type { Ability, Card } from '../data/types'
import { KINGDOM_SIZE, MAX_WAYS, PROMO_SET, dealKingdom, isAvailable, type LandscapeRule } from './kingdom'
import { shuffle, type Rng } from './rng'

/** Abilities a Kingdom can be required to contain at least once. */
export type RequirableAbility = Exclude<Ability, 'defense'>

export interface GroupLimit {
  min?: number
  max?: number
}

export interface Constraints {
  /** Card ids never used (Kingdom piles and landscapes). */
  exclude: Set<string>
  /** Card ids always used. */
  require: Set<string>
  /** Per expansion group (see groupOf) minimum / maximum Kingdom piles. */
  groupLimits: Record<string, GroupLimit>
  /** Each listed ability must appear on at least one of the 10 Kingdom piles. */
  requireAbilities: RequirableAbility[]
  /** When an Attack is in the Kingdom, also include a card that defends against Attacks. */
  attackNeedsDefense: boolean
  /** At least 2 piles in each cost band: $3 or less, $4, $5 or more. */
  costSpread: boolean
}

export function emptyConstraints(): Constraints {
  return { exclude: new Set(), require: new Set(), groupLimits: {}, requireAbilities: [], attackNeedsDefense: false, costSpread: false }
}

export type ConstrainedResult = { ok: true; kingdom: Card[] } | { ok: false; reasons: string[] }

/** Cost bands for the cost-spread rule; debt counts like coins. */
export const COST_BANDS: { label: string; test: (n: number) => boolean }[] = [
  { label: '$3 이하', test: (n) => n <= 3 },
  { label: '$4', test: (n) => n === 4 },
  { label: '$5 이상', test: (n) => n >= 5 },
]
const COST_BAND_MIN = 2
const effectiveCost = (c: Card) => (c.cost.coin ?? 0) + c.cost.debt

const ABILITY_KO: Record<RequirableAbility, string> = { village: '마을(+2 액션)', buy: '+구매', draw: '드로우(+2 카드)', trash: '폐기' }

/** Groups a card counts toward, among the selected boxes and promo picks. */
export function groupsOf(card: Card, selected: ReadonlySet<string>): string[] {
  const gs = card.sets.filter((s) => (s === PROMO_SET ? isAvailable(card, selected) : selected.has(s))).map(groupOf)
  return [...new Set(gs)]
}

/** Returns why a candidate Kingdom breaks the rules (empty when it is valid). */
export function violations(kingdom: readonly Card[], c: Constraints, selected: ReadonlySet<string>): string[] {
  const out: string[] = []
  for (const a of c.requireAbilities) {
    if (!kingdom.some((k) => k.abilities?.includes(a))) out.push(`${ABILITY_KO[a]} 카드 없음`)
  }
  if (c.attackNeedsDefense && kingdom.some((k) => k.types.includes('Attack')) && !kingdom.some((k) => k.abilities?.includes('defense'))) {
    out.push('공격에 대응할 방어 카드 없음')
  }
  if (c.costSpread) {
    for (const band of COST_BANDS) {
      if (kingdom.filter((k) => band.test(effectiveCost(k))).length < COST_BAND_MIN) out.push(`${band.label} 카드 ${COST_BAND_MIN}장 미만`)
    }
  }
  for (const [g, lim] of Object.entries(c.groupLimits)) {
    const n = kingdom.filter((k) => groupsOf(k, selected).includes(g)).length
    if (lim.min !== undefined && n < lim.min) out.push(`${groupTitle(g)} 최소 ${lim.min}장 미달`)
    if (lim.max !== undefined && n > lim.max) out.push(`${groupTitle(g)} 최대 ${lim.max}장 초과`)
  }
  return out
}

const MAX_ATTEMPTS = 3000

/**
 * Draws 10 Kingdom piles that satisfy the constraints: required cards first, then each
 * group's minimum, then random fill within group maximums; candidates that break a
 * remaining rule (abilities, defense, cost spread) are redrawn.
 */
export function drawConstrainedKingdom(
  pool: readonly Card[],
  c: Constraints,
  selected: ReadonlySet<string>,
  rng: Rng,
  size = KINGDOM_SIZE,
): ConstrainedResult {
  const usable = pool.filter((k) => !c.exclude.has(k.id))
  const required = usable.filter((k) => c.require.has(k.id))
  if (required.length > size) return { ok: false, reasons: [`필수 카드가 ${size}장을 넘어요 (${required.length}장).`] }
  if (usable.length < size) return { ok: false, reasons: [`제외 후 남은 왕국 카드가 ${usable.length}종뿐이에요.`] }

  const groups = new Map(usable.map((k) => [k.id, groupsOf(k, selected)]))
  const failures = new Map<string, number>()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const chosen: Card[] = [...required]
    const count = new Map<string, number>()
    const add = (k: Card) => {
      chosen.push(k)
      for (const g of groups.get(k.id)!) count.set(g, (count.get(g) ?? 0) + 1)
    }
    const fits = (k: Card) =>
      !chosen.includes(k) && groups.get(k.id)!.every((g) => (count.get(g) ?? 0) < (c.groupLimits[g]?.max ?? Infinity))
    for (const k of required) for (const g of groups.get(k.id)!) count.set(g, (count.get(g) ?? 0) + 1)

    for (const [g, lim] of Object.entries(c.groupLimits)) {
      for (const k of shuffle(usable.filter((x) => groups.get(x.id)!.includes(g)), rng)) {
        if ((count.get(g) ?? 0) >= (lim.min ?? 0) || chosen.length >= size) break
        if (fits(k)) add(k)
      }
    }
    for (const k of shuffle(usable, rng)) {
      if (chosen.length >= size) break
      if (fits(k)) add(k)
    }

    const problems = chosen.length < size ? ['확장별 최대 장수 때문에 10장을 채울 수 없음'] : violations(chosen, c, selected)
    if (problems.length === 0) return { ok: true, kingdom: chosen }
    for (const p of problems) failures.set(p, (failures.get(p) ?? 0) + 1)
  }

  const reasons = [...failures.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p)
  return { ok: false, reasons }
}

/**
 * Landscapes for the game: required ones first, then those dealt by the official
 * procedure, within the rule's limit (raised to fit the required ones) and the one-Way limit.
 */
export function drawLandscapes(
  kingdomPool: readonly Card[],
  landscapePool: readonly Card[],
  c: Constraints,
  rule: LandscapeRule,
  rng: Rng,
): Card[] {
  const usable = landscapePool.filter((l) => !c.exclude.has(l.id))
  const required = usable.filter((l) => c.require.has(l.id))
  const dealt = dealKingdom(kingdomPool, usable.filter((l) => !c.require.has(l.id)), rng, rule)
  const limit = Math.max(rule.mode === 'shuffled' ? rule.max : rule.count, required.length)
  const out = [...required]
  for (const l of dealt.ok ? dealt.landscapes : []) {
    if (out.length >= limit) break
    if (l.landscape === 'Way' && out.filter((x) => x.landscape === 'Way').length >= MAX_WAYS) continue
    out.push(l)
  }
  return out
}
