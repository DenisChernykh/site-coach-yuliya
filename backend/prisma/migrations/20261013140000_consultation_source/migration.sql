CREATE TYPE "ConsultationSource" AS ENUM ('HOME_CONTACT', 'COACHING_CONTACT', 'CONTACTS_CONTACT');

ALTER TABLE "consultations" ADD COLUMN "source" "ConsultationSource";
