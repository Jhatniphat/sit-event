// src/features/certificate/types.ts

// --- Enums ---
export type CertificateFieldType = 
  | 'StudentName' 
  | 'EventName' 
  | 'EventStartDate' 
  | 'EventEndDate' 
  | 'Date' 
  | 'SerialNumber' 
  | 'Text' 
  | 'Image';

// --- API Response Entities (Model จาก Backend) ---

export interface CertificateTemplate {
  id: string;
  eventId: string;
  filePath?: string; // Path ของไฟล์รูปภาพพื้นหลังที่ Backend เก็บไว้
  createdAt: string;
  updatedAt: string;
}

export interface CertificateElement {
  id: string;
  templateId: string;
  fieldName: string;
  fieldType: CertificateFieldType;
  x: number;
  y: number;
  width?: number; // Nullable ใน DB
  height?: number; // Nullable ใน DB
  placeHolder?: string; // ใช้เก็บค่า Value หรือ Text
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  dateFormat?: string;
  filePath?: string; // สำหรับ Element ที่เป็นรูปภาพ (ถ้ามี)
  createdAt: string;
  updatedAt: string;
}

// --- DTOs for Service Calls (Request Payloads) ---

export interface CreateCertificateTemplateDto {
  eventId: string;
  file: File; // Upload Background
}

export interface UpdateCertificateTemplateDto {
  eventId?: string;
  file?: File;
}

export interface CreateCertificateElementDto {
  templateId: string;
  fieldName: string;
  fieldType: CertificateFieldType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  placeHolder?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  dateFormat?: string;
  file?: File; // สำหรับ Upload รูปภาพใน Element (ถ้ามี)
}

export interface UpdateCertificateElementDto {
  templateId?: string;
  fieldName?: string;
  fieldType?: CertificateFieldType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  placeHolder?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: string;
  dateFormat?: string;
  file?: File;
}

export interface PreviewCertificateDto {
  templateId: string;
  elements: Omit<CreateCertificateElementDto, 'file'>[]; // Preview อาจจะไม่รองรับ File Upload ตรงๆ หรือส่งเป็น base64 แทนใน context นี้
}