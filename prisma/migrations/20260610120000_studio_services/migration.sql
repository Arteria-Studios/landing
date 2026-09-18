-- CreateTable
CREATE TABLE "StudioService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioService_sortOrder_idx" ON "StudioService"("sortOrder");
