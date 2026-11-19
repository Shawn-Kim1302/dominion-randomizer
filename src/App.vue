<script setup lang="ts">
import { computed, ref } from 'vue'
import CardTile from './components/CardTile.vue'
import FiltersPanel from './components/FiltersPanel.vue'
import SetPicker from './components/SetPicker.vue'
import SetupPanel from './components/SetupPanel.vue'
import { cardName, cards, sets } from './data'
import type { Card } from './data/types'
import { drawConstrainedKingdom, drawLandscapes, emptyConstraints, type Constraints } from './randomizer/constraints'
import { PROMO_SET, compareByCost, compareByName, isAvailable, kingdomPool, landscapePool, promoKey, type LandscapeRule } from './randomizer/kingdom'
import { resolveSetup, type GameSetup } from './randomizer/setup'

const selected = ref<Set<string>>(new Set(['dominion2ndEdition']))
const players = ref(2)
const landscapeChoice = ref('shuffled')
const setup = ref<GameSetup | null>(null)
const error = ref('')
const constraints = ref<Constraints>(emptyConstraints())
/** How the 10 Kingdom piles are ordered on screen. */
const sortMode = ref<'cost' | 'name'>('cost')

const LANDSCAPE_RULES: Record<string, { label: string; rule: LandscapeRule }> = {
  shuffled: { label: '랜더마이저에 섞기 · 최대 2장 (공식 기본)', rule: { mode: 'shuffled', max: 2 } },
  fixed1: { label: '따로 섞어 항상 1장', rule: { mode: 'fixed', count: 1 } },
  fixed2: { label: '따로 섞어 항상 2장', rule: { mode: 'fixed', count: 2 } },
  none: { label: '사용 안 함', rule: { mode: 'fixed', count: 0 } },
}

const LANDSCAPE_KO: Record<string, string> = { Event: '이벤트', Landmark: '랜드마크', Project: '프로젝트', Way: 'Way', Trait: '특성' }

const pool = computed(() => kingdomPool(cards, selected.value))
const landscapes = computed(() => landscapePool(cards, selected.value))

const supply = computed(() => {
  const s = setup.value
  if (!s) return []
  const traitOn = new Map(s.traits.map((t) => [t.pile.id, t.trait]))
  const tagFor = (c: Card, base?: string) => {
    const trait = traitOn.get(c.id)
    return [base, trait && `특성: ${cardName(trait)}`].filter(Boolean).join(' · ') || undefined
  }
  const piles = s.kingdom.slice().sort(sortMode.value === 'name' ? compareByName : compareByCost).map((card) => ({ card, tag: tagFor(card) }))
  for (const e of s.extraPiles.filter((x) => x.inSupply)) {
    piles.push({ card: e.card, tag: tagFor(e.card, e.role === 'bane' ? 'Bane' : '공격 더미 추가') })
  }
  return piles
})

const sideCards = computed(() => {
  const s = setup.value
  if (!s) return []
  const pileOf = new Map(s.traits.map((t) => [t.trait.id, t.pile]))
  const out: { card: Card; tag?: string }[] = s.landscapes.map((card) => {
    const pile = pileOf.get(card.id)
    return { card, tag: pile ? `특성 → ${cardName(pile)}` : LANDSCAPE_KO[card.landscape ?? ''] }
  })
  if (s.ally) out.push({ card: s.ally, tag: '동맹' })
  if (s.prophecy) out.push({ card: s.prophecy, tag: '예언' })
  return out
})

function draw() {
  const rng = Math.random
  const c = constraints.value
  const r = drawConstrainedKingdom(pool.value, c, selected.value, rng)
  if (!r.ok) {
    error.value = `조건에 맞는 왕국을 만들 수 없어요: ${r.reasons.join(', ')}. 조건을 줄이거나 확장을 더 골라 주세요.`
    return
  }
  error.value = ''
  const usablePool = pool.value.filter((k) => !c.exclude.has(k.id))
  const ls = drawLandscapes(usablePool, landscapes.value, c, LANDSCAPE_RULES[landscapeChoice.value].rule, rng)
  setup.value = resolveSetup(r.kingdom, ls, {
    allCards: cards,
    kingdomPool: usablePool,
    allies: cards.filter((x) => x.kind === 'ally' && isAvailable(x, selected.value) && !c.exclude.has(x.id)),
    prophecies: cards.filter((x) => x.kind === 'prophecy' && isAvailable(x, selected.value) && !c.exclude.has(x.id)),
    players: players.value,
    rng,
  })
}

