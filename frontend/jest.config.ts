import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],

  transformIgnorePatterns: [
    '/node_modules/(?!(@heroui|@react-aria|@react-stately|@react-types|tailwind-merge|framer-motion|react-markdown|remark-|unified|mdast-|hast-|vfile-|unist-|bail|trough)/)',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@heroui/react$': '<rootDir>/node_modules/@heroui/react',
  },
};

module.exports = createJestConfig(customJestConfig);