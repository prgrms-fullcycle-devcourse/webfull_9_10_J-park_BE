import prisma from '../config/prisma';

export const getAllCategories = async () => {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      unit: true,
    },
  });

  // console.log('카테고리 데이터:', categories);

  return categories;
};
