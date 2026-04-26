<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog' // สมมติ path ของ shadcn-vue
import { Button } from '@/components/ui/button' 

// types/event.ts
export interface RegisterPayload {
  id: string;
  canRegisterAtStaff: boolean;
  canRegisterAtParticipant: boolean;
}

export type RegistrationRole = 'STAFF' | 'PARTICIPANT' | null;

// Props เพื่อรับค่า control จาก Parent หรือ v-model
const props = defineProps<{
  open: boolean
  payload: RegisterPayload | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm', eventId: string, role: RegistrationRole): void
}>()

const selectedRole = ref<RegistrationRole>(null)

// Helper function เมื่อกดเลือก Role
const selectRole = (role: RegistrationRole) => {
  selectedRole.value = role
}

// Helper function ปิด Dialog
const handleClose = () => {
  selectedRole.value = null
  emit('update:open', false)
}

// Helper function ยืนยัน
const handleConfirm = () => {
  if (props.payload && selectedRole.value) {
    emit('confirm', props.payload.id, selectedRole.value)
    handleClose()
  }
}

// Dynamic classes สำหรับปุ่มเลือก (Square button)
const getSelectionBtnClass = (isSelected: boolean) => {
  return `
    relative flex flex-col items-center justify-center 
    aspect-square w-full md:w-40 h-40 
    border-2 rounded-xl transition-all duration-200 cursor-pointer hover:bg-accent
    ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-muted'}
  `
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>ลงทะเบียนเข้าร่วมกิจกรรม</DialogTitle>
        <DialogDescription>
          กรุณาเลือกประเภทการลงทะเบียนที่คุณต้องการ
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col md:flex-row gap-4 py-6 justify-center items-center">
        
        <button
          v-if="payload?.canRegisterAtStaff"
          type="button"
          :class="getSelectionBtnClass(selectedRole === 'STAFF')"
          @click="selectRole('STAFF')"
          id="registration-staff-select-button"
        >
          <span class="text-4xl mb-2">📋</span>
          <span class="font-semibold text-lg">Staff</span>
          <span class="text-xs text-muted-foreground mt-1">ทีมงานจัดกิจกรรม</span>
          
          <div v-if="selectedRole === 'STAFF'" class="absolute top-2 right-2 text-primary">
            ✓
          </div>
        </button>

        <button
          v-if="payload?.canRegisterAtParticipant"
          type="button"
          :class="getSelectionBtnClass(selectedRole === 'PARTICIPANT')"
          @click="selectRole('PARTICIPANT')"
          id="registration-participant-select-button"
        >
          <span class="text-4xl mb-2">🙋‍♂️</span>
          <span class="font-semibold text-lg">Participant</span>
          <span class="text-xs text-muted-foreground mt-1">ผู้เข้าร่วมงาน</span>

          <div v-if="selectedRole === 'PARTICIPANT'" class="absolute top-2 right-2 text-primary">
            ✓
          </div>
        </button>

        <div v-if="!payload?.canRegisterAtStaff && !payload?.canRegisterAtParticipant" class="text-red-500">
          คุณไม่มีสิทธิ์ลงทะเบียนในกิจกรรมนี้
        </div>
      </div>

      <DialogFooter class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button variant="outline" @click="handleClose">
          ยกเลิก
        </Button>
        <Button 
          type="submit" 
          @click="handleConfirm" 
          :disabled="!selectedRole"
          id="registration-confirm-button"
        >
          ยืนยัน
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>