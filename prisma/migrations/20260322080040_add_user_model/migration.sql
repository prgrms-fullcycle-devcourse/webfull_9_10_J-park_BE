-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "profile_image_url" TEXT,
ADD COLUMN     "total_time" INTEGER NOT NULL DEFAULT 0;
