import type { Constraints } from './randomizer/constraints'
import type { SavedSetup } from './randomizer/setup'

/**
 * Per-browser storage of the user's choices and recent results. Every access is guarded:
 * storage can be unavailable (private mode, blocked site data) and the app must still work.
 */
const KEY = 'dominion-randomizer:v1'

export interface StoredPrefs {
  selected: string[]
  players: number
  landscapeChoice: string
  sortMode: 'cost' | 'name'
  lang: 'ko' | 'en'
  constraints: {
    exclude: string[]
    require: string[]
    groupLimits: Constraints['groupLimits']
    requireAbilities: Constraints['requireAbilities']
    attackNeedsDefense: boolean
    costSpread: boolean
  }
}

export interface HistoryEntry {
  /** Epoch milliseconds of the draw. */
  at: number
  setup: SavedSetup
}

export interface StoredState {
  prefs?: Partial<StoredPrefs>
  history?: HistoryEntry[]
}

export function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredState) : {}
  } catch {
    return {}
  }
}

export function saveState(state: StoredState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: keep working without saving.
  }
}

export function constraintsToStored(c: Constraints): StoredPrefs['constraints'] {
  return { ...c, exclude: [...c.exclude], require: [...c.require] }
}

export function constraintsFromStored(s: Partial<StoredPrefs['constraints']> | undefined, known: (id: string) => boolean): Constraints {
  return {
    exclude: new Set((s?.exclude ?? []).filter(known)),
    require: new Set((s?.require ?? []).filter(known)),
    groupLimits: s?.groupLimits ?? {},
    requireAbilities: s?.requireAbilities ?? [],
    attackNeedsDefense: s?.attackNeedsDefense ?? false,
    costSpread: s?.costSpread ?? false,
  }
}
