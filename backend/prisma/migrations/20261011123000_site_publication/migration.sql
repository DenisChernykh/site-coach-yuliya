-- CreateEnum
CREATE TYPE "SitePublicationStatus" AS ENUM ('IDLE', 'PENDING', 'DISPATCHING', 'BUILDING', 'FAILED');

-- CreateTable
CREATE TABLE "site_publications" (
    "id" TEXT NOT NULL,
    "requested_revision" INTEGER NOT NULL DEFAULT 0,
    "deployed_revision" INTEGER NOT NULL DEFAULT 0,
    "active_revision" INTEGER,
    "status" "SitePublicationStatus" NOT NULL DEFAULT 'IDLE',
    "requested_at" TIMESTAMP(3),
    "dispatched_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claim_token" UUID,
    "claimed_until" TIMESTAMP(3),
    "workflow_run_id" VARCHAR(30),
    "last_error_code" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_publications_pkey" PRIMARY KEY ("id")
);
