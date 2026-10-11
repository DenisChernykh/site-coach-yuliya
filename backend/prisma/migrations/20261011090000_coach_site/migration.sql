-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TelegramDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "site_content" (
    "id" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "contacts" JSONB NOT NULL,
    "home" JSONB NOT NULL,
    "faq" JSONB NOT NULL,
    "socials" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "contact" VARCHAR(120) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "service_id" VARCHAR(100),
    "service_title" VARCHAR(300),
    "consent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consent_version" VARCHAR(100) NOT NULL,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'NEW',
    "admin_note" VARCHAR(4000) NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_deliveries" (
    "consultation_id" UUID NOT NULL,
    "status" "TelegramDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claim_token" UUID,
    "claimed_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "message_id" TEXT,
    "last_error_code" VARCHAR(100),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_deliveries_pkey" PRIMARY KEY ("consultation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_published_topic_sort_order_idx" ON "articles"("published", "topic", "sort_order");

-- CreateIndex
CREATE INDEX "programs_published_sort_order_idx" ON "programs"("published", "sort_order");

-- CreateIndex
CREATE INDEX "consultations_status_created_at_idx" ON "consultations"("status", "created_at");

-- CreateIndex
CREATE INDEX "telegram_deliveries_status_next_attempt_at_claimed_until_idx" ON "telegram_deliveries"("status", "next_attempt_at", "claimed_until");

-- AddForeignKey
ALTER TABLE "telegram_deliveries" ADD CONSTRAINT "telegram_deliveries_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
