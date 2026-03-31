import prisma from '../../src/config/prisma';
import { generateRandomUsername } from '../../src/utils/nickname.util';

const minTime = 60 * 60 * 1000; // 1시간
const maxTime = minTime * 100; // 100시간

async function main() {
  console.log('Seeding users for test...');

  const userData = Array.from({ length: 100 }).map((_, __) => {
    return {
      nickname: generateRandomUsername(),
      totalTime: Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime,
    };
  });

  await prisma.user.createMany({
    data: userData,
    skipDuplicates: true,
  });

  console.log('Successfully seeded 100 users!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
