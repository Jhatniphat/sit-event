<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, FileUser, MoreVertical, Eye, Trash2, Download, Share2 } from 'lucide-vue-next'
import { useFormStore } from '../store/FormStore'
import DeleteFormDialog from '../components/DeleteFormDialog.vue'
import { toast } from 'vue-sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FormType } from '../services/FormServices'
import QrcodeVue from 'qrcode.vue'
import { useClipboard } from '@vueuse/core'

const route = useRoute()
const router = useRouter()
const formStore = useFormStore()
const eventId = route.params.id as string
const deleteCurrentFormId = ref<string>('')
const { copy } = useClipboard()

const hasForm = computed(() => formStore.formsList.length > 0)
const isDeleteForm = ref(false)
const isCreateFormDialogOpen = ref(false)
const isQrCodeDialogOpen = ref(false)
const selectedQrCodeUrl = ref('')

onMounted(async () => {
  try {
    await formStore.fetchForms(eventId)
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error)
  }
})

const formTypes = [
  {
    type: FormType.PRE_EVENT,
    label: 'Pre-Event Form',
    description: 'ใช้สำหรับเก็บข้อมูลรับสมัครเพิ่มเติมก่อนการสมัคร เช่น แบบทดสอบก่อนเข้าร่วมกิจกรรม',
  },
  {
    type: FormType.POST_EVENT,
    label: 'Post-Event Form',
    description: 'ใช้สำหรับเก็บข้อมูลหลังจบกิจกรรม เช่น แบบประเมินความพึงพอใจ',
  },
  {
    type: FormType.OTHER,
    label: 'Other Form',
    description: 'ใช้สำหรับวัตถุประสงค์อื่นๆ สามารถสร้างได้หลายฟอร์ม',
  },
]

const canCreateType = (type: FormType) => {
  if (type === FormType.OTHER) return true
  return !formStore.formsList.some((f) => f.type === type)
}

const handleSelectFormType = async (type: FormType) => {
  if (!canCreateType(type)) {
    toast.error(`แบบฟอร์มประเภท ${type} มีอยู่แล้ว ลบของเดิมก่อนหากต้องการสร้างใหม่`)
    return
  }
  isCreateFormDialogOpen.value = false
  try {
    const res = await formStore.createInitialForm(eventId, type)
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
      toast.error('มีแบบฟอร์มประเภทนี้อยู่แล้ว')
    } else {
      toast.error('เกิดข้อผิดพลาดในการสร้างแบบฟอร์ม')
    }
  }
}

const handleViewForm = (formId: string) => {
  router.push({
    name: 'FormView',
    params: { id: eventId, formId: formId },
    query: { preview: 'true' },
  })
}

const handleDeleteForm = (formId: string) => {
  deleteCurrentFormId.value = ''
  isDeleteForm.value = true
  deleteCurrentFormId.value = formId
}

