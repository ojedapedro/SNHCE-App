// Configuración de Jest para el backend del SNHCE
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@prisma/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
  // testPathIgnorePatterns se aplica a todos los proyectos
  testPathIgnorePatterns: ['/node_modules/'],
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.spec.ts',
        '<rootDir>/test/unit/**/*.spec.ts',
      ],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      moduleNameMapper: {
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
      },
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      moduleNameMapper: {
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
      },
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
    {
      displayName: 'authorization',
      testMatch: ['<rootDir>/test/authorization/**/*.spec.ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      moduleNameMapper: {
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
      },
      testEnvironment: 'node',
      moduleFileExtensions: ['js', 'json', 'ts'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/common/telemetry/**',
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 2,
      lines: 5,
      statements: 5,
    },
  },
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};

export default config;
