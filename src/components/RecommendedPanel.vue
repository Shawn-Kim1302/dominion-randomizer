<script setup lang="ts">
import { computed } from 'vue'
import { cards, getCard, getSet, setLabel } from '../data'
import { recommended, type RecommendedKingdom } from '../data/recommended'
import { isAvailable } from '../randomizer/kingdom'

const props = defineProps<{ selected: ReadonlySet<string> }>()
defineEmits<{ pick: [rec: RecommendedKingdom] }>()

const byId = new Map(cards.map((c) => [c.id, c]))

/** Every card the recommended Kingdom needs (Ally/Prophecy come with their box). */
const needed = (r: RecommendedKingdom) =>
  [...r.kingdom, ...r.landscapes, r.bane, r.ferryman, r.riverboat, r.mouse, r.ally, r.prophecy].filter((x): x is string => !!x)

/** Recommended Kingdoms that can be played with the selected boxes and promos. */
const playable = computed(() =>
  recommended.filter((r) => needed(r).every((id) => {
    const c = byId.get(id)
    return !!c && isAvailable(c, props.selected)
  })),
)

const boxes = (r: RecommendedKingdom) =>
  r.sets.map((id) => getSet(id)).filter((s) => !!s).map((s) => setLabel(s!, 'ko')).join(' + ')

const preview = (r: RecommendedKingdom) => r.kingdom.map((id) => getCard(id)?.ko ?? getCard(id)?.en ?? id).join(', ')
</script>

<template>
  <section class="panel" aria-labelledby="rec-h">
    <details>
      <summary>
        <h2 id="rec-h">공식 추천 왕국</h2>
        <span class="count">{{ playable.length }}개 가능</span>
      </summary>
      <p class="hint">룰북에 실린 추천 구성 중 지금 고른 확장으로 할 수 있는 것만 보여요. 추천 구성 이름은 영문 원문이에요.</p>
      <p v-if="!playable.length" class="hint">선택한 확장으로 할 수 있는 추천 구성이 없어요.</p>
      <ul v-else class="list">
        <li v-for="r in playable" :key="r.source + r.name">
          <button type="button" class="entry" :title="preview(r)" @click="$emit('pick', r)">
            <span class="name" lang="en">{{ r.name }}</span>
            <span class="boxes">{{ boxes(r) }}</span>
          </button>
        </li>
      </ul>
      <p class="src">출처: 각 확장 공식 룰북의 추천 왕국 (KingdomCreator 정리 데이터, MIT)</p>
    </details>
  </section>
</template>

<style scoped>
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; list-style: none; }
summary::-webkit-details-marker { display: none; }
summary::after { content: '▾'; color: var(--muted); }
details[open] summary::after { content: '▴'; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; flex: 1; }
.count { font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.hint, .src { color: var(--muted); font-size: 0.8rem; margin: 8px 0 0; }
.list { list-style: none; margin: 8px 0 0; padding: 0; max-height: 360px; overflow-y: auto; }
.entry {
  display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left; font: inherit; color: var(--fg);
  background: none; border: 0; border-bottom: 1px solid var(--line); padding: 7px 0; cursor: pointer;
}
.entry:hover .name { color: var(--gold); }
.name { font-weight: 700; font-size: 0.9rem; }
.boxes { font-size: 0.75rem; color: var(--muted); }
</style>
