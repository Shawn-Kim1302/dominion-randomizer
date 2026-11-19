<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { getCard, getSet, setLabel } from '../data'
import { primaryName, secondaryName } from '../lang'
import type { Card } from '../data/types'
import type { ExtraRole, GameSetup } from '../randomizer/setup'

const props = defineProps<{ setup: GameSetup }>()

/** The card that causes each extra pile, and what the pile is for. */
const ROLE: Record<ExtraRole, { by: string; what: string }> = {
  bane: { by: 'Young Witch', what: 'Bane 더미 (공급처에 추가)' },
  'approaching-army': { by: 'Approaching Army', what: '공격 더미 (공급처에 추가)' },
  ferryman: { by: 'Ferryman', what: '따로 두는 더미' },
  riverboat: { by: 'Riverboat', what: '따로 두는 카드 1장' },
  mouse: { by: 'Way of the Mouse', what: '따로 두는 카드 1장' },
}
const roleLabel = (r: ExtraRole) => {
  const by = getCard(ROLE[r].by)
  return `${by ? primaryName(by) : ROLE[r].by}: ${ROLE[r].what}`
}

const names = (ids: string[]) => ids.map((id) => getCard(id)).filter((c): c is Card => !!c).map(primaryName).join(', ')
const box = (c: Card) => {
  const s = getSet(c.sets[0])
  return s ? setLabel(s, 'ko') : ''
}

const decided = (c: Card | null) => (c ? `무작위 왕국 카드 「${primaryName(c)}」(${box(c)})` : '공식 추천 왕국에 적힌 대로')

const basics = computed(() => {
  const { platinumColony: pc, shelters: sh } = props.setup
  return [
    {
      label: '백금 · 식민지',
      used: pc.used,
      why: decided(pc.decidedBy),
      source: 'Prosperity 룰북: 무작위로 고른 왕국 카드 1장이 번영이면 사용',
    },
    {
      label: '피난처 (시작 사유지 3장 대신)',
      used: sh.used,
      why: decided(sh.decidedBy),
      source: 'Dark Ages 룰북: 번영과 같은 방식으로, 암흑의 시대 카드면 사용',
    },
  ]
})

const setAside = computed(() => props.setup.extraPiles.filter((e) => !e.inSupply))

// Checklist ticks for setting up the table; cleared when a different game is drawn.
const done = ref(new Set<string>())
const gameKey = computed(() => [...props.setup.kingdom, ...props.setup.landscapes].map((c) => c.id).join('|'))
watch(gameKey, () => (done.value = new Set()))
function tick(key: string) {
  const next = new Set(done.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  done.value = next
}
</script>

<template>
  <section class="setup" aria-labelledby="setup-h">
    <h2 id="setup-h">세팅 체크리스트</h2>

    <p v-for="w in setup.warnings" :key="w" class="warn" role="alert">{{ w }}</p>

    <ul class="list">
      <li v-for="b in basics" :key="b.label" class="item">
        <div class="head">
          <label v-if="b.used" class="label"><input type="checkbox" :checked="done.has(b.label)" @change="tick(b.label)" /> {{ b.label }}</label>
          <span v-else class="label">{{ b.label }}</span>
          <span class="pill" :class="{ on: b.used }">{{ b.used ? '사용' : '사용 안 함' }}</span>
        </div>
        <p class="why">{{ b.why }}</p>
        <p class="src">{{ b.source }}</p>
      </li>

      <li v-for="e in setAside" :key="e.role" class="item">
        <div class="head"><label class="label"><input type="checkbox" :checked="done.has(e.role)" @change="tick(e.role)" /> {{ roleLabel(e.role) }}</label></div>
        <p class="why"><strong>{{ primaryName(e.card) }}</strong> <span v-if="secondaryName(e.card)" class="sub">{{ secondaryName(e.card) }}</span></p>
      </li>

      <li v-if="setup.obeliskPile" class="item">
        <div class="head"><label class="label"><input type="checkbox" :checked="done.has('obelisk')" @change="tick('obelisk')" /> 오벨리스크 지정 더미</label></div>
        <p class="why"><strong>{{ primaryName(setup.obeliskPile) }}</strong></p>
        <p class="src">Obelisk 세팅 텍스트: 무작위 액션 공급 더미 1개</p>
      </li>

      <li v-for="c in setup.components" :key="c.id" class="item">
        <div class="head">
          <label class="label"><input type="checkbox" :checked="done.has(c.id)" @change="tick(c.id)" /> {{ c.ko }}</label>
          <span v-if="c.inSupply" class="pill on">공급처</span>
        </div>
        <p v-if="c.cards.length" class="why">{{ names(c.cards) }}</p>
        <p v-if="c.note" class="why">{{ c.note }}</p>
        <p class="src">필요한 카드: {{ c.reasons.map(primaryName).join(', ') }} · {{ c.source }}</p>
      </li>

      <li v-for="n in setup.setupNotes" :key="n.card.id" class="item">
        <div class="head"><label class="label"><input type="checkbox" :checked="done.has('note:' + n.card.id)" @change="tick('note:' + n.card.id)" /> {{ primaryName(n.card) }} 세팅</label></div>
        <p class="why">{{ n.note }}</p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.setup { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0 0 6px; }
.list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0 20px; }
.item { padding: 10px 0; border-bottom: 1px solid var(--line); min-width: 0; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.label { font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.label input { accent-color: var(--gold); margin: 0; }
.item:has(input:checked) .why, .item:has(input:checked) .label { opacity: 0.55; }
.pill { font-size: 0.72rem; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; color: var(--muted); white-space: nowrap; }
.pill.on { background: var(--gold-soft); border-color: var(--gold); color: var(--gold); font-weight: 700; }
.why { margin: 4px 0 0; font-size: 0.88rem; overflow-wrap: anywhere; }
.why .sub { color: var(--muted); font-size: 0.8rem; }
.src { margin: 4px 0 0; font-size: 0.74rem; color: var(--muted); overflow-wrap: anywhere; }
.warn { color: var(--danger); margin: 4px 0 8px; }
</style>
