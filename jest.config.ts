/** @jest-config-loader ts-node */
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  silent: true, // 예기치 못한 오류까지 보고 싶을 경우 주석 처리하세요
  transformIgnorePatterns: ['/node_modules/(?!(?:@faker-js/faker)/)'],
};

export default config;
