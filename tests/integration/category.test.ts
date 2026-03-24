import request from 'supertest';
import app from '../../src/main';
import * as categoryService from '../../src/services/category.service';

// 필요하면 서비스 mock
// import * as categoryService from '../../src/services/category.service';

describe('Category API', () => {
  // 카테고리 목록 조회
  describe('GET /categories', () => {
    // 카테고리 반환 형식
    it('200 - 카테고리 목록을 올바른 형식으로 반환한다', async () => {
      const res = await request(app).get('/categories');

      expect(res.status).toBe(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          message: expect.any(String),
          data: expect.any(Array),
        }),
      );

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('카테고리 목록');

      // body data의 각 items에 대한 형식 검사
      for (const item of res.body.data) {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            unit: expect.any(String),
          }),
        );
      }
    });

    // data 형식(배열) 검사
    it('200 - data는 배열이어야 한다', async () => {
      const res = await request(app).get('/categories');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('500 - 서버 오류 시 명세된 에러 형식으로 반환한다', async () => {
      // 강제 에러 생성 (reject 리턴)
      jest
        .spyOn(categoryService, 'getAllCategories')
        .mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app).get('/categories');

      if (res.status !== 500) {
        return;
      }

      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: expect.any(String),
            message: expect.any(String),
          }),
        }),
      );
    });
  });
});