const confirmDeleteForm = async () => {
  if (!deleteCurrentFormId.value) return

  try {
    const success = await formStore.deleteForm(eventId, deleteCurrentFormId.value)

    if (success) {
      toast.success('ลบฟอร์มสำเร็จ', {
        description: 'ฟอร์มถูกลบเรียบร้อยแล้ว',
      })
      await formStore.fetchForms(eventId)
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

const getFormUrl = (formId: string) => {
  const routeData = router.resolve({ name: 'FormView', params: { id: eventId }, query: { formId } })
  return window.location.origin + routeData.href
}

const handleShareForm = (formId: string) => {
  const url = getFormUrl(formId)
  copy(url)
  toast.success('ลิงก์ถูกคัดลอกไปยังคลิปบอร์ดแล้ว')
}

const handleShowQrCode = (formId: string) => {
  selectedQrCodeUrl.value = getFormUrl(formId)
  isQrCodeDialogOpen.value = true
}

const downloadQrCode = () => {
  setTimeout(() => {
    const canvas = document.querySelector('.qr-code-canvas') as HTMLCanvasElement
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'form-qrcode.png'
      link.href = url
      link.click()
    }
  }, 100)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 px-8 py-3">
    <div class="max-w-7xl mx-auto py-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">Forms List</h1>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        <!-- Always show Create Form button -->
        <div class="flex flex-col gap-3">
          <button
            @click="isCreateFormDialogOpen = true"
            class="aspect-[4/3] bg-white border border-gray-200 rounded-md flex items-center justify-center transition-all shadow-sm group hover:border-black"
          >
            <Plus class="w-10 h-10 text-black group-hover:scale-110 transition-transform" />
          </button>
          <span class="text-sm font-medium text-gray-700 text-center">Create New Form</span>
        </div>

        <div
          v-for="form in formStore.formsList"
          :key="form.id"
          class="flex flex-col gap-3 group relative"
        >
          <div class="relative aspect-[4/3]">
            <button
              @click="handleEditForm(String(form.id))"
              class="w-full h-full bg-white border border-gray-200 rounded-md flex flex-col items-center justify-center transition-all shadow-sm group-hover:shadow-md hover:border-black"
            >
              <FileUser class="w-10 h-10 text-black group-hover:scale-110 transition-transform mb-2" />
              <!-- Show submissions count -->
              <span class="text-xs text-gray-500 font-medium">Responses: {{ form._count?.submissions || 0 }}</span>
            </button>

            <!-- Tags -->
            <div class="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
              <Badge variant="secondary" class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-800 border-none rounded">
                {{ form.type === 'PRE_EVENT' ? 'Pre-Event' : form.type === 'POST_EVENT' ? 'Post-Event' : 'Other' }}
              </Badge>
              <Badge :class="form.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" variant="secondary" class="text-[10px] px-1.5 py-0.5 border-none rounded shadow-none">
                {{ form.isActive ? 'Active' : 'Inactive' }}
              </Badge>
            </div>

            <div class="absolute top-2 right-2 transition-opacity z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button class="h-8 w-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                    <MoreVertical class="h-4 w-4 text-black" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-48">
                  <DropdownMenuItem @click="handleViewForm(String(form.id))" class="cursor-pointer">
                    <Eye class="mr-2 h-4 w-4" />
                    <span>Preview Form</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleShareForm(String(form.id))" class="cursor-pointer">
                    <Share2 class="mr-2 h-4 w-4" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="handleShowQrCode(String(form.id))" class="cursor-pointer">
                    <Download class="mr-2 h-4 w-4" />
                    <span>Download QR Code</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    @click="handleDeleteForm(String(form.id))"
                    class="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 class="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <span class="text-sm font-medium text-gray-700 truncate text-center px-1">
            {{ form.title || 'Untitled Form' }}
          </span>
        </div>
      </div>

      <DeleteFormDialog v-model:open="isDeleteForm" @confirm="confirmDeleteForm" />

      <!-- Create Form Options Dialog -->
      <Dialog v-model:open="isCreateFormDialogOpen">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เลือกประเภทของฟอร์ม</DialogTitle>
            <DialogDescription>
              เลือกประเภทของฟอร์มที่ต้องการสร้างสำหรับกิจกรรมนี้
            </DialogDescription>
          </DialogHeader>
          <div class="flex flex-col gap-4 py-4">
            <button
              v-for="ftype in formTypes"
              :key="ftype.type"
              @click="handleSelectFormType(ftype.type)"
              :disabled="!canCreateType(ftype.type)"
              class="flex flex-col text-left p-4 rounded-lg border border-gray-200 transition-colors"
              :class="canCreateType(ftype.type) ? 'hover:border-black hover:bg-gray-50 bg-white' : 'opacity-50 cursor-not-allowed bg-gray-50'"
            >
              <span class="font-medium text-black">{{ ftype.label }}</span>
              <span class="text-xs text-gray-500 mt-1">{{ ftype.description }}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <!-- QR Code Dialog -->
      <Dialog v-model:open="isQrCodeDialogOpen">
        <DialogContent class="sm:max-w-xs flex flex-col items-center pt-8">
          <DialogHeader>
            <DialogTitle class="text-center mb-2">QR Code สำหรับฟอร์ม</DialogTitle>
            <DialogDescription class="text-center flex justify-center w-full">สแกนเพื่อกรอกแบบฟอร์ม</DialogDescription>
          </DialogHeader>
          <div class="bg-white p-4 rounded-xl shadow-sm border mt-4 flex justify-center w-full">
            <QrcodeVue :value="selectedQrCodeUrl" :size="200" level="M" render-as="canvas" class="qr-code-canvas" />
          </div>
          <button
            @click="downloadQrCode"
            class="mt-6 w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none"
          >
            <Download class="w-4 h-4 mr-2" /> Download QR Code
          </button>
        </DialogContent>
      </Dialog>
    </div>
  </div>
</template>

<style scoped>
button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
