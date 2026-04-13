import parser from '@typescript-eslint/parser'
import { test } from 'eslint-rule-tester'

import { default as rule } from './no-top-level-require.mjs'

export default test(
	{
		rules: { 'no-top-level-require': rule },
	},
	{
		valid: [
			{
				code: 'require',
			},
			{
				code: 'require()',
			},
			{
				code: 'require(a)',
			},
			{
				code: 'const f = () => require("m")',
			},
			{
				code: 'const f = () => { require("m") }',
			},
			{
				code: 'class S { m = require("m") }',
			},
			{
				code: 'const s = `${require("m")}`',
			},
		],
		invalid: [
			{
				code: 'require("m")',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
			{
				code: 'const m = require("m")',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
			{
				code: 'require("m").call()',
				errors: [{ message: 'Expected `require` to be `import` syntax' }],
			},
		],
	},
	{
		languageOptions: {
			parser,
		},
	}
)