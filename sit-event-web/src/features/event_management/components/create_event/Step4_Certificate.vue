<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import { useCertificateStore } from '@/features/certificate/store/CertificateStore'
import { CertificateService } from '@/features/certificate/services/CertificateService'
import { toast } from 'vue-sonner'

// Dialog and Shadcn forms
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  isCertificateLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'skip'): void
}>()

const certificateStore = useCertificateStore()

// --- CERTIFICATE TYPES ---
type CertificateFieldType = 
  | 'ParticipantName' 
  | 'EventName' 
  | 'EventStartDate' 
  | 'EventEndDate' 
  | 'Date' 
  | 'SerialNumber' 
  | 'Text' 
  | 'Image';

interface CertificateElement {
  id: string;
  serverId?: string;
  type: CertificateFieldType;
  label: string;
  x: number;
  y: number;
  value?: string; 
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string; 
  textAlign?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  src?: string | null; 
  file?: File | null;  
  dateFormat?: string;
}

// --- CERTIFICATE STATE ---
const isCertificateDialogOpen = ref(false)
const certificateElements = ref<CertificateElement[]>([])
const selectedElementId = ref<string | null>(null)
const certificateBackground = ref<{ file: File | null; preview: string | null }>({ file: null, preview: null })
const backgroundInputRef = ref<HTMLInputElement | null>(null)
const isCreatingNode = ref(false)
const isDirty = ref(false)
const existingTemplateId = ref<string | null>(null)

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 565; 

const selectedElement = computed(() => 
  certificateElements.value.find(el => el.id === selectedElementId.value)
)

const hasCertificateConfig = computed(() => 
  certificateElements.value.length > 0 || certificateBackground.value.preview !== null
)

// --- SYNC WITH STORE ---
const initFromStore = (eventId: string) => {
    isCreatingNode.value = false;
    const data = certificateStore.certificates[eventId];
    if (data) {
        isCreatingNode.value = true;
        existingTemplateId.value = data.id;
        certificateBackground.value = {
          file: null, 
          preview: data.templateUrl || null
        }
        certificateElements.value = data.elements.map(el => ({
          id: crypto.randomUUID(),
          serverId: el.id,
          type: (el.fieldType as CertificateFieldType) || 'Text',
          label: el.fieldName || '',
          x: el.x || 50,
          y: el.y || 50,
          value: el.placeHolder || undefined,
          fontSize: el.fontSize || 16,
          fontFamily: el.fontFamily || 'Sarabun',
          color: el.color || '#000000',
          fontWeight: el.fontWeight || 'normal',
          textAlign: (el.textAlign as any) || 'left',
          width: el.width || undefined,
          height: el.height || undefined,
          src: el.sourceFilepath || null,
          dateFormat: el.dateFormat || undefined
        }))
    }
}

// --- ELEMENT MANAGEMENT ---
const addElement = (type: CertificateFieldType) => {
  const newId = crypto.randomUUID();
  const baseProps: CertificateElement = {
    id: newId, type, label: type, x: 50, y: 50, fontSize: 16, fontFamily: 'Sarabun',
    color: '#000000', fontWeight: 'normal', textAlign: 'left', width: 100, height: 100
  };

  switch (type) {
    case 'ParticipantName':
      baseProps.label = 'Participant Name'; baseProps.value = '{Student Name}';
      baseProps.fontSize = 24; baseProps.fontWeight = 'bold'; break;
    case 'EventName':
      baseProps.label = 'Event Name'; baseProps.value = '{Event Name}';
      baseProps.fontSize = 20; baseProps.fontWeight = 'bold'; break;
    case 'EventStartDate':
      baseProps.label = 'Start Date'; baseProps.value = '{Start Date}';
      baseProps.dateFormat = 'D MMMM YYYY'; break;
    case 'EventEndDate':
      baseProps.label = 'End Date'; baseProps.value = '{End Date}';
      baseProps.dateFormat = 'D MMMM YYYY'; break;
    case 'Date':
      baseProps.label = 'Fixed Date'; baseProps.value = new Date().toLocaleDateString('th-TH');
      baseProps.dateFormat = 'D MMMM YYYY'; break;
    case 'SerialNumber':
      baseProps.label = 'Serial No.'; baseProps.value = 'SIT-2024-XXXX';
      baseProps.fontSize = 12; break;
    case 'Text':
      baseProps.label = 'Fixed Text'; baseProps.value = 'ข้อความ'; break;
    case 'Image':
      baseProps.label = 'Image/Signature'; baseProps.value = '';
      baseProps.width = 150; baseProps.height = 80; break;
  }
  certificateElements.value.push(baseProps);
  selectedElementId.value = newId;
}

