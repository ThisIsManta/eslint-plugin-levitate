import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './typescript-enum-name.mjs'

export default test(
	{
		rules: { 'typescript-enum-name': rule },
	},
	{
		valid: [
			{
				code: `enum PascalCase {}`,
			},
			{
				code: `enum PascalCase {}`,
				options: ['PascalCase'],
			},
			{
				code: `enum camelCase {}`,
				options: ['camelCase'],
			},
			{
				code: `enum SNAKE_CASE {}`,
				options: ['SNAKE_CASE'],
			},
		],
		invalid: [
			{
				code: `enum SNAKE_CASE {}`,
				options: ['PascalCase'],
				errors: [{ message: 'Expected the enumeration to be named "SnakeCase".' }],
			},
		]
	},
	{
		languageOptions: {
			parser,
		},
	}
)