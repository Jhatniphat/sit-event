<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    color?: 'blue' | 'red' | 'grey'
  }>(),
  {
    primary: true,
    color: 'blue',
  },
)

const buttonClass =
  props.color == 'blue'
    ? 'bg-blue-500 hover:bg-blue-600 text-white'
    : props.color == 'red'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'border border-slate-300 hover:bg-slate-100 text-black'
</script>

<template>
  <button :class="`${buttonClass} px-4 py-2 rounded-sm font-normal transition-colors`">
    {{ props.label }}
  </button>
</template>
