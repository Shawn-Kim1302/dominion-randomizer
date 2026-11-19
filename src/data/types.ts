/** Landscape card types that share the official "at most 2 per game" recommendation. */
export type LandscapeType = 'Event' | 'Landmark' | 'Project' | 'Way' | 'Trait'

/**
 * kingdom   — a Kingdom pile that can be randomized
 * landscape — Event / Landmark / Project / Way / Trait
 * ally      — used only when a Liaison is in the Kingdom
 * prophecy  — used only when an Omen is in the Kingdom
 * other     — non-supply or basic cards (Platinum, Ruins, Boons, Prizes, ...)
 */
export type CardKind = 'kingdom' | 'landscape' | 'ally' | 'prophecy' | 'other'

export interface Cost {
  /** Coin cost, null when the card has no coin cost (e.g. Ways). */
  coin: number | null
  potion: number
  debt: number
  /** True for costs printed with * or + (variable or special costs). */
  special: boolean
}

export interface Card {
  /** Stable id (dominiontabs card_tag). */
  id: string
  en: string
  /** Korean name, null when no Korean name was found. */
  ko: string | null
  /** Box ids this card belongs to (see CardSet.id), or ["base"] for basic supply cards. */
  sets: string[]
  cost: Cost
  types: string[]
  kind: CardKind
  landscape?: LandscapeType
}

export interface CardSet {
  /** Box id, e.g. "seaside2ndEdition". */
  id: string
  /** Expansion family shared by both editions, e.g. "seaside". */
  expansion: string
  /** 1 or 2 for expansions with two editions, 0 when there is only one. */
  edition: 0 | 1 | 2
  en: string
  ko: string
  /** True when a Korean print edition of this box was released. */
  koPrint: boolean
}
