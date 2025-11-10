import { computed, isRef, type Ref } from 'vue'

/**
 * สร้าง Vue computed property (adapter) เพื่อใช้ `v-model` กับ `<input type="datetime-local">`
 * โดยเชื่อมต่อกับค่า `Date` object ที่อยู่ใน state (ref หรือ reactive)
 *
 * - `get`: แปลง `Date` object จาก state ให้เป็น string 'YYYY-MM-DDTHH:mm' (Local Time)
 * เพื่อให้ `<input type="datetime-local">` แสดงผลได้ถูกต้อง
 * - `set`: แปลง string 'YYYY-MM-DDTHH:mm' (Local Time) จาก input กลับเป็น `Date` object
 * แล้วอัปเดตค่าใน state
 *
 * @template T - Type ของ state object (เช่น CreateEventDto)
 * @template K - Key (ชื่อ property) ใน state object ที่มีค่าเป็น Date
 *
 * @param {T | Ref<T>} state - state object ที่เป็น `ref()` หรือ `reactive()`
 * @param {K} key - ชื่อ property (key) ใน state object ที่ต้องการเชื่อมต่อ (ต้องเป็นค่า Date)
 *
 * @returns {import('vue').ComputedRef<string>} - Computed ref (adapter) ที่สามารถใช้กับ `v-model` ของ input ได้โดยตรง
 */
export function useDateTimeInputAdapter<
  T extends object,
  K extends keyof T
>(
  state: T | Ref<T>,
  key: K
) {
  const stateObject = isRef(state) ? state.value : state;
  if (!(stateObject[key] instanceof Date)) {
    console.warn(`[useDateTimeInputAdapter] Property "${String(key)}" is not an instance of Date.`)
  }

  return computed<string>({
    get() {
      const dateValue = stateObject[key] as unknown as Date
      if (!dateValue) return ''
      
      const d = new Date(dateValue)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      return d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
    },

    set(value: string) {
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