import type { Card } from '../data/types'

/**
 * Extra components (non-Supply piles, decks, mats, tokens) a game needs because of
 * the cards in use. Every rule cites the official card text or rulebook FAQ it comes
 * from (dominiontabs ships the official card text and the rulebook FAQ "extra" text).
 */
export interface ComponentRule {
  /** Stable id. */
  id: string
  /** Label shown in the setup checklist. */
  ko: string
  en: string
  /** Returns the in-use cards that make this component necessary (empty = not needed). */
  needs: (inUse: readonly Card[]) => Card[]
  /** Card ids of the component itself (non-Supply cards), resolved for display. */
  cards?: (reasons: readonly Card[]) => string[]
  /** Extra instructions (counts etc.). */
  note?: (players: number) => string
  /** Where the rule comes from. */
  source: string
  /** True when the component is a Supply pile (counts toward the game end). */
  inSupply?: boolean
}

/** Every card id named by the rules below, so a test can check they all exist. */
export const REFERENCED_IDS: string[] = []

const ids = (...list: string[]) => {
  REFERENCED_IDS.push(...list)
  return (inUse: readonly Card[]) => inUse.filter((c) => list.includes(c.id))
}
const typed = (type: string) => (inUse: readonly Card[]) => inUse.filter((c) => c.types.includes(type))
const either =
  (...fs: ((inUse: readonly Card[]) => Card[])[]) =>
  (inUse: readonly Card[]) =>
    [...new Set(fs.flatMap((f) => f(inUse)))]

/** Heirloom that replaces one starting Copper, per Kingdom card (Nocturne). */
export const HEIRLOOMS: Record<string, string> = {
  Cemetery: 'Haunted Mirror',
  Fool: 'Lucky Coin',
  Pixie: 'Goat',
  Pooka: 'Cursed Gold',
  'Secret Cave': 'Magic Lamp',
  Shepherd: 'Pasture',
  Tracker: 'Pouch',
}

/** Artifacts and the cards that use them (Renaissance). */
export const ARTIFACTS: Record<string, string[]> = {
  'Border Guard': ['Horn', 'Lantern'],
  'Flag Bearer': ['Flag'],
  Swashbuckler: ['Treasure Chest'],
  Treasurer: ['Key'],
}

/** Sun tokens per player count (Rising Sun rulebook). */
export const SUN_TOKENS: Record<number, number> = { 2: 5, 3: 8, 4: 10, 5: 12, 6: 13 }

