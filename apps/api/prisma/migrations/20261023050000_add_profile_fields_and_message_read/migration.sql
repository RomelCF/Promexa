-- AlterTable
ALTER TABLE "users" ADD COLUMN "bio" TEXT,
ADD COLUMN "coverImage" VARCHAR(500);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN "read" BOOLEAN NOT NULL DEFAULT false;
