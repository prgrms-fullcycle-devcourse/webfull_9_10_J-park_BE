/** @jest-config-loader ts-node */
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  transformIgnorePatterns: ['/node_modules/(?!(?:@faker-js/faker)/)'],
};

export default config;