export const COMPONENT_RULES: ComponentRule[] = [
  {
    id: 'potion',
    ko: '물약 더미',
    en: 'Potion pile',
    needs: (u) => u.filter((c) => c.cost.potion > 0),
    cards: () => ['Potion'],
    note: () => '인원수와 관계없이 16장',
    source: 'Alchemy — Potion 해설: 비용에 물약이 있는 카드가 있으면 물약 더미를 공급처에 추가',
    inSupply: true,
  },
  {
    id: 'ruins',
    ko: '폐허 더미',
    en: 'Ruins pile',
    needs: typed('Looter'),
    cards: () => ['Ruins'],
    note: (p) => `섞어서 ${Math.max(1, p - 1) * 10}장 (2인 10장, 이후 1명당 +10장), 맨 위 1장만 앞면`,
    source: 'Dark Ages — Ruins 해설: Looter 타입 왕국 카드가 있으면 사용',
    inSupply: true,
  },
  {
    id: 'spoils',
    ko: '전리품 더미',
    en: 'Spoils pile',
    needs: ids('Bandit Camp', 'Marauder', 'Pillage'),
    cards: () => ['Spoils'],
    source: '카드 텍스트 (Spoils를 얻는 카드)',
  },
  { id: 'madman', ko: '광인 더미', en: 'Madman pile', needs: ids('Hermit'), cards: () => ['Madman'], source: 'Hermit 카드 텍스트' },
  { id: 'mercenary', ko: '용병 더미', en: 'Mercenary pile', needs: ids('Urchin'), cards: () => ['Mercenary'], source: 'Urchin 카드 텍스트' },
  {
    id: 'horse',
    ko: '말 더미',
    en: 'Horse pile',
    needs: ids('Bargain', 'Cavalry', 'Demand', 'Groom', 'Hostelry', 'Livery', 'Paddock', 'Ride', 'Scrap', 'Sleigh', 'Stampede', 'Supplies'),
    cards: () => ['Horse'],
    source: '카드 텍스트 (Horse를 얻는 카드)',
  },
  {
    id: 'loot',
    ko: '약탈물 더미',
    en: 'Loot pile',
    needs: ids('Cursed', 'Cutthroat', 'Foray', 'Invasion', 'Jewelled Egg', 'Looting', 'Peril', 'Pickaxe', 'Prosper', 'Sack of Loot', 'Search', 'Wealthy Village'),
    cards: () => ['Loot'],
    note: () => '약탈물 30장을 섞어 뒷면으로',
    source: 'Plunder — Loot 해설: Loot를 언급하는 카드가 있으면 사용',
  },
  {
    id: 'prizes',
    ko: '상(Prize) 5종',
    en: 'Prizes',
    needs: ids('Tournament'),
    cards: () => ['Bag of Gold', 'Diadem', 'Followers', 'Princess', 'Trusty Steed'],
    source: 'Tournament 카드 해설',
  },
  {
    id: 'rewards',
    ko: '보상(Reward) 6종',
    en: 'Rewards',
    needs: ids('Joust'),
    cards: () => ['Coronet', 'Courser', 'Demesne', 'Housecarl', 'Huge Turnip', 'Renown'],
    note: (p) => (p <= 2 ? '2인: 각 1장' : '3인 이상: 각 2장'),
    source: 'Joust 카드 해설',
  },
  {
    id: 'travellers-page',
    ko: '여행자 더미 (시종 계열)',
    en: 'Page Travellers',
    needs: ids('Page'),
    cards: () => ['Treasure Hunter', 'Warrior', 'Hero', 'Champion'],
    source: 'Page 카드 텍스트 (교환 대상)',
  },
  {
    id: 'travellers-peasant',
    ko: '여행자 더미 (농부 계열)',
    en: 'Peasant Travellers',
    needs: ids('Peasant'),
    cards: () => ['Soldier', 'Fugitive', 'Disciple', 'Teacher'],
    source: 'Peasant 카드 텍스트 (교환 대상)',
  },
  {
    id: 'boons',
    ko: '축복(Boon) 덱',
    en: 'Boons deck',
    needs: typed('Fate'),
    note: () => '축복 12장을 섞어 덱으로. 드루이드가 있으면 먼저 3장을 앞면으로 따로 둠',
    source: 'Nocturne — Fate 카드가 있으면 축복 사용 / Druid 세팅 텍스트',
  },
  {
    id: 'hexes',
    ko: '저주(Hex) 덱',
    en: 'Hexes deck',
    needs: typed('Doom'),
    note: () => '저주 12장을 섞어 덱으로',
    source: 'Nocturne — Doom 카드가 있으면 저주(Hex) 사용',
  },
  {
    id: 'hex-states',
    ko: '상태 카드 (현혹·질투·비참)',
    en: 'Hex States',
    needs: typed('Doom'),
    cards: () => ['Envious / Deluded', 'Miserable / Twice Miserable'],
    source: 'Delusion · Envy · Misery 저주 텍스트',
  },
  { id: 'lost-in-the-woods', ko: '상태 카드: 숲 속에서 길을 잃다', en: 'Lost in the Woods', needs: ids('Fool'), cards: () => ['Lost in the Woods'], source: 'Fool 카드 텍스트' },
  {
    id: 'heirlooms',
    ko: '가보(Heirloom)',
    en: 'Heirlooms',
    needs: (u) => u.filter((c) => c.id in HEIRLOOMS),
    cards: (reasons) => reasons.map((c) => HEIRLOOMS[c.id]),
    note: () => '각 플레이어의 시작 동화 1장을 가보 1장으로 교체 (가보마다)',
    source: 'Nocturne — 카드의 Heirloom 표기 / Fool 해설',
  },
  {
    id: 'will-o-wisp',
    ko: '윌 오 위스프 더미',
    en: "Will-o'-Wisp pile",
    needs: either(typed('Fate'), ids('Exorcist')),
    cards: () => ["Will-o'-Wisp"],
    source: "The Swamp's Gift(축복) 텍스트 / Exorcist 해설",
  },
  { id: 'imp', ko: '임프 더미', en: 'Imp pile', needs: ids("Devil's Workshop", 'Tormentor', 'Exorcist'), cards: () => ['Imp'], source: "Devil's Workshop · Tormentor 텍스트 / Exorcist 해설" },
  { id: 'ghost', ko: '유령 더미', en: 'Ghost pile', needs: ids('Cemetery', 'Exorcist'), cards: () => ['Ghost'], source: 'Haunted Mirror(Cemetery 가보) 텍스트 / Exorcist 해설' },
  { id: 'wish', ko: '소원 더미', en: 'Wish pile', needs: ids('Leprechaun', 'Secret Cave'), cards: () => ['Wish'], source: 'Leprechaun · Magic Lamp(Secret Cave 가보) 텍스트' },
  { id: 'bat', ko: '박쥐 더미', en: 'Bat pile', needs: ids('Vampire'), cards: () => ['Bat'], source: 'Vampire 카드 텍스트' },
  {
    id: 'zombies',
    ko: '좀비 3장',
    en: 'Zombies',
    needs: ids('Necromancer'),
    cards: () => ['Zombie Apprentice', 'Zombie Mason', 'Zombie Spy'],
    note: () => '폐기 더미에 놓고 시작',
    source: 'Necromancer 세팅 텍스트',
  },
  {
    id: 'artifacts',
    ko: '아티팩트',
    en: 'Artifacts',
    needs: (u) => u.filter((c) => c.id in ARTIFACTS),
    cards: (reasons) => reasons.flatMap((c) => ARTIFACTS[c.id]),
    source: 'Renaissance — 카드 텍스트 (Artifact 언급)',
  },
  {
    id: 'black-market',
    ko: '암시장 덱',
    en: 'Black Market deck',
    needs: ids('Black Market'),
    note: () => '공급처에 없는 왕국 카드 1장씩으로 덱 구성. 그 덱에 물약 비용 카드가 있으면 물약 더미도 추가',
    source: 'Black Market 카드 텍스트 / Potion 해설',
  },
  { id: 'tavern-mat', ko: 'Tavern 매트', en: 'Tavern mat', needs: either(typed('Reserve'), ids('Miser', 'Peasant')), source: 'Adventures — Reserve 카드 / Miser 텍스트' },
  {
    id: 'exile-mat',
    ko: 'Exile 매트',
    en: 'Exile mat',
    needs: ids('Banish', 'Bounty Hunter', 'Camel Train', 'Cardinal', 'Coven', 'Displace', 'Enclave', 'Gatekeeper', 'Invest', 'Sanctuary', 'Stockpile', 'Transport', 'Way of the Camel', 'Way of the Worm'),
    source: 'Menagerie — 카드 텍스트 (Exile 언급)',
  },
  { id: 'native-village-mat', ko: 'Native Village 매트', en: 'Native Village mat', needs: ids('Native Village'), source: 'Native Village 카드 텍스트' },
  { id: 'island-mat', ko: 'Island 매트 (1판)', en: 'Island mat', needs: ids('Island'), source: 'Island 카드 텍스트 (1판은 매트, 2판은 옆에 두기)' },
  { id: 'pirate-ship-mat', ko: 'Pirate Ship 매트 + 코인 토큰', en: 'Pirate Ship mat', needs: ids('Pirate Ship'), source: 'Pirate Ship 해설' },
  {
    id: 'trade-route',
    ko: 'Trade Route 매트 + 토큰',
    en: 'Trade Route mat',
    needs: ids('Trade Route'),
    note: () => '승리 카드 공급 더미마다 토큰 1개',
    source: 'Trade Route 세팅 텍스트',
  },
  { id: 'embargo-tokens', ko: 'Embargo 토큰', en: 'Embargo tokens', needs: ids('Embargo'), source: 'Embargo 카드 텍스트' },
  {
    id: 'coffers',
    ko: 'Coffers(코인) 토큰',
    en: 'Coffers',
    needs: ids('Baker', 'Butcher', 'Candlestick Maker', 'Ducat', 'Exploration', 'Footpad', 'Guildhall', 'Merchant Guild', 'Pageant', 'Patron', 'Plaza', 'Silk Merchant', 'Spices', 'Swashbuckler', 'Villain'),
    source: '카드 텍스트 (Coffers 언급)',
  },
  {
    id: 'villagers',
    ko: 'Villagers 토큰',
    en: 'Villagers',
    needs: ids('Academy', 'Acting Troupe', 'Exploration', 'Lackeys', 'Patron', 'Recruiter', 'Sculptor', 'Silk Merchant'),
    source: '카드 텍스트 (Villager 언급)',
  },
  {
    id: 'vp-tokens',
    ko: '승점(VP) 토큰',
    en: 'VP tokens',
    needs: ids(
      'Aqueduct', 'Arena', 'Basilica', 'Baths', 'Battlefield', 'Bishop', 'Chariot Race', 'Collection', 'Colonnade', 'Conquest',
      'Defiled Shrine', 'Dominate', "Farmers' Market", 'Goons', 'Groundskeeper', 'Investment', 'Labyrinth', 'Monument',
      'Mountain Pass', 'Ritual', 'Sacrifice', 'Salt the Earth', 'Temple', 'Tomb', 'Triumph', 'Wedding', 'Wild Hunt',
    ),
    source: '카드 텍스트 (<VP> 토큰을 주고받는 카드)',
  },
  {
    id: 'debt-tokens',
    ko: '빚(Debt) 토큰',
    en: 'Debt tokens',
    needs: either(
      (u) => u.filter((c) => c.cost.debt > 0),
      ids('Capital', 'Change', 'Craftsman', 'Credit', 'Gold Mine', 'Harsh Winter', 'Imperial Envoy', 'Litter', 'Mountain Pass', 'Root Cellar', 'Tax'),
    ),
    source: '빚 비용 카드 / 카드 텍스트 (Debt 언급)',
  },
  {
    id: 'favors',
    ko: 'Favor 토큰',
    en: 'Favors',
    needs: either(typed('Liaison'), (u) => u.filter((c) => c.kind === 'ally')),
    note: () => '각 플레이어 Favor 1개로 시작',
    source: 'Allies 룰북 (Ally 사용 시)',
  },
  {
    id: 'adventures-tokens',
    ko: 'Adventures 토큰',
    en: 'Adventures tokens',
    needs: ids(
      'Ball', 'Borrow', 'Bridge Troll', 'Ferry', 'Giant', 'Inheritance', 'Lost Arts', 'Pathfinding', 'Peasant', 'Pilgrimage',
      'Plan', 'Raid', 'Ranger', 'Relic', 'Seaway', 'Training',
    ),
    note: () => '필요한 플레이어 토큰(+1 카드, −1 코인, 여정 토큰 등)을 각자 준비',
    source: '카드 텍스트 (토큰 언급)',
  },
  { id: 'family-tokens', ko: '할인 토큰', en: 'Family of Inventors tokens', needs: ids('Family of Inventors'), source: 'Family of Inventors 카드 텍스트' },
  { id: 'sinister-plot', ko: 'Sinister Plot 토큰', en: 'Sinister Plot tokens', needs: ids('Sinister Plot'), source: 'Sinister Plot 카드 텍스트' },
  {
    id: 'project-cubes',
    ko: '프로젝트용 플레이어 큐브',
    en: 'Project cubes',
    needs: (u) => u.filter((c) => c.landscape === 'Project'),
    note: () => '각 플레이어 색 큐브 2개',
    source: 'Renaissance 룰북',
  },
  {
    id: 'sun-tokens',
    ko: 'Sun 토큰',
    en: 'Sun tokens',
    needs: (u) => u.filter((c) => c.kind === 'prophecy'),
    note: (p) => `예언 위에 ${SUN_TOKENS[p] ?? SUN_TOKENS[6]}개 (2인 5 · 3인 8 · 4인 10 · 5인 12 · 6인 13)`,
    source: 'Rising Sun 룰북',
  },
]

/**
 * Setup instructions printed on specific cards ("Setup: …"), shown when the card is in use.
 */
export const SETUP_NOTES: Record<string, string> = {
  Aqueduct: '은화·금화 더미 위에 각각 8VP',
  Arena: '이 랜드마크 위에 인원 × 6VP',
  Basilica: '이 랜드마크 위에 인원 × 6VP',
  Baths: '이 랜드마크 위에 인원 × 6VP',
  Battlefield: '이 랜드마크 위에 인원 × 6VP',
  Colonnade: '이 랜드마크 위에 인원 × 6VP',
  Labyrinth: '이 랜드마크 위에 인원 × 6VP',
  'Defiled Shrine': 'Gathering이 아닌 액션 공급 더미마다 2VP',
  Tax: '모든 공급 더미에 빚 1개씩',
  Baker: '각 플레이어 Coffers 1개로 시작',
  Importer: '각 플레이어 Favor +4로 시작',
  Inherited: '각 플레이어는 원하는 시작 카드 1장을 Inherited 더미의 카드로 교체',
  Necromancer: '좀비 3장을 폐기 더미에 놓기',
}
