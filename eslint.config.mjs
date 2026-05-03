import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  ...nextCoreWebVitals,
  eslintConfigPrettier,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off'
    }
  }
];
