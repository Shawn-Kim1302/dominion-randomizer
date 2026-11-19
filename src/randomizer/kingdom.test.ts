import { describe, expect, it } from 'vitest'
import { cards } from '../data'
import { compareByCost, drawKingdom, kingdomPool } from './kingdom'
import { createRng } from './rng'

const only = (...ids: string[]) => new Set(ids)

describe('kingdomPool', () => {
  it('contains only Kingdom piles of the selected boxes', () => {
    const pool = kingdomPool(cards, only('dominion2ndEdition'))
    expect(pool).toHaveLength(26)
    expect(pool.every((c) => c.kind === 'kingdom' && c.sets.includes('dominion2ndEdition'))).toBe(true)
  })

  it('does not duplicate cards shared by both editions', () => {
    const pool = kingdomPool(cards, only('dominion1stEdition', 'dominion2ndEdition'))
    expect(new Set(pool.map((c) => c.id)).size).toBe(pool.length)
    // 1st edition 25 + 2nd edition 26, sharing 19 cards (6 removed, 7 added) = 32 distinct piles
    expect(pool).toHaveLength(32)
  })

  it('keeps editions apart', () => {
    const first = kingdomPool(cards, only('dominion1stEdition')).map((c) => c.en)
    const second = kingdomPool(cards, only('dominion2ndEdition')).map((c) => c.en)
    expect(first).toContain('Chancellor')
    expect(second).not.toContain('Chancellor')
    expect(second).toContain('Sentry')
    expect(first).not.toContain('Sentry')
  })
})

describe('drawKingdom', () => {
  const pool = kingdomPool(cards, only('dominion2ndEdition', 'seaside2ndEdition'))

  it('draws 10 distinct cards from the pool', () => {
    const r = drawKingdom(pool, createRng(1))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.kingdom).toHaveLength(10)
    expect(new Set(r.kingdom.map((c) => c.id)).size).toBe(10)
    expect(r.kingdom.every((c) => pool.includes(c))).toBe(true)
  })

  it('is reproducible with the same seed', () => {
    const a = drawKingdom(pool, createRng(42))
    const b = drawKingdom(pool, createRng(42))
    expect(a).toEqual(b)
  })

  it('reports when the pool is too small', () => {
    const r = drawKingdom(pool.slice(0, 7), createRng(1))
    expect(r).toEqual({ ok: false, reason: 'not-enough-cards', available: 7 })
  })
})

describe('compareByCost', () => {
  it('orders by coin + debt, then potion', () => {
    const byName = (n: string) => cards.find((c) => c.en === n)!
    const sorted = [byName('Gold'), byName('Golem'), byName('Moat'), byName('Engineer')].sort(compareByCost)
    expect(sorted.map((c) => c.en)).toEqual(['Moat', 'Engineer', 'Golem', 'Gold'])
  })
})