const removeElement = (id: string) => {
  certificateElements.value = certificateElements.value.filter(e => e.id !== id);
  if (selectedElementId.value === id) selectedElementId.value = null;
}

const triggerBackgroundUpload = () => backgroundInputRef.value?.click();

const handleBackgroundSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    certificateBackground.value.file = file;
    certificateBackground.value.preview = URL.createObjectURL(file);
  }
}

const removeBackground = () => {
  certificateBackground.value.file = null;
  certificateBackground.value.preview = null;
  if (backgroundInputRef.value) backgroundInputRef.value.value = '';
}

const handleElementImageUpload = (e: Event, element: CertificateElement) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && file.type.startsWith('image/')) {
    element.file = file;
    element.src = URL.createObjectURL(file);
  }
}

// --- DRAG LOGIC ---
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const startDrag = (e: MouseEvent, element: CertificateElement) => {
  if (e.button !== 0) return; 
  selectedElementId.value = element.id;
  isDragging.value = true;
  dragOffset.value = { x: e.clientX - element.x, y: e.clientY - element.y };
  
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !selectedElement.value) return;
  selectedElement.value.x = Math.round(e.clientX - dragOffset.value.x);
  selectedElement.value.y = Math.round(e.clientY - dragOffset.value.y);
}

const stopDrag = () => {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

watch(certificateElements, () => {
    isDirty.value = true
}, { deep: true })
watch(certificateBackground, () => {
    isDirty.value = true
}, { deep: true })

const saveCertificateTemplate = () => {
    isDirty.value = true;
    toast.success('บันทึก Template เกียรติบัตรไว้ในรายการแล้ว (จะถูกสร้างเมื่อกด Save Event)');
    isCertificateDialogOpen.value = false;
}

const saveCertificate = async (targetEventId: string) => {
    if (!isDirty.value && !existingTemplateId.value) return; 
    if (!isDirty.value) return; 

    await certificateStore.saveCertificate(
        targetEventId,
        existingTemplateId.value,
        certificateBackground.value.file,
        certificateElements.value as any
    );

    isDirty.value = false;
    existingTemplateId.value = certificateStore.certificates[targetEventId]?.id || existingTemplateId.value;
}

const validateForm = () => {
    if (!isCreatingNode.value && !hasCertificateConfig.value) return true;
    
    if (!certificateBackground.value.preview) {
        toast.error('กรุณาอัปโหลดรูปภาพพื้นหลังเกียรติบัตร');
        return false;
    }

    const missingImageElements = certificateElements.value.filter(el => el.type === 'Image' && !el.src && !el.file);
    if (missingImageElements.length > 0) {
        toast.error('กรุณาอัปโหลดรูปภาพ/ลายเซ็น ให้ครบทุกจุดที่เพิ่มไว้');
        return false;
    }

    return true;
}

defineExpose({ initFromStore, saveCertificate, hasCertificateConfig, validateForm });

const toggleCreate = () => isCreatingNode.value = true;
const handleSkip = () => {
    isCreatingNode.value = false;
    emit('skip')
}
</script>

<template>
  <div class="space-y-6 text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="mb-4">
       <h2 class="text-xl font-semibold text-gray-900">4. Certificate Configuration</h2>
       <p class="text-sm text-gray-500">Create beautiful certificates for event attendees.</p>
    </div>

    <!-- Ask User UI -->
    <div v-if="!isCreatingNode && !hasCertificateConfig" class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Do you want to add a certificate?</h3>
        <p class="text-sm text-gray-500 text-center max-w-md mb-6">Certificates are a great way to reward attendees. You can configure a template now, or skip this if your event does not provide certificates.</p>
        
        <div class="flex items-center gap-4">
            <Button type="button" variant="outline" class="w-32" @click="handleSkip" id="skip-btn">No, Skip</Button>
            <Button type="button" class="w-32 bg-green-600 hover:bg-green-700 text-white" @click="toggleCreate" id="add-btn">Yes, Configure</Button>
        </div>
    </div>

    <div v-else class="space-y-4">
      <div class="border rounded-lg bg-white shadow-sm p-6 text-gray-800 relative min-h-[140px]">
          <div v-if="isCertificateLoading" class="absolute inset-0 bg-white/90 z-20 flex flex-col gap-2 items-center justify-center rounded-lg">
             <Loader2 class="w-8 h-8 animate-spin text-green-600" />
             <span class="text-xs text-gray-500 font-medium">Loading Certificate...</span>
          </div>

          <div v-if="!hasCertificateConfig" class="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/></svg>
              </div>
              <div>
                 <h3 class="font-medium text-gray-900">Configure Certificate Layout</h3>
                 <p class="text-sm text-gray-500 mt-1">Open the certificate editor to design your layout.</p>
              </div>
              <Button type="button" variant="outline" @click="isCertificateDialogOpen = true">
                 Open Editor
              </Button>
          </div>

          <div v-else class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </div>
                  <div>
                      <h3 class="font-medium text-gray-900">Certificate Configured</h3>
                      <p class="text-xs text-gray-500">Ready to be issued to participants</p>
                  </div>
              </div>
              <Button type="button" variant="outline" @click="isCertificateDialogOpen = true">
                 Edit Certificate
              </Button>
          </div>
      </div>
    </div>

    <Dialog v-model:open="isCertificateDialogOpen">
      <!-- Certificate Editor Dialog (Moved entirely from original) -->
      <DialogContent class="sm:max-w-[85vw] w-[85vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white text-gray-800">
         <DialogHeader class="px-6 py-3 border-b bg-white z-10 flex flex-row items-center justify-between shadow-sm">
             <div class="flex flex-col">
                <DialogTitle>Certificate Editor</DialogTitle>
                <DialogDescription class="text-xs mt-0.5">Drag and drop elements to design your certificate.</DialogDescription>
             </div>
             
             <div class="flex gap-2 flex-wrap items-center">
                 <div class="h-6 w-px bg-gray-200 mx-1"></div>
                 <p class="text-xs text-gray-400 mr-1 font-medium">Add:</p>
                 
                 <div class="flex bg-gray-100 rounded-md p-1 gap-1">
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('ParticipantName')" title="Participant Name">
                        Name
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventName')" title="Event Name">
                        Event
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventStartDate')" title="Event Start Date">
                        Start Date
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('EventEndDate')" title="Event End Date">
                        End Date
                    </Button>
                     <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('SerialNumber')" title="Running Number">
                        No.
                    </Button>
                 </div>

                 <div class="flex bg-gray-100 rounded-md p-1 gap-1 ml-2">
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Text')">
                        Text
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Date')">
                        Fixed Date
                    </Button>
                    <Button variant="ghost" size="sm" class="h-7 text-xs px-2 hover:bg-white hover:shadow-sm" @click="addElement('Image')">
                        Image
                    </Button>
                 </div>

                 <div class="h-6 w-px bg-gray-200 mx-1"></div>
                 <Button size="sm" class="h-8 bg-blue-600 hover:bg-blue-700 text-white" @click="saveCertificateTemplate">
                    Save Template
                 </Button>
             </div>
         </DialogHeader>
         
         <div class="flex flex-1 overflow-hidden bg-gray-100">
             
             <div class="flex-1 overflow-auto p-8 flex items-center justify-center relative bg-gray-100/50">
                 <div 
                    class="bg-white shadow-xl relative select-none overflow-hidden transition-all ease-in-out"
                    :style="{ width: CANVAS_WIDTH + 'px', height: CANVAS_HEIGHT + 'px', flexShrink: 0 }"
                    @click.self="selectedElementId = null" 
                 >
                    <div 
                      class="absolute inset-0 z-0 bg-no-repeat bg-center bg-cover pointer-events-none"
                      :style="{ backgroundImage: certificateBackground.preview ? `url(${certificateBackground.preview})` : 'none', backgroundColor: certificateBackground.preview ? 'transparent' : '#fff' }"
                    >
                       <div v-if="!certificateBackground.preview" class="w-full h-full flex flex-col items-center justify-center text-gray-300 border-2 border-dashed m-4 rounded-lg border-gray-200">
                           <span class="text-sm">No Background Image</span>
                       </div>
                    </div>

                    <div
                      v-for="el in certificateElements"
                      :key="el.id"
                      class="absolute cursor-move flex items-center justify-center whitespace-nowrap group hover:outline hover:outline-1 hover:outline-blue-400 z-10"
                      :class="{ 'outline outline-2 outline-blue-600 shadow-md': selectedElementId === el.id }"
                      :style="{
                        left: el.x + 'px', top: el.y + 'px', fontSize: el.fontSize + 'px', color: el.color,
                        fontWeight: el.fontWeight, textAlign: el.textAlign, fontFamily: el.fontFamily,
                        width: el.type === 'Image' ? el.width + 'px' : 'auto', height: el.type === 'Image' ? el.height + 'px' : 'auto',
                      }"
                      @mousedown.stop="startDrag($event, el)"
                    >
                       <template v-if="el.type === 'Image'">
                           <div class="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden relative" :class="{'opacity-50': !el.src}">
                               <img v-if="el.src" :src="el.src" class="w-full h-full object-contain" />
                               <span v-else class="text-[10px] text-gray-400">Image</span>
                           </div>
                       </template>
                       <template v-else-if="el.type === 'SerialNumber'"><span>{{ el.value }}</span></template>
                       <template v-else><span>{{ el.value || el.label }}</span></template>
                       
                       <button 
                          v-if="selectedElementId === el.id"
                          class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 w-5 h-5 flex items-center justify-center shadow-md text-xs z-50 hover:bg-red-600 transition-transform hover:scale-110"
                          @click.stop="removeElement(el.id)"
                       >×</button>

                       <div v-if="isDragging && selectedElementId === el.id" class="absolute -top-6 left-0 bg-black text-white text-[9px] px-1 py-0.5 rounded opacity-70">
                          x:{{ Math.round(el.x) }}, y:{{ Math.round(el.y) }}
                       </div>
                    </div>
                 </div>
             </div>

             <div class="w-80 bg-white border-l shadow-sm flex flex-col overflow-y-auto">
                 <div class="p-4 border-b">
                     <h3 class="font-semibold text-sm text-gray-900">Properties</h3>
                 </div>

                 <div v-if="!selectedElement" class="p-4 space-y-6">
                     <div class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Background</Label>
                        <div 
                          class="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors h-32 relative group"
                          @click="triggerBackgroundUpload"
                        >
                            <input type="file" ref="backgroundInputRef" class="hidden" accept="image/*" @change="handleBackgroundSelect" />
                            <img v-if="certificateBackground.preview" :src="certificateBackground.preview" class="absolute inset-0 w-full h-full object-cover rounded-lg opacity-80" />
                            <div class="z-10 bg-white/80 p-2 rounded-full shadow-sm backdrop-blur-sm group-hover:bg-white transition-all">
                               <svg v-if="!certificateBackground.preview" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                               <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                            </div>
                            <span v-if="!certificateBackground.preview" class="text-xs text-gray-500 mt-2">Upload Background</span>
                        </div>
                        <Button v-if="certificateBackground.preview" variant="destructive" size="sm" class="w-full text-xs" @click="removeBackground">
                           Remove Background
                        </Button>
                     </div>
                     <div class="text-xs text-gray-400 text-center mt-10">Select an element on the canvas to edit its properties.</div>
                 </div>

                 <div v-else class="p-4 space-y-6">
                     <div class="flex items-center justify-between">
                        <span class="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded uppercase">{{ selectedElement.type }}</span>
                        <span class="text-xs text-gray-400">ID: {{ selectedElement.id.slice(0,4) }}</span>
                     </div>

                     <div class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</Label>
                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">X (px)</Label>
                               <Input type="number" v-model.number="selectedElement.x" class="h-8" />
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Y (px)</Label>
                               <Input type="number" v-model.number="selectedElement.y" class="h-8" />
                            </div>
                        </div>
                     </div>

                     <div v-if="selectedElement.type !== 'Image'" class="space-y-3">
                        <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</Label>
                        <div class="space-y-1">
                            <Label class="text-[10px]">Font Family</Label>
                            <select v-model="selectedElement.fontFamily" class="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="Sarabun">Sarabun (TH)</option>
                                <option value="Kanit">Kanit (TH)</option>
                                <option value="Prompt">Prompt (TH)</option>
                                <option value="TH Sarabun New">TH Sarabun New</option>
                                <option value="Arial">Arial</option>
                            </select>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">Size (px)</Label>
                               <Input type="number" v-model.number="selectedElement.fontSize" class="h-8" min="8" />
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Color</Label>
                               <div class="flex gap-2">
                                  <Input type="color" v-model="selectedElement.color" class="h-8 w-8 p-0 border-0" />
                                  <Input type="text" v-model="selectedElement.color" class="h-8 flex-1 text-xs" />
                               </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="space-y-1">
                               <Label class="text-[10px]">Weight</Label>
                               <select v-model="selectedElement.fontWeight" class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="normal">Normal</option>
                                   <option value="bold">Bold</option>
                                   <option value="300">Light</option>
                               </select>
                            </div>
                            <div class="space-y-1">
                               <Label class="text-[10px]">Align</Label>
                               <select v-model="selectedElement.textAlign" class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="left">Left</option>
                                   <option value="center">Center</option>
                                   <option value="right">Right</option>
                               </select>
                            </div>
                        </div>
                     </div>

                     <div class="space-y-3">
                         <Label class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Content</Label>
                         <div v-if="selectedElement.type === 'Text' || selectedElement.type === 'Date'" class="space-y-1">
                             <Label class="text-[10px]">{{ selectedElement.type === 'Text' ? 'Text Content' : 'Preview Date' }}</Label>
                             <Input v-model="selectedElement.value" class="h-8" />
                         </div>

                         <div v-if="['EventStartDate', 'EventEndDate', 'Date'].includes(selectedElement.type)" class="space-y-1">
                             <Label class="text-[10px]">Date Format</Label>
                             <select v-model="selectedElement.dateFormat" class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm">
                                   <option value="D MMMM YYYY">25 มกราคม 2568</option>
                                   <option value="DD/MM/YYYY">25/01/2568</option>
                                   <option value="D MMM YYYY">25 ม.ค. 2568</option>
                                   <option value="YYYY-MM-DD">2025-01-25</option>
                             </select>
                         </div>

                         <div v-if="selectedElement.type === 'Image'" class="space-y-3">
                             <div class="grid grid-cols-2 gap-3">
                                <div class="space-y-1">
                                   <Label class="text-[10px]">Width</Label>
                                   <Input type="number" v-model.number="selectedElement.width" class="h-8" />
                                </div>
                                <div class="space-y-1">
                                   <Label class="text-[10px]">Height</Label>
                                   <Input type="number" v-model.number="selectedElement.height" class="h-8" />
                                </div>
                             </div>
                             <div class="space-y-1">
                                 <Label class="text-[10px]">Source Image</Label>
                                 <Input type="file" class="h-8 text-[10px]" accept="image/*" @change="handleElementImageUpload($event, selectedElement!)" />
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
