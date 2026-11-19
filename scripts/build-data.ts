/**
 * Builds src/data/cards.json and src/data/sets.json.
 *
 * Sources
 * - English names, costs, types, editions: sumpfork/dominiontabs (MIT)
 *   https://github.com/sumpfork/dominiontabs/tree/master/card_db_src
 * - Korean names: namu.wiki "도미니언(보드게임)/카드/<확장>" pages, which follow the
 *   Korean print edition where one exists and the Temple Gates Games app otherwise.
 * - Manual fixes: src/data/ko-overrides.json (wins over everything else).
 *
 * Run: npm run build-data   (raw downloads are cached in .cache/)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { Ability, Card, CardKind, CardSet, LandscapeType } from '../src/data/types'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, '.cache')
const TABS = 'https://raw.githubusercontent.com/sumpfork/dominiontabs/master/card_db_src/'
const NAMU = 'https://namu.wiki/w/'
const UA = { 'User-Agent': 'Mozilla/5.0 (dominion-randomizer data build)' }

/** Expansion boxes. `tag` is the dominiontabs cardset tag. koPrint = released as a Korean print edition. */
const SETS: (CardSet & { namu: string })[] = [
  { id: 'dominion1stEdition', expansion: 'dominion', edition: 1, en: 'Dominion', ko: '기본판', koPrint: true, namu: '기본판' },
  { id: 'dominion2ndEdition', expansion: 'dominion', edition: 2, en: 'Dominion', ko: '기본판', koPrint: true, namu: '기본판' },
  { id: 'intrigue1stEdition', expansion: 'intrigue', edition: 1, en: 'Intrigue', ko: '장막 뒤의 사람들', koPrint: true, namu: '장막 뒤의 사람들' },
  { id: 'intrigue2ndEdition', expansion: 'intrigue', edition: 2, en: 'Intrigue', ko: '장막 뒤의 사람들', koPrint: true, namu: '장막 뒤의 사람들' },
  { id: 'seaside1stEdition', expansion: 'seaside', edition: 1, en: 'Seaside', ko: '정복자의 바다', koPrint: true, namu: '정복자의 바다' },
  { id: 'seaside2ndEdition', expansion: 'seaside', edition: 2, en: 'Seaside', ko: '정복자의 바다', koPrint: false, namu: '정복자의 바다' },
  { id: 'alchemy', expansion: 'alchemy', edition: 0, en: 'Alchemy', ko: '현자의 연금술', koPrint: false, namu: '현자의 연금술' },
  { id: 'prosperity1stEdition', expansion: 'prosperity', edition: 1, en: 'Prosperity', ko: '약속된 번영', koPrint: true, namu: '약속된 번영' },
  { id: 'prosperity2ndEdition', expansion: 'prosperity', edition: 2, en: 'Prosperity', ko: '약속된 번영', koPrint: false, namu: '약속된 번영' },
  { id: 'cornucopia1stEdition', expansion: 'cornucopia', edition: 1, en: 'Cornucopia', ko: '풍요의 뿔', koPrint: false, namu: '풍요의 뿔' },
  { id: 'hinterlands1stEdition', expansion: 'hinterlands', edition: 1, en: 'Hinterlands', ko: '오지의 사람들', koPrint: false, namu: '오지의 사람들' },
  { id: 'hinterlands2ndEdition', expansion: 'hinterlands', edition: 2, en: 'Hinterlands', ko: '오지의 사람들', koPrint: false, namu: '오지의 사람들' },
  { id: 'darkAges', expansion: 'darkAges', edition: 0, en: 'Dark Ages', ko: '암흑의 시대', koPrint: true, namu: '암흑의 시대' },
  { id: 'guilds1stEdition', expansion: 'guilds', edition: 1, en: 'Guilds', ko: '길드를 위하여', koPrint: true, namu: '길드를 위하여' },
  { id: 'cornucopiaAndGuilds2ndEdition', expansion: 'cornucopiaGuilds', edition: 2, en: 'Cornucopia & Guilds', ko: '풍요의 뿔 & 길드를 위하여', koPrint: false, namu: '풍요의 뿔' },
  { id: 'adventures', expansion: 'adventures', edition: 0, en: 'Adventures', ko: '모험', koPrint: false, namu: '모험' },
  { id: 'empires', expansion: 'empires', edition: 0, en: 'Empires', ko: '위대한 제국', koPrint: true, namu: '위대한 제국' },
  { id: 'nocturne', expansion: 'nocturne', edition: 0, en: 'Nocturne', ko: '녹턴', koPrint: false, namu: '녹턴' },
  { id: 'renaissance', expansion: 'renaissance', edition: 0, en: 'Renaissance', ko: '르네상스의 도래', koPrint: true, namu: '르네상스의 도래' },
  { id: 'menagerie', expansion: 'menagerie', edition: 0, en: 'Menagerie', ko: '동물원', koPrint: false, namu: '동물원' },
  { id: 'allies', expansion: 'allies', edition: 0, en: 'Allies', ko: '굳건한 동맹', koPrint: true, namu: '굳건한 동맹' },
  { id: 'plunder', expansion: 'plunder', edition: 0, en: 'Plunder', ko: '약탈', koPrint: false, namu: '약탈' },
  { id: 'risingSun', expansion: 'risingSun', edition: 0, en: 'Rising Sun', ko: '일출', koPrint: false, namu: '일출' },
  { id: 'promo', expansion: 'promo', edition: 0, en: 'Promos', ko: '프로모션', koPrint: false, namu: '프로모션' },
]
/** Basic supply cards (Copper, Platinum, Potion, ...) live under this pseudo set. */
const BASIC = 'base'
const EXTRA_NAMU_PAGES = ['길드를 위하여']

