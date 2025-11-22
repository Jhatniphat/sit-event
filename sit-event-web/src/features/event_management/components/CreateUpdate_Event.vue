<script setup lang="ts">
import TextField from '@/components/ui/commons/TextField.vue'
import TextArea from '@/components/ui/commons/TextArea.vue'
import BaseButton from '@/components/ui/button/BaseButton.vue'
import Modal from '@/components/ui/commons/ModalBox.vue'
import TagInput from '@/components/ui/commons/TagInput.vue'
import { ref, computed, onMounted } from 'vue'
import { useEventStore } from '@/features/event_management/store/EventStore'
import { useDateTimeInputAdapter } from '@/shared/useDateTimeInput'
import { type CreateEventDto } from '@/features/event_management/services/EventServices'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps<{
  id?: string
}>()

const eventStore = useEventStore()
const eventForm = ref<CreateEventDto>({
  name: '',
  description: '',
  thumbnail: 'aaa',
  images: ['asd'],
  registrationOpenDate: new Date(),
  registrationEndDate: new Date(),
  eventStartDate: new Date(),
  eventEndDate: new Date(),
  targetAudience: [],
  tags: [],
})

const regOpenInput = useDateTimeInputAdapter(eventForm, 'registrationOpenDate')
const regEndInput = useDateTimeInputAdapter(eventForm, 'registrationEndDate')
const eventStartInput = useDateTimeInputAdapter(eventForm, 'eventStartDate')
const eventEndInput = useDateTimeInputAdapter(eventForm, 'eventEndDate')

const ALL_EVENT_TARGET_AUDIENCE = ['EXTERNAL_STUDENT', 'INTERNAL_STUDENT', 'TEACHER', 'PUBLIC']

const isEditMode = computed(() => !!props.id)
console.log('isEditMode:', isEditMode.value)
console.log('Event ID:', props.id)

const modalOpen = ref(false)

const returnToDashboard = () => {
  if (modalOpen.value) {
    modalOpen.value = false
  }
  router.push('/')
}

onMounted(async () => {
  if (isEditMode.value) {
    await eventStore.fetchEventById(props.id!)
    const eventToEdit = eventStore.currentEvent

    if (eventToEdit) {
      eventForm.value = {
        ...eventToEdit,
        registrationOpenDate: new Date(eventToEdit.registrationOpenDate),
        registrationEndDate: new Date(eventToEdit.registrationEndDate),
        eventStartDate: new Date(eventToEdit.eventStartDate),
        eventEndDate: new Date(eventToEdit.eventEndDate),
      }
    }
  }
})

const onSubmit = () => {
  if (isEditMode.value) {
    console.log('Updating Event:', props.id, eventForm.value)
    eventStore.updateEvent(props.id!, eventForm.value)
    if (eventStore.error != '' || eventStore.error != null) {
      console.log('No error')
    } else {
      modalOpen.value = true
    }
  } else {
    console.log('Creating Event:', eventForm.value)
    eventStore.createEvent(eventForm.value)
    if (eventStore.error != '' || eventStore.error != null) {
      console.log('No error')
    } else {
      modalOpen.value = true
    }
  }
}

// ===================== Image Upload (Drag & Drop + Browse) =====================
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)

const openFileDialog = () => {
  // Safely trigger the file input click only when the element is present
  fileInput.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file && file.type.startsWith('image/')) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

