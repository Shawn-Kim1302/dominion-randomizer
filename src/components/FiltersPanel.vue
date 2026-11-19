<script setup lang="ts">
import { computed, ref } from 'vue'
import { cardName, cards, groupTitle } from '../data'
import type { Card } from '../data/types'
import { COST_BANDS, groupsOf, type Constraints, type GroupLimit, type RequirableAbility } from '../randomizer/constraints'
import { isAvailable } from '../randomizer/kingdom'

const props = defineProps<{ modelValue: Constraints; selected: ReadonlySet<string> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Constraints] }>()

const update = (patch: Partial<Constraints>) => emit('update:modelValue', { ...props.modelValue, ...patch })

const ABILITIES: { id: RequirableAbility; label: string }[] = [
  { id: 'village', label: '마을 (+2 액션)' },
  { id: 'buy', label: '+구매' },
  { id: 'draw', label: '드로우 (+2 카드)' },
  { id: 'trash', label: '폐기' },
]

function toggleAbility(a: RequirableAbility) {
  const list = props.modelValue.requireAbilities
  update({ requireAbilities: list.includes(a) ? list.filter((x) => x !== a) : [...list, a] })
}

/** Expansion groups that currently have selectable Kingdom cards. */
const groups = computed(() => {
  const seen = new Set<string>()
  for (const c of cards) if (c.kind === 'kingdom' && isAvailable(c, props.selected)) for (const g of groupsOf(c, props.selected)) seen.add(g)
  return [...seen]
})

function setLimit(group: string, key: keyof GroupLimit, raw: string) {
  const n = raw === '' ? undefined : Math.max(0, Math.min(10, Math.floor(Number(raw))))
  const next = { ...props.modelValue.groupLimits, [group]: { ...props.modelValue.groupLimits[group], [key]: n } }
  if (next[group].min === undefined && next[group].max === undefined) delete next[group]
  update({ groupLimits: next })
}

// Card search for require / exclude.
const query = ref('')
const searchable = computed(() => cards.filter((c) => (c.kind === 'kingdom' || c.kind === 'landscape') && isAvailable(c, props.selected)))
const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return searchable.value.filter((c) => (c.ko ?? '').toLowerCase().includes(q) || c.en.toLowerCase().includes(q)).slice(0, 8)
})

function mark(card: Card, list: 'require' | 'exclude') {
  const require = new Set(props.modelValue.require)
  const exclude = new Set(props.modelValue.exclude)
  require.delete(card.id)
  exclude.delete(card.id)
  if (list === 'require') require.add(card.id)
  else exclude.add(card.id)
  update({ require, exclude })
  query.value = ''
}

function unmark(id: string) {
  const require = new Set(props.modelValue.require)
  const exclude = new Set(props.modelValue.exclude)
  require.delete(id)
  exclude.delete(id)
  update({ require, exclude })
}

const byId = new Map(cards.map((c) => [c.id, c]))
const named = (ids: Set<string>) => [...ids].map((id) => byId.get(id)).filter((c): c is Card => !!c)
</script>

