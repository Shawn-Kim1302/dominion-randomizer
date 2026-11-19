/**
 * Builds src/data/recommended.json: the recommended Kingdoms printed in the official
 * rulebooks, as transcribed by KingdomCreator (dominionrandomizer.com, MIT licence):
 *   https://github.com/blakevanlan/KingdomCreator/tree/master/kingdoms
 *
 * Run after build-data (it reads src/data/cards.json):  npm run build-data
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { Card } from '../src/data/types'
import type { RecommendedKingdom } from '../src/data/recommended'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, '.cache')
const SRC = 'https://raw.githubusercontent.com/blakevanlan/KingdomCreator/master/kingdoms/'

/** KingdomCreator file → its set ids → our box ids. */
const FILES = [
  'base-set', 'base-set-2', 'intrigue', 'intrigue-2', 'seaside', 'seaside-2', 'alchemy', 'prosperity', 'prosperity-2',
  'cornucopia', 'hinterlands', 'hinterlands-2', 'dark-ages', 'guilds', 'guildscornucopia', 'guildscornucopia2',
  'adventures', 'empires', 'nocturne', 'renaissance', 'menagerie', 'allies', 'plunder', 'risingsun', 'promos',
]
const SET_MAP: Record<string, string> = {
  baseset: 'dominion1stEdition', baseset2: 'dominion2ndEdition',
  intrigue: 'intrigue1stEdition', intrigue2: 'intrigue2ndEdition',
  seaside: 'seaside1stEdition', seaside2: 'seaside2ndEdition',
  alchemy: 'alchemy',
  prosperity: 'prosperity1stEdition', prosperity2: 'prosperity2ndEdition',
  cornucopia: 'cornucopia1stEdition', guilds: 'guilds1stEdition', guildscornucopia: 'cornucopiaAndGuilds2ndEdition', guildscornucopia2: 'cornucopiaAndGuilds2ndEdition',
  hinterlands: 'hinterlands1stEdition', hinterlands2: 'hinterlands2ndEdition',
  darkages: 'darkAges', adventures: 'adventures', empires: 'empires', nocturne: 'nocturne', renaissance: 'renaissance',
  menagerie: 'menagerie', allies: 'allies', plunder: 'plunder', risingsun: 'risingSun', promos: 'promo',
}

async function cached(url: string): Promise<string> {
  await mkdir(CACHE, { recursive: true })
  const file = path.join(CACHE, createHash('sha1').update(url).digest('hex') + '.yaml')
  if (existsSync(file)) return readFile(file, 'utf8')
  const res = await fetch(url, { headers: { 'User-Agent': 'dominion-randomizer data build' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  const text = await res.text()
  await writeFile(file, text)
  return text
}

type Raw = Record<string, string | string[] | Record<string, string>>

/**
 * Parses the fixed shape of these files: `kingdoms:` → `- name:` items whose keys hold
 * a scalar, a list (`- value`) or a small map (`key: value`).
 */
function parseKingdoms(text: string): Raw[] {
  const out: Raw[] = []
  let cur: Raw | null = null
  let key = ''
  for (const line of text.replace(/\t/g, '  ').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#') || line.startsWith('kingdoms:')) continue
    let m = line.match(/^\s*- name:\s*(.+?)\s*$/)
    if (m) {
      cur = { name: m[1].replace(/^['"]|['"]$/g, '') }
      out.push(cur)
      continue
    }
    if (!cur) continue
    m = line.match(/^ {4}(\w+):\s*(.*?)\s*$/)
    if (m) {
      key = m[1]
      if (m[2]) cur[key] = m[2]
      continue
    }
    m = line.match(/^\s+- (\S+)\s*$/)
    if (m) {
      const list = (Array.isArray(cur[key]) ? cur[key] : []) as string[]
      list.push(m[1])
      cur[key] = list
      continue
    }
    m = line.match(/^ {6,}(\w+):\s*(.+?)\s*$/)
    if (m) cur[key] = { ...((cur[key] as Record<string, string>) ?? {}), [m[1]]: m[2] }
  }
  return out
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

async function main() {
  const cards: Card[] = JSON.parse(await readFile(path.join(ROOT, 'src/data/cards.json'), 'utf8'))
  const byName = new Map<string, Card>()
  for (const c of cards) if (c.kind !== 'other') byName.set(squash(c.id), c)

  const unmatched = new Set<string>()
  /** "baseset2_cellar" / "adventures_event_plan" → our card id. */
  const resolve = (ref: string): string | null => {
    const name = ref.replace(/^[a-z0-9]+_/, '').replace(/^(event|landmark|project|way|trait|ally|prophecy|boon)_/, '')
    const hit = byName.get(name) ?? byName.get(name.replace(/s$/, ''))
    if (!hit) unmatched.add(ref)
    return hit?.id ?? null
  }
  const list = (v: Raw[string] | undefined) => (Array.isArray(v) ? v : typeof v === 'string' ? [v] : [])

  const out: RecommendedKingdom[] = []
  for (const f of FILES) {
    for (const k of parseKingdoms(await cached(SRC + f + '.yaml'))) {
      const meta = (typeof k.metadata === 'object' && !Array.isArray(k.metadata) ? k.metadata : {}) as Record<string, string>
      const ids = (key: string) => list(k[key]).map(resolve).filter((x): x is string => !!x)
      const one = (...keys: string[]) => keys.flatMap((key) => ids(key))[0]
      const rec: RecommendedKingdom = {
        name: String(k.name),
        source: f,
        sets: [...new Set(list(k.sets).map((s) => SET_MAP[s]).filter(Boolean))],
        kingdom: ids('supply'),
        landscapes: [...ids('events'), ...ids('landmarks'), ...ids('projects'), ...ids('ways')],
      }
      // Traits are written "trait->pile": the Trait and the Kingdom pile it goes on.
      const traits = list(k.traits).flatMap((t) => {
        const [trait, pile] = t.split('->').map(resolve)
        return trait && pile ? [{ trait, pile }] : []
      })
      if (traits.length) {
        rec.traits = traits
        rec.landscapes.push(...traits.map((t) => t.trait))
      }
      const ally = one('allies')
      const prophecy = one('prophecies')
      const bane = one('bane')
      const ferryman = one('ferrymanGain', 'ferrynamGain')
      const riverboat = one('riverboatActionCard')
      const mouse = one('wayofthemouseActionCard')
      const obelisk = one('obeliskActionCard')
      if (ally) rec.ally = ally
      if (prophecy) rec.prophecy = prophecy
      if (bane) rec.bane = bane
      if (ferryman) rec.ferryman = ferryman
      if (riverboat) rec.riverboat = riverboat
      if (mouse) rec.mouse = mouse
      if (obelisk) rec.obelisk = obelisk
      if (meta.colonies === 'true') rec.colonies = true
      if (meta.shelters === 'true') rec.shelters = true
      if (rec.kingdom.length !== 10) console.warn(`  ! ${f} "${rec.name}": ${rec.kingdom.length} Kingdom cards`)
      out.push(rec)
    }
  }

  await writeFile(path.join(ROOT, 'src/data/recommended.json'), JSON.stringify(out, null, 1) + '\n')
  console.log(`recommended kingdoms: ${out.length}, unmatched card refs: ${unmatched.size}`)
  for (const u of unmatched) console.log('  -', u)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
