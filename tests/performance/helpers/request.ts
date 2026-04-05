import request from 'supertest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

export const makeToken = (userId: number) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};

export const asCookie = (token: string) => [`token=${token}`];

export const measureRequest = async (
  fn: () => Promise<request.Response>,
): Promise<{ elapsedMs: number; response: request.Response }> => {
  const started = performance.now();
  const response = await fn();
  const ended = performance.now();

  return {
    elapsedMs: Number((ended - started).toFixed(2)),
    response,
  };
};
