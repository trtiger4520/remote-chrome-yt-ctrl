import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['../../artifacts/**'] },
  ...tseslint.configs.recommended,
);
