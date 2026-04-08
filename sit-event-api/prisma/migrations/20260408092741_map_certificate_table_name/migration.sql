/*
  Warnings:

  - You are about to drop the `CertificateElement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CertificateTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CertificateElement" DROP CONSTRAINT "CertificateElement_templateId_fkey";

-- DropForeignKey
ALTER TABLE "CertificateTemplate" DROP CONSTRAINT "CertificateTemplate_eventId_fkey";

-- DropTable
DROP TABLE "CertificateElement";

-- DropTable
DROP TABLE "CertificateTemplate";

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "templateFilepath" TEXT NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_elements" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "placeHolder" TEXT,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fontSize" INTEGER,
    "fontFamily" TEXT,
    "color" TEXT,
    "fontWeight" TEXT,
    "textAlign" TEXT,
    "sourceFilepath" TEXT,
    "dateFormat" TEXT,

    CONSTRAINT "certificate_elements_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_elements" ADD CONSTRAINT "certificate_elements_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
