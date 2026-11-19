<script setup lang="ts">
import { compareByCost } from '../randomizer/kingdom'
import type { GameSetup } from '../randomizer/setup'
import { primaryName } from '../lang'

defineProps<{ entries: { at: number; setup: GameSetup }[] }>()
defineEmits<{ restore: [index: number]; clear: [] }>()

const when = (at: number) =>
  new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <section class="panel" aria-labelledby="history-h">
    <div class="head">
      <h2 id="history-h">최근 결과</h2>
      <button v-if="entries.length" type="button" class="link" @click="$emit('clear')">기록 지우기</button>
    </div>
    <p v-if="!entries.length" class="empty">뽑은 왕국이 여기에 쌓여요 (최근 20개, 이 브라우저에만 저장).</p>
    <ol v-else class="list">
      <li v-for="(e, i) in entries" :key="e.at">
        <button type="button" class="entry" @click="$emit('restore', i)">
          <span class="when">{{ when(e.at) }}</span>
          <span class="names">
            {{ e.setup.kingdom.slice().sort(compareByCost).map(primaryName).join(', ') }}
            <template v-if="e.setup.landscapes.length"> · {{ e.setup.landscapes.map(primaryName).join(', ') }}</template>
          </span>
        </button>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; min-width: 0; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h2 { font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin: 0; }
.link { background: none; border: 0; padding: 0; color: var(--gold); cursor: pointer; font-size: 0.85rem; }
.empty { color: var(--muted); font-size: 0.85rem; margin: 8px 0 0; }
.list { list-style: none; margin: 8px 0 0; padding: 0; }
.entry {
  display: flex; gap: 12px; width: 100%; text-align: left; font: inherit; color: var(--fg);
  background: none; border: 0; border-bottom: 1px solid var(--line); padding: 8px 0; cursor: pointer;
}
.entry:hover .names { color: var(--gold); }
.when { flex: none; color: var(--muted); font-size: 0.8rem; font-variant-numeric: tabular-nums; min-width: 92px; }
.names { font-size: 0.85rem; min-width: 0; overflow-wrap: anywhere; }
</style>