function selectAll(on: boolean) {
  if (!on) {
    selected.value = new Set()
    return
  }
  const promos = cards.filter((c) => c.sets.includes(PROMO_SET)).map((c) => promoKey(c.id))
  selected.value = new Set([...sets.filter((s) => s.id !== PROMO_SET).map((s) => s.id), ...promos])
}
</script>

<template>
  <div class="page">
    <header class="top">
      <h1>도미니언 랜더마이저</h1>
      <p class="sub">가진 확장을 고르고 왕국 카드 10종을 뽑아요. 추가 구성물은 공식 규칙대로 정해져요.</p>
    </header>

    <div class="layout">
      <div class="side">
        <section class="panel" aria-labelledby="opts-h">
          <h2 id="opts-h">게임</h2>
          <label class="field">
            <span>인원</span>
            <select v-model.number="players">
              <option v-for="n in [2, 3, 4, 5, 6]" :key="n" :value="n">{{ n }}명</option>
            </select>
          </label>
          <label class="field">
            <span>랜드스케이프</span>
            <select v-model="landscapeChoice">
              <option v-for="(v, k) in LANDSCAPE_RULES" :key="k" :value="k">{{ v.label }}</option>
            </select>
          </label>
        </section>

        <section class="panel" aria-labelledby="sets-h">
          <div class="panel-head">
            <h2 id="sets-h">확장</h2>
            <div class="quick">
              <button type="button" class="link" @click="selectAll(true)">모두 선택</button>
              <button type="button" class="link" @click="selectAll(false)">모두 해제</button>
            </div>
          </div>
          <SetPicker v-model="selected" />
        </section>

        <FiltersPanel v-model="constraints" :selected="selected" />
      </div>

      <section class="result" aria-labelledby="kingdom-h">
        <div class="result-head">
          <div>
            <h2 id="kingdom-h">왕국</h2>
            <p class="pool">뽑을 수 있는 왕국 카드 {{ pool.length }}종 · 랜드스케이프 {{ landscapes.length }}종</p>
          </div>
          <div class="actions">
            <div class="seg" role="group" aria-label="왕국 카드 정렬">
              <button type="button" :aria-pressed="sortMode === 'cost'" @click="sortMode = 'cost'">비용순</button>
              <button type="button" :aria-pressed="sortMode === 'name'" @click="sortMode = 'name'">가나다순</button>
            </div>
            <button type="button" class="primary" @click="draw">왕국 뽑기</button>
          </div>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <template v-if="setup">
          <div class="grid">
            <CardTile v-for="p in supply" :key="p.card.id" :card="p.card" :tag="p.tag" :selected-sets="selected" />
          </div>
          <div v-if="sideCards.length" class="grid wide">
            <CardTile v-for="p in sideCards" :key="p.card.id" :card="p.card" :tag="p.tag" :selected-sets="selected" />
          </div>
          <SetupPanel :setup="setup" />
        </template>
        <p v-else-if="!error" class="empty">확장을 고르고 <strong>왕국 뽑기</strong>를 눌러 주세요.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 1200px; margin: 0 auto; padding: 28px 16px 64px; display: flex; flex-direction: column; gap: 24px; }
.top h1 { font-family: var(--font-display); font-size: 1.9rem; margin: 0; }
.sub { margin: 4px 0 0; color: var(--muted); }
.layout { display: grid; grid-template-columns: minmax(280px, 360px) 1fr; gap: 24px; align-items: start; }
@media (max-width: 820px) { .layout { grid-template-columns: 1fr; } }
.side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.panel-head, .result-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; }
.field { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; font-size: 0.9rem; }
.field select {
  min-width: 0; max-width: 220px; font: inherit; font-size: 0.85rem; color: var(--fg);
  background: var(--surface-2); border: 1px solid var(--line); border-radius: 6px; padding: 4px 8px;
}
.quick { display: flex; gap: 10px; }
.link { background: none; border: 0; padding: 0; color: var(--gold); cursor: pointer; font-size: 0.85rem; }
.result { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pool { margin: 2px 0 0; color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.primary {
  background: var(--gold); color: var(--surface); border: 0; border-radius: 8px;
  padding: 10px 22px; font-weight: 700; cursor: pointer;
}
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.seg button { background: var(--surface); color: var(--fg); border: 0; padding: 8px 12px; font: inherit; font-size: 0.85rem; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--line); }
.seg button[aria-pressed='true'] { background: var(--gold-soft); color: var(--gold); font-weight: 700; }
.primary:hover { filter: brightness(1.08); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.grid.wide { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.error { color: var(--danger); margin: 0; }
.empty { color: var(--muted); margin: 0; padding: 40px 0; text-align: center; border: 1px dashed var(--line); border-radius: 12px; }
</style>
