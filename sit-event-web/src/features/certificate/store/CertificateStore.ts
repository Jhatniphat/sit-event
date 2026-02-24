import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CertificateService, type EventCertificateResponse } from '../services/CertificateService'

export interface FrontendCertificateElement {
  id: string;
  serverId?: string;
  type: string;
  label: string;
  x: number;
  y: number;
  value?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  src?: string | null;
  file?: File | null;
  dateFormat?: string;
}

export const useCertificateStore = defineStore('certificate', () => {
  // Store certificates mapped by eventId
  const certificates = ref<Record<string, EventCertificateResponse>>({})
  const isLoading = ref(false)

  const fetchCertificate = async (eventId: string) => {
    if (certificates.value[eventId]) {
      return certificates.value[eventId]
    }

    isLoading.value = true
    try {
      const template = await CertificateService.getTemplateByEventId(eventId)
      if (template) {
        certificates.value[eventId] = template
      }
      return template
    } catch (error) {
      console.error("Failed to fetch certificate", error)
    } finally {
      isLoading.value = false
    }
  }

  const saveCertificate = async (
    targetEventId: string,
    existingTemplateId: string | null,
    backgroundFile: File | null,
    elements: FrontendCertificateElement[]
  ) => {
    isLoading.value = true;
    try {
      let templateId = existingTemplateId;
      const templateFormData = new FormData();
      templateFormData.append('eventId', targetEventId);

      if (backgroundFile) {
        templateFormData.append('file', backgroundFile);
      }

      if (!templateId) {
        if (backgroundFile) {
          const res = await CertificateService.createTemplate(templateFormData);
          templateId = res.id;
        }
      } else {
        if (backgroundFile) {
          await CertificateService.updateTemplate(templateId, templateFormData);
        }
      }

      if (!templateId) return;

      if (existingTemplateId) {
        const oldElements = await CertificateService.getElements(templateId);
        await Promise.all(oldElements.map(el => CertificateService.deleteElement(el.id)));
      }

      const elementPromises = elements.map(el => {
        const formData = new FormData()
        formData.append('templateId', templateId!)
        formData.append('fieldName', el.label || el.type)
        formData.append('fieldType', el.type)
        formData.append('x', Math.round(el.x).toString())
        formData.append('y', Math.round(el.y).toString())

        if (el.width) formData.append('width', Math.round(el.width).toString())
        if (el.height) formData.append('height', Math.round(el.height).toString())
        if (el.value) formData.append('placeHolder', el.value)
        if (el.fontSize) formData.append('fontSize', el.fontSize.toString())
        if (el.fontFamily) formData.append('fontFamily', el.fontFamily)
        if (el.color) formData.append('color', el.color)
        if (el.fontWeight) formData.append('fontWeight', el.fontWeight)
        if (el.textAlign) formData.append('textAlign', el.textAlign)
        if (el.dateFormat) formData.append('dateFormat', el.dateFormat)

        if (el.type === 'Image' && el.file) {
          formData.append('file', el.file)
        }

        return CertificateService.createElement(formData)
      })

      await Promise.all(elementPromises)

      // Re-fetch to update cache
      const updatedTemplate = await CertificateService.getTemplateByEventId(targetEventId)
      if (updatedTemplate) {
        certificates.value[targetEventId] = updatedTemplate
      }

    } catch (error) {
      console.error("Error saving certificate:", error)
      throw error
    } finally {
      isLoading.value = false;
    }
  }

  return {
    certificates,
    isLoading,
    fetchCertificate,
    saveCertificate
  }
})