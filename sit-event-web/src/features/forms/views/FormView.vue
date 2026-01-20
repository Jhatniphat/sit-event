<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, FileUser, X } from 'lucide-vue-next'
import { useFormStore } from '../store/FormStore'
import DeleteFormDialog from '../components/DeleteFormDialog.vue'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const formStore = useFormStore()
const eventId = route.params.id as string

const hasForm = computed(() => !!formStore.currentFormId)
const isDeleteForm = ref(false)

onMounted(async () => {
  try {
    await formStore.fetchForm(eventId)
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

const handleDeleteForm = () => {
  isDeleteForm.value = true
}

const confirmDeleteForm = async () => {
  if (!formStore.currentFormId) return

  try {
    const success = await formStore.deleteForm(eventId, String(formStore.currentFormId))

    if (success) {
      toast.success('ลบฟอร์มสำเร็จ', {
        description: 'ฟอร์มถูกลบเรียบร้อยแล้ว',
      })
    } else {
      toast.error('ลบฟอร์มล้มเหลว', {
        description: 'ไม่สามารถลบฟอร์มได้ในขณะนี้ กรุณาลองใหม่ภายหลัง',
      })
    }
  } catch (error: any) {
    console.error('Error during form deletion:', error)
    const errorMessage =
      error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์'
    toast.error('ลบฟอร์มล้มเหลว', {
      description: errorMessage,
    })
  } finally {
    isDeleteForm.value = false
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

        <div v-if="hasForm" class="flex flex-col gap-3 group relative">
          <div class="relative aspect-[4/3]">
            <button
              @click="handleEditForm(String(formStore.currentFormId))"
              class="w-full h-full bg-white border border-gray-200 rounded-md flex items-center justify-center transition-all shadow-sm hover:border-black"
            >
              <FileUser class="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
            </button>

            <button
              @click.stop="handleDeleteForm()"
              class="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors z-10 opacity-0 group-hover:opacity-100"
              title="Delete Form"
            >
              <X class="w-4 h-4" />
            </button>
            <span class="text-sm font-medium text-gray-700 truncate">{{
              formStore.formTitle || 'Untitled Form'
            }}</span>
          </div>
        </div>
      </div>
      <DeleteFormDialog v-model:open="isDeleteForm" @confirm="confirmDeleteForm" />
    </div>
  </div>
</template>

<style scoped>
/* เพิ่มความนวลให้กับเงาเวลา hover */
button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
