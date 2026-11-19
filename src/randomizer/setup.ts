import { cardName, getCard, getSet } from '../data'
import type { Card } from '../data/types'
import { COMPONENT_RULES, SETUP_NOTES } from './components'
import type { RecommendedKingdom } from '../data/recommended'
import { shuffle, type Rng } from './rng'

/**
 * Why an extra Kingdom pile was added or set aside, with the official text it follows.
 */
export type ExtraRole = 'bane' | 'approaching-army' | 'ferryman' | 'riverboat' | 'mouse'

export interface ExtraPile {
  role: ExtraRole
  card: Card
  /** True when the pile is part of the Supply (Bane, Approaching Army). */
  inSupply: boolean
}

export interface ResolvedComponent {
  id: string
  ko: string
  en: string
  /** Component card ids (non-Supply cards to set out). */
  cards: string[]
  /** In-use cards that require it. */
  reasons: Card[]
  note?: string
  source: string
  inSupply: boolean
}

/** A yes/no rule decided by revealing one random Kingdom card (Platinum/Colony, Shelters). */
export interface RandomCheck {
  used: boolean
  /** The randomly chosen Kingdom card that decided it; null when a recommended Kingdom fixes it. */
  decidedBy: Card | null
}

export interface GameSetup {
  /** The 10 dealt Kingdom piles. */
  kingdom: Card[]
  landscapes: Card[]
  extraPiles: ExtraPile[]
  /** Each Trait and the Action/Treasure Kingdom pile it was placed on. */
  traits: { trait: Card; pile: Card }[]
  ally: Card | null
  prophecy: Card | null
  platinumColony: RandomCheck
  shelters: RandomCheck
  /** Pile chosen for the Obelisk landmark (may be the Ruins pile). */
  obeliskPile: Card | null
  components: ResolvedComponent[]
  /** Card-printed setup instructions for cards in use. */
  setupNotes: { card: Card; note: string }[]
  /** Rules that could not be satisfied (e.g. no unused $2–3 card for the Bane). */
  warnings: string[]
  /** Name of the rulebook's recommended Kingdom this setup was loaded from. */
  recommended?: string
}

export interface SetupContext {
  /** Every card (for looking up Ruins and component cards). */
  allCards: readonly Card[]
  /** Kingdom piles available from the selected boxes (extra piles are drawn from it). */
  kingdomPool: readonly Card[]
  /** Ally cards available (used when a Liaison is in use). */
  allies: readonly Card[]
  /** Prophecy cards available (used when an Omen is in use). */
  prophecies: readonly Card[]
  players: number
  rng: Rng
}

const coinOnly = (c: Card, ...coins: number[]) =>
  c.cost.coin !== null && coins.includes(c.cost.coin) && !c.cost.potion && !c.cost.debt && !c.cost.special

/**
 * Card-driven extra piles. Each "Setup:" line is quoted from the official card text.
 */
const EXTRA_RULES: { role: ExtraRole; trigger: string; inSupply: boolean; fits: (c: Card) => boolean; warn: string }[] = [
  {
    // Young Witch: "Setup: Add an extra Kingdom card pile costing $2 or $3 to the Supply. Cards from that pile are Bane cards."
    role: 'bane',
    trigger: 'Young Witch',
    inSupply: true,
    fits: (c) => coinOnly(c, 2, 3),
    warn: 'Bane으로 쓸 $2~3 왕국 카드가 남아 있지 않아요.',
  },
  {
    // Ferryman: "Setup: Choose an unused Kingdom card pile costing $3 or $4."
    role: 'ferryman',
    trigger: 'Ferryman',
    inSupply: false,
    fits: (c) => coinOnly(c, 3, 4),
    warn: '따로 둘 $3~4 왕국 카드가 남아 있지 않아요.',
  },
  {
    // Riverboat: "Setup: Set aside an unused non-Duration Action card costing $5."
    role: 'riverboat',
    trigger: 'Riverboat',
    inSupply: false,
    fits: (c) => coinOnly(c, 5) && c.types.includes('Action') && !c.types.includes('Duration'),
    warn: '따로 둘 $5 비지속 액션 카드가 남아 있지 않아요.',
  },
  {
    // Way of the Mouse: "Setup: Set aside an unused Action costing $2 or $3."
    role: 'mouse',
    trigger: 'Way of the Mouse',
    inSupply: false,
    fits: (c) => coinOnly(c, 2, 3) && c.types.includes('Action'),
    warn: '따로 둘 $2~3 액션 카드가 남아 있지 않아요.',
  },
]

const ARMY_WARN = '추가할 공격 왕국 카드가 남아 있지 않아요.'

const fromExpansion =(c: Card, expansion: string) => c.sets.some((s) => getSet(s)?.expansion === expansion)

/**
 * Applies every official setup rule to a dealt Kingdom.
 *
 * Order: card-driven extra piles (repeated until nothing changes, because an extra pile
 * can itself need setup — e.g. a Liaison Bane needs an Ally), then the random
 * Platinum/Colony and Shelters checks on the 10 dealt cards, then Traits, Obelisk and
 * the component checklist over everything in use.
 */
