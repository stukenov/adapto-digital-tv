/** @type {import("prettier").Config} */
export default {
  // Основные настройки
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // Специфичные настройки для Smart TV
  embeddedLanguageFormatting: 'auto',
  htmlWhitespaceSensitivity: 'css',
  insertPragma: false,
  requirePragma: false,
  proseWrap: 'preserve',
  rangeStart: 0,
  rangeEnd: Infinity,
  
  // Переопределения для разных типов файлов
  overrides: [
    {
      files: '*.{js,jsx,ts,tsx}',
      options: {
        parser: 'typescript',
        singleQuote: true,
        jsxSingleQuote: true,
        trailingComma: 'es5',
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        singleQuote: false,
        trailingComma: 'none',
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
        printWidth: 100,
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        parser: 'yaml',
        singleQuote: true,
        tabWidth: 2,
      },
    },
    {
      files: '*.css',
      options: {
        parser: 'css',
        singleQuote: true,
      },
    },
    {
      files: '*.html',
      options: {
        parser: 'html',
        singleQuote: true,
        bracketSameLine: true,
      },
    },
  ],
}; 