<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useUserStore } from '../store/UserStore'
import { useForm, useField } from 'vee-validate'
import * as zod from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router'
import type { UpdateUserDto } from '../services/UserService'

const userStore = useUserStore()
const router = useRouter()

// 1. กำหนด Schema (กฎการ Validate)
const profileSchema = toTypedSchema(
  zod.object({
    firstName: zod.string().min(1, 'กรุณากรอกชื่อ'),
    lastName: zod.string().min(1, 'กรุณากรอกนามสกุล'),
    email: zod.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    phoneNumber: zod.string().nullable().optional(),
    province: zod.string().nullable().optional(),
    roleInSchool: zod.string().nullable().optional(),
    school: zod.string().nullable().optional(),
  }),
)

// 2. Setup Form
const { handleSubmit, errors, setValues } = useForm({
  validationSchema: profileSchema,
})
const { value: firstName } = useField<string>('firstName')
const { value: lastName } = useField<string>('lastName')
const { value: email } = useField<string>('email')
const { value: phoneNumber } = useField<string>('phoneNumber')
const { value: province } = useField<string>('province')
const { value: roleInSchool } = useField<string>('roleInSchool')
const { value: school } = useField<string>('school')

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchMyProfile()
  }
  if (userStore.profile) {
    setValues({
      firstName: userStore.profile.firstName,
      lastName: userStore.profile.lastName,
      email: userStore.profile.email,
      phoneNumber: userStore.profile.phoneNumber,
      province: userStore.profile.province,
      roleInSchool: userStore.profile.roleInSchool,
      school: userStore.profile.school,
    })
  }
})

watch(
  () => userStore.profile,
  (newProfile) => {
    if (newProfile) {
      setValues({
        firstName: newProfile.firstName,
        lastName: newProfile.lastName,
        email: newProfile.email,
        phoneNumber: newProfile.phoneNumber || '',
        province: newProfile.province || '',
        roleInSchool: newProfile.roleInSchool || '',
        school: newProfile.school || '',
      })
    }
  },
  { immediate: true },
)

const userInitials = computed(() => {
  if (!userStore.profile) return 'UE'
  return `${userStore.profile.firstName.charAt(0)}${userStore.profile.lastName.charAt(0)}`.toUpperCase()
})

// 3. Submit
const onSubmit = handleSubmit(async (values) => {
  console.log('Submitting form with values:', values) // Debug log
  // กรองเอาเฉพาะ field ที่เราต้องการ update เท่านั้น
  const updatePayload = {
    firstName: values.firstName,
    lastName: values.lastName,
    phoneNumber: values.phoneNumber,
    province: values.province,
    roleInSchool: values.roleInSchool,
    school: values.school,
  }

  // กรองค่า null/undefined ออก (ถ้ามี)
  const cleanedPayload = Object.fromEntries(
    Object.entries(updatePayload).filter(([_, v]) => v != null),
  )
  const success = await userStore.updateProfileInfo(cleanedPayload as UpdateUserDto)
  if (success) {
    toast.success('บันทึกข้อมูลสำเร็จ')
    router.push('/profile/me')
  } else {
    toast.error('บันทึกข้อมูลล้มเหลว: ' + (userStore.error || ''))
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="rounded-lg border border-gray-200 bg-white p-6 px-9">
        <div class="text-2xl font-semibold text-gray-800 mb-6">Edit Profile</div>
        <div class="flex flex-row items-center space-x-6">
          <Avatar class="h-32 w-32 border">
            <AvatarImage src="" alt="User Avatar" />
            <AvatarFallback>{{ userInitials }}</AvatarFallback>
          </Avatar>

          <div class="flex flex-col gap-1 items-start">
            <div class="text-lg font-bold">{{ firstName }} {{ lastName }}</div>
            <div class="text-sm text-gray-500">{{ email }}</div>
          </div>
        </div>
        <div class="mt-3">
          <form @submit="onSubmit" class="rounded-lg bg-white space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>ชื่อ</Label>
                <Input v-model="firstName" :class="{ 'border-red-500': errors.firstName }" />
                <p v-if="errors.firstName" class="text-xs text-red-500 h-4">
                  {{ errors.firstName }}
                </p>
              </div>
              <div class="space-y-1">
                <Label>นามสกุล</Label>
                <Input v-model="lastName" :class="{ 'border-red-500': errors.lastName }" />
                <p v-if="errors.lastName" class="text-xs text-red-500 h-4">
                  {{ errors.lastName }}
                </p>
              </div>
            </div>

            <div class="space-y-1">
              <Label>อีเมล</Label>
              <Input v-model="email" disabled />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>เบอร์โทรศัพท์</Label>
                <Input v-model="phoneNumber" />
              </div>
              <div class="space-y-1">
                <Label>จังหวัด</Label>
                <Input v-model="province" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>บทบาทในโรงเรียน</Label>
                <Input v-model="roleInSchool" />
              </div>
              <div class="space-y-1">
                <Label>โรงเรียน/มหาวิทยาลัย</Label>
                <Input v-model="school" />
              </div>
            </div>

            <div class="flex justify-end pt-4 gap-3">
              <Button type="button" variant="outline" @click="router.push('/profile/me')"
                >ย้อนกลับ</Button
              >
              <Button type="submit" :disabled="userStore.isLoading">
                {{ userStore.isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
