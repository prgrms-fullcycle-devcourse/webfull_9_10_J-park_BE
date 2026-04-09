/*
  Warnings:

  - Added the required column `actualStudyMinutes` to the `quota_feedbacks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quota_feedbacks" ADD COLUMN     "actualStudyMinutes" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "quota_recommendations" ADD COLUMN     "fatigueBaselineSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 60,
ADD COLUMN     "fatigueBiasSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "fatigueWeightSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "recentAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_quota_profiles" ADD COLUMN     "fatigueBaseline" DOUBLE PRECISION NOT NULL DEFAULT 60,
ADD COLUMN     "fatigueWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.5;
