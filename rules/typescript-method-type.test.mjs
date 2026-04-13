import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './typescript-method-type.mjs'

export default test(
	{
		rules: { 'typescript-method-type': rule },
	},
	{
		valid: [
			{
				code: `
        interface X {
          onClick: <T>(a, b, c) => void
        }
        `,
			},
		],
		invalid: [
			{
				code: `
        interface X {
          onClick<T>(a, b, c): void
        }
        `,
				errors: [
					{ message: 'Expected to be using arrow notation' },
				],
				output: `
        interface X {
          onClick: <T>(a, b, c) => void
        }
        `,
			},
			{
				code: `
        interface X {
          onClose?()
        }
        `,
				errors: [
					{ message: 'Expected to be using arrow notation' },
				],
				output: `
        interface X {
          onClose?: () => void
        }
        `,
			},
			{
				code: `
        interface X {
          onClose?<T>()
        }
        `,
				errors: [
					{ message: 'Expected to be using arrow notation' },
				],
				output: `
        interface X {
          onClose?: <T>() => void
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
			},
		},
	}
)