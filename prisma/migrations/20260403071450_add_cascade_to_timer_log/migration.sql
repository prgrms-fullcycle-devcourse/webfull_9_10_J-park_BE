-- DropForeignKey
ALTER TABLE "timer_logs" DROP CONSTRAINT "timer_logs_goalLogId_fkey";

-- AddForeignKey
ALTER TABLE "timer_logs" ADD CONSTRAINT "timer_logs_goalLogId_fkey" FOREIGN KEY ("goalLogId") REFERENCES "goal_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
