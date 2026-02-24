<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, MapPin, Users, Ticket, CheckCircle2 } from 'lucide-vue-next'

const props = defineProps<{
  formValues: any
  subSessions: any[]
  wantPreEventForm: boolean
  wantPostEventForm: boolean
  hasCertificate: boolean
  isSubmitting: boolean
  previewUrl: string | null
  isEditMode: boolean
  submitStatus: {
    event: 'pending' | 'loading' | 'done' | 'error'
    sessions: 'pending' | 'loading' | 'done' | 'error'
    certificate: 'pending' | 'loading' | 'done' | 'error'
    forms: 'pending' | 'loading' | 'done' | 'error'
  }
}>()

const formatDate = (date: Date) => {
  if (!date || isNaN(date.getTime())) return '-'
  return date.toLocaleString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  })
}
</script>

<template>
  <div class="space-y-6 text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <!-- SUBMITTING STATE -->
    <div v-if="isSubmitting" class="flex flex-col items-center justify-center py-20 px-4 text-center space-y-8 bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
       <!-- decorative background -->
       <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
       
       <div class="relative">
           <div class="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
               <Loader2 class="w-12 h-12 text-blue-600 animate-spin" />
           </div>
           <div class="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-500"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
           </div>
       </div>
       
       <div class="space-y-3">
           <h2 class="text-2xl font-bold text-gray-900">กำลังสร้างกิจกรรมของคุณ...</h2>
           <p class="text-gray-500 max-w-md mx-auto">ระบบกำลังดำเนินการบันทึกข้อมูลและสร้างทรัพยากรต่างๆ ที่เกี่ยวข้องกับกิจกรรมนี้</p>
       </div>

       <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 max-w-md w-full text-left">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 flex-shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
           <div>
               <h4 class="font-semibold text-amber-800">กรุณาอย่าปิดแท็บหรือเบราว์เซอร์นี้</h4>
               <p class="text-sm text-amber-700 mt-1">กระบวนการนี้อาจใช้เวลาสักครู่ ขึ้นอยู่กับจำนวนข้อมูลและไฟล์ที่อัปโหลด</p>
           </div>
       </div>

       <div class="w-full max-w-md mt-4 space-y-3 text-left bg-gray-50 p-4 rounded-lg border border-gray-100">
           <div class="flex items-center gap-3 text-sm" :class="{
               'text-gray-400': submitStatus.event === 'pending',
               'text-blue-600 font-medium': submitStatus.event === 'loading',
               'text-green-600': submitStatus.event === 'done',
               'text-red-500': submitStatus.event === 'error'
           }">
               <Loader2 v-if="submitStatus.event === 'loading'" class="inline w-4 h-4 animate-spin" />
               <CheckCircle2 v-else-if="submitStatus.event === 'done'" class="inline w-4 h-4" />
               <svg v-else-if="submitStatus.event === 'error'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
               <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
               บันทึกข้อมูลและอัปโหลดรูปภาพ
           </div>

           <div v-if="subSessions.length > 0" class="flex items-center gap-3 text-sm" :class="{
               'text-gray-400': submitStatus.sessions === 'pending',
               'text-blue-600 font-medium': submitStatus.sessions === 'loading',
               'text-green-600': submitStatus.sessions === 'done',
               'text-red-500': submitStatus.sessions === 'error'
           }">
               <Loader2 v-if="submitStatus.sessions === 'loading'" class="inline w-4 h-4 animate-spin" />
               <CheckCircle2 v-else-if="submitStatus.sessions === 'done'" class="inline w-4 h-4" />
               <svg v-else-if="submitStatus.sessions === 'error'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
               <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
               สร้าง Sub-sessions ({{ subSessions.length }})
           </div>

           <div v-if="hasCertificate" class="flex items-center gap-3 text-sm" :class="{
               'text-gray-400': submitStatus.certificate === 'pending',
               'text-blue-600 font-medium': submitStatus.certificate === 'loading',
               'text-green-600': submitStatus.certificate === 'done',
               'text-red-500': submitStatus.certificate === 'error'
           }">
               <Loader2 v-if="submitStatus.certificate === 'loading'" class="inline w-4 h-4 animate-spin" />
               <CheckCircle2 v-else-if="submitStatus.certificate === 'done'" class="inline w-4 h-4" />
               <svg v-else-if="submitStatus.certificate === 'error'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
               <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
               สร้างเทมเพลตเกียรติบัตร
           </div>

           <div v-if="!isEditMode && (wantPreEventForm || wantPostEventForm)" class="flex items-center gap-3 text-sm" :class="{
               'text-gray-400': submitStatus.forms === 'pending',
               'text-blue-600 font-medium': submitStatus.forms === 'loading',
               'text-green-600': submitStatus.forms === 'done',
               'text-red-500': submitStatus.forms === 'error'
           }">
               <Loader2 v-if="submitStatus.forms === 'loading'" class="inline w-4 h-4 animate-spin" />
               <CheckCircle2 v-else-if="submitStatus.forms === 'done'" class="inline w-4 h-4" />
               <svg v-else-if="submitStatus.forms === 'error'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
               <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
               สร้างแบบประเมิน
           </div>
       </div>
    </div>

    <!-- PREVIEW STATE -->
    <div v-else class="space-y-8">
      <div class="mb-4">
         <h2 class="text-xl font-semibold text-gray-900">5. Review & Confirm</h2>
         <p class="text-sm text-gray-500">Please review your event details before finalizing.</p>
      </div>

      <!-- General Info Recap -->
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
         <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
             <h3 class="font-medium text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                General Information
             </h3>
         </div>
         <div class="p-6 md:flex gap-6">
             <!-- Thumbnail -->
             <div class="w-full md:w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 mb-4 md:mb-0 border">
                <img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    <span class="text-xs mt-1">No Image</span>
                </div>
             </div>

             <div class="flex-1 space-y-4">
                 <div>
                     <h4 class="text-xl font-bold text-gray-900">{{ formValues.name || 'Untitled Event' }}</h4>
                     <p class="text-sm text-gray-600 mt-2 line-clamp-2">{{ formValues.description || 'No description provided.' }}</p>
                 </div>

                 <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                     <div class="flex items-start gap-2">
                         <Calendar class="w-4 h-4 text-blue-500 mt-0.5" />
                         <div>
                             <p class="text-xs font-semibold text-gray-500 uppercase">Event Schedule</p>
                             <p class="text-sm font-medium text-gray-900">{{ formatDate(formValues.eventStartDate) }} - {{ formatDate(formValues.eventEndDate) }}</p>
                         </div>
                     </div>
                     <div class="flex items-start gap-2">
                         <Ticket class="w-4 h-4 text-green-500 mt-0.5" />
                         <div>
                             <p class="text-xs font-semibold text-gray-500 uppercase">Registration</p>
                             <p class="text-sm font-medium text-gray-900">{{ formatDate(formValues.registrationOpenDate) }} - {{ formatDate(formValues.registrationEndDate) }}</p>
                         </div>
                     </div>
                 </div>

                 <div class="flex flex-wrap gap-2 pt-2">
                     <Badge v-for="t in formValues.targetAudience" :key="t" variant="secondary" class="bg-blue-50 text-blue-700">{{ t }}</Badge>
                     <Badge v-for="t in formValues.tags" :key="t" variant="outline" class="border-gray-200">{{ t }}</Badge>
                 </div>
             </div>
         </div>
      </div>

      <!-- Add-ons Recap -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
         <!-- Sub-sessions -->
         <div class="border rounded-lg p-5 bg-white shadow-sm flex flex-col justify-between">
             <div>
                <div class="flex items-center gap-2 mb-2 text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-orange-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    <h3 class="font-semibold text-gray-900">Sub-Sessions</h3>
                </div>
                <p class="text-sm text-gray-500 mb-4">You have added <strong class="text-gray-900">{{ subSessions.length }}</strong> sub-sessions to your event.</p>
             </div>
             <Badge :variant="subSessions.length > 0 ? 'default' : 'secondary'" class="self-start w-fit">
                 {{ subSessions.length > 0 ? 'Configured' : 'Skipped' }}
             </Badge>
         </div>

         <!-- Forms -->
         <div class="border rounded-lg p-5 bg-white shadow-sm flex flex-col justify-between">
             <div>
                <div class="flex items-center gap-2 mb-2 text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-purple-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    <h3 class="font-semibold text-gray-900">Survey Forms</h3>
                </div>
                <p class="text-sm text-gray-500 mb-4 text-balance">
                   Pre-Event Form: <strong :class="wantPreEventForm ? 'text-green-600' : 'text-gray-400'">{{ wantPreEventForm ? 'Yes' : 'No' }}</strong><br>
                   Post-Event Form: <strong :class="wantPostEventForm ? 'text-green-600' : 'text-gray-400'">{{ wantPostEventForm ? 'Yes' : 'No' }}</strong>
                </p>
             </div>
             <Badge :variant="(wantPreEventForm || wantPostEventForm) ? 'default' : 'secondary'" class="self-start w-fit">
                 {{ (wantPreEventForm || wantPostEventForm) ? 'Configured' : 'Skipped' }}
             </Badge>
         </div>

         <!-- Certificate -->
         <div class="border rounded-lg p-5 bg-white shadow-sm flex flex-col justify-between">
             <div>
                <div class="flex items-center gap-2 mb-2 text-gray-800">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <h3 class="font-semibold text-gray-900">Certificate</h3>
                </div>
                <p class="text-sm text-gray-500 mb-4">Certificate generation for attendees upon completion.</p>
             </div>
             <Badge :variant="hasCertificate ? 'default' : 'secondary'" class="self-start w-fit">
                 {{ hasCertificate ? 'Configured' : 'Skipped' }}
             </Badge>
         </div>
      </div>
    </div>
  </div>
</template>
