<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { FormType } from '@/features/forms/services/FormServices'

interface FormItem {
  id: string
  type: string
  title: string
  isActive: boolean
}

const props = defineProps<{
  eventId?: string
  isEditMode: boolean
  isFormLoading: boolean
  formsList: FormItem[]
  wantPreEventForm: boolean
  wantPostEventForm: boolean
}>()

const emit = defineEmits<{
  (e: 'update:wantPreEventForm', value: boolean): void
  (e: 'update:wantPostEventForm', value: boolean): void
  (e: 'createForm', type: FormType): void
  (e: 'editForm', formId: string): void
  (e: 'skip'): void
}>()

const isCreatingNode = ref(props.formsList.length > 0 || props.wantPreEventForm || props.wantPostEventForm)

const toggleCreate = () => {
    isCreatingNode.value = true
}

const handleSkip = () => {
   isCreatingNode.value = false
   emit('update:wantPreEventForm', false)
   emit('update:wantPostEventForm', false)
   emit('skip')
}

const getFormByType = (type: string) => {
  return props.formsList.find(f => f.type === type)
}
</script>

<template>
  <div class="space-y-6 text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-4">
       <h2 class="text-xl font-semibold text-gray-900">3. Survey Forms</h2>
       <p class="text-sm text-gray-500">Add registration forms or feedback surveys for your event.</p>
    </div>

    <div v-if="!isCreatingNode" class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 text-purple-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Do you want to add survey forms?</h3>
        <p class="text-sm text-gray-500 text-center max-w-md mb-6">You can create pre-event forms for registration details or post-event forms for feedback. If you don't need any forms, you can skip this step.</p>
        
        <div class="flex items-center gap-4">
            <Button type="button" variant="outline" class="w-32" @click="handleSkip" id="skip-btn">No, Skip</Button>
            <Button type="button" class="w-32 bg-purple-600 hover:bg-purple-700 text-white" @click="toggleCreate" id="add-btn">Yes, Add</Button>
        </div>
    </div>

    <div v-else class="space-y-4">
      
      <div v-if="isFormLoading" class="flex justify-center items-center p-8 bg-gray-50 rounded-lg border border-dashed">
          <Loader2 class="w-6 h-6 animate-spin text-gray-500" />
          <span class="ml-2 text-sm text-gray-500">Loading Forms...</span>
      </div>

      <div v-else class="grid gap-4">
        <p v-if="!isEditMode && !eventId" class="text-sm text-blue-600 bg-blue-50 p-4 rounded-lg flex items-start gap-2 border border-blue-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
           <span>Since the event is not created yet, you can choose to enable these forms now. Empty forms will be initialized when you save the event, and you can edit them later.</span>
        </p>

        <!-- Pre-Event Form Block -->
        <div class="border p-4 rounded-lg flex justify-between items-center bg-white shadow-sm transition-all"
             :class="{'border-purple-300 ring-2 ring-purple-100': (!isEditMode && wantPreEventForm)}">
          <div>
            <h3 class="font-medium text-gray-900">Pre-Event Form</h3>
            <p class="text-xs text-gray-500 max-w-sm mt-1">Collect information from participants before the event (e.g., dietary restrictions, t-shirt size).</p>
          </div>
          <div class="flex items-center gap-2">
             <template v-if="isEditMode && eventId">
                <Badge v-if="getFormByType(FormType.PRE_EVENT)" :variant="getFormByType(FormType.PRE_EVENT)!.isActive ? 'default' : 'secondary'">
                   {{ getFormByType(FormType.PRE_EVENT)!.isActive ? 'Active' : 'Inactive' }}
                </Badge>
                <Button v-if="getFormByType(FormType.PRE_EVENT)" type="button" variant="outline" size="sm" @click="emit('editForm', getFormByType(FormType.PRE_EVENT)!.id)">Edit</Button>
                <Button v-else type="button" variant="outline" size="sm" @click="emit('createForm', FormType.PRE_EVENT)">Create Form</Button>
             </template>
             <template v-else>
                <Button 
                   type="button" 
                   :variant="wantPreEventForm ? 'default' : 'outline'" 
                   size="sm" 
                   @click="emit('update:wantPreEventForm', !wantPreEventForm)"
                >
                   {{ wantPreEventForm ? 'Added to Event' : 'Add Form' }}
                </Button>
             </template>
          </div>
        </div>

        <!-- Post-Event Form Block -->
        <div class="border p-4 rounded-lg flex justify-between items-center bg-white shadow-sm transition-all"
             :class="{'border-purple-300 ring-2 ring-purple-100': (!isEditMode && wantPostEventForm)}">
          <div>
            <h3 class="font-medium text-gray-900">Post-Event Form</h3>
            <p class="text-xs text-gray-500 max-w-sm mt-1">Gather feedback from participants after the event has concluded.</p>
          </div>
          <div class="flex items-center gap-2">
             <template v-if="isEditMode && eventId">
                <Badge v-if="getFormByType(FormType.POST_EVENT)" :variant="getFormByType(FormType.POST_EVENT)!.isActive ? 'default' : 'secondary'">
                   {{ getFormByType(FormType.POST_EVENT)!.isActive ? 'Active' : 'Inactive' }}
                </Badge>
                <Button v-if="getFormByType(FormType.POST_EVENT)" type="button" variant="outline" size="sm" @click="emit('editForm', getFormByType(FormType.POST_EVENT)!.id)">Edit</Button>
                <Button v-else type="button" variant="outline" size="sm" @click="emit('createForm', FormType.POST_EVENT)">Create Form</Button>
             </template>
             <template v-else>
                <Button 
                   type="button" 
                   :variant="wantPostEventForm ? 'default' : 'outline'" 
                   size="sm" 
                   @click="emit('update:wantPostEventForm', !wantPostEventForm)"
                >
                   {{ wantPostEventForm ? 'Added to Event' : 'Add Form' }}
                </Button>
             </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
