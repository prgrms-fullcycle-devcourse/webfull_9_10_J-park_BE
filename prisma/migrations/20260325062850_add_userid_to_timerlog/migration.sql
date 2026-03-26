/*
  Warnings:

  - Added the required column `userId` to the `timer_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "timer_logs" ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "timer_logs_userId_endTime_idx" ON "timer_logs"("userId", "endTime");

-- AddForeignKey
ALTER TABLE "timer_logs" ADD CONSTRAINT "timer_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
