<script setup lang="ts">
import { useToastStore } from '@/features/toast/stores/toast.store';

// 1. ดึง store มาใช้งาน
const toastStore = useToastStore()
</script>

<template>
  <div class="toast-container">
    <transition-group name="toast-fade" tag="div">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="['toast-item', `toast-${toast.status}`]"
      >
        {{ toast.text }}
        <button @click="toastStore.removeToast(toast.id)" class="toast-close">
          &times;
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-item {
  padding: 15px 20px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 250px;
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}

/* 6. กำหนดสีตาม status ที่ส่งมา */
.toast-success {
  background-color: #42b883; /* สีเขียว Vue */
}
.toast-error {
  background-color: #e53e3e; /* สีแดง */
}
.toast-info {
  background-color: #3182ce; /* สีฟ้า */
}
.toast-warning {
  background-color: #ed8936; /* สีส้ม */
}

.toast-close {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  margin-left: 15px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

/* 7. CSS Transitions */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.5s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>