<template>
  <section class="panel" aria-labelledby="filters-h">
    <h2 id="filters-h">조건</h2>

    <fieldset>
      <legend>꼭 들어갈 효과 (왕국 10장 중 1장 이상)</legend>
      <div class="chips">
        <button
          v-for="a in ABILITIES"
          :key="a.id"
          type="button"
          class="chip"
          :aria-pressed="modelValue.requireAbilities.includes(a.id)"
          @click="toggleAbility(a.id)"
        >
          {{ a.label }}
        </button>
      </div>
    </fieldset>

    <label class="check">
      <input type="checkbox" :checked="modelValue.attackNeedsDefense" @change="update({ attackNeedsDefense: !modelValue.attackNeedsDefense })" />
      공격 카드가 있으면 방어 카드(해자 등)도 넣기
    </label>
    <label class="check">
      <input type="checkbox" :checked="modelValue.costSpread" @change="update({ costSpread: !modelValue.costSpread })" />
      비용 고르게 ({{ COST_BANDS.map((b) => b.label).join(' · ') }} 각 2장 이상)
    </label>

    <fieldset v-if="groups.length">
      <legend>확장별 장수 (비우면 제한 없음)</legend>
      <table class="limits">
        <thead>
          <tr><th scope="col">확장</th><th scope="col">최소</th><th scope="col">최대</th></tr>
        </thead>
        <tbody>
          <tr v-for="g in groups" :key="g">
            <th scope="row">{{ groupTitle(g) }}</th>
            <td>
              <input type="number" min="0" max="10" inputmode="numeric" :aria-label="`${groupTitle(g)} 최소`"
                :value="modelValue.groupLimits[g]?.min ?? ''" @change="setLimit(g, 'min', ($event.target as HTMLInputElement).value)" />
            </td>
            <td>
              <input type="number" min="0" max="10" inputmode="numeric" :aria-label="`${groupTitle(g)} 최대`"
                :value="modelValue.groupLimits[g]?.max ?? ''" @change="setLimit(g, 'max', ($event.target as HTMLInputElement).value)" />
            </td>
          </tr>
        </tbody>
      </table>
    </fieldset>

    <fieldset>
      <legend>카드 지정</legend>
      <input v-model="query" type="search" class="search" placeholder="카드 이름 검색 (한글/영문)" aria-label="카드 이름 검색" />
      <ul v-if="results.length" class="results">
        <li v-for="c in results" :key="c.id">
          <span class="rname">{{ cardName(c) }} <small v-if="c.ko" lang="en">{{ c.en }}</small></span>
          <button type="button" class="mini" @click="mark(c, 'require')">필수</button>
          <button type="button" class="mini" @click="mark(c, 'exclude')">제외</button>
        </li>
      </ul>
      <p v-else-if="query.trim()" class="hint">일치하는 카드가 없어요.</p>
      <div v-if="modelValue.require.size" class="marked">
        <span class="mlabel">필수</span>
        <button v-for="c in named(modelValue.require)" :key="c.id" type="button" class="tagchip req" :aria-label="`${cardName(c)} 필수 해제`" @click="unmark(c.id)">{{ cardName(c) }} ×</button>
      </div>
      <div v-if="modelValue.exclude.size" class="marked">
        <span class="mlabel">제외</span>
        <button v-for="c in named(modelValue.exclude)" :key="c.id" type="button" class="tagchip" :aria-label="`${cardName(c)} 제외 해제`" @click="unmark(c.id)">{{ cardName(c) }} ×</button>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
legend { font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; padding: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  border: 1px solid var(--line); background: var(--surface-2); color: var(--fg);
  border-radius: 999px; padding: 3px 12px; font-size: 0.85rem; cursor: pointer;
}
.chip[aria-pressed='true'] { background: var(--gold); border-color: var(--gold); color: var(--surface); font-weight: 700; }
.check { display: flex; gap: 8px; align-items: flex-start; font-size: 0.88rem; }
.check input { margin-top: 3px; accent-color: var(--gold); }
.limits { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.limits th, .limits td { padding: 3px 0; text-align: left; font-weight: 400; }
.limits thead th { color: var(--muted); font-size: 0.75rem; }
.limits td { width: 64px; }
.limits input, .search {
  font: inherit; color: var(--fg); background: var(--surface-2);
  border: 1px solid var(--line); border-radius: 6px; padding: 3px 6px;
}
.limits input { width: 56px; }
.search { width: 100%; padding: 6px 8px; }
.results { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; }
.results li { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--line); font-size: 0.88rem; }
.rname { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.rname small { color: var(--muted); }
.mini { font-size: 0.75rem; border: 1px solid var(--line); background: var(--surface-2); color: var(--fg); border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.hint { margin: 6px 0 0; color: var(--muted); font-size: 0.85rem; }
.marked { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px; }
.mlabel { font-size: 0.75rem; color: var(--muted); }
.tagchip { font-size: 0.8rem; border: 1px solid var(--line); background: var(--surface-2); color: var(--fg); border-radius: 6px; padding: 2px 8px; cursor: pointer; }
.tagchip.req { border-color: var(--gold); color: var(--gold); }
</style>
