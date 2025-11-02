import { computed, isRef, type Ref } from 'vue'

/**
 * Creates a v-model adapter for <input type="datetime-local">.
 * @param state - The reactive state object (can be a ref() or reactive()).
 * @param key - The key in the state object that holds the Date.
 */
export function useDateTimeInputAdapter<
  T extends object,
  K extends keyof T
>(
  state: T | Ref<T>,
  key: K
) {
  const stateObject = isRef(state) ? state.value : state;

  // Runtime check (good practice)
  if (!(stateObject[key] instanceof Date)) {
    console.warn(`[useDateTimeInputAdapter] Property "${String(key)}" is not an instance of Date.`)
  }

  return computed<string>({
    
    // GET: Date -> string (for input)
    get() {
      const dateValue = stateObject[key] as unknown as Date
      if (!dateValue) return ''
      
      const d = new Date(dateValue)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    },

    // SET: string -> Date (for state)
    set(value: string) {
      // value is the 'YYYY-MM-DDTHH:mm' string or ''
      
      // Based on your DTO, the field *must* be a Date.
      // So if the input is empty, we default to 'now'.
      const newDate = value ? new Date(value) : new Date();
      stateObject[key] = newDate as T[K];
    }
  })
}


// <script setup lang="ts">
// import { reactive } from 'vue'
// import { useDateTimeInputAdapter } from '@/shared/useDateTimeInput'
// interface EventFormState {
//   name: string
//   registrationOpenDate: Date | null
//   registrationEndDate: Date | null
//   eventStartDate: Date | null
//   eventEndDate: Date | null
// }

// const eventForm = reactive<EventFormState>({
//   name: 'My New Event',
//   registrationOpenDate: new Date(),
//   registrationEndDate: null,
//   eventStartDate: null,
//   eventEndDate: null
// })

// // 3. ตัวเชื่อม v-model สำหรับ input type="datetime-local"
// const regOpenInput = useDateTimeInputAdapter(eventForm, 'registrationOpenDate')
// const regEndInput = useDateTimeInputAdapter(eventForm, 'registrationEndDate')
// const eventStartInput = useDateTimeInputAdapter(eventForm, 'eventStartDate')
// const eventEndInput = useDateTimeInputAdapter(eventForm, 'eventEndDate')


// // 4. ฟังก์ชัน Submit (เหมือนเดิม)
// const onSubmit = () => {
//   // เวลาส่งข้อมูลไป NestJS
//   // เรายังคงใช้ .toISOString() กับค่า Date object ใน eventForm
//   const payload = {
//     name: eventForm.name,
    
//     // แปลงเป็น UTC String (...Z) ตอนส่ง
//     registrationOpenDate: eventForm.registrationOpenDate?.toISOString(),
//     registrationEndDate: eventForm.registrationEndDate?.toISOString(),
//     eventStartDate: eventForm.eventStartDate?.toISOString(),
//     eventEndDate: eventForm.eventEndDate?.toISOString()
//   }

//   console.log('Sending this payload to backend:', payload)
//   // ผลลัพธ์ (ตัวอย่าง):
//   // {
//   //   name: "My New Event",
//   //   registrationOpenDate: "2025-11-02T08:42:00.000Z", (สมมติเวลาไทยคือ 15:42)
//   //   registrationEndDate: "..." 
//   // }
  
//   // await axios.post('/api/events', payload)
// }
// </script>

// <template>
//   <form @submit.prevent="onSubmit">
    
//     <div>
//       <label for="name">Event Name:</label>
//       <input type="text" v-model="eventForm.name" />
//     </div>

//     <div>
//       <label for="reg-open">Registration Open:</label>
//       <input type="datetime-local" v-model="regOpenInput" />
//     </div>

//     <div>
//       <label for="reg-end">Registration End:</label>
//       <input type="datetime-local" v-model="regEndInput" />
//     </div>

//     <div>
//       <label for="event-start">Event Start:</label>
//       <input type="datetime-local" v-model="eventStartInput" />
//     </div>

//     <div>
//       <label for="event-end">Event End:</label>
//       <input type="datetime-local" v-model="eventEndInput" />
//     </div>
    
//     <button type="submit">Create Event</button>
//   </form>
// </template>