<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, FileUser } from 'lucide-vue-next'
import { useFormStore } from '../store/FormStore'

const route = useRoute()
const router = useRouter()
const formStore = useFormStore()
const eventId = route.params.id as string

const hasForm = computed(() => !!formStore.currentFormId)

onMounted(async () => {
  try {
    await formStore.fetchForm(eventId)

    if (formStore.currentFormId) {
      console.log('พบฟอร์มที่มีอยู่ ID:', formStore.currentFormId)
      console.log('ข้อมูลคำถาม:', formStore.questions)
    } else {
      console.log('ยังไม่มีการสร้างฟอร์มสำหรับ Event นี้')
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error)
  }
})

const handleCreateForm = async () => {
  try {
    const res = await formStore.createInitialForm(eventId)
    if (formStore.questions.length === 0) {
      console.log('ไม่มีคำถามในฟอร์ม กำลังเพิ่มคำถามตัวอย่าง...')
      formStore.addQuestion()
    }
    // ส่ง id และ formId ไปหน้าแก้ไข
    router.push({
      name: 'CreateForms',
      params: { id: eventId, formId: res.id },
    })
  } catch (err: any) {
    if (err.response?.status === 409) {
      // ถ้ามีแล้ว ให้ไปหน้าแก้ไขของเดิม (ต้องมั่นใจว่า fetchForm ทำงานแล้ว)
      router.push({
        name: 'CreateForms',
        params: { id: eventId, formId: formStore.currentFormId },
      })
    }
  }
}

const handleEditForm = (formId: string) => {
  router.push({
    name: 'CreateForms',
    params: { id: eventId, formId },
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-6xl mx-auto px-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">Forms List</h1>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        <div v-if="!hasForm" class="flex flex-col gap-3">
          <button
            @click="handleCreateForm()"
            class="aspect-[4/3] bg-white border border-gray-200 rounded-md flex items-center justify-center transition-all shadow-sm group"
          >
            <div class="relative w-12 h-12 flex items-center justify-center">
              <Plus class="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
            </div>
          </button>
          <span class="text-sm font-medium text-gray-700">Create New Form</span>
        </div>

        <div v-if="hasForm">
          <div class="flex flex-col gap-3">
            <button
              @click="handleEditForm(String(formStore.currentFormId))"
              class="aspect-[4/3] bg-white border border-gray-200 rounded-md flex items-center justify-center transition-all shadow-sm group"
            >
              <div class="relative w-12 h-12 flex items-center justify-center">
                <FileUser class="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
              </div>
            </button>
            <span class="text-sm font-medium text-gray-700 truncate">{{
              formStore.formTitle || 'Untitled Form'
            }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* เพิ่มความนวลให้กับเงาเวลา hover */
button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
