<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
        <DialogTitle>ยืนยันการลบฟอร์ม</DialogTitle>
        <DialogDescription> คุณแน่ใจหรือไม่ว่าต้องการลบฟอร์มนี้? </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">ยกเลิก</Button>
        <Button variant="destructive" @click="emit('confirm')">ยืนยันการลบ</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
