<script setup lang="ts">
import { Plus, Trash2, GripVertical, Image as ImageIcon, Type, PlaySquare } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useRoute, useRouter } from 'vue-router'
import { useFormStore } from '../store/FormStore'
import { onMounted, ref } from 'vue'

const router = useRouter()
const route = useRoute()
const formStore = useFormStore()
const eventId = route.params.id as string
const formId = route.params.formId as string
console.log('Creating/editing form for event ID:', eventId)
console.log('Editing form with ID:', formId)

const onCancel = () => {
  router.back()
}

const onSubmit = async () => {
  try {
    await formStore.saveFullForm(eventId)
    router.back()
  } catch (error) {
    console.error('Error submitting form:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 p-6 flex justify-center items-start gap-4">
    <div class="w-full max-w-3xl flex flex-col gap-4">
      <Card class="shadow-sm overflow-hidden">
        <CardContent class="p-6">
          <Input
            v-model="formStore.formTitle"
            variant="ghost"
            placeholder="Form Title"
            class="!text-3xl font-normal py-4 border-none border-b-2 border-transparent focus-visible:border-purple-700 focus-visible:ring-0 rounded-none px-0 mb-4 shadow-none"
          />
          <Input
            v-model="formStore.formDescription"
            variant="ghost"
            placeholder="Description (Not required)"
            class="text-sm border-none border-b focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-gray-300 rounded-none px-0 h-auto shadow-none"
          />
        </CardContent>
      </Card>

      <div v-for="(q, index) in formStore.questions" :key="q.id" class="group relative">
        <Card
          class="shadow-sm border-l-4 border-l-transparent focus-within:border-l-black transition-all"
        >
          <CardContent class="p-6">
            <div class="flex flex-col md:flex-row gap-4 mb-6">
              <div class="flex-1">
                <Input
                  v-model="q.title"
                  placeholder="Question Title"
                  class="bg-slate-50 border-none border-b-2 rounded-none focus-visible:ring-0 focus-visible:bg-slate-100 transition-all h-12"
                />
              </div>

              <Select v-model="q.type">
                <SelectTrigger class="w-full md:w-[200px] h-12">
                  <SelectValue placeholder="Question Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                  <SelectItem value="RADIO">Radio</SelectItem>
                  <SelectItem value="CHECKBOX">Checkboxes</SelectItem>
                  <SelectItem value="RATING_SCALE">Rating Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="min-h-[60px]">
              <div
                v-if="q.type === 'SHORT_ANSWER'"
                class="w-3/5 border-b border-dashed border-slate-300 py-2 text-slate-400 text-sm"
              >
                Short Answer
              </div>

              <div v-if="q.type === 'RADIO' || q.type === 'CHECKBOX'" class="flex flex-col gap-3">
                <div
                  v-for="(opt, optIdx) in q.options"
                  :key="optIdx"
                  class="flex items-center gap-3 group/option"
                >
                  <div
                    v-if="q.type === 'RADIO'"
                    class="w-5 h-5 border-2 border-slate-300 rounded-full"
                  />
                  <div v-else class="w-5 h-5 border-2 border-slate-300 rounded" />
                  <Input
                    v-model="q.options[optIdx]"
                    class="border-none focus-visible:ring-0 focus-visible:border-b rounded-none h-8 px-0"
                  />
                  <div v-if="q.options.length > 1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="formStore.removeOption(index, optIdx)"
                      class="text-slate-500 hover:text-red-600"
                    >
                      <Trash2 class="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="w-fit text-slate-500 font-normal"
                  @click="formStore.addOption(index)"
                >
                  Add Option
                </Button>
              </div>

              <div v-if="q.type === 'RATING_SCALE'" class="flex items-center gap-4 py-4">
                <span class="text-sm text-slate-500">1</span>
                <div class="flex gap-2">
                  <div
                    v-for="n in 5"
                    :key="n"
                    class="w-9 h-9 rounded-full border flex items-center justify-center text-sm text-slate-600"
                  >
                    {{ n }}
                  </div>
                </div>
                <span class="text-sm text-slate-500">5</span>
              </div>
            </div>

            <Separator class="my-6" />

            <div class="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                @click="formStore.removeQuestion(index)"
                class="text-slate-500 hover:text-red-600"
              >
                <Trash2 class="h-5 w-5" />
              </Button>

              <div class="h-6 w-px bg-slate-200 mx-2" />

              <div class="flex items-center space-x-2">
                <Label :for="'req-' + q.id" class="text-sm font-normal text-slate-600"
                  >Required</Label
                >
                <Switch :id="'req-' + q.id" v-model:checked="q.required" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <div class="flex flex-row justify-end gap-3 pt-4 text-gray-800">
          <Button type="button" variant="outline" @click="onCancel">Cancel</Button
          ><Button type="submit" @click="onSubmit">Save</Button>
        </div>
      </div>
    </div>

    <Card class="sticky top-6 p-1 flex flex-col gap-1 shadow-md border-slate-200 h-fit">
      <Button
        variant="ghost"
        size="icon"
        @click="formStore.addQuestion"
        class="rounded-full h-12 w-12"
        title="Add Question"
      >
        <Plus class="h-6 w-6 text-slate-600" />
      </Button>
    </Card>
  </div>
</template>

<style scoped>
/* ลบเส้นโฟกัสพื้นฐานของ Input ในบางกรณี */
:deep(.border-none:focus-visible) {
  outline: none;
  box-shadow: none;
}
</style>
