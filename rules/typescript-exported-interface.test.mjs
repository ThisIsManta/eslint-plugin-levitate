// @ts-check

import { eslintCompatPlugin } from '@oxlint/plugins'
import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './typescript-exported-interface.mjs'

export default test(
	eslintCompatPlugin({
		rules: { 'typescript-exported-interface': rule },
	}),
	{
		valid: [
			{
				code: `export interface x {}`,
			},
			{
				code: `declare global { interface x {} }`,
			},
		],
		invalid: [
			{
				code: `interface x {}`,
				errors: [{ message: 'Expected interfaces to be exported.' }],
			},
		],
	},
	{
		languageOptions: {
			parser,
		},
	}
)