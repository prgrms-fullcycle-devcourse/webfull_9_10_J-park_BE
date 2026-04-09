/*
  Warnings:

  - You are about to drop the column `actualStudyMinutes` on the `quota_feedbacks` table. All the data in the column will be lost.
  - Added the required column `actualStudyTime` to the `quota_feedbacks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quota_feedbacks" DROP COLUMN "actualStudyMinutes",
ADD COLUMN     "actualStudyTime" INTEGER NOT NULL;
