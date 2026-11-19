import { describe, expect, it } from 'vitest'
import { cards } from '../data'
import { drawConstrainedKingdom, drawLandscapes, emptyConstraints, groupsOf, violations } from './constraints'
import { compareByName, kingdomPool, landscapePool, promoKey } from './kingdom'
import { createRng } from './rng'

const selected = new Set(['dominion2ndEdition', 'intrigue2ndEdition', 'seaside2ndEdition', promoKey('Captain')])
const pool = kingdomPool(cards, selected)

function draw(patch: Partial<ReturnType<typeof emptyConstraints>>, seed = 1) {
  const c = { ...emptyConstraints(), ...patch }
  return { c, r: drawConstrainedKingdom(pool, c, selected, createRng(seed)) }
}

describe('drawConstrainedKingdom', () => {
  it('keeps required cards and never uses excluded ones', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { r } = draw({ require: new Set(['Witch', 'Captain']), exclude: new Set(['Moat', 'Village']) }, seed)
      if (!r.ok) throw new Error(r.reasons.join())
      const ids = r.kingdom.map((k) => k.id)
      expect(ids).toEqual(expect.arrayContaining(['Witch', 'Captain']))
      expect(ids).not.toContain('Moat')
      expect(ids).not.toContain('Village')
      expect(new Set(ids).size).toBe(10)
    }
  })

  it('respects per-expansion minimum and maximum', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { r } = draw({ groupLimits: { dominion: { min: 5 }, seaside: { max: 1 } } }, seed)
      if (!r.ok) throw new Error(r.reasons.join())
      const inGroup = (g: string) => r.kingdom.filter((k) => groupsOf(k, selected).includes(g)).length
      expect(inGroup('dominion')).toBeGreaterThanOrEqual(5)
      expect(inGroup('seaside')).toBeLessThanOrEqual(1)
    }
  })

  it('satisfies ability, defense and cost-spread rules', () => {
    const patch = { requireAbilities: ['village', 'buy', 'draw', 'trash'] as const, attackNeedsDefense: true, costSpread: true }
    for (let seed = 1; seed <= 100; seed++) {
      const { c, r } = draw({ ...patch, requireAbilities: [...patch.requireAbilities] }, seed)
      if (!r.ok) throw new Error(r.reasons.join())
      expect(violations(r.kingdom, c, selected)).toEqual([])
    }
  })

  it('explains impossible constraints', () => {
    const { r } = draw({ groupLimits: { dominion: { max: 0 }, intrigue: { max: 0 }, seaside: { max: 0 } } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reasons[0]).toContain('10장')
  })
})

describe('drawLandscapes', () => {
  const sets = new Set(['empires', 'menagerie'])
  it('includes required landscapes and drops excluded ones', () => {
    const c = { ...emptyConstraints(), require: new Set(['Way of the Mouse']), exclude: new Set(['Obelisk']) }
    for (let seed = 1; seed <= 100; seed++) {
      const ls = drawLandscapes(kingdomPool(cards, sets), landscapePool(cards, sets), c, { mode: 'fixed', count: 2 }, createRng(seed))
      expect(ls.map((l) => l.id)).toContain('Way of the Mouse')
      expect(ls.map((l) => l.id)).not.toContain('Obelisk')
      expect(ls.filter((l) => l.landscape === 'Way')).toHaveLength(1)
      expect(ls).toHaveLength(2)
    }
  })
})

describe('compareByName', () => {
  it('orders Kingdom cards in 가나다 order', () => {
    const names = ['Witch', 'Moat', 'Village', 'Chapel'].map((id) => cards.find((c) => c.id === id)!)
    const sorted = names.slice().sort(compareByName).map((c) => c.ko)
    expect(sorted).toEqual(['마녀', '마을', '예배당', '해자'])
  })
})
