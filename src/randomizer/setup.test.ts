import { describe, expect, it } from 'vitest'
import { cards } from '../data'
import type { Card } from '../data/types'
import { ARTIFACTS, COMPONENT_RULES, HEIRLOOMS, REFERENCED_IDS, SETUP_NOTES } from './components'
import { dealKingdom, kingdomPool, landscapePool, promoKey } from './kingdom'
import { createRng } from './rng'
import { resolveSetup, type SetupContext } from './setup'

const byId = new Map(cards.map((c) => [c.id, c]))
const card = (id: string): Card => {
  const c = byId.get(id)
  if (!c) throw new Error(`no card ${id}`)
  return c
}
const filler = (n: number, exclude: string[] = []) =>
  cards.filter((c) => c.kind === 'kingdom' && c.sets.includes('dominion2ndEdition') && !exclude.includes(c.id)).slice(0, n)

function ctx(seed = 1, pool: readonly Card[] = cards.filter((c) => c.kind === 'kingdom')): SetupContext {
  return {
    allCards: cards,
    kingdomPool: pool,
    allies: cards.filter((c) => c.kind === 'ally'),
    prophecies: cards.filter((c) => c.kind === 'prophecy'),
    players: 3,
    rng: createRng(seed),
  }
}

describe('component table', () => {
  it('names only cards that exist', () => {
    const named = [
      ...REFERENCED_IDS,
      ...Object.keys(HEIRLOOMS),
      ...Object.values(HEIRLOOMS),
      ...Object.entries(ARTIFACTS).flat(2),
      ...Object.keys(SETUP_NOTES),
      ...COMPONENT_RULES.flatMap((r) => r.cards?.(r.needs(cards)) ?? []),
    ]
    expect(named.filter((id) => !byId.has(id))).toEqual([])
  })
})

describe('dealKingdom', () => {
  const sets = new Set(['dominion2ndEdition', 'empires', 'plunder'])
  const kp = kingdomPool(cards, sets)
  const lp = landscapePool(cards, sets)

  it('shuffled mode deals 10 Kingdom cards and at most 2 landscapes', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = dealKingdom(kp, lp, createRng(seed))
      if (!r.ok) throw new Error('deal failed')
      expect(r.kingdom).toHaveLength(10)
      expect(r.kingdom.every((c) => c.kind === 'kingdom')).toBe(true)
      expect(r.landscapes.length).toBeLessThanOrEqual(2)
    }
  })

  it('fixed mode deals exactly the requested landscapes', () => {
    const r = dealKingdom(kp, lp, createRng(7), { mode: 'fixed', count: 2 })
    expect(r.ok && r.landscapes.length).toBe(2)
  })
})

