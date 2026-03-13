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

const profileSchema = toTypedSchema(
  zod.object({
    firstName: zod
      .string()
      .min(1, 'กรุณากรอกชื่อ')
      .regex(/^[a-zA-Zก-๙\s]+$/, 'ชื่อห้ามมีอักขระพิเศษ'),
    lastName: zod
      .string()
      .min(1, 'กรุณากรอกนามสกุล')
      .regex(/^[a-zA-Zก-๙\s]+$/, 'ชื่อห้ามมีอักขระพิเศษ'),
    email: zod.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
    phoneNumber: zod
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || /^[0-9]+$/.test(val), {
        message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น',
      })
      .refine((val) => !val || (val.length >= 9 && val.length <= 15), {
        message: 'เบอร์โทรศัพท์ต้องมีความยาวระหว่าง 9-15 หลัก',
      }),
    province: zod.string().nullable().optional(),
    roleInSchool: zod
      .enum(['STUDENT', 'TEACHER', 'STAFF', ''])
      .nullable()
      .optional()
      .transform((val) => (val === '' ? null : val)),
    school: zod.string().nullable().optional(),
  }),
)

const { handleSubmit, errors, setValues, meta } = useForm({
  validationSchema: profileSchema,
})
const { value: firstName } = useField<string>('firstName')
const { value: lastName } = useField<string>('lastName')
const { value: email } = useField<string>('email')
const { value: phoneNumber } = useField<string>('phoneNumber')
const { value: province } = useField<string>('province')
const { value: roleInSchool } = useField<string>('roleInSchool')
const { value: school } = useField<string>('school')

const isFormChanged = computed(() => {
  if (!userStore.profile) return false

  const p = userStore.profile

  // แปลงค่าทุกอย่างให้เป็น string ว่าง ('') ก่อนเปรียบเทียบ
  const getVal = (val: any) => (val === null || val === undefined ? '' : String(val))

  return (
    getVal(firstName.value) !== getVal(p.firstName) ||
    getVal(lastName.value) !== getVal(p.lastName) ||
    getVal(phoneNumber.value) !== getVal(p.phoneNumber) ||
    getVal(province.value) !== getVal(p.province) ||
    getVal(roleInSchool.value) !== getVal(p.roleInSchool) ||
    getVal(school.value) !== getVal(p.school)
  )
})

const getValidRole = (role: any) => {
  const allowedRoles = ['STUDENT', 'TEACHER', 'STAFF', '']
  return allowedRoles.includes(role) ? role : '' // ถ้าไม่ใช่ให้ตีเป็นค่าว่าง
}

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchMyProfile()
  }
  if (userStore.profile) {
    setValues({
      firstName: userStore.profile.firstName || '',
      lastName: userStore.profile.lastName || '',
      email: userStore.profile.email || '',
      phoneNumber: userStore.profile.phoneNumber || '',
      province: userStore.profile.province || '',
      roleInSchool: getValidRole(userStore.profile.roleInSchool),
      school: userStore.profile.school || '',
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
        roleInSchool: getValidRole(newProfile.roleInSchool),
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

const onSubmit = handleSubmit(async (values) => {
  const updatePayload = {
    firstName: values.firstName,
    lastName: values.lastName,
    phoneNumber: values.phoneNumber || null,
    province: values.province || null,
    roleInSchool: values.roleInSchool || null,
    school: values.school || null,
  }

  const success = await userStore.updateProfileInfo(updatePayload as UpdateUserDto)
  if (success) {
    toast.success('บันทึกข้อมูลสำเร็จ')
    router.push('/profile/me')
  } else {
    toast.error('บันทึกข้อมูลล้มเหลว: ' + (userStore.error || ''))
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 p-4 sm:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="rounded-lg border border-gray-200 bg-white p-6 sm:px-9">
        <div class="text-2xl font-semibold text-gray-800 mb-6">Edit Profile</div>
        <div class="flex flex-col items-center gap-4 mb-8">
          <Avatar class="h-32 w-32 border">
            <AvatarImage src="" alt="User Avatar" />
            <AvatarFallback>{{ userInitials }}</AvatarFallback>
          </Avatar>
        </div>
        <div class="mt-3">
          <form @submit="onSubmit" class="rounded-lg bg-white space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>First Name</Label>
                <Input
                  v-model="firstName"
                  placeholder="Enter First Name"
                  :class="{ 'border-red-500': errors.firstName }"
                />
                <p v-if="errors.firstName" class="text-xs text-red-500 h-4">
                  {{ errors.firstName }}
                </p>
              </div>
              <div class="space-y-1">
                <Label>Last Name</Label>
                <Input
                  v-model="lastName"
                  placeholder="Enter Last Name"
                  :class="{ 'border-red-500': errors.lastName }"
                />
                <p v-if="errors.lastName" class="text-xs text-red-500 h-4">
                  {{ errors.lastName }}
                </p>
              </div>
            </div>

            <div class="space-y-1">
              <Label>Email</Label>
              <Input v-model="email" disabled />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>Phone</Label>
                <Input
                  placeholder="Enter Phone Number"
                  v-model="phoneNumber"
                  type="tel"
                  maxlength="15"
                  :class="{ 'border-red-500': errors.phoneNumber }"
                />
                <p v-if="errors.phoneNumber" class="text-xs text-red-500 h-4">
                  {{ errors.phoneNumber }}
                </p>
              </div>
              <div class="space-y-1">
                <Label>Province</Label>
                <Input v-model="province" placeholder="Enter Province" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <Label>Role in School</Label>
                <select
                  placeholder="Select Role..."
                  v-model="roleInSchool"
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select Role...</option>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STAFF">Staff</option>
                </select>
                <p v-if="errors.roleInSchool" class="text-xs text-red-500 h-4">
                  {{ errors.roleInSchool }}
                </p>
              </div>
              <div class="space-y-1">
                <Label>School/University</Label>
                <Input v-model="school" placeholder="Enter School/University" />
              </div>
            </div>

            <div class="flex justify-end pt-4 gap-3">
              <Button type="button" variant="outline" @click="router.push('/profile/me')"
                >Cancel</Button
              >
              <Button
                type="submit"
                :disabled="userStore.isLoading || !isFormChanged || !meta.valid"
              >
                {{ userStore.isLoading ? 'Saving...' : 'Save' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
