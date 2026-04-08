-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "user_quota_profiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "baseBias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_quota_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_recommendations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" INTEGER NOT NULL,
    "recommendationDate" TIMESTAMPTZ(3) NOT NULL,
    "remainingUnits" INTEGER NOT NULL,
    "remainingDays" INTEGER NOT NULL,
    "baseQuota" INTEGER NOT NULL,
    "baseBiasSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recommendedQuota" INTEGER NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_feedbacks" (
    "id" SERIAL NOT NULL,
    "recommendationId" INTEGER NOT NULL,
    "actualCompleted" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "finalReward" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quota_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_quota_profiles_userId_key" ON "user_quota_profiles"("userId");

-- CreateIndex
CREATE INDEX "quota_recommendations_userId_recommendationDate_idx" ON "quota_recommendations"("userId", "recommendationDate");

-- CreateIndex
CREATE UNIQUE INDEX "quota_recommendations_goalId_recommendationDate_key" ON "quota_recommendations"("goalId", "recommendationDate");

-- CreateIndex
CREATE UNIQUE INDEX "quota_feedbacks_recommendationId_key" ON "quota_feedbacks"("recommendationId");

-- AddForeignKey
ALTER TABLE "user_quota_profiles" ADD CONSTRAINT "user_quota_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_recommendations" ADD CONSTRAINT "quota_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_recommendations" ADD CONSTRAINT "quota_recommendations_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_feedbacks" ADD CONSTRAINT "quota_feedbacks_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "quota_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
