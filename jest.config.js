module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/tests/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/Backend/'],
  collectCoverageFrom: [
    'src/lib/auth.ts',
    'src/lib/jwt.ts',
    'src/lib/matches.ts',
    'src/lib/progress.ts',
    'src/lib/skill-scoring.ts',
    'src/lib/validation.ts',
    'src/middleware/**/*.ts',
    'src/app/api/auth/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          jsx: 'react-jsx',
          rootDir: '.'
        }
      }
    ]
  }
};
