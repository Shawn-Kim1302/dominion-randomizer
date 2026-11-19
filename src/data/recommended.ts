import recommendedJson from './recommended.json'

/**
 * A recommended Kingdom from an official rulebook (card ids refer to cards.json).
 */
export interface RecommendedKingdom {
  /** English name as printed in the rulebook. */
  name: string
  /** Rulebook file it comes from (KingdomCreator file name). */
  source: string
  /** Boxes needed to play it. */
  sets: string[]
  kingdom: string[]
  landscapes: string[]
  /** Each Trait and the Kingdom pile the rulebook puts it on. */
  traits?: { trait: string; pile: string }[]
  ally?: string
  prophecy?: string
  bane?: string
  ferryman?: string
  riverboat?: string
  mouse?: string
  obelisk?: string
  /** Rulebook says to use Platinum and Colony. */
  colonies?: boolean
  /** Rulebook says to use Shelters. */
  shelters?: boolean
}

export const recommended = recommendedJson as RecommendedKingdom[]
