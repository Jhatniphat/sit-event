<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { suggestionService, type Suggestion } from '../services/suggestion.service';
import { useEventStore } from '@/features/event_management/store/EventStore';
import { Button } from '@/components/ui/button';

const suggestions = ref<Suggestion[]>([]);
const isModalOpen = ref(false);
const isEditing = ref(false);
const selectedId = ref<string | null>(null);

const eventStore = useEventStore();

const form = ref({
  title: '',
  description: '',
  link: '',
  eventId: '',
  backgroundType: 'PARTICLE' as 'PARTICLE' | 'IMAGE',
  announcementType: 'OTHERS' as 'PRE_EVENT' | 'REGISTRATION' | 'IN_EVENT' | 'OTHERS',
  startDate: '',
  endDate: '',
  contentDate: '',
});

const fileBackground = ref<File | null>(null);
const fileIcons = ref<File[]>([]);

const fetchSuggestions = async () => {
  try {
    suggestions.value = await suggestionService.getAllSuggestions();
  } catch (error) {
    console.error('Failed to load suggestions', error);
  }
};

onMounted(() => {
  fetchSuggestions();
  eventStore.fetchAllEvents(1, 100);
});

const openModal = () => {
  isEditing.value = false;
  selectedId.value = null;
  form.value = {
    title: '',
    description: '',
    link: '',
    eventId: '',
    backgroundType: 'PARTICLE',
    announcementType: 'OTHERS',
    startDate: '',
    endDate: '',
    contentDate: '',
  };
  fileBackground.value = null;
  fileIcons.value = [];
  isModalOpen.value = true;
};

const openEditModal = (suggestion: Suggestion) => {
  isEditing.value = true;
  selectedId.value = suggestion.id;
  form.value = {
    title: suggestion.title,
    description: suggestion.description,
    link: suggestion.link || '',
    eventId: suggestion.eventId || '',
    backgroundType: suggestion.backgroundType,
    announcementType: suggestion.announcementType,
    startDate: suggestion.startDate ? new Date(suggestion.startDate).toISOString().slice(0, 16) : '',
    endDate: suggestion.endDate ? new Date(suggestion.endDate).toISOString().slice(0, 16) : '',
    contentDate: suggestion.contentDate ? new Date(suggestion.contentDate).toISOString().slice(0, 16) : '',
  };
  fileBackground.value = null;
  fileIcons.value = [];
  isModalOpen.value = true;
};

const handleBgFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileBackground.value = target.files[0] || null;
  }
};

const handleIconsFile = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fileIcons.value = Array.from(target.files);
  }
};

const submitForm = async () => {
  const formData = new FormData();
  formData.append('title', form.value.title);
  formData.append('description', form.value.description);
  
  if (form.value.announcementType !== 'OTHERS') {
    if (form.value.eventId) formData.append('eventId', form.value.eventId);
    // Pre Event requires a start date to know when to start showing it
    if (form.value.announcementType === 'PRE_EVENT') {
      if (form.value.startDate) formData.append('startDate', new Date(form.value.startDate).toISOString());
    }
  } else {
    if (form.value.link) formData.append('link', form.value.link);
    // Send dates only for OTHERS
    if (form.value.startDate) formData.append('startDate', new Date(form.value.startDate).toISOString());
    if (form.value.endDate) formData.append('endDate', new Date(form.value.endDate).toISOString());
    if (form.value.contentDate) {
      formData.append('contentDate', new Date(form.value.contentDate).toISOString());
    }
  }

  formData.append('backgroundType', form.value.backgroundType);
  formData.append('announcementType', form.value.announcementType);

  if (fileBackground.value) {
    formData.append('backgroundImage', fileBackground.value);
  }
  
  fileIcons.value.forEach(icon => {
    formData.append('icons', icon);
  });

  try {
    if (isEditing.value && selectedId.value) {
      await suggestionService.updateSuggestion(selectedId.value, formData);
    } else {
      await suggestionService.createSuggestion(formData);
    }
    await fetchSuggestions();
    isModalOpen.value = false;
  } catch (error) {
    console.error('Submission failed', error);
    alert('Failed to submit suggestion');
  }
};

const deleteSuggestion = async (id: string) => {
  if (confirm('Are you sure you want to delete this suggestion?')) {
    try {
      await suggestionService.deleteSuggestion(id);
      await fetchSuggestions();
    } catch (error) {
      console.error('Delete failed', error);
      alert('Failed to delete suggestion');
    }
  }
};

