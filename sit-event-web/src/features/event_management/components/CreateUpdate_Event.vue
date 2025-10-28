<script setup lang="ts">
import { ref } from 'vue'

const message = ref('Hello Vue 3')
</script>

<template>
  <div class="container">Content here</div>
  <h1>{{ message }}</h1>
</template>

<style scoped>
.container {
  /* styles */
}
</style>