export function resolveSetup(kingdom: readonly Card[], landscapes: readonly Card[], ctx: SetupContext): GameSetup {
  const { rng } = ctx
  const extraPiles: ExtraPile[] = []
  const warnings: string[] = []
  let ally: Card | null = null
  let prophecy: Card | null = null

  const addWarning = (trigger: string, text: string) => {
    const by = getCard(trigger)
    const w = `${by ? cardName(by) : trigger}: ${text}`
    if (!warnings.includes(w)) warnings.push(w)
  }
  const used = () => new Set([...kingdom, ...extraPiles.map((e) => e.card)].map((c) => c.id))
  const inUseKingdom = () => [...kingdom, ...extraPiles.map((e) => e.card)]
  const pickUnused = (fits: (c: Card) => boolean): Card | undefined => {
    const taken = used()
    return shuffle(ctx.kingdomPool.filter((c) => !taken.has(c.id) && fits(c)), rng)[0]
  }

  for (let changed = true; changed; ) {
    changed = false
    const present = new Set([...inUseKingdom(), ...landscapes].map((c) => c.id))

    for (const rule of EXTRA_RULES) {
      if (!present.has(rule.trigger) || extraPiles.some((e) => e.role === rule.role)) continue
      const card = pickUnused(rule.fits)
      if (card) extraPiles.push({ role: rule.role, card, inSupply: rule.inSupply })
      else addWarning(rule.trigger, rule.warn)
      changed ||= !!card
    }

    // Rising Sun: if any Omen is in use, use exactly one random Prophecy.
    if (!prophecy && inUseKingdom().some((c) => c.types.includes('Omen'))) {
      prophecy = shuffle(ctx.prophecies, rng)[0] ?? null
      changed ||= !!prophecy
    }
    // Approaching Army: "Setup: Add an Attack kingdom card pile to the Supply."
    if (prophecy?.id === 'Approaching Army' && !extraPiles.some((e) => e.role === 'approaching-army')) {
      const card = pickUnused((c) => c.types.includes('Attack'))
      if (card) extraPiles.push({ role: 'approaching-army', card, inSupply: true })
      else addWarning('Approaching Army', ARMY_WARN)
      changed ||= !!card
    }
    // Allies: if any Liaison is in use, use exactly one random Ally ("Only use one Ally").
    if (!ally && inUseKingdom().some((c) => c.types.includes('Liaison'))) {
      ally = shuffle(ctx.allies, rng)[0] ?? null
      changed ||= !!ally
    }
  }

  // Prosperity / Dark Ages: reveal a random one of the 10 Kingdom cards (landscapes excluded).
  const randomKingdomCard = () => kingdom[Math.floor(rng() * kingdom.length)]
  const plat = randomKingdomCard()
  const platinumColony = { used: fromExpansion(plat, 'prosperity'), decidedBy: plat }
  const shel = randomKingdomCard()
  const shelters = { used: fromExpansion(shel, 'darkAges'), decidedBy: shel }

  const supplyKingdom = [...kingdom, ...extraPiles.filter((e) => e.inSupply).map((e) => e.card)]

  // Plunder: put each Trait on a different random Action or Treasure Kingdom pile.
  const traitTargets = shuffle(
    supplyKingdom.filter((c) => c.types.includes('Action') || c.types.includes('Treasure')),
    rng,
  )
  const traits: GameSetup['traits'] = []
  for (const trait of landscapes.filter((l) => l.landscape === 'Trait')) {
    const pile = traitTargets.shift()
    if (pile) traits.push({ trait, pile })
    else warnings.push(`${cardName(trait)}: 놓을 액션/재물 왕국 더미가 없어요.`)
  }

  const inUse: Card[] = [...inUseKingdom(), ...landscapes, ...(ally ? [ally] : []), ...(prophecy ? [prophecy] : [])]
  const components = resolveComponents(inUse, ctx.players)

  // Empires — Obelisk: "Setup: Choose a random Action Supply pile." (Ruins counts when used.)
  let obeliskPile: Card | null = null
  if (landscapes.some((l) => l.id === 'Obelisk')) {
    const ruins = ctx.allCards.find((c) => c.id === 'Ruins')
    const candidates = [
      ...supplyKingdom.filter((c) => c.types.includes('Action')),
      ...(ruins && components.some((c) => c.id === 'ruins') ? [ruins] : []),
    ]
    obeliskPile = candidates[Math.floor(rng() * candidates.length)] ?? null
  }

  const setupNotes = inUse.filter((c) => c.id in SETUP_NOTES).map((card) => ({ card, note: SETUP_NOTES[card.id] }))

  return { kingdom: [...kingdom], landscapes: [...landscapes], extraPiles, traits, ally, prophecy, platinumColony, shelters, obeliskPile, components, setupNotes, warnings }
}

/**
 * Evaluates the component checklist for the cards in use.
 */
