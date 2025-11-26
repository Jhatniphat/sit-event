<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { Button } from '@/components/ui/button'

// 1. ปรับ Interface ให้รองรับ bgImage
export interface HeroSlide {
  id: number | string
  title: string
  description: string
  buttonText?: string
  logos?: string[]
  bgImage?: string // เพิ่มฟิลด์สำหรับรูปพื้นหลัง (URL)
  eventStartDate: string
}

const props = defineProps<{
  slides: HeroSlide[]
}>()

const api = ref<CarouselApi>()
const current = ref(0)
const count = ref(0)

function setApi(val: CarouselApi) {
  api.value = val
}

watch(api, (emblaApi: CarouselApi | undefined) => {
  if (!emblaApi) return
  count.value = emblaApi.scrollSnapList().length
  current.value = emblaApi.selectedScrollSnap()

  emblaApi.on('select', () => {
    current.value = emblaApi.selectedScrollSnap()
  })
})

function formatDate(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// 2. ฟังก์ชันคำนวณ Style พื้นหลัง
function getSlideStyle(slide: HeroSlide) {
  if (slide.bgImage) {
    return {
      backgroundImage: `url(${slide.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }

  return {
    background: 'linear-gradient(to top, #000046, #1CB5E0)'
  }
}
</script>

<template>
  <div class="relative w-full">
    <Carousel 
      class="w-full" 
      @init-api="setApi"
      :opts="{ loop: true }"
    >
      <CarouselContent>
        <CarouselItem v-for="slide in props.slides" :key="slide.id">
          <div 
            :style="getSlideStyle(slide)"
            class="relative flex h-[85vh] w-full flex-col items-center justify-center px-4 text-center text-white transition-all duration-300 md:h-[600px]"
          >
            <div v-if="slide.bgImage" class="absolute inset-0 bg-black/40"></div>

            <div class="z-10 flex max-w-4xl flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
              
              <div class="rounded-full bg-white/20 px-4 py-1 text-sm font-semibold backdrop-blur-sm md:text-base border border-white/10 shadow-sm">
                📅 {{ formatDate(slide.eventStartDate) }}
              </div>

              <h1 class="text-4xl font-bold tracking-tight md:text-6xl drop-shadow-lg">
                {{ slide.title }}
              </h1>

              <div class="h-1 w-24 rounded bg-white/70 shadow-sm"></div>

              <div v-if="slide.logos && slide.logos.length" class="flex items-center justify-center gap-8 py-4">
                <img 
                  v-for="(logo, index) in slide.logos" 
                  :key="index" 
                  :src="logo" 
                  alt="Partner Logo" 
                  class="h-12 w-auto object-contain md:h-16 opacity-90 hover:opacity-100 transition-opacity drop-shadow-md"
                />
              </div>

              <p class="text-lg font-medium text-white/95 md:text-xl max-w-2xl drop-shadow-md">
                {{ slide.description }}
              </p>

              <Button 
                v-if="slide.buttonText"
                variant="secondary" 
                size="lg" 
                class="mt-4 bg-white text-[#005AA7] hover:bg-gray-100 font-bold px-8 py-6 text-lg shadow-xl border-none"
              >
                {{ slide.buttonText }}
              </Button>
            </div>

          </div>
        </CarouselItem>
      </CarouselContent>
      
      <div class="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
        <button
          v-for="(slide, index) in count"
          :key="index"
          @click="api?.scrollTo(index)"
          :class="[
            'h-3 w-3 rounded-full transition-all duration-300 shadow-md border border-white/20',
            current === index ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'
          ]"
          aria-label="Go to slide"
        />
      </div>

    </Carousel>
  </div>
</template>