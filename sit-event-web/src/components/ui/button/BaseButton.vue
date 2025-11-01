<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    primary?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    primary: true,
    type: 'button',
  },
)

const buttonClass = props.primary
  ? 'bg-blue-500 hover:bg-blue-600 text-white'
  : 'bg-slate-100 hover:bg-slate-200 text-black'
</script>

<template>
  <button
    :type="props.type"
    :class="`${buttonClass} px-4 py-2 rounded-lg font-semibold transition-colors`"
  >
    {{ props.label }}
  </button>
</template>