export function resolveComponents(inUse: readonly Card[], players: number): ResolvedComponent[] {
  const out: ResolvedComponent[] = []
  for (const rule of COMPONENT_RULES) {
    const reasons = rule.needs(inUse)
    if (reasons.length === 0) continue
    out.push({
      id: rule.id,
      ko: rule.ko,
      en: rule.en,
      cards: [...new Set(rule.cards?.(reasons) ?? [])],
      reasons,
      note: rule.note?.(players),
      source: rule.source,
      inSupply: rule.inSupply ?? false,
    })
  }
  return out
}

/** Every card in use by a setup (Kingdom, extra piles, landscapes, Ally, Prophecy). */
export function inUseCards(s: GameSetup): Card[] {
  return [...s.kingdom, ...s.extraPiles.map((e) => e.card), ...s.landscapes, ...(s.ally ? [s.ally] : []), ...(s.prophecy ? [s.prophecy] : [])]
}

/** Recomputes player-count–dependent parts (component counts) for another player count. */
export function withPlayers(s: GameSetup, players: number): GameSetup {
  return { ...s, components: resolveComponents(inUseCards(s), players) }
}

/** A setup stored by card id (for history), small enough for localStorage. */
export interface SavedSetup {
  kingdom: string[]
  landscapes: string[]
  extraPiles: { role: ExtraRole; id: string; inSupply: boolean }[]
  traits: { trait: string; pile: string }[]
  ally: string | null
  prophecy: string | null
  platinumColony: { used: boolean; decidedBy: string | null }
  shelters: { used: boolean; decidedBy: string | null }
  obeliskPile: string | null
}

export function saveSetup(s: GameSetup): SavedSetup {
  return {
    kingdom: s.kingdom.map((c) => c.id),
    landscapes: s.landscapes.map((c) => c.id),
    extraPiles: s.extraPiles.map((e) => ({ role: e.role, id: e.card.id, inSupply: e.inSupply })),
    traits: s.traits.map((t) => ({ trait: t.trait.id, pile: t.pile.id })),
    ally: s.ally?.id ?? null,
    prophecy: s.prophecy?.id ?? null,
    platinumColony: { used: s.platinumColony.used, decidedBy: s.platinumColony.decidedBy?.id ?? null },
    shelters: { used: s.shelters.used, decidedBy: s.shelters.decidedBy?.id ?? null },
    obeliskPile: s.obeliskPile?.id ?? null,
  }
}

/**
 * Rebuilds a stored setup; null when a card no longer exists in the data.
 */
export function loadSetup(saved: SavedSetup, allCards: readonly Card[], players: number, recommendedName?: string): GameSetup | null {
  const byId = new Map(allCards.map((c) => [c.id, c]))
  const get = (id: string) => {
    const c = byId.get(id)
    if (!c) throw new Error(id)
    return c
  }
  try {
    const s: GameSetup = {
      kingdom: saved.kingdom.map(get),
      landscapes: saved.landscapes.map(get),
      extraPiles: saved.extraPiles.map((e) => ({ role: e.role, card: get(e.id), inSupply: e.inSupply })),
      traits: saved.traits.map((t) => ({ trait: get(t.trait), pile: get(t.pile) })),
      ally: saved.ally ? get(saved.ally) : null,
      prophecy: saved.prophecy ? get(saved.prophecy) : null,
      platinumColony: { used: saved.platinumColony.used, decidedBy: saved.platinumColony.decidedBy ? get(saved.platinumColony.decidedBy) : null },
      shelters: { used: saved.shelters.used, decidedBy: saved.shelters.decidedBy ? get(saved.shelters.decidedBy) : null },
      obeliskPile: saved.obeliskPile ? get(saved.obeliskPile) : null,
      components: [],
      setupNotes: [],
      warnings: [],
      ...(recommendedName ? { recommended: recommendedName } : {}),
    }
    const inUse = inUseCards(s)
    s.components = resolveComponents(inUse, players)
    s.setupNotes = inUse.filter((c) => c.id in SETUP_NOTES).map((card) => ({ card, note: SETUP_NOTES[card.id] }))
    return s
  } catch {
    return null
  }
}

/**
 * Setup for a rulebook recommended Kingdom: every choice the rulebook prints (Bane,
 * Ally, Prophecy, Traits, Platinum/Colony, Shelters, ...) is used as given.
 */
export function setupFromRecommended(rec: RecommendedKingdom, allCards: readonly Card[], players: number): GameSetup | null {
  const extra = (role: ExtraRole, id: string | undefined, inSupply: boolean) => (id ? [{ role, id, inSupply }] : [])
  return loadSetup(
    {
      kingdom: rec.kingdom,
      landscapes: rec.landscapes,
      extraPiles: [
        ...extra('bane', rec.bane, true),
        ...extra('ferryman', rec.ferryman, false),
        ...extra('riverboat', rec.riverboat, false),
        ...extra('mouse', rec.mouse, false),
      ],
      traits: rec.traits ?? [],
      ally: rec.ally ?? null,
      prophecy: rec.prophecy ?? null,
      platinumColony: { used: !!rec.colonies, decidedBy: null },
      shelters: { used: !!rec.shelters, decidedBy: null },
      obeliskPile: rec.obelisk ?? null,
    },
    allCards,
    players,
    rec.name,
  )
}
