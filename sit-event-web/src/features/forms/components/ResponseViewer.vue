<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import type { FormSubmissionResponse } from '../services/FormServices'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ListFilter } from 'lucide-vue-next'

const props = defineProps<{
  eventId: string
  formId: string
  isLoading: boolean
  formResponses: FormSubmissionResponse[]
}>()

const allQuestions = computed(() => {
  if (props.formResponses.length === 0) return []
  const questionsMap = new Map()
  props.formResponses.forEach((res) => {
    res.answers.forEach((ans) => {
      if (!questionsMap.has(ans.fieldId)) {
        questionsMap.set(ans.fieldId, {
          question: ans.field.question,
          order: ans.field.order || 0,
        })
      }
    })
  })
  return Array.from(questionsMap.entries())
    .map(([id, data]) => ({ id, question: data.question, order: data.order }))
    .sort((a, b) => a.order - b.order)
})

const visibleQuestions = ref<Record<string, boolean>>([])
const hiddenQuestions = ref<string[]>([])

const toggleQuestion = (id: string) => {
  if (hiddenQuestions.value.includes(id)) {
    hiddenQuestions.value = hiddenQuestions.value.filter((itemId) => itemId !== id)
  } else {
    hiddenQuestions.value.push(id)
  }
}

// 3. ฟังก์ชันเช็คสถานะว่าต้อง "โชว์" ไหม
const isVisible = (id: string) => !hiddenQuestions.value.includes(id)

watch(
  allQuestions,
  (newQuestions) => {
    newQuestions.forEach((q) => {
      if (visibleQuestions.value[q.id] === undefined) {
        visibleQuestions.value[q.id] = true
      }
    })
  },
  { immediate: true },
)

const getAnswer = (response: FormSubmissionResponse, fieldId: string) => {
  const answerObj = response.answers.find((a) => a.fieldId === fieldId)
  return answerObj ? answerObj.answer : '-'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 sm:p-8">
    <div class="max-w-full mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-gray-900">Form Responses</h1>
          <p class="text-gray-500 mt-1 text-sm">Review participant submissions and answers</p>
        </div>

        <div class="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="outline" class="flex items-center gap-2">
                <ListFilter class="w-4 h-4" />
                Filter Questions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-64 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Show/Hide Questions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                v-for="q in allQuestions"
                :key="q.id"
                :checked="isVisible(q.id)"
                @select="(e) => e.preventDefault()"
                @click="toggleQuestion(q.id)"
              >
                <div class="flex items-center gap-2 overflow-hidden m-3">
                  <component :is="isVisible(q.id) ? Eye : EyeOff" class="w-4 h-4 shrink-0" />
                  <span class="truncate text-sm">{{ q.question }}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold">
            {{ formResponses.length }} Responses
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left border-collapse">
            <thead
              class="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold sticky top-0 z-20"
            >
              <tr>
                <th class="px-6 py-4 sticky left-0 bg-gray-50 z-30 border-r w-[60px]">No</th>
                <th class="px-6 py-4 w-[120px] sticky left-[60px] bg-gray-50 z-30 border-r">
                  FirstName
                </th>
                <th class="px-6 py-4 w-[120px] sticky left-[175px] bg-gray-50 z-30 border-r">
                  LastName
                </th>
                <th class="px-6 py-4 w-[220px] border-r bg-gray-50">Email</th>
                <th class="px-6 py-4 w-[180px] border-r bg-gray-50">Submitted At</th>
                <th
                  v-for="q in allQuestions.filter((q) => isVisible(q.id))"
                  :key="q.id"
                  class="px-6 py-4 min-w-[250px] max-w-[350px] border-r bg-blue-50/30 text-blue-900"
                >
                  <div class="line-clamp-2 leading-tight" :title="q.question">
                    (Q{{ allQuestions.findIndex((item) => item.id === q.id) + 1 }})
                    {{ q.question }}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-100">
              <tr v-if="isLoading" class="animate-pulse">
                <td colspan="100%" class="px-6 py-12 text-center text-gray-400">
                  Loading responses...
                </td>
              </tr>
              <tr v-else-if="formResponses.length === 0">
                <td colspan="100%" class="px-6 py-12 text-center text-gray-400">
                  No responses found.
                </td>
              </tr>

              <tr
                v-for="(res, index) in formResponses"
                :key="res.id"
                class="hover:bg-gray-50/80 group"
              >
                <td
                  class="px-6 py-4 text-gray-500 sticky left-0 bg-white group-hover:bg-gray-50 z-10 border-r"
                >
                  {{ index + 1 }}
                </td>
                <td
                  class="px-6 py-4 font-medium text-gray-900 sticky left-[60px] bg-white group-hover:bg-gray-50 z-10 border-r"
                >
                  {{ res.user.firstName }}
                </td>
                <td
                  class="px-6 py-4 font-medium text-gray-900 sticky left-[175px] bg-white group-hover:bg-gray-50 z-10 border-r"
                >
                  {{ res.user.lastName }}
                </td>

                <td class="px-6 py-4 text-gray-600 border-r">{{ res.user.email }}</td>
                <td class="px-6 py-4 text-gray-500 text-xs whitespace-nowrap border-r">
                  {{ new Date(res.submittedAt).toLocaleString('th-TH') }}
                </td>

                <td
                  v-for="q in allQuestions.filter((q) => isVisible(q.id))"
                  :key="q.id"
                  class="px-6 py-4 text-gray-700 border-r border-gray-50"
                >
                  <div
                    class="max-w-[300px] truncate hover:whitespace-normal cursor-help"
                    :title="getAnswer(res, q.id)"
                  >
                    {{ getAnswer(res, q.id) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