const removeImage = () => {
  selectedFile.value = null
  previewUrl.value = null
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div>
    <div class="flex justify-between p-5">
      <div class="container flex-1">
        <!-- <div>SpaceLeft</div> -->
      </div>
      <div class="container flex-8">
        <!-- Event Name, Description, Location -->
        <div>
          <div>
            <div class="text-3xl font-bold">
              {{ isEditMode ? 'Edit Event' : 'Create New Event' }}
            </div>
          </div>
          <div class="py-3"></div>
          <div class="flex flex-row">
            <div class="container">
              <div>
                <TextField
                  label="Event Name"
                  placeholder="Enter event name"
                  v-model="eventForm.name"
                />
              </div>
              <div class="py-2"></div>
              <div><TextArea label="Event Description" v-model="eventForm.description" /></div>
              <div class="py-2"></div>
              <div><TextField label="Event Location" placeholder="Enter event location" /></div>
              <!-- todo : location -->
            </div>
            <div class="container"></div>
          </div>
        </div>
        <div class="py-3"></div>
        <!-- Sub-sessions Section -->
        <div>
          <div>
            <div class="text-xl font-bold">Sub-sessions</div>
          </div>
          <div class="py-3"></div>
          <div class="container">
            <img class="w-full h-64" src="@/assets/images/mock_sub_session1.png" alt="mock1" />
          </div>
          <div class="py-3"></div>
          <div class="container">
            <img class="w-full h-64" src="@/assets/images/mock_sub_session2.png" alt="mock1" />
          </div>
          <div class="py-2"></div>
          <div><BaseButton label="Add Sub-sessions" color="grey"></BaseButton></div>
          <!-- todo : subsessions -->
        </div>
        <div class="py-3"></div>
        <!-- Images Section -->
        <div>
          <div class="text-xl font-bold">Images</div>
        </div>
        <div class="py-3"></div>
        <div
          class="border-2 border-dashed border-slate-300 rounded-xl p-2 cursor-pointer relative group h-64"
          @dragover.prevent
          @drop.prevent="handleDrop"
          @click="openFileDialog()"
        >
          <!-- ถ้ายังไม่มีรูป -->
          <div
            v-if="!previewUrl"
            class="w-full h-full flex flex-col items-center justify-center text-slate-400"
          >
            <p>Drag & Drop image</p>
            <p class="text-sm">or click to upload</p>
          </div>

          <!-- ถ้ามีรูป -->
          <div v-else class="w-full h-full relative">
            <img :src="previewUrl" class="w-full h-full object-cover rounded-lg" />

            <!-- ปุ่ม X ลบรูป (แสดงเมื่อ hover) -->
            <button
              @click.stop="removeImage"
              class="absolute top-2 right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>

          <input
            type="file"
            accept="image/*"
            class="hidden"
            ref="fileInput"
            @change="handleFileSelect"
          />
        </div>

        <div class="py-3"></div>
        <!-- Date Section -->
        <div class="flex flex-row">
          <div class="container">
            <div>
              <div>
                <div class="text-xl font-bold">Dates</div>
              </div>
              <div class="py-3"></div>
              <div class="flex">
                <div class="pr-2 pl-2 pb-2 w-full">
                  <TextField
                    label="Registration Start Date"
                    type="datetime-local"
                    placeholder="Select Startdate"
                    v-model="regOpenInput"
                  ></TextField>
                </div>
                <div class="pr-2 pl-2 pb-2 w-full">
                  <TextField
                    label="Registration End Date"
                    type="datetime-local"
                    placeholder="Select End Date"
                    v-model="regEndInput"
                  ></TextField>
                </div>
              </div>
              <div class="flex">
                <div class="p-2 w-full">
                  <TextField
                    label="Event Start Date"
                    type="datetime-local"
                    placeholder="Select Startdate"
                    v-model="eventStartInput"
                  ></TextField>
                </div>
                <div class="p-2 w-full">
                  <TextField
                    label="Event End Date"
                    type="datetime-local"
                    placeholder="Select End Date"
                    v-model="eventEndInput"
                  ></TextField>
                </div>
              </div>
            </div>
            <div class="py-3"></div>
            <!-- Staff Section -->
            <div>
              <div>
                <div class="text-xl font-bold">Staff Requirements</div>
              </div>
              <div class="py-3"></div>
              <div>
                <TextField
                  label="Staff Required"
                  placeholder="Enter number of staff required"
                ></TextField>
              </div>
              <div class="py-2"></div>
              <div>
                <TextField
                  label="Responsible Person"
                  placeholder="Enter responsible person's name"
                ></TextField>
              </div>
            </div>
            <div class="py-3"></div>
            <!-- Additional Options -->
            <div>
              <div>
                <div class="text-xl font-bold">Additional Options</div>
              </div>
              <div class="py-3"></div>
              <div class="flex flex-row">
                <input
                  type="checkbox"
                  class="text-blue-500 rounded-xl border-gray-300 focus:ring-blue-400"
                />
                <div class="pl-2">On-site Registration Available</div>
              </div>
              <div class="py-2"></div>
              <div class="flex flex-row">
                <input
                  type="checkbox"
                  class="text-blue-500 rounded-xl border-gray-300 focus:ring-blue-400"
                />
                <div class="pl-2">Wi-Fi Needed</div>
              </div>
              <div class="py-3"></div>
              <div>
                <!-- <TextField label="Target Audience" placeholder="Enter target audience" /> -->
                <TagInput
                  label="Target Audience"
                  placeholder="ค้นหา Tag..."
                  :choices="ALL_EVENT_TARGET_AUDIENCE"
                  v-model="eventForm.targetAudience"
                />
              </div>
              <div class="py-2"></div>
              <div><TextField label="Activity Hours" placeholder="Enter activity hours" /></div>
              <!-- todo : Activity Hours -->
            </div>
            <div class="py-3"></div>
            <!-- FAQ-->
            <!-- <div>
              <div>
                <div class="text-xl font-bold">FAQ</div>
              </div>
              <div class="py-3"></div>
              <TextArea label="FAQ"></TextArea>
            </div> -->
            <!-- Invitation Message -->
            <div>
              <div>
                <div class="text-xl font-bold">Invitation Message</div>
              </div>
              <div class="py-3"></div>
              <TextArea label="Invitation Message"></TextArea>
            </div>
            <div class="py-3"></div>
            <!-- Website -->
            <div>
              <div class="text-xl font-bold">Website</div>
            </div>
            <div class="py-3"></div>
            <div>
              <TextField label="Website URL" placeholder="Enter website URL"></TextField>
            </div>
            <div class="py-3"></div>
            <!-- Certicate Details -->
            <div>
              <div class="text-xl font-bold">Certicate Details</div>
            </div>
            <div class="py-3"></div>
            <div>
              <TextField
                label="Certificate Template"
                placeholder="Select certificate template"
              ></TextField>
            </div>
            <div class="py-2"></div>
            <div>
              <TextField
                label="Certificate Issuer"
                placeholder="Enter certificate issuer"
              ></TextField>
            </div>
          </div>
          <div class="container"></div>
        </div>
        <div class="py-3"></div>
        <!-- Create Button -->
        <div class="container flex justify-end">
          <BaseButton label="Cancel" color="red" @click="returnToDashboard"></BaseButton>
          <div class="w-4"></div>
          <BaseButton
            :label="isEditMode ? 'Edit Event' : 'Create New Event'"
            color="blue"
            @click="onSubmit"
          ></BaseButton>
          <Modal v-model="modalOpen">
            <div class="flex flex-row justify-center">
              <img
                src="../../../assets/icons/success_icon.svg"
                alt="Suscess Icon"
                class="w-24 h-24 my-4"
              />
            </div>
            <div class="flex flex-row justify-center">
              <h2 class="text-xl font-bold my-4">Create Event Suscessfull!!</h2>
            </div>

            <div class="flex justify-center my-4">
              <BaseButton @click="returnToDashboard" color="blue" label="Close" />
            </div>
          </Modal>
        </div>
      </div>
      <div class="container flex-1"></div>
    </div>
  </div>
</template>

<style scoped></style>
