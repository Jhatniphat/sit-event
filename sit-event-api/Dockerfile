# --- Stage 1: Builder ---
# ใช้ Node Image ตัวเต็มเพื่อ Build และ Install Dependencies ทั้งหมด
FROM node:20-alpine AS builder

WORKDIR /app

# Copy ไฟล์ package เพื่อ Install dependencies ก่อน (เพื่อใช้ Docker layer caching)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies ทั้งหมด (รวม devDependencies)
RUN npm ci

# Generate Prisma Client
# สำคัญ: เพราะคุณ config output ไว้ที่ ../generated/prisma
RUN npx prisma generate

# Copy source code ทั้งหมด
COPY . .

# Build NestJS (จะได้โฟลเดอร์ dist)
RUN npm run build

# --- Stage 2: Production Deps ---
# แยก Stage นี้เพื่อลงเฉพาะ Production Dependencies (ลดขนาด image)
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install เฉพาะ dependencies ที่จำเป็นสำหรับรันงานจริง
RUN npm ci --only=production

# --- Stage 3: Runner ---
# Image ตัวสุดท้ายที่จะเอาไปรันจริง
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy dependencies จาก stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copy โฟลเดอร์ dist ที่ build เสร็จแล้ว
COPY --from=builder /app/dist ./dist

# Copy โฟลเดอร์ generated ของ Prisma (สำคัญมาก! เพราะคุณไม่ได้เก็บใน node_modules)
COPY --from=builder /app/generated ./generated

# Copy โฟลเดอร์ prisma (เผื่อต้องใช้ schema ในการ migrate หรือ validate)
COPY --from=builder /app/prisma ./prisma

# Copy package.json
COPY package.json ./

# เปิด Port (NestJS default 3000)
EXPOSE 3000

# คำสั่งรัน
CMD ["node", "dist/main"]