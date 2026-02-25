import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    clearMocks: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    reporters: [
      'default', // Terminal output
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'components/icons/**',
        '**/*.js',
        '**/*.jsx',
        '**/route.ts',
        '.next/**',
        'prisma/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'pages/layout.tsx',
      ],
    },
  },
});
