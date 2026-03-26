import { GoalLog } from '../generated/prisma';

export function calculateStats(logs: GoalLog[], quota: number) {
  if (logs.length === 0) return { mean: quota, stdDev: quota * 0.5 };

  const values = logs.map((log) => log.actualValue || 0);
  const n = values.length;

  // 평균 (mean)
  const total = values.reduce((sum, cur) => sum + cur, 0);
  const mean = total / n;

  // 개수가 1개이면 표준편차를 구할 수 없음
  if (n == 1) return { mean, stdDev: mean * 0.5 };

  // 표준 편차 (standard deviation)
  // 분산(variance) = (측정값 - 평균)^2의 평균
  const sumOfSqaures = values.reduce(
    (sum, val) => sum + Math.pow(val - mean, 2),
    0,
  );
  const variance = sumOfSqaures / n;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * 박스-뮬러 변환을 사용하여 정규분포를 따르는 난수 생성
 * @param mean 분포의 평균
 * @param stdDev 분포의 표준편차
 * @returns 정규분포를 따르는 무작위 난수
 */
function generateRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  return z0 * stdDev + mean;
}

export function calculateRisk(
  mean: number,
  stdDev: number,
  remainingValue: number,
  remainingDays: number,
  iter: number = 10000,
) {
  if (remainingDays <= 0) return remainingValue > 0 ? 100 : 0; // 남은 날이 없는데 양이 남음 (100)
  if (remainingValue <= 0) return 0; // 남은 양이 없음 (0)

  let successCnt = 0;

  for (let i = 0; i < iter; i++) {
    let simulatedTotal = 0;
    for (let day = 0; day < remainingDays; day++) {
      simulatedTotal += generateRandom(mean, stdDev);
    }

    if (simulatedTotal >= remainingValue) {
      successCnt += 1;
    }
  }

  const successProb = successCnt / iter;
  return (1 - successProb) * 100;
}
