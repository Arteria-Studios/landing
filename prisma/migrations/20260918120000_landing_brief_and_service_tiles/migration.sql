-- Services are grouped into the home page bento tiles and carry a popover text.
ALTER TABLE "StudioService" ADD COLUMN "category" TEXT;
ALTER TABLE "StudioService" ADD COLUMN "description" TEXT;

-- The landing brief form sends services, budget and timeline with each request.
ALTER TABLE "ContactRequest" ADD COLUMN "services" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ContactRequest" ADD COLUMN "budget" TEXT;
ALTER TABLE "ContactRequest" ADD COLUMN "timeline" TEXT;
