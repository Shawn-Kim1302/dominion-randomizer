<script setup lang="ts">
import { computed } from 'vue'
import { sets } from '../data'
import type { CardSet } from '../data/types'

const props = defineProps<{ modelValue: ReadonlySet<string> }>()
const emit = defineEmits<{ 'update:modelValue': [value: Set<string>] }>()

/** Cornucopia and Guilds were merged into one box in the 2nd edition, so they share a row. */
const CG = new Set(['cornucopia', 'guilds', 'cornucopiaGuilds'])

const groups = computed(() => {
  const rows: { key: string; title: string; boxes: CardSet[] }[] = []
  for (const s of sets) {
    const key = CG.has(s.expansion) ? 'cornucopia-guilds' : s.expansion
    let row = rows.find((r) => r.key === key)
    if (!row) {
      row = { key, title: key === 'cornucopia-guilds' ? '풍요의 뿔 · 길드를 위하여' : s.ko, boxes: [] }
      rows.push(row)
    }
    row.boxes.push(s)
  }
  return rows
})

function chipLabel(s: CardSet, rowKey: string): string {
  if (rowKey === 'cornucopia-guilds') {
    if (s.edition === 2) return '2판 (합본)'
    return `${s.expansion === 'cornucopia' ? '풍요의 뿔' : '길드'} 1판`
  }
  return s.edition === 0 ? '사용' : `${s.edition}판`
}

function toggle(id: string) {
  const next = new Set(props.modelValue)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  emit('update:modelValue', next)
}
</script>

<template>
  <ul class="sets">
    <li v-for="row in groups" :key="row.key" class="row">
      <div class="name">
        <span class="ko">{{ row.title }}</span>
        <span class="en">{{ row.key === 'cornucopia-guilds' ? 'Cornucopia · Guilds' : row.boxes[0].en }}</span>
      </div>
      <div class="chips">
        <button
          v-for="s in row.boxes"
          :key="s.id"
          type="button"
          class="chip"
          :aria-pressed="modelValue.has(s.id)"
          @click="toggle(s.id)"
        >
          {{ chipLabel(s, row.key) }}
          <span v-if="!s.koPrint" class="badge" title="한국어 실물판 미발매 · 한글명은 공식 앱(Temple Gates) 번역">앱 번역</span>
        </button>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.sets { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.row {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 6px 12px; padding: 9px 0; border-bottom: 1px solid var(--line);
}
.row:last-child { border-bottom: 0; }
.name { display: flex; flex-direction: column; min-width: 0; }
.ko { font-weight: 700; }
.en { font-size: 0.78rem; color: var(--muted); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--line); background: var(--surface-2); color: var(--fg);
  border-radius: 999px; padding: 3px 12px; font-size: 0.85rem; cursor: pointer;
}
.chip[aria-pressed='true'] { background: var(--gold); border-color: var(--gold); color: var(--surface); font-weight: 700; }
.badge { font-size: 0.68rem; border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; opacity: 0.8; }
</style>
