<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
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
  buttonLink?: string
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

import { ChevronDown } from 'lucide-vue-next'

const getBackgroundClass = (slide: HeroSlide) => {
  if (slide.bgImage) {
    return 'bg-black/40' // overlay if image exists
  }
  return 'bg-white' // default white background for particles
}

// 2. ฟังก์ชันคำนวณ Style พื้นหลัง (แก้ไขให้รองรับ particles white bg)
function getSlideStyle(slide: HeroSlide) {
  if (slide.bgImage) {
    return {
      backgroundImage: `url(${slide.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }

  return {
    backgroundColor: '#ffffff'
  }
}

// 3. Scroll Shrink Logic
const scrollY = ref(0)
const onScroll = () => {
  scrollY.value = window.scrollY
}

const scrollDown = () => {
  window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})

const sliderStyle = computed(() => {
  const maxScroll = window.innerHeight
  // Calculate scale between 1 and 0.9
  const progress = Math.min(scrollY.value / maxScroll, 1)
  const scale = 1 - (progress * 0.1)
  const borderRadius = progress * 32 // max 32px
  
  return {
    transform: `scale(${scale})`,
    borderRadius: `${borderRadius}px`,
    overflow: 'hidden',
    transformOrigin: 'top center',
    transition: scrollY.value === 0 ? 'transform 0.4s ease-out, border-radius 0.4s ease-out' : 'none'
  }
})

// 4. Typing Animation Logic
const typedTitle = ref('')
const typedDescription = ref('')
let typingTimeout: any = null

const typeText = (fullTitle: string, fullDesc: string) => {
  if (typingTimeout) clearTimeout(typingTimeout)
  typedTitle.value = ''
  typedDescription.value = ''
  
  let i = 0
  let j = 0
  
  const typeChar = () => {
    if (i < fullTitle.length) {
      typedTitle.value += fullTitle.charAt(i)
      i++
      typingTimeout = setTimeout(typeChar, 50) // typing speed
    } else if (j < fullDesc.length) {
      typedDescription.value += fullDesc.charAt(j)
      j++
      typingTimeout = setTimeout(typeChar, 30) // slightly faster for desc
    }
  }
  
  // start typing
  typeChar()
}

// Monitor slide changes to re-trigger typing
watch(current, () => {
  const currentSlide = props.slides[current.value]
  if (currentSlide) {
    typeText(currentSlide.title, currentSlide.description)
  }
})

// Trigger typing on initial load
onMounted(() => {
  if (props.slides.length > 0) {
    const currentSlide = props.slides[0]
    if (currentSlide) {
      typeText(currentSlide.title || '', currentSlide.description || '')
    }
  }
})

// 5. Particles Options (Black dots on white bg)
const particlesOptions = {
  background: { color: { value: "transparent" } },
  fpsLimit: 60,
  particles: {
    color: { value: "#000000" },
    links: {
      color: "#000000",
      distance: 150,
      enable: true,
      opacity: 0.2,
      width: 1,
    },
    move: {
      direction: "none",
      enable: true,
      outModes: { default: "bounce" },
      random: false,
      speed: 1,
      straight: false,
    },
    number: {
      density: { enable: true, area: 800 },
      value: 80,
    },
    opacity: { value: 0.3 },
    shape: { type: "circle" },
    size: { value: { min: 1, max: 3 } },
  },
  detectRetina: true,
}
</script>

<template>
  <div class="relative w-full overflow-hidden bg-black mb-8 pb-4" :style="sliderStyle">
    <Carousel 
      class="w-full" 
      @init-api="setApi"
      :opts="{ loop: true }"
    >
      <CarouselContent>
        <CarouselItem v-for="(slide, index) in props.slides" :key="slide.id">
          <div 
            :style="getSlideStyle(slide)"
            class="relative flex h-screen w-full flex-col items-center justify-center px-4 text-center transition-all duration-300"
            :class="slide.bgImage ? 'text-white' : 'text-gray-900'"
          >
            <!-- Particles component (only render if no bgImage or if desired) -->
            <vue-particles
              v-if="!slide.bgImage"
              id="tsparticles"
              :options="particlesOptions"
              class="absolute inset-0 z-0 pointer-events-none"
            />

            <div v-if="slide.bgImage" class="absolute inset-0 bg-black/40 z-0"></div>

            <div class="z-10 flex max-w-4xl flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
              
              <div :class="slide.bgImage ? 'bg-white/20 text-white border-white/10' : 'bg-black/5 text-gray-800 border-black/10'" 
                   class="rounded-full px-4 py-1 text-sm font-semibold backdrop-blur-sm md:text-base border shadow-sm">
                📅 {{ formatDate(slide.eventStartDate) }}
              </div>

              <h1 class="text-4xl font-bold tracking-tight md:text-6xl drop-shadow-sm min-h-[4rem] md:min-h-[8rem] flex items-center justify-center">
                {{ current === index ? typedTitle : slide.title }}
                <span v-if="current === index" class="animate-pulse">|</span>
              </h1>

              <div :class="slide.bgImage ? 'bg-white/70' : 'bg-primary/70'" class="h-1 w-24 rounded shadow-sm"></div>

              <div v-if="slide.logos && slide.logos.length" class="flex items-center justify-center gap-8 py-4">
                <img 
                  v-for="(logo, i) in slide.logos" 
                  :key="i" 
                  :src="logo" 
                  alt="Partner Logo" 
                  class="h-12 w-auto object-contain md:h-16 opacity-90 hover:opacity-100 transition-opacity drop-shadow-sm"
                />
              </div>

              <p :class="slide.bgImage ? 'text-white/95' : 'text-gray-600'" class="text-lg font-medium md:text-xl max-w-2xl drop-shadow-sm min-h-[3rem] md:min-h-[4rem]">
                {{ current === index ? typedDescription : slide.description }}
              </p>

              <Button 
                v-if="slide.buttonText"
                variant="secondary" 
                size="lg" 
                class="mt-4 font-bold px-8 py-6 text-lg shadow-xl border-none transition-all hover:-translate-y-1"
                :class="slide.bgImage ? 'bg-white text-[#005AA7] hover:bg-gray-100' : 'bg-primary text-primary-foreground hover:bg-primary/90'"
                :as="slide.buttonLink ? 'a' : 'button'"
                :href="slide.buttonLink || null"
              >
                {{ slide.buttonText }}
              </Button>
            </div>

          </div>
        </CarouselItem>
      </CarouselContent>
      
      <!-- Slide Indicators -->
      <div class="absolute bottom-36 left-0 right-0 flex justify-center gap-2 z-20">
        <button
          v-for="(slide, index) in count"
          :key="index"
          @click="api?.scrollTo(index)"
          :class="[
            'h-3 w-3 rounded-full transition-all duration-300 shadow-md border',
            current === index ? 'bg-primary w-8 border-transparent' : 'bg-black/20 hover:bg-black/40 border-black/10',
            props.slides[current]?.bgImage && current === index ? '!bg-white' : '',
            props.slides[current]?.bgImage && current !== index ? '!bg-white/40 !border-white/20 hover:!bg-white/60' : ''
          ]"
          aria-label="Go to slide"
        />
      </div>

      <!-- Scroll Down Indicator -->
      <div class="absolute bottom-20 left-0 right-0 flex justify-center z-20 animate-bounce cursor-pointer" @click="scrollDown">
        <button class="flex flex-col items-center justify-center text-gray-500 hover:text-primary transition-colors focus:outline-none"
                :class="props.slides[current]?.bgImage ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-primary'">
          <span class="text-xs uppercase font-semibold tracking-widest mb-1">Scroll to explore</span>
          <ChevronDown class="w-6 h-6" />
        </button>
      </div>

    </Carousel>
  </div>
</template>