const LANDSCAPE_TYPES: LandscapeType[] = ['Event', 'Landmark', 'Project', 'Way', 'Trait']

type TabsCard = {
  card_tag: string
  cardset_tags: string[]
  cost: string
  potcost?: string
  debtcost?: string
  types: string[]
  randomizer?: boolean
  group_tag?: string
  group_top?: boolean
}

async function cached(url: string, ext: string): Promise<string> {
  await mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, createHash('sha1').update(url).digest('hex') + ext)
  if (existsSync(file)) return readFile(file, 'utf8')
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const text = await res.text()
  await writeFile(file, text)
  return text
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()

/** Extracts "한글명(English)" pairs from a namu.wiki card page. */
async function namuPairs(page: string): Promise<Map<string, string>> {
  const html = await cached(NAMU + encodeURIComponent(`도미니언(보드게임)/카드/${page}`), '.html')
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
  const map = new Map<string, string>()
  const re = /([가-힣][가-힣 ·'\-]{0,15})\s*\(\s*([A-Z][A-Za-z'’ \-\/]{1,30})\s*\)/g
  for (const m of text.matchAll(re)) {
    const key = norm(m[2])
    if (!map.has(key)) map.set(key, m[1].trim())
  }
  return map
}

function kindOf(c: TabsCard, setIds: string[]): { kind: CardKind; landscape?: LandscapeType } {
  const landscape = LANDSCAPE_TYPES.find((t) => c.types.includes(t))
  if (landscape) return { kind: 'landscape', landscape }
  if (c.types.includes('Ally')) return { kind: 'ally' }
  if (c.types.includes('Prophecy')) return { kind: 'prophecy' }
  const isPileTop = !c.group_tag || c.group_top === true
  if (c.randomizer !== false && isPileTop && setIds.length > 0) return { kind: 'kingdom' }
  return { kind: 'other' }
}

/**
 * Kingdom abilities detected from the official English card text (heuristic, used by
 * the "require a village / +Buy / trashing / draw" filters and the attack → defense rule).
 */
const ABILITY_PATTERNS: [Ability, RegExp][] = [
  ['village', /\+\s?([2-9]|X)\s?Actions?\b|Villagers?/i],
  ['buy', /\+\s?\d*\s?Buys?\b/i],
  ['draw', /\+\s?([2-9]|X)\s?Cards?\b|draw until/i],
  [
    'trash',
    /\btrash (?:up to \w+|any number of|a|an|one|two|\d+)?\s*(?:card|cards|Treasure|Copper|Curse|Action|of them)?.{0,40}?from your hand|trash a card from your hand|trash up to|trash and\/or|trash one of them|trash any number of them|from your discard pile or hand|trash your hand|return up to 2 copies/i,
  ],
  ['defense', /unaffected|immune|reveal this from your hand.{0,80}Attack|When another player plays an Attack/i],
]

