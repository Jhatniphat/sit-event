// src/utils/eventMapper.ts
import type { EventItem } from '@/features/event_management/components/EventCard.vue'; // path ตามที่คุณเก็บ interface
import type { Event, TargetAudience } from '@/features/event_management/services/EventServices';

// รับ input เป็น any ไปก่อนเพื่อให้ยืดหยุ่นกับข้อมูลจริงที่ Backend ส่งมา (ซึ่งมักเป็น JSON String)
// หรือถ้าคุณมั่นใจใน Interface Event สามารถใส่ type Event ได้ครับ
export const mapEventToEventItem = (
    backendEvent: Event,
    currentUserRole: string = 'GUEST' // รับ Role ของ user ปัจจุบัน (Default เป็น Guest)
): EventItem => {

    // Logic 1: canRegisterAtStaff
    // เงื่อนไข: ผู้ใช้ต้องเป็น INTERNAL_STUDENT เท่านั้น
    const isInternalStudent = currentUserRole === 'INTERNAL_STUDENT';
    const canRegisterAtStaff = isInternalStudent;

    // Logic 2: canRegisterAtParticipant
    // เงื่อนไข: User role ต้องตรงกับ targetAudience
    // (เพิ่มเงื่อนไข PUBLIC ให้ด้วยเผื่อกรณีเปิดกว้าง)
    const targetAudiences = backendEvent.targetAudience || [];
    const canRegisterAtParticipant =
        targetAudiences.includes(currentUserRole as TargetAudience) ||
        targetAudiences.includes('PUBLIC');

    return {
        id: backendEvent.id,
        name: backendEvent.name,
        description: backendEvent.description ?? '',
        thumbnail: backendEvent.thumbnail ?? '',
        eventStartDate: new Date(backendEvent.eventStartDate),
        eventEndDate: new Date(backendEvent.eventEndDate),
        registrationEndDate: new Date(backendEvent.registrationEndDate),

        // Map ค่า Boolean ที่คำนวณได้
        canRegisterAtStaff,
        canRegisterAtParticipant
    };
};