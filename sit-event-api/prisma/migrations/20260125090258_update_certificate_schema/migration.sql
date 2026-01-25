/*
  Warnings:

  - You are about to drop the column `CertificateFieldName` on the `CertificateElement` table. All the data in the column will be lost.
  - You are about to drop the column `signatureFilepath` on the `CertificateTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `signatureX` on the `CertificateTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `signatureY` on the `CertificateTemplate` table. All the data in the column will be lost.
  - Added the required column `fieldName` to the `CertificateElement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fieldType` to the `CertificateElement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('StudentName', 'EventName', 'Date', 'SerialNumber', 'Text', 'Image');

-- AlterTable
ALTER TABLE "CertificateElement" DROP COLUMN "CertificateFieldName",
ADD COLUMN     "dateFormat" TEXT,
ADD COLUMN     "fieldName" TEXT NOT NULL,
ADD COLUMN     "fieldType" "FieldType" NOT NULL,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "sourceFilepath" TEXT,
ADD COLUMN     "width" INTEGER,
ALTER COLUMN "placeHolder" DROP NOT NULL,
ALTER COLUMN "fontSize" DROP NOT NULL,
ALTER COLUMN "fontFamily" DROP NOT NULL,
ALTER COLUMN "color" DROP NOT NULL,
ALTER COLUMN "fontWeight" DROP NOT NULL,
ALTER COLUMN "textAlign" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CertificateTemplate" DROP COLUMN "signatureFilepath",
DROP COLUMN "signatureX",
DROP COLUMN "signatureY";