async function main() {
  const cards: TabsCard[] = JSON.parse(await cached(TABS + 'cards_db.json', '.json'))
  const enNames: Record<string, { name: string; description?: string }> = JSON.parse(await cached(TABS + 'en_us/cards_en_us.json', '.json'))
  const overrides: Record<string, string> = JSON.parse(await readFile(path.join(ROOT, 'src/data/ko-overrides.json'), 'utf8'))

  const pages = [...new Set([...SETS.map((s) => s.namu), ...EXTRA_NAMU_PAGES])]
  const pageMaps = new Map<string, Map<string, string>>()
  for (const p of pages) pageMaps.set(p, await namuPairs(p))
  const global = new Map<string, string>()
  for (const m of pageMaps.values()) for (const [k, v] of m) if (!global.has(k)) global.set(k, v)

  const setIdSet = new Set(SETS.map((s) => s.id))
  const lookup = (en: string, setIds: string[]): string | null => {
    const key = norm(en)
    for (const id of setIds) {
      const page = SETS.find((s) => s.id === id)!.namu
      const hit = pageMaps.get(page)?.get(key)
      if (hit) return hit
    }
    return global.get(key) ?? null
  }

  const out: Card[] = []
  const unmatched: string[] = []
  for (const c of cards) {
    const en = enNames[c.card_tag]?.name
    if (!en) continue
    const sets = c.cardset_tags.filter((t) => setIdSet.has(t))
    const basic = c.cardset_tags.includes(BASIC)
    if (sets.length === 0 && !basic) continue // upgrade packs, German big box, unofficial extras
    const { kind, landscape } = kindOf(c, sets)

    let ko: string | null = overrides[en] ?? lookup(en, sets)
    if (!ko && en.includes(' / ')) {
      const parts = en.split(' / ').map((p) => lookup(p, sets))
      if (parts.every(Boolean)) ko = parts.join(' / ')
    }
    if (!ko && /s$/.test(en)) ko = lookup(en.replace(/s$/, ''), sets) // pile names such as "Castles"
    if (!ko) unmatched.push(`${sets[0] ?? BASIC}: ${en}`)

    // Split piles: the group entry has no text of its own, so read every card in the pile.
    const text = [c, ...cards.filter((m) => m.group_tag === c.card_tag && m.card_tag !== c.card_tag)]
      .map((m) => enNames[m.card_tag]?.description ?? '')
      .join(' ')
      .replace(/<[^>]+>/g, ' ')
    const abilities = kind === 'kingdom' ? ABILITY_PATTERNS.filter(([, rx]) => rx.test(text)).map(([a]) => a) : []

    const coin = parseInt(c.cost, 10)
    out.push({
      id: c.card_tag,
      en,
      ko,
      sets: basic && sets.length === 0 ? [BASIC] : sets,
      cost: {
        coin: Number.isNaN(coin) ? null : coin,
        potion: c.potcost ? Number(c.potcost) : 0,
        debt: c.debtcost ? Number(c.debtcost) : 0,
        special: /[*+]/.test(c.cost),
      },
      types: c.types,
      kind,
      ...(landscape ? { landscape } : {}),
      ...(abilities.length ? { abilities } : {}),
    })
  }

  out.sort((a, b) => a.id.localeCompare(b.id))
  const sets: CardSet[] = SETS.map(({ namu: _namu, ...s }) => s)
  await writeFile(path.join(ROOT, 'src/data/cards.json'), JSON.stringify(out, null, 1) + '\n')
  await writeFile(path.join(ROOT, 'src/data/sets.json'), JSON.stringify(sets, null, 1) + '\n')

  // Report
  console.log('set'.padEnd(32), 'kingdom', 'landscape', 'ko-matched')
  for (const s of SETS) {
    const inSet = out.filter((c) => c.sets.includes(s.id))
    const k = inSet.filter((c) => c.kind === 'kingdom').length
    const l = inSet.filter((c) => c.kind === 'landscape').length
    const ko = inSet.filter((c) => c.ko).length
    console.log(s.id.padEnd(32), String(k).padStart(7), String(l).padStart(9), `${ko}/${inSet.length}`.padStart(10))
  }
  console.log(`\ntotal ${out.length} cards, unmatched Korean names: ${unmatched.length}`)
  for (const u of unmatched) console.log('  -', u)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