describe('resolveSetup', () => {
  it('Young Witch adds an unused $2–3 Bane to the Supply', () => {
    const k = [card('Young Witch'), ...filler(9)]
    for (let seed = 1; seed <= 50; seed++) {
      const s = resolveSetup(k, [], ctx(seed))
      const bane = s.extraPiles.find((e) => e.role === 'bane')
      expect(bane?.inSupply).toBe(true)
      expect([2, 3]).toContain(bane?.card.cost.coin)
      expect(bane?.card.cost.potion).toBe(0)
      expect(k.map((c) => c.id)).not.toContain(bane?.card.id)
    }
  })

  it('warns when no Bane candidate is left', () => {
    const k = [card('Young Witch'), ...filler(9)]
    const s = resolveSetup(k, [], ctx(1, k))
    expect(s.extraPiles).toEqual([])
    expect(s.warnings).toHaveLength(1)
  })

  it('a Liaison Bane brings in exactly one Ally', () => {
    const k = [card('Young Witch'), ...filler(9)]
    const s = resolveSetup(k, [], ctx(1, [...k, card('Underling')]))
    expect(s.extraPiles.map((e) => e.card.id)).toEqual(['Underling'])
    expect(s.ally?.kind).toBe('ally')
  })

  it('uses an Ally only with a Liaison', () => {
    expect(resolveSetup(filler(10), [], ctx()).ally).toBeNull()
    expect(resolveSetup([card('Bauble'), ...filler(9)], [], ctx()).ally?.kind).toBe('ally')
  })

  it('an Omen brings one Prophecy and Sun tokens; Approaching Army adds an Attack pile', () => {
    const k = [card('Rustic Village'), ...filler(9)]
    const army = { ...ctx(), prophecies: [card('Approaching Army')] }
    const s = resolveSetup(k, [], army)
    expect(s.prophecy?.id).toBe('Approaching Army')
    const added = s.extraPiles.find((e) => e.role === 'approaching-army')
    expect(added?.card.types).toContain('Attack')
    expect(s.components.find((c) => c.id === 'sun-tokens')?.note).toContain('8개')
  })

  it('Platinum/Colony and Shelters follow the randomly revealed Kingdom card', () => {
    const prosperity = cards.filter((c) => c.kind === 'kingdom' && c.sets.includes('prosperity2ndEdition')).slice(0, 10)
    const darkAges = cards.filter((c) => c.kind === 'kingdom' && c.sets.includes('darkAges')).slice(0, 10)
    expect(resolveSetup(prosperity, [], ctx()).platinumColony.used).toBe(true)
    expect(resolveSetup(prosperity, [], ctx()).shelters.used).toBe(false)
    expect(resolveSetup(darkAges, [], ctx()).shelters.used).toBe(true)
    const s = resolveSetup(filler(10), [], ctx())
    expect(filler(10)).toContainEqual(s.platinumColony.decidedBy)
  })

  it('puts each Trait on a different Action or Treasure Kingdom pile', () => {
    const traits = cards.filter((c) => c.landscape === 'Trait').slice(0, 2)
    for (let seed = 1; seed <= 30; seed++) {
      const s = resolveSetup(filler(10), traits, ctx(seed))
      expect(s.traits).toHaveLength(2)
      expect(new Set(s.traits.map((t) => t.pile.id)).size).toBe(2)
      for (const t of s.traits) expect(t.pile.types.some((x) => x === 'Action' || x === 'Treasure')).toBe(true)
    }
  })

  it('Looters bring Ruins sized by player count; potion costs bring the Potion pile', () => {
    const s = resolveSetup([card('Cultist'), card('Familiar'), ...filler(8)], [], ctx())
    expect(s.components.find((c) => c.id === 'ruins')?.note).toContain('20장')
    expect(s.components.find((c) => c.id === 'potion')?.inSupply).toBe(true)
  })

  it('lists Heirlooms, Boons and Will-o\'-Wisp for Nocturne Fate cards', () => {
    const s = resolveSetup([card('Pixie'), ...filler(9)], [], ctx())
    const ids = s.components.map((c) => c.id)
    expect(ids).toEqual(expect.arrayContaining(['boons', 'will-o-wisp', 'heirlooms']))
    expect(s.components.find((c) => c.id === 'heirlooms')?.cards).toEqual(['Goat'])
  })

  it('needs no extras for a plain base-game Kingdom', () => {
    const s = resolveSetup(filler(10), [], ctx())
    expect(s.extraPiles).toEqual([])
    expect(s.components).toEqual([])
    expect(s.warnings).toEqual([])
  })
})

describe('landscape limits and promos', () => {
  it('never deals more than one Way (Menagerie rulebook)', () => {
    const sets = new Set(['menagerie'])
    const kp = kingdomPool(cards, sets)
    const lp = landscapePool(cards, sets)
    for (let seed = 1; seed <= 300; seed++) {
      for (const rule of [{ mode: 'shuffled', max: 2 } as const, { mode: 'fixed', count: 2 } as const]) {
        const r = dealKingdom(kp, lp, createRng(seed), rule)
        if (!r.ok) throw new Error('deal failed')
        expect(r.landscapes.filter((c) => c.landscape === 'Way').length).toBeLessThanOrEqual(1)
      }
    }
  })

  it('promos are chosen card by card', () => {
    const only = new Set([promoKey('Captain'), promoKey('Summon')])
    expect(kingdomPool(cards, only).map((c) => c.id)).toEqual(['Captain'])
    expect(landscapePool(cards, only).map((c) => c.id)).toEqual(['Summon'])
    expect(kingdomPool(cards, new Set(['promo']))).toEqual([])
  })
})
