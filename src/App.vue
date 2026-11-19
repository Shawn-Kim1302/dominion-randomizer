<script setup lang="ts">
import { computed, ref } from 'vue'
import CardTile from './components/CardTile.vue'
import SetPicker from './components/SetPicker.vue'
import { cards, sets } from './data'
import type { Card } from './data/types'
import { KINGDOM_SIZE, compareByCost, drawKingdom, kingdomPool } from './randomizer/kingdom'

const selected = ref<Set<string>>(new Set(['dominion2ndEdition']))
const kingdom = ref<Card[]>([])
const error = ref('')

const pool = computed(() => kingdomPool(cards, selected.value))
const sorted = computed(() => kingdom.value.slice().sort(compareByCost))

function draw() {
  const r = drawKingdom(pool.value, Math.random)
  if (r.ok) {
    kingdom.value = r.kingdom
    error.value = ''
  } else {
    error.value = `왕국 카드가 ${KINGDOM_SIZE}종 필요한데 선택한 확장에는 ${r.available}종뿐이에요. 확장을 더 골라 주세요.`
  }
}

function selectAll(on: boolean) {
  selected.value = on ? new Set(sets.map((s) => s.id)) : new Set()
}
</script>

<template>
  <div class="page">
    <header class="top">
      <h1>도미니언 랜더마이저</h1>
      <p class="sub">가진 확장을 고르고 왕국 카드 10종을 뽑아요.</p>
    </header>

    <div class="layout">
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

      <section class="result" aria-labelledby="kingdom-h">
        <div class="result-head">
          <div>
            <h2 id="kingdom-h">왕국</h2>
            <p class="pool">뽑을 수 있는 왕국 카드 {{ pool.length }}종</p>
          </div>
          <button type="button" class="primary" @click="draw">왕국 뽑기</button>
        </div>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <div v-if="sorted.length" class="grid">
          <CardTile v-for="c in sorted" :key="c.id" :card="c" :selected-sets="selected" />
        </div>
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
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.panel-head, .result-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; }
.quick { display: flex; gap: 10px; }
.link { background: none; border: 0; padding: 0; color: var(--gold); cursor: pointer; font-size: 0.85rem; }
.result { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.pool { margin: 2px 0 0; color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }
.primary {
  background: var(--gold); color: var(--surface); border: 0; border-radius: 8px;
  padding: 10px 22px; font-weight: 700; cursor: pointer;
}
.primary:hover { filter: brightness(1.08); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.error { color: var(--danger); margin: 0; }
.empty { color: var(--muted); margin: 0; padding: 40px 0; text-align: center; border: 1px dashed var(--line); border-radius: 12px; }
</style>
