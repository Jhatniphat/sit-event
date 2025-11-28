<script setup lang="ts">
import { ref, computed } from 'vue'

type TagType = string;

interface Props {
  modelValue: TagType[] | undefined
  choices: TagType[]
  label?: string
  placeholder?: string
  required?: boolean // รับ prop required
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  placeholder: 'ค้นหาหรือเพิ่มแท็ก...',
  modelValue: () => [] 
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: TagType[]): void
}>()

const searchText = ref('')
const isDropdownOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const internalModel = computed({
  get: () => props.modelValue || [], 
  set: (newValue) => {
    emit('update:modelValue', newValue) 
  }
})

/**
 * Computed: กรองตัวเลือก
 */
const filteredChoices = computed(() => {
  const searchLower = searchText.value.toLowerCase()
  
  return props.choices.filter(choice => {
    const isNotSelected = !internalModel.value.includes(choice)
    const matchesSearch = choice.toLowerCase().includes(searchLower)
    
    return isNotSelected && matchesSearch
  })
})

function addTag(tag: TagType) {
  const newTag = tag.trim()
  if (newTag && !internalModel.value.includes(newTag)) {
    internalModel.value = [...internalModel.value, newTag]
  }
  searchText.value = ''
  isDropdownOpen.value = false
}

function removeTag(tag: TagType) {
  internalModel.value = internalModel.value.filter(t => t !== tag)
  inputRef.value?.focus()
}

/**
 * จัดการการกดปุ่มบน keyboard
 */
/**
 * จัดการการกดปุ่มบน keyboard
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace' && searchText.value === '') {
    event.preventDefault()
    const lastTag = internalModel.value[internalModel.value.length - 1]
    if (lastTag) {
      removeTag(lastTag)
    }
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    // ถ้า dropdown เปิดอยู่และมีตัวเลือก ให้เลือกตัวแรก
    if (isDropdownOpen.value && filteredChoices.value.length > 0) {
        const firstChoice = filteredChoices.value[0]
        // ตรวจสอบว่า firstChoice ไม่ใช่ undefined ก่อนเรียก addTag
        if (firstChoice) {
            addTag(firstChoice)
        }
    } 
  }
}

function openDropdown() {
  isDropdownOpen.value = true
}

function closeDropdown() {
  setTimeout(() => {
    isDropdownOpen.value = false
  }, 200)
}

function focusInput() {
  inputRef.value?.focus()
}
</script>

<template>
  <div class="relative w-full">
    <label 
      v-if="label" 
      class="block text-sm font-medium text-gray-700 mb-1"
    >
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <div
      @click="focusInput"
      class="flex flex-wrap items-center gap-2 p-2 min-h-[42px] border border-gray-300 rounded-md shadow-sm bg-white cursor-text relative"
    >
      <span
        v-for="tag in internalModel"
        :key="tag"
        class="flex items-center justify-center bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full"
      >
        {{ tag }}
        <button
          @click.stop="removeTag(tag)"
          class="ml-1.5 -mr-1 text-blue-600 hover:text-blue-800 focus:outline-none"
          aria-label="Remove tag"
          type="button" 
        >
          &times;
        </button>
      </span>

      <input
        ref="inputRef"
        type="text"
        v-model="searchText"
        @focus="openDropdown"
        @blur="closeDropdown"
        @keydown="handleKeydown"
        :placeholder="internalModel.length === 0 ? placeholder : ''"
        class="flex-1 text-sm outline-none bg-transparent min-w-[120px]"
      />
      
      <input 
        v-if="required"
        tabindex="-1"
        class="absolute opacity-0 pointer-events-none w-full h-full top-0 left-0 -z-10"
        :value="internalModel.length > 0 ? 'valid' : ''"
        required
        @invalid="focusInput"
      />
    </div>

    <div
      v-if="isDropdownOpen && filteredChoices.length > 0"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
    >
      <ul>
        <li
          v-for="choice in filteredChoices"
          :key="choice"
          @click="addTag(choice)"
          class="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          {{ choice }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
</style>