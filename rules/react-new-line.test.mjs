import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './react-new-line.mjs'

export default test(
  {
    rules: { 'react-new-line': rule },
  },
  {
    valid: [
      {
        code: `
        function Component() {
          return <div />
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <p>
                text
              </p>
            </div>
          )
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <span></span>
              <span></span>
            </div>
          )
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <i /> <i />
              <p>
                text
              </p>
            </div>
          )
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <i />{' '}
              <p>
                text
              </p>
            </div>
          )
        }
        `,
      },
    ],
    invalid: [
      {
        code: `
        function Component() {
          return (
            <div>
              <p>
                text
              </p>
              <p>
                text
              </p>
            </div>
          )
        }
        `,
        errors: [{ messageId: 'add', line: 8, column: 15 }],
        output: `
        function Component() {
          return (
            <div>
              <p>
                text
              </p>

              <p>
                text
              </p>
            </div>
          )
        }
        `,
      },
      {
        code: `
        function Component() {
          return (
            <div>
              <span></span>

              <span></span>
            </div>
          )
        }
        `,
        errors: [{ messageId: 'remove', line: 6 }],
        output: `
        function Component() {
          return (
            <div>
              <span></span>
              <span></span>
            </div>
          )
        }
        `,
      },
    ],
  },
  {
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      }
    },
  }
)