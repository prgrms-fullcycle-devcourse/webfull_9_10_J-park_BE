-- DropIndex
DROP INDEX "timer_logs_userId_endTime_idx";

-- AlterTable
ALTER TABLE "timer_logs" ADD COLUMN     "goalLogId" INTEGER;

-- CreateIndex
CREATE INDEX "timer_logs_userId_goalId_endTime_idx" ON "timer_logs"("userId", "goalId", "endTime");

-- AddForeignKey
ALTER TABLE "timer_logs" ADD CONSTRAINT "timer_logs_goalLogId_fkey" FOREIGN KEY ("goalLogId") REFERENCES "goal_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
