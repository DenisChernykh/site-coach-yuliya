ALTER TABLE "site_content" ADD COLUMN "page_layout" JSONB;

CREATE TABLE "site_cms_drafts" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "published_revision" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_cms_drafts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "site_cms_drafts_revision_check" CHECK ("revision" >= "published_revision" AND "published_revision" >= 1)
);
