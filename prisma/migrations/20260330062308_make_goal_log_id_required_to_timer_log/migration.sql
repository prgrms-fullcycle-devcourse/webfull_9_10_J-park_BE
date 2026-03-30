/*
  Warnings:

  - Made the column `goalLogId` on table `timer_logs` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "timer_logs" ALTER COLUMN "goalLogId" SET NOT NULL;
