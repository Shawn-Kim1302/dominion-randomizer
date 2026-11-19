<script setup lang="ts">
import { computed } from 'vue'
import { cardName, getCard, getSet, setLabel } from '../data'
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
  return `${by ? cardName(by) : ROLE[r].by}: ${ROLE[r].what}`
}

const names = (ids: string[]) => ids.map((id) => getCard(id)).filter((c): c is Card => !!c).map(cardName).join(', ')
const box = (c: Card) => {
  const s = getSet(c.sets[0])
  return s ? setLabel(s, 'ko') : ''
}

const basics = computed(() => {
  const { platinumColony: pc, shelters: sh } = props.setup
  return [
    {
      label: '백금 · 식민지',
      used: pc.used,
      why: `무작위 왕국 카드 「${cardName(pc.decidedBy)}」(${box(pc.decidedBy)})`,
      source: 'Prosperity 룰북: 무작위로 고른 왕국 카드 1장이 번영이면 사용',
    },
    {
      label: '피난처 (시작 사유지 3장 대신)',
      used: sh.used,
      why: `무작위 왕국 카드 「${cardName(sh.decidedBy)}」(${box(sh.decidedBy)})`,
      source: 'Dark Ages 룰북: 번영과 같은 방식으로, 암흑의 시대 카드면 사용',
    },
  ]
})

const setAside = computed(() => props.setup.extraPiles.filter((e) => !e.inSupply))
</script>

<template>
  <section class="setup" aria-labelledby="setup-h">
    <h2 id="setup-h">세팅</h2>

    <p v-for="w in setup.warnings" :key="w" class="warn" role="alert">{{ w }}</p>

    <ul class="list">
      <li v-for="b in basics" :key="b.label" class="item">
        <div class="head">
          <span class="label">{{ b.label }}</span>
          <span class="pill" :class="{ on: b.used }">{{ b.used ? '사용' : '사용 안 함' }}</span>
        </div>
        <p class="why">{{ b.why }}</p>
        <p class="src">{{ b.source }}</p>
      </li>

      <li v-for="e in setAside" :key="e.role" class="item">
        <div class="head"><span class="label">{{ roleLabel(e.role) }}</span></div>
        <p class="why"><strong>{{ cardName(e.card) }}</strong> <span v-if="e.card.ko" lang="en">{{ e.card.en }}</span></p>
      </li>

      <li v-if="setup.obeliskPile" class="item">
        <div class="head"><span class="label">오벨리스크 지정 더미</span></div>
        <p class="why"><strong>{{ cardName(setup.obeliskPile) }}</strong></p>
        <p class="src">Obelisk 세팅 텍스트: 무작위 액션 공급 더미 1개</p>
      </li>

      <li v-for="c in setup.components" :key="c.id" class="item">
        <div class="head">
          <span class="label">{{ c.ko }}</span>
          <span v-if="c.inSupply" class="pill on">공급처</span>
        </div>
        <p v-if="c.cards.length" class="why">{{ names(c.cards) }}</p>
        <p v-if="c.note" class="why">{{ c.note }}</p>
        <p class="src">필요한 카드: {{ c.reasons.map(cardName).join(', ') }} · {{ c.source }}</p>
      </li>

      <li v-for="n in setup.setupNotes" :key="n.card.id" class="item">
        <div class="head"><span class="label">{{ cardName(n.card) }} 세팅</span></div>
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
.label { font-weight: 700; }
.pill { font-size: 0.72rem; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; color: var(--muted); white-space: nowrap; }
.pill.on { background: var(--gold-soft); border-color: var(--gold); color: var(--gold); font-weight: 700; }
.why { margin: 4px 0 0; font-size: 0.88rem; overflow-wrap: anywhere; }
.why [lang='en'] { color: var(--muted); font-size: 0.8rem; }
.src { margin: 4px 0 0; font-size: 0.74rem; color: var(--muted); overflow-wrap: anywhere; }
.warn { color: var(--danger); margin: 4px 0 8px; }
</style>
