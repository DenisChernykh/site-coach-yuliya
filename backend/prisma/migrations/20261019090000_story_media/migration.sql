CREATE TABLE "story_media" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_media_size_check" CHECK ("size" > 0 AND "size" <= 31457280 AND octet_length("data") = "size")
);
