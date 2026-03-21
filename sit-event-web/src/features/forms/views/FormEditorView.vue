<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useFormStore } from '../store/FormStore'
import { computed, onMounted, ref } from 'vue'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import QuestionEditor from '../components/QuestionEditor.vue'
import ResponseViewer from '../components/ResponseViewer.vue'
import type { FormSubmissionResponse } from '../services/FormServices'

const router = useRouter()
const route = useRoute()
const formStore = useFormStore()
const eventId = route.params.id as string
const formId = route.params.formId as string
const initialData = ref('')
const formResponses = ref<FormSubmissionResponse[]>([])
const isLoading = ref(false)
const responsesCount = computed(() => formResponses.value.length)

onMounted(async () => {
  isLoading.value = true
  if (formId) {
    await formStore.loadForm(eventId, formId)
  }

  initialData.value = JSON.stringify({
    title: formStore.formTitle,
    description: formStore.formDescription,
    isActive: formStore.formIsActive,
    questions: formStore.questions,
    deletedIds: formStore.deletedFieldIds,
  })

  if (formResponses.value && formResponses.value.length > 0) {
    isLoading.value = false
    return
  }
  const res = await formStore.getAllFormResponses(eventId, formId)
  console.log('Form responses:', res)
  formResponses.value = res ?? []
  isLoading.value = false
})

type editorView = 'Questions' | 'Responses'
const editorTab = ref<editorView>('Questions')

const changeEditorTab = (tab: editorView) => {
  if (editorTab.value === tab) return
  editorTab.value = tab
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div>
    <div>
      <div>
        <div class="p-4">
          <div class="flex flex-row justify-between items-center mb-5">
            <div>
              <button @click="goBack" class="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <ArrowLeft class="w-5 h-5" />
              </button>
            </div>
            <div class="flex flex-row text-lg relative">
              <Tabs defaultValue="overview">
                <TabsList variant="line">
                  <TabsTrigger @click="changeEditorTab('Questions')" value="questions"
                    >Questions</TabsTrigger
                  >
                  <TabsTrigger @click="changeEditorTab('Responses')" value="responses"
                    ><div>
                      Responses
                      <span
                        v-if="responsesCount > 0"
                        class="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium text-white bg-primary rounded-full"
                      >
                        {{ responsesCount }}
                      </span>
                    </div></TabsTrigger
                  >
                </TabsList>
              </Tabs>
              <!-- <div
                class="mx-3 cursor-pointer"
                :class="{ 'font-bold': editorTab === 'Questions' }"
                @click="changeEditorTab('Questions')"
              >
                Questions
              </div>

              <div
                class="mx-3 cursor-pointer"
                :class="{ 'font-bold': editorTab === 'Responses' }"
                @click="changeEditorTab('Responses')"
              >
                Responses
              </div> -->

              <!-- underline (เส้นเลื่อน) -->
              <!-- <div
                class="underline-bar"
                :style="{
                  transform: editorTab === 'Questions' ? 'translateX(0)' : 'translateX(120px)',
                }"
              ></div> -->
            </div>
            <div class="w-4"></div>
          </div>
          <hr class="mb-2" />
          <div v-if="editorTab === 'Questions'">
            <QuestionEditor />
          </div>
          <div v-if="editorTab === 'Responses'">
            <ResponseViewer
              :eventId="eventId"
              :formId="formId"
              :isLoading="isLoading"
              :formResponses="formResponses"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ลบเส้นโฟกัสพื้นฐานของ Input ในบางกรณี */
:deep(.border-0:focus-visible) {
  outline: none;
  box-shadow: none;
}
</style>
