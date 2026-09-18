-- AlterTable
ALTER TABLE "Project" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Preserve current homepage order (newest first → lowest sortOrder)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1 AS rn
  FROM "Project"
)
UPDATE "Project" p
SET "sortOrder" = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

-- CreateIndex
CREATE INDEX "Project_sortOrder_idx" ON "Project"("sortOrder");
