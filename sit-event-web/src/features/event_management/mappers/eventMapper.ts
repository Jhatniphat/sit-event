// src/features/event_management/mappers/eventMapper.ts
import type { EventItem } from '@/features/event_management/components/EventCard.vue';
import type { Event, TargetAudience } from '@/features/event_management/services/EventServices';
import type { StaffApplication } from '@/features/registration/store/RegistrationStore';
import type { EventRegistration } from '@/features/registration/services/RegistrationService';

export const mapEventToEventItem = (
    backendEvent: Event,
    currentUserRole: string = 'GUEST',
    myRegistrations: EventRegistration[] = [],
    myStaffStatus: StaffApplication[] = []
): EventItem => {

    // Logic 1: สิทธิ์ Staff
    const isInternalStudent = currentUserRole === 'INTERNAL_STUDENT';
    const canRegisterAtStaff = isInternalStudent;

    // Logic 2: สิทธิ์ Participant
    const targetAudiences = backendEvent.targetAudience || [];
    const canRegisterAtParticipant =
        targetAudiences.includes(currentUserRole as TargetAudience) ||
        targetAudiences.includes('PUBLIC');

    // Logic 3: ตรวจสอบ hasRegister
    let hasRegister = '';

    // เช็คว่าลงทะเบียนเป็น Participant หรือไม่
    const isRegisteredAsParticipant = myRegistrations.some(reg => reg.eventId === backendEvent.id);
    if (isRegisteredAsParticipant) {
        hasRegister = 'PARTICIPANT';
    }

    // เช็คว่าลงทะเบียนเป็น Staff หรือไม่ (ถ้ายังไม่ได้เป็น Participant หรือจะให้ Staff overwrite ก็ตาม business logic)
    // สมมติว่าถ้าเป็น Staff ให้ขึ้น STAFF (หรือถ้าเป็นทั้งคู่ให้เลือกอย่างใดอย่างหนึ่ง)
    if (!hasRegister) {
        // เช็คใน myStaffStatus ว่ามี eventId นี้และ status ไม่ใช่ REFUSED หรือ WITHDRAWN
        const staffApp = myStaffStatus.find(s => s.eventId === backendEvent.id);
        if (staffApp && staffApp.status !== 'REFUSED' && staffApp.status !== 'WITHDRAWN') {
             hasRegister = 'STAFF';
        }
    }
    
    // Logic 4: Thumbnail
    let thumbnail = backendEvent.thumbnail; 
    if (backendEvent.thumbnail === null || backendEvent.thumbnail === undefined || backendEvent.thumbnail === '') {
        const firstWord = backendEvent.name.trim().split(' ')[0];
        thumbnail = `https://placehold.co/600x400?text=${firstWord}`;
    }

    return {
        id: backendEvent.id,
        name: backendEvent.name,
        description: backendEvent.description ?? '',
        thumbnail: thumbnail,
        eventStartDate: new Date(backendEvent.eventStartDate),
        eventEndDate: new Date(backendEvent.eventEndDate),
        registrationEndDate: new Date(backendEvent.registrationEndDate),
        canRegisterAtStaff,
        canRegisterAtParticipant,
        hasRegister // return ค่านี้กลับไป
    };
};