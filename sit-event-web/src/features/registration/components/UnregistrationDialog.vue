<script setup lang="ts">
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

defineProps<{
  open: boolean
  targetRole?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>ยืนยันการยกเลิก</DialogTitle>
        <DialogDescription>
          คุณต้องการยกเลิกการลงทะเบียนในฐานะ 
          <span class="font-bold text-primary">{{ targetRole }}</span> 
          ใช่หรือไม่?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">ยกเลิก</Button>
        <Button variant="destructive" @click="emit('confirm')" id="confirm-unregister-button">ยืนยันการยกเลิก</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>