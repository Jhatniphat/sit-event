<script setup lang="ts">
import { ref } from 'vue'
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

type QuestionType = 'text' | 'rating' | 'checkbox' | 'radio'

interface Question {
  id: number
  title: string
  type: QuestionType
  options: string[]
  required: boolean
}

const questions = ref<Question[]>([
  {
    id: Date.now(),
    title: '',
    type: 'radio',
    options: ['Option 1'],
    required: false,
  },
])

const addQuestion = () => {
  questions.value.push({
    id: Date.now(),
    title: '',
    type: 'radio',
    options: ['Option 1'],
    required: false,
  })
}

const removeQuestion = (index: number) => {
  if (questions.value.length > 1) {
    questions.value.splice(index, 1)
  }
}

const addOption = (question: Question) => {
  question.options.push(`Option ${question.options.length + 1}`)
}
</script>

<template>
  <div class="min-h-screen bg-slate-50/50 p-6 flex justify-center items-start gap-4">
    <div class="w-full max-w-3xl flex flex-col gap-4">
      <Card class="shadow-sm overflow-hidden">
        <CardContent class="p-6">
          <Input
            variant="ghost"
            placeholder="Form Title"
            class="!text-3xl font-normal py-4 border-none border-b-2 border-transparent focus-visible:border-purple-700 focus-visible:ring-0 rounded-none px-0 mb-4 shadow-none"
          />
          <Input
            variant="ghost"
            placeholder="Description (Not required)"
            class="text-sm border-none border-b focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-gray-300 rounded-none px-0 h-auto shadow-none"
          />
        </CardContent>
      </Card>

      <div v-for="(q, index) in questions" :key="q.id" class="group relative">
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
                  <SelectValue placeholder="ประเภทคำถาม" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Short Answer</SelectItem>
                  <SelectItem value="radio">Multiple Choice</SelectItem>
                  <SelectItem value="checkbox">Checkboxes</SelectItem>
                  <SelectItem value="rating">Rating Scale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="min-h-[60px]">
              <div
                v-if="q.type === 'text'"
                class="w-3/5 border-b border-dashed border-slate-300 py-2 text-slate-400 text-sm"
              >
                Short Answer
              </div>

              <div v-if="q.type === 'radio' || q.type === 'checkbox'" class="flex flex-col gap-3">
                <div
                  v-for="(opt, optIdx) in q.options"
                  :key="optIdx"
                  class="flex items-center gap-3 group/option"
                >
                  <div
                    v-if="q.type === 'radio'"
                    class="w-5 h-5 border-2 border-slate-300 rounded-full"
                  />
                  <div v-else class="w-5 h-5 border-2 border-slate-300 rounded" />
                  <Input
                    v-model="q.options[optIdx]"
                    class="border-none focus-visible:ring-0 focus-visible:border-b rounded-none h-8 px-0"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="w-fit text-slate-500 font-normal"
                  @click="addOption(q)"
                >
                  Add Option
                </Button>
              </div>

              <div v-if="q.type === 'rating'" class="flex items-center gap-4 py-4">
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
                @click="removeQuestion(index)"
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
    </div>

    <Card class="sticky top-6 p-1 flex flex-col gap-1 shadow-md border-slate-200 h-fit">
      <Button
        variant="ghost"
        size="icon"
        @click="addQuestion"
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