const getImageUrl = (url?: string) => {
  if (!url) return '';
  // If it's already a full URL (signed URL from backend), return it as is
  if (url.startsWith('http')) return url;
  
  // Fallback for direct Minio filenames (if any remain)
  const minioUrl = import.meta.env.VITE_MINIO_ENDPOINT_FRONTEND || 'http://localhost:9000';
  return `${minioUrl}/sitevent/${url}`;
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Suggestion Management</h1>
      <Button @click="openModal">Create New Suggestion</Button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow overflow-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="item in suggestions" :key="item.id" class="hover:bg-gray-50">
            <td class="px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ item.title }}</div>
              <div class="text-sm text-gray-500 truncate max-w-xs">{{ item.description }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                {{ item.announcementType }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ new Date(item.startDate).toLocaleDateString() }} - {{ new Date(item.endDate).toLocaleDateString() }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button @click="openEditModal(item)" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
              <button @click="deleteSuggestion(item.id)" class="text-red-600 hover:text-red-900">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <div v-if="isModalOpen" class="fixed inset-0 bg-black/50 z-50 flex justify-center items-center overflow-auto py-10">
      <div class="bg-white rounded-xl shadow-xl p-8 w-full max-w-3xl m-auto">
        <h2 class="text-2xl font-bold mb-6">{{ isEditing ? 'Edit' : 'Create' }} Suggestion</h2>
        
        <form @submit.prevent="submitForm" class="grid grid-cols-2 gap-6">
          <div class="col-span-2 bg-gray-50 p-4 rounded-md border border-blue-200">
            <label class="block text-sm font-bold text-gray-800 mb-2">1. Announcement Type <span class="text-red-500">*</span></label>
            <select v-model="form.announcementType" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary">
              <option value="PRE_EVENT">Pre Event</option>
              <option value="REGISTRATION">Registration</option>
              <option value="IN_EVENT">In Event</option>
              <option value="OTHERS">Others</option>
            </select>
            <p class="text-sm mt-3 text-gray-600" v-if="form.announcementType === 'PRE_EVENT'">
              <strong>PRE_EVENT:</strong> ประชาสัมพันธ์ก่อนเริ่มรับสมัครกิจกรรม ระบบจะแสดงผลอัตโนมัติก่อนถึงวันเปิดรับสมัคร (ลิงก์ไปยังหน้า Event อัตโนมัติ)
            </p>
            <p class="text-sm mt-3 text-gray-600" v-if="form.announcementType === 'REGISTRATION'">
              <strong>REGISTRATION:</strong> ประชาสัมพันธ์ช่วงกำลังเปิดรับสมัคร ระบบจะแสดงผลอัตโนมัติเฉพาะช่วงเวลาที่กิจกรรมเปิดรับสมัครเท่านั้น (ลิงก์ไปยังหน้า Event อัตโนมัติ)
            </p>
            <p class="text-sm mt-3 text-gray-600" v-if="form.announcementType === 'IN_EVENT'">
              <strong>IN_EVENT:</strong> ประชาสัมพันธ์กิจกรรมที่กำลังจัดขึ้น ระบบจะแสดงผลอัตโนมัติเฉพาะช่วงวันที่กิจกรรมจัดขึ้น ตามที่ตั้งค่าไว้ใน Event (ลิงก์ไปยังหน้า Event อัตโนมัติ)
            </p>
            <p class="text-sm mt-3 text-gray-600" v-if="form.announcementType === 'OTHERS'">
              <strong>OTHERS:</strong> ประกาศทั่วไปที่ไม่ได้ผูกกับเงื่อนไขของกิจกรรมเลย (เช่น ประกาศหยุดพัก, ประชาสัมพันธ์อื่นๆ) *กรณีนี้จะต้องระบุวันที่แสดงผลเองทั้งหมด*
            </p>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Title <span class="text-red-500">*</span></label>
            <input v-model="form.title" required type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Description <span class="text-red-500">*</span></label>
            <textarea v-model="form.description" required rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-primary focus:ring-primary"></textarea>
          </div>

          <div v-if="form.announcementType === 'OTHERS'" class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Custom Link (Optional)</label>
            <input v-model="form.link" type="text" placeholder="https://..." class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary" />
          </div>

          <div v-if="form.announcementType !== 'OTHERS'" class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Select Event <span class="text-red-500">*</span></label>
            <select v-model="form.eventId" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary">
              <option value="" disabled>-- กรุณาเลือกกิจกรรมที่ต้องการเชื่อมต่อ --</option>
              <option v-for="evt in eventStore.events" :key="evt.id" :value="evt.id">{{ evt.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Background Type</label>
            <select v-model="form.backgroundType" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary">
              <option value="PARTICLE">Particle (Default)</option>
              <option value="IMAGE">Image</option>
            </select>
          </div>



          <div class="col-span-2" v-if="form.backgroundType === 'IMAGE'">
            <label class="block text-sm font-medium text-gray-700">Upload Background Image</label>
            <input type="file" accept="image/*" @change="handleBgFile" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700">Upload Icons (Multiple allowed)</label>
            <input type="file" accept="image/*" multiple @change="handleIconsFile" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>

          <div v-if="form.announcementType === 'OTHERS' || form.announcementType === 'PRE_EVENT'">
            <label class="block text-sm font-medium text-gray-700">Start Date <span class="text-red-500">*</span></label>
            <input v-model="form.startDate" required type="datetime-local" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary" />
          </div>

          <div v-if="form.announcementType === 'OTHERS'">
            <label class="block text-sm font-medium text-gray-700">End Date <span class="text-red-500">*</span></label>
            <input v-model="form.endDate" required type="datetime-local" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary" />
          </div>

          <div v-if="form.announcementType === 'OTHERS'">
            <label class="block text-sm font-medium text-gray-700">Content Date (Optional)</label>
            <input v-model="form.contentDate" type="datetime-local" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-primary focus:border-primary" />
          </div>
          
          <div class="col-span-2 flex justify-end gap-4 mt-4">
            <Button type="button" variant="outline" @click="isModalOpen = false">Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
