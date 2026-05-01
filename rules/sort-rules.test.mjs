import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './sort-rules.mjs'

export default test(
  {
    rules: { 'sort-rules': rule },
  },
  {
    valid: [
      {
        code: `export default { rules: { 'a': 1, 'b': 1 } }`,
        filename: 'eslint.config.js',
      },
      {
        code: `export default { rules: { 'a': 1, 'b': 1 } }`,
        filename: 'oxlint.config.ts',
      },
      {
        code: `export default { rules: { 'b': 1, 'a': 1 } }`,
        filename: 'untitled.js',
      },
      {
        code: `export default [{
          rules: {
            a: 1,

            '@x/y': 2,

            'x/y': 2,
            'x/z': 2,

            // Comment
            'x-a/z': 2,
          }
        }]`,
        filename: 'eslint.config.js',
      },
    ],
    invalid: [
      ...[
        '.eslintrc.js',
        'eslint.config.js',
        'eslint.config.mjs',
        'eslint.config.cjs',
        'eslint.config.ts',
        'eslint.config.mts',
        'eslint.config.cts',
        'oxlint.config.ts',
      ].map(filename => ({
        code: `export default { rules: { 'b': 1, 'a': 1 } }`,
        filename,
        errors: [
          {
            message: 'Expected the rule "a" to be placed before "b".',
          }
        ]
      })),
      {
        code: `export default [{
          rules: {
            '@x/y': 2,
            a: 1,
          }
        }]`,
        filename: 'eslint.config.js',
        errors: [
          {
            message: 'Expected the rule "a" to be placed before "@x/y".'
          }
        ],
      },
      {
        code: `export default [{
          rules: {
            'x/y': 2,
            '@x/y': 2,
          }
        }]`,
        filename: 'eslint.config.js',
        errors: [
          {
            message: 'Expected the rule "@x/y" to be placed before "x/y".'
          }
        ],
      },
      {
        code: `export default [{
          rules: {
            '@x/y': 2,
            'x/z': 2,
            'x/y': 2,
          }
        }]`,
        filename: 'eslint.config.js',
        errors: [
          {
            message: 'Expected the rule "x/y" to be placed immediately after "@x/y".',
          },
        ],
      },
      {
        code: `export default [{
          rules: {
            'x/y': 1,
            'x/y': 2,
            'x/z': 2,
          }
        }]`,
        filename: 'eslint.config.js',
        errors: [
          {
            message: 'Unexpected duplicate rule "x/y".',
            line: 3,
          },
          {
            message: 'Unexpected duplicate rule "x/y".',
            line: 4,
          },
        ],
      },
      {
        code: `export default [{
          rules: {
            'a': 1,
            'x/y': 1,

            'x/z': 2,
          }
        }]`,
        filename: 'eslint.config.js',
        errors: [
          {
            message: 'Expected an empty line before the rule "x/y".',
            line: 4,
            endLine: 4,
          },
          {
            message: 'Unexpected an empty line here.',
            line: 4,
            endLine: 6,
          },
        ],
      },
    ],
  },
  {
    languageOptions: {
      parser,
    },
  }
)
