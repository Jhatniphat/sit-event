<script setup lang="ts">
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TagInput from '@/components/ui/commons/TagInput.vue'
import DateTimeRangePicker from '@/components/ui/commons/DateTimeRangePicker.vue'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps<{
  previewUrl: string | null
  isThumbnailLoading: boolean
  ALL_EVENT_TARGET_AUDIENCE: string[]
  ALL_EVENT_TAGS: string[]
  errors?: any
}>()

const emit = defineEmits<{
  (e: 'setThumbnail', file: File): void
  (e: 'removeImage'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    emit('setThumbnail', file)
  }
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    emit('setThumbnail', file)
  }
}
</script>

<template>
  <div class="space-y-6 text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-4">
       <h2 class="text-xl font-semibold text-gray-900">1. General Information</h2>
       <p class="text-sm text-gray-500">Provide the basic details of your event.</p>
    </div>

    <!-- Event Name & Description -->
    <div class="space-y-4">
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>Event Name <span class="text-destructive">*</span></FormLabel>
          <FormControl>
            <Input type="text" placeholder="Enter event name" v-bind="componentField" id="input-event-name" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField v-slot="{ componentField }" name="description">
        <FormItem>
          <FormLabel>Description <span class="text-destructive">*</span></FormLabel>
          <FormControl>
            <Textarea placeholder="Describe your event..." class="min-h-[120px]" v-bind="componentField" id="input-event-description" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>

    <!-- Dates (Using DateTimeRangePicker) -->
    <div class="space-y-4 pt-4 border-t border-gray-100">
      <h3 class="text-lg font-medium text-gray-800">Schedule & Registration</h3>
      
      <div class="grid gap-6">
        <FormField v-slot="{ value, handleChange }" name="eventStartDate">
          <FormItem>
            <FormLabel>Event Schedule <span class="text-destructive">*</span></FormLabel>
            <FormControl>
               <FormField v-slot="{ value: endValue, handleChange: handleEndChange }" name="eventEndDate">
                  <DateTimeRangePicker 
                    :start="value" 
                    :end="endValue" 
                    @update:start="handleChange" 
                    @update:end="handleEndChange"
                    startLabel="Start"
                    endLabel="End"
                    :error="errors?.eventStartDate || errors?.eventEndDate"
                  />
               </FormField>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ value, handleChange }" name="registrationOpenDate">
          <FormItem>
            <FormLabel>Registration Period <span class="text-destructive">*</span></FormLabel>
            <FormControl>
               <FormField v-slot="{ value: endValue, handleChange: handleEndChange }" name="registrationEndDate">
                  <DateTimeRangePicker 
                    :start="value" 
                    :end="endValue" 
                    @update:start="handleChange" 
                    @update:end="handleEndChange"
                    startLabel="Open"
                    endLabel="Close"
                    :error="errors?.registrationOpenDate || errors?.registrationEndDate"
                  />
               </FormField>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </div>

    <!-- Categories & Tags -->
    <div class="space-y-4 pt-4 border-t border-gray-100">
      <h3 class="text-lg font-medium text-gray-800">Categorization</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField v-slot="{ value, handleChange }" name="targetAudience">
          <FormItem>
            <TagInput
              label="Target Audience"
              placeholder="Select audience..."
              :choices="ALL_EVENT_TARGET_AUDIENCE"
              :model-value="value" 
              @update:model-value="handleChange"
              :required="true"
              id="input-target-audience"
            />
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField v-slot="{ value, handleChange }" name="tags">
            <FormItem>
            <TagInput
              label="Event Tags"
              placeholder="Select tags..."
              :choices="ALL_EVENT_TAGS"
              :model-value="value"
              @update:model-value="handleChange"
              :required="true"
              id="input-event-tags"
            />
            <FormMessage />
          </FormItem>
        </FormField>
      </div>
    </div>

    <!-- Thumbnail -->
    <div class="space-y-4 pt-4 border-t border-gray-100">
      <h3 class="text-lg font-medium text-gray-800">Event Thumbnail</h3>
      <FormField name="thumbnail">
         <FormItem>
            <div 
               class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer h-64"
               :class="{ 'border-red-500 bg-red-50': errors?.thumbnail }"
               @dragover.prevent
               @drop.prevent="handleDrop"
               @click="fileInput?.click()"
            >
               <div v-if="isThumbnailLoading" class="absolute inset-0 bg-white/80 z-20 flex items-center justify-center rounded-lg">
                  <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
                  <span class="sr-only">Loading Image...</span>
               </div>
               <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleFileSelect" />
               
               <div v-if="!previewUrl" class="space-y-2">
                 <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                 </div>
                 <div class="text-sm text-gray-600">
                     <span class="font-semibold text-blue-600">Click to upload</span> or drag and drop
                 </div>
                 <p class="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
               </div>

               <div v-else class="w-full h-full relative group">
                 <img :src="previewUrl" alt="Thumbnail Preview" class="w-full h-full object-contain rounded-md" />
                 <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                     <Button 
                     type="button" 
                     variant="destructive" 
                     size="sm" 
                     @click.stop="emit('removeImage')"
                     >
                     Remove Image
                     </Button>
                 </div>
               </div>
            </div>
            <FormMessage />
         </FormItem>
      </FormField>
    </div>
  </div>
</template>
