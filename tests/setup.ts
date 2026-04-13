// uuid는 ESM 모듈이라 Jest에서 import 시 에러 발생
// 테스트에서는 실제 랜덤 값이 필요 없으므로 mock 처리
jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));