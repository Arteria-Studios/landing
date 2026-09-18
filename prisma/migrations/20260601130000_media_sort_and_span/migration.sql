-- CreateEnum
CREATE TYPE "MediaColumnSpan" AS ENUM ('ONE_COLUMN', 'TWO_COLUMNS');

-- AlterTable
ALTER TABLE "ProjectMedia" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjectMedia" ADD COLUMN "columnSpan" "MediaColumnSpan" NOT NULL DEFAULT 'TWO_COLUMNS';
