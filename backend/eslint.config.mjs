import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Object này phải CHỈ có `ignores` thì mới là ignore toàn cục của ESLint.
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/types/express.d.ts', 'tmp-*.mjs'],
  },
  {
    linterOptions: {
      // Khung cũ có chú thích tắt lỗi không còn cần thiết; không báo thừa để không phải sửa mã nguồn.
      reportUnusedDisableDirectives: 'off',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      // Tham số bắt đầu bằng _ là không dùng (quy ước của Express errorHandler)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Cấu hình môi trường đã kiểm bằng zod nên không cần ép kiểu ở nơi khác
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'smart'],
      'no-console': 'warn',
    },
  },
  {
    // Script dòng lệnh (seed), kiểm tra env lúc khởi động, chuẩn bị test: cần in ra màn hình
    files: ['prisma/seed.ts', 'src/config/env.ts', 'tests/global-setup.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
