<script setup lang="ts">
import { computed } from 'vue'
import { getSet, setLabel } from '../data'
import type { Card } from '../data/types'
import { primaryName, secondaryName } from '../lang'

const props = defineProps<{
  card: Card
  selectedSets: ReadonlySet<string>
  /** Short label such as "Bane" or the Trait placed on this pile. */
  tag?: string
  /** Shows a "다시 뽑기" button that emits `reroll`. */
  rerollable?: boolean
}>()
defineEmits<{ reroll: [] }>()

/** Frame colours in the order the printed cards prioritise them. */
const BANDS: [string, string][] = [
  ['Night', 'var(--t-night)'],
  ['Duration', 'var(--t-duration)'],
  ['Reaction', 'var(--t-reaction)'],
  ['Reserve', 'var(--t-reserve)'],
  ['Treasure', 'var(--t-treasure)'],
  ['Victory', 'var(--t-victory)'],
  ['Action', 'var(--t-action)'],
]

const LANDSCAPE_KINDS = new Set(['landscape', 'ally', 'prophecy'])

const band = computed(() => {
  if (LANDSCAPE_KINDS.has(props.card.kind)) return 'var(--t-landscape)'
  const colors = BANDS.filter(([t]) => props.card.types.includes(t)).map(([, c]) => c).slice(0, 2)
  if (colors.length === 0) return 'var(--t-action)'
  if (colors.length === 1) return colors[0]
  return `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`
})

const boxName = computed(() => {
  // Show the box the player actually selected (a card can be in both editions).
  const id = props.card.sets.find((s) => props.selectedSets.has(s)) ?? props.card.sets[0]
  const s = getSet(id)
  return s ? setLabel(s, 'ko') : ''
})
</script>

<template>
  <article class="card">
    <div class="band" :style="{ background: band }"></div>
    <div class="body">
      <span v-if="tag" class="tag">{{ tag }}</span>
      <h3 class="ko">{{ primaryName(card) }}</h3>
      <p v-if="secondaryName(card)" class="en">{{ secondaryName(card) }}</p>
      <p class="types">{{ card.types.join(' · ') }}</p>
    </div>
    <footer class="foot">
      <span class="cost" :aria-label="`비용 ${card.cost.coin ?? 0}`">
        <span v-if="card.cost.coin !== null && (card.cost.coin > 0 || (!card.cost.debt && !card.cost.potion))" class="coin">
          {{ card.cost.coin }}<sup v-if="card.cost.special">*</sup>
        </span>
        <span v-if="card.cost.potion" class="potion" title="물약">P</span>
        <span v-if="card.cost.debt" class="debt" title="빚">{{ card.cost.debt }}</span>
      </span>
      <span class="box">{{ boxName }}</span>
    </footer>
    <button v-if="rerollable" type="button" class="reroll" :aria-label="`${primaryName(card)} 다시 뽑기`" title="이 카드만 다시 뽑기" @click="$emit('reroll')">↻</button>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  overflow: hidden; display: flex; flex-direction: column; min-width: 0;
}
.band { height: 8px; }
.body { padding: 12px 14px 6px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
.tag {
  align-self: flex-start; font-size: 0.7rem; font-weight: 700; color: var(--gold);
  background: var(--gold-soft); border-radius: 4px; padding: 1px 6px; margin-bottom: 4px;
}
.ko { font-family: var(--font-display); font-size: 1.15rem; line-height: 1.3; margin: 0; overflow-wrap: anywhere; }
.en { margin: 0; color: var(--muted); font-size: 0.82rem; }
.types { margin: 4px 0 0; font-size: 0.72rem; color: var(--muted); letter-spacing: 0.02em; }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 14px 12px; }
.cost { display: inline-flex; gap: 4px; align-items: center; }
.coin, .potion, .debt {
  display: inline-grid; place-items: center; min-width: 26px; height: 26px;
  font-weight: 700; font-size: 0.85rem; font-variant-numeric: tabular-nums;
}
.coin { border-radius: 50%; background: var(--t-treasure); color: #3a2a00; }
.coin sup { font-size: 0.6rem; }
.potion { border-radius: 50% 50% 40% 40%; background: #4b7bd1; color: #fff; }
.debt { clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%); background: #b55a3c; color: #fff; }
.reroll {
  position: absolute; top: 12px; right: 8px; width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid var(--line); background: var(--surface); color: var(--muted); cursor: pointer; font-size: 0.95rem;
}
.reroll:hover { color: var(--gold); border-color: var(--gold); }
.box { font-size: 0.72rem; color: var(--muted); text-align: right; }
</style>
