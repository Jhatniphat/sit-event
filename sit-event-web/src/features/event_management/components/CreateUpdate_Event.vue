<script setup lang="ts">
import TextField from '@/components/ui/commons/TextField.vue'
import TextArea from '@/components/ui/commons/TextArea.vue'
import BaseButton from '@/components/ui/button/BaseButton.vue'
import { ref } from 'vue'
import { useEventStore } from '@/features/event_management/store/EventStore';
import { useDateTimeInputAdapter } from '@/shared/useDateTimeInput';

import {
  type CreateEventDto,
} from '@/features/event_management/services/EventServices';

const EventManagementStore = useEventStore()
const eventForm = ref<CreateEventDto>({
  name: '',
  description: '',
  thumbnail: '',
  // location: '',
  registrationOpenDate: new Date(),
  registrationEndDate: new Date(),
  eventStartDate: new Date(),
  eventEndDate: new Date(),
  // staffRequired: 0,
  // responsiblePerson: '',
  targetAudience: [],
  // activityHours: '',
  // invitationMessage: '',
  // websiteUrl: '',
  // certificateTemplate: '',
  // certificateIssuer: '',
  tags: [],
})

const regOpenInput = useDateTimeInputAdapter(eventForm, 'registrationOpenDate')
const regEndInput = useDateTimeInputAdapter(eventForm, 'registrationEndDate')
const eventStartInput = useDateTimeInputAdapter(eventForm, 'eventStartDate')
const eventEndInput = useDateTimeInputAdapter(eventForm, 'eventEndDate')


const onSubmit = () => {
  console.log('Event Form Data:', eventForm.value);
  // Here you would typically call a service to submit the form data
  // For example:
  // EventManagementStore.createEvent(eventForm.value);
  EventManagementStore.createEvent(eventForm.value);
};
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
            <div class="text-3xl font-bold">Create New Event</div>
          </div>
          <div class="py-3"></div>
          <div class="flex flex-row">
            <div class="container">
              <div><TextField label="Event Name" placeholder="Enter event name" v-model="eventForm.name"/></div>
              <div class="py-2"></div>
              <div><TextArea label="Event Description" v-model="eventForm.description"/></div>
              <div class="py-2"></div>
              <div><TextField label="Event Location" placeholder="Enter event location"/></div> 
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
          <div><BaseButton label="Add Sub-sessions" :primary="false"></BaseButton></div>
          <!-- todo : subsessions -->
        </div>
        <div class="py-3"></div>
        <!-- Images Section -->
        <div>
          <div>
            <div class="text-xl font-bold">Images</div>
          </div>
          <div class="py-3"></div>
          <div
            class="container flex flex-col border border-dashed border-slate-300 rounded-lg h-48 justify-center items-center"
          >
            <div class="text-lg font-semibold">Upload Images</div>
            <div class="flex flex-row">
              <div>Drag and drop images here or</div>
              <div class="pl-1 underline-offset-1 text-blue-500">browse files</div>
            </div>
          </div>
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
                <TextField label="Target Audience" placeholder="Enter target audience" />
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
          <BaseButton label="Create Event" :primary="true" @click="onSubmit"></BaseButton>
        </div>
      </div>
      <div class="container flex-1">
        <!-- <div>SpaceRight</div> -->
      </div>
    </div>
  </div>
</template>

<style scoped></style>
