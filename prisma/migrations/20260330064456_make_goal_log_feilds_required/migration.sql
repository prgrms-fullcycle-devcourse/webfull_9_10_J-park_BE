/*
  Warnings:

  - Made the column `targetValue` on table `goal_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `actualValue` on table `goal_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `timeSpent` on table `goal_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "goal_logs" ALTER COLUMN "targetValue" SET NOT NULL,
ALTER COLUMN "actualValue" SET NOT NULL,
ALTER COLUMN "timeSpent" SET NOT NULL;
